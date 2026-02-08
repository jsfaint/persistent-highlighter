import * as vscode from "vscode";
import type { HighlightColor, CachedHighlight } from "../types";
import { decorationTypes, colorPool } from "../constants";

/**
 * 装饰器管理器
 * 负责管理所有文本装饰器的创建、应用和清理
 */
export class DecoratorManager {
    private customDecorationTypes = new Map<string, vscode.TextEditorDecorationType>();

    /**
     * 清空编辑器中的所有装饰器
     */
    public clearAllEditorDecorations(editor: vscode.TextEditor): void {
        // 清除内置颜色装饰器
        decorationTypes.forEach((dt) => editor.setDecorations(dt, []));

        // 清除自定义颜色装饰器
        this.customDecorationTypes.forEach((dt) => editor.setDecorations(dt, []));
    }

    /**
     * 应用高亮到编辑器
     */
    public applyHighlightsToEditor(editor: vscode.TextEditor, highlights: CachedHighlight[]): void {
        this.clearAllEditorDecorations(editor);

        const { colorHighlights, customHighlights } = this.categorizeHighlights(highlights);

        this.applyBuiltInDecorations(editor, colorHighlights);
        this.applyCustomDecorations(editor, customHighlights);
    }

    /**
     * 将高亮按颜色分类
     */
    private categorizeHighlights(highlights: CachedHighlight[]): {
        colorHighlights: Map<number, vscode.Range[]>;
        customHighlights: Map<string, { ranges: vscode.Range[]; highlight: CachedHighlight }>;
    } {
        const colorHighlights = this.initializeColorHighlightsMap();
        const customHighlights = new Map<string, { ranges: vscode.Range[]; highlight: CachedHighlight }>();

        for (const highlight of highlights) {
            if (highlight.isCustomColor && highlight.customColor) {
                const colorKey = this.getCustomColorKey(highlight);
                if (colorKey) {
                    if (!customHighlights.has(colorKey)) {
                        customHighlights.set(colorKey, { ranges: [], highlight });
                    }
                    customHighlights.get(colorKey)!.ranges.push(...highlight.ranges);
                }
            } else {
                const colorDecorations = colorHighlights.get(highlight.colorId);
                if (colorDecorations) {
                    colorDecorations.push(...highlight.ranges);
                }
            }
        }

        return { colorHighlights, customHighlights };
    }

    /**
     * 初始化颜色高亮映射表
     */
    private initializeColorHighlightsMap(): Map<number, vscode.Range[]> {
        const map = new Map<number, vscode.Range[]>();
        for (let i = 0; i < colorPool.length; i++) {
            map.set(i, []);
        }
        return map;
    }

    /**
     * 获取自定义颜色的唯一键
     */
    private getCustomColorKey(highlight: CachedHighlight): string | null {
        if (!highlight.customColor?.light) {
            return null;
        }
        return `${highlight.text}_${highlight.customColor.light.backgroundColor}`;
    }

    /**
     * 应用内置颜色装饰器
     */
    private applyBuiltInDecorations(
        editor: vscode.TextEditor,
        colorHighlights: Map<number, vscode.Range[]>
    ): void {
        colorHighlights.forEach((ranges, colorId) => {
            if (colorId < decorationTypes.length) {
                editor.setDecorations(decorationTypes[colorId], ranges);
            }
        });
    }

    /**
     * 应用自定义颜色装饰器
     */
    private applyCustomDecorations(
        editor: vscode.TextEditor,
        customHighlights: Map<string, { ranges: vscode.Range[]; highlight: CachedHighlight }>
    ): void {
        customHighlights.forEach(({ ranges, highlight }) => {
            const colorKey = this.getCustomColorKey(highlight);

            if (!colorKey || !highlight.customColor) {
                return;
            }

            if (!this.customDecorationTypes.has(colorKey)) {
                const customDecorationType = this.createCustomDecorationType(highlight.customColor);
                this.customDecorationTypes.set(colorKey, customDecorationType);
            }

            const decorationType = this.customDecorationTypes.get(colorKey);
            if (decorationType) {
                editor.setDecorations(decorationType, ranges);
            }
        });
    }

    /**
     * 创建自定义装饰器类型
     */
    private createCustomDecorationType(customColor: HighlightColor): vscode.TextEditorDecorationType {
        return vscode.window.createTextEditorDecorationType({
            light: { ...customColor.light, color: "#000000" },
            dark: { ...customColor.dark, color: "#FFFFFF" },
            borderRadius: "2px",
            overviewRulerColor: customColor.light.backgroundColor.replace('rgba', 'rgb').replace(/[\d.]+\)$/, '1)'),
            overviewRulerLane: vscode.OverviewRulerLane.Full
        });
    }

    /**
     * 注册自定义装饰器类型（用于外部添加）
     */
    public registerCustomDecorationType(text: string, color: HighlightColor): void {
        const customDecorationType = this.createCustomDecorationType(color);
        const colorKey = this.createColorKey(text, color);
        this.customDecorationTypes.set(colorKey, customDecorationType);
    }

    /**
     * 清理指定文本相关的自定义装饰器
     */
    public disposeDecorationsForText(text: string): void {
        for (const [key, decorationType] of this.customDecorationTypes) {
            if (key.startsWith(text)) {
                decorationType.dispose();
                this.customDecorationTypes.delete(key);
            }
        }
    }

    /**
     * 创建颜色键
     */
    private createColorKey(text: string, color: HighlightColor): string {
        return `${text}_${color.light.backgroundColor}`;
    }

    /**
     * 释放所有资源
     */
    public dispose(): void {
        for (const decorationType of this.customDecorationTypes.values()) {
            decorationType.dispose();
        }
        this.customDecorationTypes.clear();
    }
}
