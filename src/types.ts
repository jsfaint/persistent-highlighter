import * as vscode from "vscode";

/**
 * 颜色定义接口 - 统一的颜色定义类型
 * 用于高亮颜色、颜色池条目和自定义颜色
 */
export interface ColorDefinition {
    light: { backgroundColor: string };
    dark: { backgroundColor: string };
}

export interface AnnotationTagColorDefinition {
    light: { backgroundColor: string; color: string };
    dark: { backgroundColor: string; color: string };
    borderColor: string;
    overviewRulerColor: string;
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
 * 高亮匹配模式
 */
export type HighlightMatchMode = "wholeWord" | "substring" | "regex";

/**
 * 高亮作用域类型
 */
export type HighlightScopeType = "global" | "workspace" | "file" | "language";

/**
 * 高亮词项接口 - 存储在 globalState 中的数据结构
 */
export interface HighlightedTerm {
    id?: string;
    text: string;
    colorId: number;
    enabled?: boolean;
    caseSensitive?: boolean;
    matchMode?: HighlightMatchMode;
    scopeType?: HighlightScopeType;
    scopeValue?: string;
    isCustomColor?: boolean;
    customColor?: HighlightColor;
    isAnnotationTag?: boolean;
    annotationColorId?: number;
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
    isAnnotationTag?: boolean;
    annotationColorId?: number;
}

export interface SerializedRange {
    startLine: number;
    startCharacter: number;
    endLine: number;
    endCharacter: number;
}

export interface HighlightMatchLocation {
    ruleId: string;
    text: string;
    uri: string;
    fileName: string;
    line: number;
    character: number;
    preview: string;
    range: SerializedRange;
}

/**
 * 预设颜色定义
 */
export interface PresetColor {
    hex: string;
    name: string;
}
