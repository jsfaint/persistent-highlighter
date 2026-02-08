import * as vscode from "vscode";

/**
 * 颜色定义接口 - 统一的颜色定义类型
 * 用于高亮颜色、颜色池条目和自定义颜色
 */
export interface ColorDefinition {
    light: { backgroundColor: string };
    dark: { backgroundColor: string };
}

/**
 * 高亮颜色类型别名 - 向后兼容
 */
export type HighlightColor = ColorDefinition;

/**
 * 颜色池条目类型别名 - 向后兼容
 */
export type ColorPoolEntry = ColorDefinition;

/**
 * 高亮词项接口 - 存储在 globalState 中的数据结构
 */
export interface HighlightedTerm {
    text: string;
    colorId: number;
    isCustomColor?: boolean;
    customColor?: HighlightColor;
}

/**
 * 高亮位置信息接口
 */
export interface HighlightPosition {
    text: string;
    index: number;
    range: vscode.Range;
}

/**
 * 缓存的高亮信息
 */
export interface CachedHighlight {
    text: string;
    ranges: vscode.Range[];
    colorId: number;
    isCustomColor?: boolean;
    customColor?: HighlightColor;
}

/**
 * 预设颜色定义
 */
export interface PresetColor {
    hex: string;
    name: string;
}
