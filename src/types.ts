import * as vscode from "vscode";

/**
 * 颜色定义接口
 */
export interface HighlightColor {
    light: { backgroundColor: string };
    dark: { backgroundColor: string };
}

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

/**
 * 颜色池条目
 */
export interface ColorPoolEntry {
    light: { backgroundColor: string };
    dark: { backgroundColor: string };
}
