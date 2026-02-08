import * as assert from "assert";
import * as vscode from "vscode";
import { DecoratorManager } from "../../src/utils/decorator-manager";
import type { CachedHighlight, ColorDefinition } from "../../src/types";

// Mock TextEditor for testing
class MockTextEditor {
    public decorations = new Map<vscode.TextEditorDecorationType, vscode.Range[]>();

    setDecorations(decorationType: vscode.TextEditorDecorationType, ranges: vscode.Range[]): void {
        this.decorations.set(decorationType, ranges);
    }
}

suite("DecoratorManager Suite", () => {
    let decoratorManager: DecoratorManager;
    let mockEditor: any;

    setup(() => {
        decoratorManager = new DecoratorManager();
        mockEditor = new MockTextEditor();
    });

    teardown(() => {
        decoratorManager.dispose();
    });

    test("clearAllEditorDecorations 应该清除所有装饰器", () => {
        // 创建一些装饰器类型
        const mockDecorationType1 = vscode.window.createTextEditorDecorationType({});
        const mockDecorationType2 = vscode.window.createTextEditorDecorationType({});

        mockEditor.setDecorations(mockDecorationType1, [new vscode.Range(0, 0, 0, 5)]);
        mockEditor.setDecorations(mockDecorationType2, [new vscode.Range(1, 0, 1, 5)]);

        assert.strictEqual(mockEditor.decorations.size, 2, "应该有 2 个装饰器");

        decoratorManager["clearAllEditorDecorations"](mockEditor);

        assert.strictEqual(mockEditor.decorations.size, 0, "所有装饰器应该被清除");

        // 清理
        mockDecorationType1.dispose();
        mockDecorationType2.dispose();
    });

    test("applyHighlightsToEditor 应该应用内置颜色高亮", () => {
        const highlights: CachedHighlight[] = [
            {
                text: "test",
                ranges: [new vscode.Range(0, 0, 0, 4)],
                colorId: 0,
                isCustomColor: false
            }
        ];

        decoratorManager["applyHighlightsToEditor"](mockEditor, highlights);

        // 验证装饰器被应用
        assert.ok(mockEditor.decorations.size > 0, "应该应用装饰器");
    });

    test("applyHighlightsToEditor 应该应用自定义颜色高亮", () => {
        const customColor: ColorDefinition = {
            light: { backgroundColor: "rgba(255, 0, 0, 0.5)" },
            dark: { backgroundColor: "rgba(255, 0, 0, 0.3)" }
        };

        const highlights: CachedHighlight[] = [
            {
                text: "test",
                ranges: [new vscode.Range(0, 0, 0, 4)],
                colorId: 0,
                isCustomColor: true,
                customColor: customColor
            }
        ];

        decoratorManager["applyHighlightsToEditor"](mockEditor, highlights);

        // 验证装饰器被应用
        assert.ok(mockEditor.decorations.size > 0, "应该应用自定义颜色装饰器");
    });

    test("registerCustomDecorationType 应该注册自定义装饰器", () => {
        const customColor: ColorDefinition = {
            light: { backgroundColor: "rgba(255, 0, 0, 0.5)" },
            dark: { backgroundColor: "rgba(255, 0, 0, 0.3)" }
        };

        decoratorManager.registerCustomDecorationType("test", customColor);

        // 验证装饰器被注册
        const customDecorationTypes = decoratorManager["customDecorationTypes"];
        assert.ok(customDecorationTypes.size > 0, "应该注册自定义装饰器");
    });

    test("disposeDecorationsForText 应该清理指定文本的装饰器", () => {
        const customColor: ColorDefinition = {
            light: { backgroundColor: "rgba(255, 0, 0, 0.5)" },
            dark: { backgroundColor: "rgba(255, 0, 0, 0.3)" }
        };

        decoratorManager.registerCustomDecorationType("test", customColor);

        let customDecorationTypes = decoratorManager["customDecorationTypes"];
        const sizeBefore = customDecorationTypes.size;
        assert.ok(sizeBefore > 0, "应该有自定义装饰器");

        decoratorManager.disposeDecorationsForText("test");

        customDecorationTypes = decoratorManager["customDecorationTypes"];
        assert.strictEqual(customDecorationTypes.size, 0, "装饰器应该被清理");
    });

    test("dispose 应该释放所有资源", () => {
        const customColor: ColorDefinition = {
            light: { backgroundColor: "rgba(255, 0, 0, 0.5)" },
            dark: { backgroundColor: "rgba(255, 0, 0, 0.3)" }
        };

        decoratorManager.registerCustomDecorationType("test1", customColor);
        decoratorManager.registerCustomDecorationType("test2", customColor);

        let customDecorationTypes = decoratorManager["customDecorationTypes"];
        assert.strictEqual(customDecorationTypes.size, 2, "应该有 2 个装饰器");

        decoratorManager.dispose();

        customDecorationTypes = decoratorManager["customDecorationTypes"];
        assert.strictEqual(customDecorationTypes.size, 0, "所有装饰器应该被释放");
    });

    test("categorizeHighlights 应该正确分类内置颜色和自定义颜色", () => {
        const customColor: ColorDefinition = {
            light: { backgroundColor: "rgba(255, 0, 0, 0.5)" },
            dark: { backgroundColor: "rgba(255, 0, 0, 0.3)" }
        };

        const highlights: CachedHighlight[] = [
            {
                text: "test1",
                ranges: [new vscode.Range(0, 0, 0, 5)],
                colorId: 0,
                isCustomColor: false
            },
            {
                text: "test2",
                ranges: [new vscode.Range(1, 0, 1, 5)],
                colorId: 1,
                isCustomColor: true,
                customColor: customColor
            }
        ];

        const result = decoratorManager["categorizeHighlights"](highlights);

        assert.ok(result.colorHighlights instanceof Map, "应该返回颜色映射");
        assert.ok(result.customHighlights instanceof Map, "应该返回自定义颜色映射");
        assert.ok(result.colorHighlights.size > 0, "应该有内置颜色");
        assert.ok(result.customHighlights.size > 0, "应该有自定义颜色");
    });

    test("getCustomColorKey 应该为相同文本和颜色生成相同的键", () => {
        const customColor: ColorDefinition = {
            light: { backgroundColor: "rgba(255, 0, 0, 0.5)" },
            dark: { backgroundColor: "rgba(255, 0, 0, 0.3)" }
        };

        const highlight: CachedHighlight = {
            text: "test",
            ranges: [],
            colorId: 0,
            isCustomColor: true,
            customColor: customColor
        };

        const key1 = decoratorManager["getCustomColorKey"](highlight);
        const key2 = decoratorManager["getCustomColorKey"](highlight);

        assert.strictEqual(key1, key2, "应该生成相同的键");
    });

    test("getCustomColorKey 缺少自定义颜色应该返回 null", () => {
        const highlight: CachedHighlight = {
            text: "test",
            ranges: [],
            colorId: 0,
            isCustomColor: false
        };

        const key = decoratorManager["getCustomColorKey"](highlight);
        assert.strictEqual(key, null, "缺少自定义颜色应该返回 null");
    });
});
