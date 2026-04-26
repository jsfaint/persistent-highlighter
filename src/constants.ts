import * as vscode from "vscode";
import type { AnnotationTagColorDefinition, ColorPoolEntry, PresetColor } from "./types";

/**
 * Global State 存储键名
 */
export const GLOBAL_STATE_KEY = "persistentHighlighterTerms";

export const DEFAULT_ANNOTATION_TAGS = [
    "TODO:",
    "FIXME:",
    "NOTE:",
    "BUG:",
    "HACK:",
    "WARN:",
    "WARNING:",
    "REVIEW:",
    "OPTIMIZE:",
    "XXX:",
    "DEPRECATED:"
];

export const ANNOTATION_TAG_COLOR_ID = 0;

export const annotationTagColorPalette: AnnotationTagColorDefinition[] = [
    {
        light: { backgroundColor: "rgba(255, 214, 10, 0.78)", color: "#111111" },
        dark: { backgroundColor: "rgba(255, 176, 0, 0.74)", color: "#000000" },
        borderColor: "rgba(255, 140, 0, 0.9)",
        overviewRulerColor: "rgba(255, 176, 0, 1)"
    },
    {
        light: { backgroundColor: "rgba(255, 92, 92, 0.78)", color: "#111111" },
        dark: { backgroundColor: "rgba(255, 82, 82, 0.76)", color: "#000000" },
        borderColor: "rgba(210, 35, 35, 0.9)",
        overviewRulerColor: "rgba(255, 82, 82, 1)"
    },
    {
        light: { backgroundColor: "rgba(64, 196, 255, 0.78)", color: "#07121f" },
        dark: { backgroundColor: "rgba(64, 196, 255, 0.72)", color: "#000000" },
        borderColor: "rgba(0, 126, 190, 0.9)",
        overviewRulerColor: "rgba(64, 196, 255, 1)"
    },
    {
        light: { backgroundColor: "rgba(255, 112, 67, 0.78)", color: "#111111" },
        dark: { backgroundColor: "rgba(255, 112, 67, 0.74)", color: "#000000" },
        borderColor: "rgba(210, 65, 20, 0.9)",
        overviewRulerColor: "rgba(255, 112, 67, 1)"
    },
    {
        light: { backgroundColor: "rgba(186, 104, 200, 0.78)", color: "#111111" },
        dark: { backgroundColor: "rgba(206, 147, 216, 0.74)", color: "#000000" },
        borderColor: "rgba(130, 60, 150, 0.9)",
        overviewRulerColor: "rgba(206, 147, 216, 1)"
    },
    {
        light: { backgroundColor: "rgba(255, 202, 40, 0.78)", color: "#111111" },
        dark: { backgroundColor: "rgba(255, 202, 40, 0.74)", color: "#000000" },
        borderColor: "rgba(205, 145, 0, 0.9)",
        overviewRulerColor: "rgba(255, 202, 40, 1)"
    },
    {
        light: { backgroundColor: "rgba(255, 183, 77, 0.78)", color: "#111111" },
        dark: { backgroundColor: "rgba(255, 183, 77, 0.74)", color: "#000000" },
        borderColor: "rgba(205, 120, 20, 0.9)",
        overviewRulerColor: "rgba(255, 183, 77, 1)"
    },
    {
        light: { backgroundColor: "rgba(77, 208, 225, 0.78)", color: "#07121f" },
        dark: { backgroundColor: "rgba(77, 208, 225, 0.72)", color: "#000000" },
        borderColor: "rgba(0, 130, 150, 0.9)",
        overviewRulerColor: "rgba(77, 208, 225, 1)"
    },
    {
        light: { backgroundColor: "rgba(102, 187, 106, 0.78)", color: "#07121f" },
        dark: { backgroundColor: "rgba(129, 199, 132, 0.72)", color: "#000000" },
        borderColor: "rgba(40, 135, 45, 0.9)",
        overviewRulerColor: "rgba(129, 199, 132, 1)"
    },
    {
        light: { backgroundColor: "rgba(224, 64, 251, 0.78)", color: "#111111" },
        dark: { backgroundColor: "rgba(234, 128, 252, 0.74)", color: "#000000" },
        borderColor: "rgba(170, 35, 195, 0.9)",
        overviewRulerColor: "rgba(234, 128, 252, 1)"
    },
    {
        light: { backgroundColor: "rgba(158, 158, 158, 0.82)", color: "#111111" },
        dark: { backgroundColor: "rgba(189, 189, 189, 0.76)", color: "#000000" },
        borderColor: "rgba(100, 100, 100, 0.9)",
        overviewRulerColor: "rgba(189, 189, 189, 1)"
    }
];

