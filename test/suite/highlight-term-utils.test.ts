import * as assert from "assert";
import * as vscode from "vscode";
import {
    doesHighlightApplyToDocument,
    getAnnotationTagColorId,
    getHighlightCaseSensitive,
    getHighlightMatchMode,
    normalizeHighlightedTerm,
    normalizeHighlightedTerms
} from "../../src/utils/highlight-term-utils";
import type { HighlightedTerm } from "../../src/types";
import { DEFAULT_ANNOTATION_TAGS } from "../../src/constants";
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
        assert.strictEqual(normalized[0].isAnnotationTag, undefined);
        assert.strictEqual(normalized[0].annotationColorId, undefined);
    });

    test("normalizeHighlightedTerm: 保留有效 annotation tag metadata and color", () => {
        const normalized = normalizeHighlightedTerm(
            {
                text: "SECURITY",
                colorId: 0,
                isAnnotationTag: true,
                annotationColorId: 3
            },
            false
        );

        assert.strictEqual(normalized.isAnnotationTag, true);
        assert.strictEqual(normalized.annotationColorId, 3);
    });

    test("normalizeHighlightedTerm: assigns built-in annotation colors safely", () => {
        const todo = normalizeHighlightedTerm(
            {
                text: "TODO:",
                colorId: 0,
                isAnnotationTag: true
            },
            false
        );
        const fixme = normalizeHighlightedTerm(
            {
                text: "FIXME",
                colorId: 0,
                isAnnotationTag: true,
                annotationColorId: 999
            },
            false
        );

        assert.strictEqual(todo.annotationColorId, 0);
        assert.strictEqual(fixme.annotationColorId, 1);
    });

    test("normalizeHighlightedTerm: forces built-in annotation matching options", () => {
        const storedTerm: HighlightedTerm = {
            text: "TODO:",
            colorId: 0,
            isAnnotationTag: true,
            caseSensitive: false,
            matchMode: "regex"
        };
        const normalized = normalizeHighlightedTerm(storedTerm, false);

        assert.strictEqual(normalized.caseSensitive, true);
        assert.strictEqual(normalized.matchMode, "wholeWord");
        assert.strictEqual(getHighlightCaseSensitive(storedTerm, false), true);
        assert.strictEqual(getHighlightMatchMode(storedTerm), "wholeWord");
    });

    test("normalizeHighlightedTerm: preserves custom annotation matching options", () => {
        const normalized = normalizeHighlightedTerm(
            {
                text: "SECURITY",
                colorId: 0,
                isAnnotationTag: true,
                caseSensitive: false,
                matchMode: "substring"
            },
            true
        );

        assert.strictEqual(normalized.caseSensitive, false);
        assert.strictEqual(normalized.matchMode, "substring");
        assert.strictEqual(getHighlightMatchMode(normalized), "substring");
    });

    test("getAnnotationTagColorId: resolves built-ins with or without trailing colon", () => {
        assert.strictEqual(getAnnotationTagColorId("NOTE:"), getAnnotationTagColorId("NOTE"));
        assert.strictEqual(getAnnotationTagColorId("deprecated:"), 10);
    });

    test("getAnnotationTagColorId: assigns distinct colors to built-in tags", () => {
        const colorIds = DEFAULT_ANNOTATION_TAGS.map((tag) => getAnnotationTagColorId(tag));

        assert.strictEqual(new Set(colorIds).size, DEFAULT_ANNOTATION_TAGS.length);
    });

    test("DEFAULT_ANNOTATION_TAGS: built-in match text includes trailing colon", () => {
        assert.ok(DEFAULT_ANNOTATION_TAGS.every((tag) => tag.endsWith(":")));
    });

    test("getAnnotationTagColorId: uses deterministic fallback for custom tags", () => {
        assert.strictEqual(
            getAnnotationTagColorId("SECURITY"),
            getAnnotationTagColorId("SECURITY")
        );
        assert.strictEqual(
            getAnnotationTagColorId("security"),
            getAnnotationTagColorId("SECURITY")
        );
    });

    test("getHighlightCaseSensitive: built-in annotation tag always returns true", () => {
        const builtInTag: HighlightedTerm = {
            text: "TODO:",
            colorId: 0,
            isAnnotationTag: true,
            caseSensitive: false,
            matchMode: "wholeWord",
            scopeType: "global"
        };
        assert.strictEqual(getHighlightCaseSensitive(builtInTag, false), true);
        assert.strictEqual(getHighlightCaseSensitive(builtInTag, true), true);
    });

    test("getHighlightCaseSensitive: custom annotation tag preserves its own caseSensitive", () => {
        const customTag: HighlightedTerm = {
            text: "CUSTOM_TAG",
            colorId: 0,
            isAnnotationTag: true,
            caseSensitive: false,
            matchMode: "substring",
            scopeType: "global"
        };
        assert.strictEqual(getHighlightCaseSensitive(customTag, true), false);
    });

    test("getHighlightMatchMode: built-in annotation tag always returns wholeWord", () => {
        const builtInTag: HighlightedTerm = {
            text: "FIXME:",
            colorId: 0,
            isAnnotationTag: true,
            caseSensitive: false,
            matchMode: "regex",
            scopeType: "global"
        };
        assert.strictEqual(getHighlightMatchMode(builtInTag), "wholeWord");
    });

    test("getHighlightMatchMode: custom annotation tag preserves its own matchMode", () => {
        const customTag: HighlightedTerm = {
            text: "MYTAG",
            colorId: 0,
            isAnnotationTag: true,
            caseSensitive: false,
            matchMode: "substring",
            scopeType: "global"
        };
        assert.strictEqual(getHighlightMatchMode(customTag), "substring");
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
