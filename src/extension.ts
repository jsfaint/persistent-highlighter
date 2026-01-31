import * as vscode from "vscode";
import { HighlightsTreeProvider, HighlightItem } from "./highlightsTreeProvider";

// 内置颜色池 - 25种高对比度颜色
const colorPool = [
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

// 为颜色池中的每种颜色创建 DecorationType
const decorationTypes = colorPool.map((color) =>
    vscode.window.createTextEditorDecorationType({
        light: { ...color.light, color: "#000000" },
        dark: { ...color.dark, color: "#FFFFFF" },
        borderRadius: "2px",
        overviewRulerColor: color.light.backgroundColor.replace('rgba', 'rgb').replace(/[\d.]+\)$/, '1)'),
        overviewRulerLane: vscode.OverviewRulerLane.Full
    })
);

// 定义存储在 globalState 中的对象结构
export interface HighlightColor {
    light: { backgroundColor: string };
    dark: { backgroundColor: string };
}

export interface HighlightedTerm {
    text: string;
    colorId: number;
    isCustomColor?: boolean;
    customColor?: HighlightColor;
}

export interface HighlightPosition {
    text: string;
    index: number;
    range: vscode.Range;
}

// 常量定义
const GLOBAL_STATE_KEY = "persistentHighlighterTerms";
const CUSTOM_COLOR_ID_OFFSET = colorPool.length;
const DEFAULT_LIGHT_OPACITY = 0.4;
const DEFAULT_DARK_OPACITY = 0.3;