export const builtInAnnotationTagColorIds: Record<string, number> = {
    TODO: 0,
    FIXME: 1,
    NOTE: 2,
    BUG: 3,
    HACK: 4,
    WARN: 5,
    WARNING: 6,
    REVIEW: 7,
    OPTIMIZE: 8,
    XXX: 9,
    DEPRECATED: 10
};

export const WORKSPACE_MATCH_FILE_LIMIT = 200;
export const WORKSPACE_MATCH_RESULT_LIMIT = 1000;
export const WORKSPACE_MATCH_EXCLUDE = "{**/node_modules/**,**/.git/**,**/out/**,**/dist/**,**/build/**}";

/**
 * 默认透明度设置
 */
export const DEFAULT_LIGHT_OPACITY = 0.4;
export const DEFAULT_DARK_OPACITY = 0.3;

/**
 * 内置颜色池 - 25种高对比度颜色
 */
export const colorPool: ColorPoolEntry[] = [
    { light: { backgroundColor: "rgba(255, 255, 0, 0.4)" }, dark: { backgroundColor: "rgba(255, 255, 0, 0.3)" } }, // Yellow
    { light: { backgroundColor: "rgba(173, 216, 230, 0.5)" }, dark: { backgroundColor: "rgba(173, 216, 230, 0.4)" } }, // Light Blue
    { light: { backgroundColor: "rgba(144, 238, 144, 0.5)" }, dark: { backgroundColor: "rgba(144, 238, 144, 0.4)" } }, // Light Green
    { light: { backgroundColor: "rgba(255, 182, 193, 0.5)" }, dark: { backgroundColor: "rgba(255, 182, 193, 0.4)" } }, // Light Pink
    { light: { backgroundColor: "rgba(218, 112, 214, 0.5)" }, dark: { backgroundColor: "rgba(218, 112, 214, 0.4)" } }, // Orchid
    { light: { backgroundColor: "rgba(255, 160, 122, 0.5)" }, dark: { backgroundColor: "rgba(255, 160, 122, 0.4)" } }, // Light Salmon
    { light: { backgroundColor: "rgba(240, 230, 140, 0.5)" }, dark: { backgroundColor: "rgba(240, 230, 140, 0.4)" } }, // Khaki
    { light: { backgroundColor: "rgba(152, 251, 152, 0.5)" }, dark: { backgroundColor: "rgba(152, 251, 152, 0.4)" } }, // Pale Green
    { light: { backgroundColor: "rgba(255, 218, 185, 0.5)" }, dark: { backgroundColor: "rgba(255, 218, 185, 0.4)" } }, // Peach Puff
    { light: { backgroundColor: "rgba(221, 160, 221, 0.5)" }, dark: { backgroundColor: "rgba(221, 160, 221, 0.4)" } }, // Plum
    { light: { backgroundColor: "rgba(255, 99, 71, 0.4)" }, dark: { backgroundColor: "rgba(255, 99, 71, 0.3)" } }, // Tomato
    { light: { backgroundColor: "rgba(255, 165, 0, 0.4)" }, dark: { backgroundColor: "rgba(255, 165, 0, 0.3)" } }, // Orange
    { light: { backgroundColor: "rgba(255, 215, 0, 0.4)" }, dark: { backgroundColor: "rgba(255, 215, 0, 0.3)" } }, // Gold
    { light: { backgroundColor: "rgba(154, 205, 50, 0.4)" }, dark: { backgroundColor: "rgba(154, 205, 50, 0.3)" } }, // Yellow Green
    { light: { backgroundColor: "rgba(0, 255, 127, 0.4)" }, dark: { backgroundColor: "rgba(0, 255, 127, 0.3)" } }, // Spring Green
    { light: { backgroundColor: "rgba(64, 224, 208, 0.4)" }, dark: { backgroundColor: "rgba(64, 224, 208, 0.3)" } }, // Turquoise
    { light: { backgroundColor: "rgba(0, 191, 255, 0.4)" }, dark: { backgroundColor: "rgba(0, 191, 255, 0.3)" } }, // Deep Sky Blue
    { light: { backgroundColor: "rgba(138, 43, 226, 0.4)" }, dark: { backgroundColor: "rgba(138, 43, 226, 0.3)" } }, // Blue Violet
    { light: { backgroundColor: "rgba(255, 20, 147, 0.4)" }, dark: { backgroundColor: "rgba(255, 20, 147, 0.3)" } }, // Deep Pink
    { light: { backgroundColor: "rgba(255, 105, 180, 0.4)" }, dark: { backgroundColor: "rgba(255, 105, 180, 0.3)" } }, // Hot Pink
    { light: { backgroundColor: "rgba(199, 21, 133, 0.4)" }, dark: { backgroundColor: "rgba(199, 21, 133, 0.3)" } }, // Medium Violet Red
    { light: { backgroundColor: "rgba(255, 127, 80, 0.4)" }, dark: { backgroundColor: "rgba(255, 127, 80, 0.3)" } }, // Coral
    { light: { backgroundColor: "rgba(255, 69, 0, 0.4)" }, dark: { backgroundColor: "rgba(255, 69, 0, 0.3)" } }, // Red Orange
    { light: { backgroundColor: "rgba(218, 165, 32, 0.4)" }, dark: { backgroundColor: "rgba(218, 165, 32, 0.3)" } }, // Goldenrod
    { light: { backgroundColor: "rgba(107, 142, 35, 0.4)" }, dark: { backgroundColor: "rgba(107, 142, 35, 0.3)" } }, // Olive Drab
    { light: { backgroundColor: "rgba(70, 130, 180, 0.4)" }, dark: { backgroundColor: "rgba(70, 130, 180, 0.3)" } }, // Steel Blue
    { light: { backgroundColor: "rgba(123, 104, 238, 0.4)" }, dark: { backgroundColor: "rgba(123, 104, 238, 0.3)" } }, // Medium Slate Blue
];

