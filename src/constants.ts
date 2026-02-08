import * as vscode from "vscode";
import type { ColorPoolEntry, PresetColor } from "./types";

/**
 * Global State 存储键名
 */
export const GLOBAL_STATE_KEY = "persistentHighlighterTerms";

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