// 预设调色板 - 18种精选颜色
const presetColorPalette = [
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

// 缓存高亮位置信息
interface CachedHighlight {
    text: string;
    ranges: vscode.Range[];
    colorId: number;
    isCustomColor?: boolean;
    customColor?: HighlightColor;
}

export class HighlightManager {
    private context: vscode.ExtensionContext;
    private treeProvider: HighlightsTreeProvider | undefined;
    private customDecorationTypes: Map<string, vscode.TextEditorDecorationType> | undefined;
    private highlightCache: Map<vscode.TextDocument, CachedHighlight[]>;

    constructor(context: vscode.ExtensionContext, treeProvider?: HighlightsTreeProvider) {
        this.context = context;
        this.treeProvider = treeProvider;
        this.customDecorationTypes = new Map();
        this.highlightCache = new Map();

        // 监听活动编辑器的变化
        vscode.window.onDidChangeActiveTextEditor(
            (editor) => {
                if (editor) {
                    this.updateDecorations(editor);
                }
            },
            null,
            context.subscriptions
        );

        // 监听文档内容的变化
        vscode.workspace.onDidChangeTextDocument(
            (event) => {
                const activeEditor = vscode.window.activeTextEditor;
                if (
                    activeEditor &&
                    event.document === activeEditor.document
                ) {
                    this.updateDecorations(activeEditor);
                }
            },
            null,
            context.subscriptions
        );

        // 初始化时为当前打开的文件更新一次高亮
        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );

        // 监听文档关闭事件，清理缓存
        vscode.workspace.onDidCloseTextDocument(
            (document) => {
                this.highlightCache.delete(document);
            },
            null,
            context.subscriptions
        );
    }

    public addHighlight() {
        const editor = this.validateActiveEditor();
        if (!editor) {
            return;
        }

        const textToHighlight = this.getSelectedText(editor);
        if (!textToHighlight || textToHighlight.trim() === "") {
            vscode.window.showWarningMessage("No text selected or word under cursor.");
            return;
        }

        const terms = this.getTerms();
        const caseSensitive = this.getCaseSensitiveConfig();

        if (terms.some((t) => this.textEquals(t.text, textToHighlight, caseSensitive))) {
            vscode.window.showInformationMessage(`'${textToHighlight}' is already highlighted.`);
            return;
        }

        const colorId = terms.length % colorPool.length;
        terms.push({ text: textToHighlight.trim(), colorId });

        this.updateGlobalState(terms);
    }

    public removeHighlight() {
        const editor = this.validateActiveEditor();
        if (!editor) {
            return;
        }

        const textToRemove = this.getSelectedText(editor);
        if (!textToRemove) {
            vscode.window.showWarningMessage("No text selected or word under cursor to remove.");
            return;
        }

        const terms = this.getTerms();
        const termIndex = this.findTermIndex(terms, textToRemove);

        if (termIndex === -1) {
            vscode.window.showInformationMessage(`'${textToRemove}' is not currently highlighted.`);
            return;
        }

        this.disposeDecorationsForText(textToRemove);
        terms.splice(termIndex, 1);
        this.updateGlobalState(terms);
    }

    public toggleHighlight() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            // 尝试从visibleTextEditors中获取第一个编辑器
            const visibleEditors = vscode.window.visibleTextEditors;
            if (visibleEditors.length > 0) {
                this.toggleHighlightForEditor(visibleEditors[0]);
                return;
            }

            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        this.toggleHighlightForEditor(editor);
    }

    private toggleHighlightForEditor(editor: vscode.TextEditor): void {
        const currentPosition = editor.selection.active;
        const highlightsAtPosition = this.findHighlightsAtPosition(editor, currentPosition);

        if (highlightsAtPosition.length > 0) {
            this.removeHighlightAtPosition(highlightsAtPosition[0]);
            return;
        }

        this.addHighlightAtPosition(editor);
    }

    /**
     * 移除指定位置的高亮
     */
    private removeHighlightAtPosition(text: string): void {
        const terms = this.getTerms();
        const termIndex = this.findTermIndex(terms, text);

        if (termIndex !== -1) {
            this.disposeDecorationsForText(text);
            terms.splice(termIndex, 1);
            this.updateGlobalState(terms);
        }
    }

    /**
     * 在当前位置添加高亮
     */
    private addHighlightAtPosition(editor: vscode.TextEditor): void {
        const textToToggle = this.getSelectedText(editor);
        if (!textToToggle || textToToggle.trim() === "") {
            vscode.window.showWarningMessage("No text selected or word under cursor.");
            return;
        }

        const terms = this.getTerms();
        const trimmedText = textToToggle.trim();
        const termIndex = this.findTermIndex(terms, trimmedText);

        if (termIndex !== -1) {
            terms.splice(termIndex, 1);
        } else {
            const colorId = terms.length % colorPool.length;
            terms.push({ text: trimmedText, colorId });
        }

        this.updateGlobalState(terms);
    }

    /**
     * 查找指定位置的所有高亮
     */
    private findHighlightsAtPosition(editor: vscode.TextEditor, position: vscode.Position): string[] {
        const terms = this.getTerms();
        if (terms.length === 0) {
            return [];
        }

        const document = editor.document;
        const offset = document.offsetAt(position);
        const caseSensitive = this.getCaseSensitiveConfig();
        const highlightedTexts: string[] = [];

        for (const term of terms) {
            const regex = createHighlightRegex(term.text, caseSensitive);
            let match;

            while ((match = regex.exec(document.getText())) !== null) {
                const matchStart = match.index;
                const matchEnd = matchStart + match[0].length;

                // 检查光标位置是否在这个高亮范围内
                if (offset >= matchStart && offset <= matchEnd) {
                    highlightedTexts.push(term.text);
                    break; // 找到一个匹配就够了
                }

                // 防止无限循环
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
        }

        return highlightedTexts;
    }

    public clearAllHighlights() {
        const terms = this.getTerms();
        if (terms.length === 0) {
            vscode.window.showInformationMessage("There are no highlights to clear.");
            return;
        }

        // 清理所有自定义装饰器
        if (this.customDecorationTypes) {
            for (const decorationType of this.customDecorationTypes.values()) {
                decorationType.dispose();
            }
            this.customDecorationTypes.clear();
        }

        this.updateGlobalState([]);
        vscode.window.showInformationMessage("All highlights have been cleared.");
    }

    public refreshHighlights(): void {
        this.refreshAllEditors();
    }

    public async addHighlightWithCustomColor(): Promise<void> {
        const editor = this.validateActiveEditor();
        if (!editor) {
            return;
        }

        const textToHighlight = this.getSelectedText(editor);
        if (!textToHighlight || textToHighlight.trim() === "") {
            vscode.window.showWarningMessage("No text selected or word under cursor.");
            return;
        }

        const customColorHex = await this.showColorPicker();
        if (!customColorHex) {
            return;
        }

        const customColor = this.parseHexToColor(customColorHex);
        if (!customColor) {
            vscode.window.showErrorMessage('Invalid color format. Please use hex format #RRGGBB.');
            return;
        }

        this.addOrUpdateHighlightWithColor(textToHighlight, customColor);
        this.registerCustomDecorationType(textToHighlight, customColor);
        this.refreshAllEditors();
        this.refreshSidebar();

        vscode.window.showInformationMessage(`Highlight added with custom color: ${customColorHex}`);
    }

    /**
     * 解析十六进制颜色为 HighlightColor
     */
    private parseHexToColor(hex: string): HighlightColor | null {
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
     * 添加或更新带自定义颜色的高亮
     */
    private addOrUpdateHighlightWithColor(text: string, color: HighlightColor): void {
        const terms = this.getTerms();
        const termIndex = this.findTermIndex(terms, text);

        const highlightData: HighlightedTerm = {
            text,
            colorId: CUSTOM_COLOR_ID_OFFSET,
            isCustomColor: true,
            customColor: color
        };

        if (termIndex !== -1) {
            terms[termIndex] = highlightData;
        } else {
            terms.push(highlightData);
        }

        this.context.globalState.update(GLOBAL_STATE_KEY, terms);
    }

    /**
     * 注册自定义装饰器类型
     */
    private registerCustomDecorationType(text: string, color: HighlightColor): void {
        if (!this.customDecorationTypes) {
            this.customDecorationTypes = new Map();
        }
        const customDecorationType = this.createCustomDecorationType(color);
        this.customDecorationTypes.set(text, customDecorationType);
    }

    public jumpToHighlight(text: string): void {
        // 验证输入参数
        if (!text || typeof text !== 'string') {
            vscode.window.showErrorMessage('Invalid highlight text provided.');
            return;
        }

        const editor = this.validateActiveEditor();
        if (!editor) {
            return;
        }

        const textContent = editor.document.getText();
        const caseSensitive = this.getCaseSensitiveConfig();

        let index: number;
        try {
            index = findWholeWord(textContent, text, caseSensitive);
        } catch (error) {
            vscode.window.showErrorMessage(`Error searching for text: ${error}`);
            return;
        }

        if (index === -1) {
            vscode.window.showInformationMessage(`"${text}" not found in current file.`);
            return;
        }

        const startPos = editor.document.positionAt(index);
        const endPos = editor.document.positionAt(index + text.length);
        const range = new vscode.Range(startPos, endPos);

        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    public jumpToNextHighlight(): void {
        this.jumpToHighlightByDirection(1);
    }

    public jumpToPrevHighlight(): void {
        this.jumpToHighlightByDirection(-1);
    }

    /**
     * 按方向跳转到高亮（1=下一个，-1=上一个）
     */
    private jumpToHighlightByDirection(direction: 1 | -1): void {
        const editor = this.validateActiveEditor();
        if (!editor) {
            return;
        }

        const allHighlights = this.getAllHighlightsInEditor(editor);
        if (allHighlights.length === 0) {
            vscode.window.showInformationMessage("No highlights found.");
            return;
        }

        const currentOffset = editor.document.offsetAt(editor.selection.active);
        const targetHighlight = this.findHighlightByDirection(allHighlights, currentOffset, direction);

        if (targetHighlight) {
            this.selectAndRevealRange(editor, targetHighlight.range);
        }
    }

    /**
     * 获取编辑器中的所有高亮并排序
     */
    private getAllHighlightsInEditor(editor: vscode.TextEditor): HighlightPosition[] {
        const terms = this.getTerms();
        if (terms.length === 0) {
            return [];
        }

        const allHighlights = this.findAllHighlightsInEditor(editor, terms);
        allHighlights.sort((a: HighlightPosition, b: HighlightPosition) => a.index - b.index);
        return allHighlights;
    }

    /**
     * 根据方向查找目标高亮
     */
    private findHighlightByDirection(
        highlights: HighlightPosition[],
        currentOffset: number,
        direction: 1 | -1
    ): HighlightPosition | null {
        if (direction === 1) {
            // 找下一个
            const nextHighlight = highlights.find((h) => h.index > currentOffset);
            return nextHighlight || highlights[0]; // 循环到第一个
        } else {
            // 找上一个
            for (let i = highlights.length - 1; i >= 0; i--) {
                if (highlights[i].index < currentOffset) {
                    return highlights[i];
                }
            }
            return highlights[highlights.length - 1]; // 循环到最后一个
        }
    }

    /**
     * 选中并滚动到指定范围
     */
    private selectAndRevealRange(editor: vscode.TextEditor, range: vscode.Range): void {
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
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
                if (!customHighlights.has(colorKey)) {
                    customHighlights.set(colorKey, { ranges: [], highlight });
                }
                customHighlights.get(colorKey)!.ranges.push(...highlight.ranges);
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
     * 获取自定义颜色的唯一键
     */
    private getCustomColorKey(highlight: CachedHighlight): string {
        return `${highlight.text}_${highlight.customColor!.light.backgroundColor}`;
    }

    /**
     * 应用内置颜色装饰器
     */
    private applyBuiltInDecorations(editor: vscode.TextEditor, colorHighlights: Map<number, vscode.Range[]>): void {
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
        if (!this.customDecorationTypes) {
            this.customDecorationTypes = new Map();
        }

        const decorationTypes = this.customDecorationTypes;

        customHighlights.forEach(({ ranges, highlight }) => {
            const colorKey = this.getCustomColorKey(highlight);
            if (!decorationTypes.has(colorKey)) {
                const customDecorationType = this.createCustomDecorationType(highlight.customColor!);
                decorationTypes.set(colorKey, customDecorationType);
            }
            const decorationType = decorationTypes.get(colorKey);
            if (decorationType) {
                editor.setDecorations(decorationType, ranges);
            }
        });
    }

    private applyHighlightsToEditor(editor: vscode.TextEditor, highlights: CachedHighlight[]): void {
        this.clearAllEditorDecorations(editor);

        const { colorHighlights, customHighlights } = this.categorizeHighlights(highlights);

        this.applyBuiltInDecorations(editor, colorHighlights);
        this.applyCustomDecorations(editor, customHighlights);
    }

    private async showColorPicker(): Promise<string | undefined> {
        // Provide preset color selection or custom color input
        const colorOptions = [
            ...presetColorPalette.map((color) => ({
                label: `$(symbol-color) ${color.name}`,
                description: color.hex,
                detail: `Select ${color.name} color`,
                value: color.hex
            })),
            {
                label: "$(edit) Custom Color",
                description: "Enter hex color code",
                detail: "e.g., #FF5733",
                value: "custom"
            }
        ];

        const selected = await vscode.window.showQuickPick(colorOptions, {
            placeHolder: "Choose a color",
            title: "Color Picker"
        });

        if (!selected) return undefined; // User cancelled

        if (selected.value === "custom") {
            // Custom color input
            return await vscode.window.showInputBox({
                prompt: "Enter hex color code (e.g., #FF5733)",
                placeHolder: "#FF5733",
                validateInput: (value) => {
                    if (!value) return null;
                    return value.match(/^#[0-9A-Fa-f]{6}$/) ? null : "Please enter a valid hex color code (e.g., #FF5733)";
                }
            });
        }

        return selected.value;
    }

    private getTerms(): HighlightedTerm[] {
        return this.context.globalState.get<HighlightedTerm[]>(
            GLOBAL_STATE_KEY,
            []
        );
    }

    private updateDecorations(editor: vscode.TextEditor) {
        const terms = this.getTerms();
        if (terms.length === 0) {
            this.clearAllEditorDecorations(editor);
            this.highlightCache.delete(editor.document);
            return;
        }

        // 统一使用全量更新
        const highlights: CachedHighlight[] = [];
        const text = editor.document.getText();
        const caseSensitive = this.getCaseSensitiveConfig();

        terms.forEach((term) => {
            const regex = createHighlightRegex(term.text, caseSensitive);
            const ranges: vscode.Range[] = [];
            let match;

            while ((match = regex.exec(text)) !== null) {
                const startPos = editor.document.positionAt(match.index);
                const endPos = editor.document.positionAt(
                    match.index + match[0].length
                );
                ranges.push(new vscode.Range(startPos, endPos));
            }

            if (ranges.length > 0) {
                highlights.push({
                    text: term.text,
                    ranges: ranges,
                    colorId: term.colorId,
                    isCustomColor: term.isCustomColor,
                    customColor: term.customColor
                });
            }
        });

        // 缓存结果
        this.highlightCache.set(editor.document, highlights);

        // 应用高亮到编辑器
        this.applyHighlightsToEditor(editor, highlights);
    }

    /**
     * 获取大小写敏感配置
     */
    private getCaseSensitiveConfig(): boolean {
        return vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);
    }

    /**
     * 验证活动编辑器
     */
    private validateActiveEditor(): vscode.TextEditor | null {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return null;
        }
        return editor;
    }

    /**
     * 获取选中的文本或光标下的单词
     */
    private getSelectedText(editor: vscode.TextEditor): string | undefined {
        const selection = editor.selection;

        if (!selection.isEmpty) {
            return editor.document.getText(selection);
        } else {
            const wordRange = editor.document.getWordRangeAtPosition(selection.active);
            if (wordRange) {
                return editor.document.getText(wordRange);
            }
        }

        return undefined;
    }

    /**
     * 刷新侧边栏
     */
    private refreshSidebar(): void {
        if (this.treeProvider) {
            this.treeProvider.refresh();
        }
    }

    /**
     * 刷新所有编辑器的高亮
     */
    private refreshAllEditors(): void {
        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );
    }

    /**
     * 更新全局状态并刷新界面
     */
    private async updateGlobalState(terms: HighlightedTerm[]): Promise<void> {
        this.context.globalState.update(GLOBAL_STATE_KEY, terms);
        this.refreshAllEditors();
        this.refreshSidebar();
    }

    /**
     * 根据文本查找高亮词索引
     */
    private findTermIndex(terms: HighlightedTerm[], text: string): number {
        const caseSensitive = this.getCaseSensitiveConfig();
        return terms.findIndex((t) => this.textEquals(t.text, text, caseSensitive));
    }

    /**
     * Unicode感知的文本比较
     */
    private textEquals(a: string, b: string, caseSensitive: boolean): boolean {
        if (caseSensitive) {
            return a === b;
        }
        // 使用 localeCompare 进行Unicode感知的大小写不敏感比较
        return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
    }

    /**
     * 查找编辑器中所有的高亮位置
     */
    private findAllHighlightsInEditor(editor: vscode.TextEditor, terms: HighlightedTerm[]): HighlightPosition[] {
        const allHighlights: HighlightPosition[] = [];
        const document = editor.document;
        const textContent = document.getText();
        const caseSensitive = this.getCaseSensitiveConfig();

        for (const term of terms) {
            const regex = createHighlightRegex(term.text, caseSensitive);
            let match;

            while ((match = regex.exec(textContent)) !== null) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);

                allHighlights.push({
                    text: term.text,
                    index: match.index,
                    range: range
                });

                // 防止无限循环
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
        }

        return allHighlights;
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
     * 清理指定文本相关的自定义装饰器
     */
    private disposeDecorationsForText(text: string): void {
        if (!this.customDecorationTypes) {
            return;
        }
        for (const [key, decorationType] of this.customDecorationTypes) {
            if (key.startsWith(text)) {
                decorationType.dispose();
                this.customDecorationTypes.delete(key);
            }
        }
    }

    /**
     * 清空编辑器中的所有装饰器
     */
    private clearAllEditorDecorations(editor: vscode.TextEditor): void {
        decorationTypes.forEach((dt) => editor.setDecorations(dt, []));
        if (this.customDecorationTypes) {
            this.customDecorationTypes.forEach((dt) => editor.setDecorations(dt, []));
        }
    }
}

/**
 * 创建支持中英文的正则表达式
 */
export function createHighlightRegex(searchText: string, caseSensitive: boolean = false): RegExp {
    // 验证输入不为空
    if (!searchText || searchText.length === 0) {
        throw new Error('Search text cannot be empty');
    }

    const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = caseSensitive ? 'g' : 'gi';

    // 检查是否只包含英文单词字符（字母、数字、下划线）
    const isPureWord = /^[a-zA-Z0-9_]+$/.test(searchText);

    if (isPureWord) {
        // 对于纯英文单词，使用标准的 \b 边界（严格全字匹配）
        return new RegExp(String.raw`\b${escapedText}\b`, flags);
    } else {
        // 对于包含特殊字符或非英文字符的文本，直接匹配不使用边界
        // 因为中文等语言没有空格分隔单词的概念
        return new RegExp(escapedText, flags);
    }
}

/**
 * 全字匹配搜索函数 - 支持英文和非英文文本
 */
export function findWholeWord(text: string, searchText: string, caseSensitive: boolean = false): number {
    const regex = createHighlightRegex(searchText, caseSensitive);
    const match = regex.exec(text);
    return match ? match.index : -1;
}

// 激活扩展
export function activate(context: vscode.ExtensionContext) {

    const treeProvider = new HighlightsTreeProvider(context);
    const highlightManager = new HighlightManager(context, treeProvider);

    // 注册侧边栏视图
    vscode.window.registerTreeDataProvider('highlightsView', treeProvider);

    // 创建树视图
    const treeView = vscode.window.createTreeView('highlightsView', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });

    // 注册添加高亮的命令
    const addHighlightCommand = vscode.commands.registerCommand(
        "persistent-highlighter.addHighlight",
        () => {
            highlightManager.addHighlight();
        }
    );

    // 注册移除高亮的命令
    const removeHighlightCommand = vscode.commands.registerCommand(
        "persistent-highlighter.removeHighlight",
        () => {
            highlightManager.removeHighlight();
        }
    );

    context.subscriptions.push(addHighlightCommand);
    context.subscriptions.push(removeHighlightCommand);

    const toggleHighlightCommand = vscode.commands.registerCommand(
        "persistent-highlighter.toggleHighlight",
        () => {
            highlightManager.toggleHighlight();
        }
    );

    context.subscriptions.push(toggleHighlightCommand);

    const clearAllHighlightsCommand = vscode.commands.registerCommand(
        "persistent-highlighter.clearAllHighlights",
        () => {
            highlightManager.clearAllHighlights();
        }
    );

    context.subscriptions.push(clearAllHighlightsCommand);

    // 自定义颜色命令
    const addHighlightWithCustomColorCommand = vscode.commands.registerCommand(
        "persistent-highlighter.addHighlightWithCustomColor",
        () => {
            highlightManager.addHighlightWithCustomColor();
        }
    );

    context.subscriptions.push(addHighlightWithCustomColorCommand);

    // 侧边栏相关命令
    const jumpToHighlightCommand = vscode.commands.registerCommand(
        'persistent-highlighter.jumpToHighlight',
        (text: string) => {
            highlightManager.jumpToHighlight(text);
        }
    );

    const removeHighlightFromTreeCommand = vscode.commands.registerCommand(
        'persistent-highlighter.removeHighlightFromTree',
        (item: HighlightItem) => {
            treeProvider.removeHighlight(item.text);
            highlightManager.refreshHighlights();
            // 侧边栏的删除操作已经内置了refresh，这里不需要额外刷新
        }
    );

    const editHighlightCommand = vscode.commands.registerCommand(
        'persistent-highlighter.editHighlight',
        async (item: HighlightItem) => {
            const newText = await vscode.window.showInputBox({
                prompt: 'Edit highlight text',
                value: item.text
            });
            if (newText && newText !== item.text) {
                treeProvider.editHighlight(item.text, newText);
                highlightManager.refreshHighlights();
                // 侧边栏的编辑操作已经内置了refresh，这里不需要额外刷新
            }
        }
    );

    const refreshTreeCommand = vscode.commands.registerCommand(
        'persistent-highlighter.refreshTree',
        () => {
            treeProvider.refresh();
        }
    );


    // 新增跳转到下一个/上一个高亮的命令
    const jumpToNextHighlightCommand = vscode.commands.registerCommand(
        'persistent-highlighter.jumpToNextHighlight',
        () => {
            highlightManager.jumpToNextHighlight();
        }
    );

    const jumpToPrevHighlightCommand = vscode.commands.registerCommand(
        'persistent-highlighter.jumpToPrevHighlight',
        () => {
            highlightManager.jumpToPrevHighlight();
        }
    );

    // 右键菜单命令
    const contextMenuAddHighlightCommand = vscode.commands.registerCommand(
        'persistent-highlighter.contextMenuAddHighlight',
        () => {
            highlightManager.addHighlight();
        }
    );

    const contextMenuRemoveHighlightCommand = vscode.commands.registerCommand(
        'persistent-highlighter.contextMenuRemoveHighlight',
        () => {
            highlightManager.removeHighlight();
        }
    );

    const contextMenuToggleHighlightCommand = vscode.commands.registerCommand(
        'persistent-highlighter.contextMenuToggleHighlight',
        () => {
            highlightManager.toggleHighlight();
        }
    );

    const contextMenuCustomColorCommand = vscode.commands.registerCommand(
        'persistent-highlighter.contextMenuCustomColor',
        () => {
            highlightManager.addHighlightWithCustomColor();
        }
    );

    context.subscriptions.push(
        jumpToHighlightCommand,
        removeHighlightFromTreeCommand,
        editHighlightCommand,
        refreshTreeCommand,
        jumpToNextHighlightCommand,
        jumpToPrevHighlightCommand,
        contextMenuAddHighlightCommand,
        contextMenuRemoveHighlightCommand,
        contextMenuToggleHighlightCommand,
        contextMenuCustomColorCommand,
        treeView
    );
}

export function deactivate() { }