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
     * @param editor 目标文本编辑器
     * @remarks
     * 此方法会清除所有已应用的装饰器,包括:
     * - 内置颜色池的装饰器
     * - 自定义颜色的装饰器
     */
    public clearAllEditorDecorations(editor: vscode.TextEditor): void {
        // 清除内置颜色装饰器
        decorationTypes.forEach((dt) => editor.setDecorations(dt, []));

        // 清除自定义颜色装饰器
        this.customDecorationTypes.forEach((dt) => editor.setDecorations(dt, []));
    }

    /**
     * 应用高亮到编辑器
     * @param editor 目标文本编辑器
     * @param highlights 要应用的高亮信息数组
     * @remarks
     * 此方法会:
     * 1. 清除编辑器上的所有现有装饰器
     * 2. 将高亮按颜色分类(内置颜色 vs 自定义颜色)
     * 3. 批量应用装饰器以提高性能
     */
    public applyHighlightsToEditor(editor: vscode.TextEditor, highlights: CachedHighlight[]): void {
        this.clearAllEditorDecorations(editor);

        const { colorHighlights, customHighlights } = this.categorizeHighlights(highlights);

        this.applyBuiltInDecorations(editor, colorHighlights);
        this.applyCustomDecorations(editor, customHighlights);
    }

    /**
     * 将高亮按颜色分类
     * @param highlights 高亮信息数组
     * @returns 包含两种映射的对象:
     * - colorHighlights: 按内置 colorId 索引的范围数组
     * - customHighlights: 按自定义颜色键索引的范围和原始高亮对象
     * @private
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
     * @returns 为颜色池中的每种颜色创建空数组的映射
     * @private
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
     * @param highlight 高亮信息对象
     * @returns 由文本和浅色背景色组成的唯一键,如果缺少自定义颜色则返回 null
     * @private
     */
    private getCustomColorKey(highlight: CachedHighlight): string | null {
        if (!highlight.customColor?.light) {
            return null;
        }
        return `${highlight.text}_${highlight.customColor.light.backgroundColor}`;
    }

    /**
     * 应用内置颜色装饰器
     * @param editor 目标文本编辑器
     * @param colorHighlights 按 colorId 索引的范围映射
     * @private
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
     * @param editor 目标文本编辑器
     * @param customHighlights 按颜色键索引的范围和高亮映射
     * @remarks
     * 如果装饰器类型不存在,会先创建并缓存
     * @private
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
     * @param customColor 自定义颜色定义
     * @returns VS Code TextEditorDecorationType 对象
     * @remarks
     * 装饰器配置包括:
     * - 浅色/深色主题的背景色和文本色
     * - 2px 圆角边框
     * - 概览标尺颜色指示器
     * @private
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
     * 注册自定义装饰器类型(用于外部添加)
     * @param text 高亮文本
     * @param color 自定义颜色定义
     * @remarks
     * 此方法允许外部预先创建装饰器类型,避免在应用时的重复创建
     */
    public registerCustomDecorationType(text: string, color: HighlightColor): void {
        const customDecorationType = this.createCustomDecorationType(color);
        const colorKey = this.getCustomColorKey({ text, customColor: color } as CachedHighlight);
        if (colorKey) {
            this.customDecorationTypes.set(colorKey, customDecorationType);
        }
    }

    /**
     * 清理指定文本相关的自定义装饰器
     * @param text 要清理的高亮文本
     * @remarks
     * 会释放所有以该文本开头的装饰器类型的资源
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
     * 释放所有资源
     * @remarks
     * 必须在不再需要此管理器时调用,以释放 VS Code 装饰器资源
     * 实现了 vscode.Disposable 接口的约定
     */
    public dispose(): void {
        for (const decorationType of this.customDecorationTypes.values()) {
            decorationType.dispose();
        }
        this.customDecorationTypes.clear();
    }
}
