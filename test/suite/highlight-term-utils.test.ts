import * as assert from "assert";
import * as vscode from "vscode";
import {
    doesHighlightApplyToDocument,
    normalizeHighlightedTerm,
    normalizeHighlightedTerms
} from "../../src/utils/highlight-term-utils";
import type { HighlightedTerm } from "../../src/types";
import { createMockDocument, setupVSCodeMocks } from "./helpers";

suite("highlight-term-utils 测试", () => {
    setup(() => {
        setupVSCodeMocks();
    });

    test("normalizeHighlightedTerm: 为旧数据补齐默认字段", () => {
        const normalized = normalizeHighlightedTerm(
            {
                text: " test ",
                colorId: 0
            },
            false
        );

        assert.strictEqual(normalized.text, "test");
        assert.ok(normalized.id);
        assert.strictEqual(normalized.enabled, true);
        assert.strictEqual(normalized.caseSensitive, false);
        assert.strictEqual(normalized.matchMode, "wholeWord");
        assert.strictEqual(normalized.scopeType, "global");
        assert.strictEqual(normalized.scopeValue, undefined);
    });

    test("normalizeHighlightedTerms: 无效字段回退到默认值", () => {
        const invalidTerms = [
            {
                text: "demo",
                colorId: 1,
                enabled: false,
                caseSensitive: true,
                matchMode: "invalid",
                scopeType: "bad",
                scopeValue: "ignored"
            }
        ] as unknown as HighlightedTerm[];

        const normalized = normalizeHighlightedTerms(
            invalidTerms,
            false
        );

        assert.strictEqual(normalized.length, 1);
        assert.strictEqual(normalized[0].enabled, false);
        assert.strictEqual(normalized[0].caseSensitive, true);
        assert.strictEqual(normalized[0].matchMode, "wholeWord");
        assert.strictEqual(normalized[0].scopeType, "global");
        assert.strictEqual(normalized[0].scopeValue, undefined);
    });

    test("doesHighlightApplyToDocument: file 作用域只命中当前文件", () => {
        const document = createMockDocument("content", "file:///mock/current.ts");
        const sameFileRule = {
            id: "highlight:file",
            text: "demo",
            colorId: 0,
            enabled: true,
            caseSensitive: false,
            matchMode: "wholeWord" as const,
            scopeType: "file" as const,
            scopeValue: "file:///mock/current.ts"
        };
        const otherFileRule = {
            ...sameFileRule,
            id: "highlight:other-file",
            scopeValue: "file:///mock/other.ts"
        };

        assert.strictEqual(doesHighlightApplyToDocument(sameFileRule, document), true);
        assert.strictEqual(doesHighlightApplyToDocument(otherFileRule, document), false);
    });

    test("doesHighlightApplyToDocument: language 作用域按 languageId 过滤", () => {
        const document = createMockDocument("content") as vscode.TextDocument & { languageId: string };
        const languageRule = {
            id: "highlight:lang",
            text: "demo",
            colorId: 0,
            enabled: true,
            caseSensitive: false,
            matchMode: "wholeWord" as const,
            scopeType: "language" as const,
            scopeValue: "typescript"
        };
        const otherLanguageRule = {
            ...languageRule,
            id: "highlight:other-lang",
            scopeValue: "markdown"
        };

        assert.strictEqual(doesHighlightApplyToDocument(languageRule, document), true);
        assert.strictEqual(doesHighlightApplyToDocument(otherLanguageRule, document), false);
    });
});
