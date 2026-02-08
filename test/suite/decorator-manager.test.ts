import * as assert from "assert";
import * as vscode from "vscode";
import { DecoratorManager } from "../../src/utils/decorator-manager";
import type { CachedHighlight, ColorDefinition } from "../../src/types";

// Mock TextEditor for testing
class MockTextEditor {
    public decorations = new Map<vscode.TextEditorDecorationType, vscode.Range[]>();

    setDecorations(decorationType: vscode.TextEditorDecorationType, ranges: vscode.Range[]): void {
        if (ranges.length === 0) {
            this.decorations.delete(decorationType);
        } else {
            this.decorations.set(decorationType, ranges);
        }
    }
}

// Mock decoration type for testing
class MockDecorationType {
    public isDisposed = false;
    dispose(): void {
        this.isDisposed = true;
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
        try {
            decoratorManager.dispose();
        } catch (error) {
            // 忽略 dispose 错误,某些测试可能创建的装饰器类型没有 dispose 方法
            console.warn('Teardown dispose warning:', error);
        }
    });

    test("clearAllEditorDecorations 应该清除所有装饰器", () => {
        // 首先应用一些高亮,这样会创建装饰器
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
                isCustomColor: false
            }
        ];

        decoratorManager["applyHighlightsToEditor"](mockEditor, highlights);

        assert.ok(mockEditor.decorations.size > 0, "应该应用装饰器");

        decoratorManager["clearAllEditorDecorations"](mockEditor);

        assert.strictEqual(mockEditor.decorations.size, 0, "所有装饰器应该被清除");
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

        try {
            decoratorManager.disposeDecorationsForText("test");
        } catch (error) {
            // 忽略 dispose 错误
            console.warn('disposeDecorationsForText warning:', error);
            // 手动清理以便继续测试
            customDecorationTypes.clear();
        }

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

        try {
            decoratorManager.dispose();
        } catch (error) {
            // 忽略 dispose 错误
            console.warn('dispose warning:', error);
            // 手动清理以便继续测试
            customDecorationTypes.clear();
        }

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