/**
 * 自定义颜色 ID 偏移量
 */
export const CUSTOM_COLOR_ID_OFFSET = colorPool.length;

/**
 * 预设调色板 - 18种精选颜色
 */
export const presetColorPalette: PresetColor[] = [
    { hex: "#FF6B6B", name: "Coral" },
    { hex: "#4ECDC4", name: "Turquoise" },
    { hex: "#45B7D1", name: "Sky Blue" },
    { hex: "#96CEB4", name: "Mint" },
    { hex: "#FFEAA7", name: "Light Yellow" },
    { hex: "#DDA0DD", name: "Plum" },
    { hex: "#98D8C8", name: "Seafoam" },
    { hex: "#F7DC6F", name: "Golden" },
    { hex: "#BB8FCE", name: "Lavender" },
    { hex: "#85C1E9", name: "Light Blue" },
    { hex: "#F8C471", name: "Apricot" },
    { hex: "#82E0AA", name: "Light Green" },
    { hex: "#F1948A", name: "Salmon" },
    { hex: "#D7BDE2", name: "Light Purple" },
    { hex: "#A9DFBF", name: "Pale Green" },
    { hex: "#FAD7A0", name: "Peach" },
    { hex: "#AED6F1", name: "Pale Blue" },
    { hex: "#F5B7B1", name: "Rose" }
];

/**
 * 为颜色池中的每种颜色创建 DecorationType
 */
export const decorationTypes = colorPool.map((color) =>
    vscode.window.createTextEditorDecorationType({
        light: { ...color.light, color: "#000000" },
        dark: { ...color.dark, color: "#FFFFFF" },
        borderRadius: "2px",
        overviewRulerColor: color.light.backgroundColor.replace('rgba', 'rgb').replace(/[\d.]+\)$/, '1)'),
        overviewRulerLane: vscode.OverviewRulerLane.Full
    })
);
