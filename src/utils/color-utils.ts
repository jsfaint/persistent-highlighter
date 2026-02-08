import type { HighlightColor } from "../types";
import { DEFAULT_LIGHT_OPACITY, DEFAULT_DARK_OPACITY } from "../constants";

/**
 * 颜色工具类
 * 提供颜色解析和转换功能
 */
export class ColorUtils {
    /**
     * 解析十六进制颜色为 HighlightColor
     * @param hex 十六进制颜色字符串 (例如: #FF5733)
     * @returns HighlightColor 对象或 null（如果格式无效）
     */
    public static parseHexToColor(hex: string): HighlightColor | null {
        if (!hex.match(/^#[0-9A-Fa-f]{6}$/)) {
            return null;
        }

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return null;
        }

        return {
            light: { backgroundColor: `rgba(${r}, ${g}, ${b}, ${DEFAULT_LIGHT_OPACITY})` },
            dark: { backgroundColor: `rgba(${r}, ${g}, ${b}, ${DEFAULT_DARK_OPACITY})` }
        };
    }

    /**
     * 将 RGBA 颜色转换为 RGB 颜色（移除透明度）
     */
    public static rgbaToRgb(rgba: string): string {
        return rgba.replace('rgba', 'rgb').replace(/[\d.]+\)$/, '1)');
    }
}
