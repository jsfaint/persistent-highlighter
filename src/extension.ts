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
type HighlightedTerm = {
    text: string;
    colorId: number;
    isCustomColor?: boolean;
    customColor?: {
        light: { backgroundColor: string };
        dark: { backgroundColor: string };
    };
};

const GLOBAL_STATE_KEY = "persistentHighlighterTerms";

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
    customColor?: {
        light: { backgroundColor: string };
        dark: { backgroundColor: string };
    };
}

class HighlightManager {
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
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        let textToHighlight: string | undefined;
        const selection = editor.selection;

        if (!selection.isEmpty) {
            textToHighlight = editor.document.getText(selection);
        } else {
            const wordRange = editor.document.getWordRangeAtPosition(
                selection.active
            );
            if (wordRange) {
                textToHighlight = editor.document.getText(wordRange);
            }
        }

        if (!textToHighlight || textToHighlight.trim() === "") {
            vscode.window.showWarningMessage(
                "No text selected or word under cursor."
            );
            return;
        }

        const terms = this.getTerms();
        if (terms.some((t) => t.text === textToHighlight)) {
            vscode.window.showInformationMessage(
                `'${textToHighlight}' is already highlighted.`
            );
            return;
        }

        const colorId = terms.length % colorPool.length;
        terms.push({ text: textToHighlight, colorId });

        this.context.globalState.update(GLOBAL_STATE_KEY, terms);
        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );

        // 刷新侧边栏
        if (this.treeProvider) {
            this.treeProvider.refresh();
        }
    }

    public removeHighlight() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        let textToRemove: string | undefined;
        const selection = editor.selection;

        if (!selection.isEmpty) {
            textToRemove = editor.document.getText(selection);
        } else {
            const wordRange = editor.document.getWordRangeAtPosition(
                selection.active
            );
            if (wordRange) {
                textToRemove = editor.document.getText(wordRange);
            }
        }

        if (!textToRemove) {
            vscode.window.showWarningMessage(
                "No text selected or word under cursor to remove."
            );
            return;
        }

        const terms = this.getTerms();
        const caseSensitive = vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);
        const termIndex = terms.findIndex(
            (t) => caseSensitive ? t.text === textToRemove : t.text.toLowerCase() === textToRemove.toLowerCase()
        );

        if (termIndex === -1) {
            vscode.window.showInformationMessage(
                `'${textToRemove}' is not currently highlighted.`
            );
            return;
        }

        terms.splice(termIndex, 1);
        this.context.globalState.update(GLOBAL_STATE_KEY, terms);
        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );

        // 刷新侧边栏
        if (this.treeProvider) {
            this.treeProvider.refresh();
        }
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

    private toggleHighlightForEditor(editor: vscode.TextEditor) {

        let textToToggle: string | undefined;
        const selection = editor.selection;

        if (!selection.isEmpty) {
            textToToggle = editor.document.getText(selection);
        } else {
            const wordRange = editor.document.getWordRangeAtPosition(
                selection.active
            );
            if (wordRange) {
                textToToggle = editor.document.getText(wordRange);
            }
        }

        if (!textToToggle || textToToggle.trim() === "") {
            vscode.window.showWarningMessage(
                "No text selected or word under cursor."
            );
            return;
        }

        // 清理选中的文本，移除首尾空白字符
        textToToggle = textToToggle.trim();

        const terms = this.getTerms();
        const caseSensitive = vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);

        // 统一的大小写敏感比较逻辑
        const termIndex = terms.findIndex(
            (t) => caseSensitive ? t.text === textToToggle : t.text.toLowerCase() === textToToggle.toLowerCase()
        );

        if (termIndex !== -1) {
            // Term exists, so remove it
            terms.splice(termIndex, 1);
            this.context.globalState.update(GLOBAL_STATE_KEY, terms);
            vscode.window.visibleTextEditors.forEach((editor) =>
                this.updateDecorations(editor)
            );

            // 刷新侧边栏
            if (this.treeProvider) {
                this.treeProvider.refresh();
            }
        } else {
            // Term does not exist, so add it
            const colorId = terms.length % colorPool.length;
            terms.push({ text: textToToggle, colorId });
            this.context.globalState.update(GLOBAL_STATE_KEY, terms);
            vscode.window.visibleTextEditors.forEach((editor) =>
                this.updateDecorations(editor)
            );

            // 刷新侧边栏
            if (this.treeProvider) {
                this.treeProvider.refresh();
            }
        }
    }

    public clearAllHighlights() {
        const terms = this.getTerms();
        if (terms.length === 0) {
            vscode.window.showInformationMessage("There are no highlights to clear.");
            return;
        }

        this.context.globalState.update(GLOBAL_STATE_KEY, []);
        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );

        // 刷新侧边栏
        if (this.treeProvider) {
            this.treeProvider.refresh();
        }

        vscode.window.showInformationMessage("All highlights have been cleared.");
    }

    public refreshHighlights(): void {
        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );
    }

    public async addHighlightWithCustomColor() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        let textToHighlight: string | undefined;
        const selection = editor.selection;

        if (!selection.isEmpty) {
            textToHighlight = editor.document.getText(selection);
        } else {
            const wordRange = editor.document.getWordRangeAtPosition(selection.active);
            if (wordRange) {
                textToHighlight = editor.document.getText(wordRange);
            }
        }

        if (!textToHighlight || textToHighlight.trim() === "") {
            vscode.window.showWarningMessage("No text selected or word under cursor.");
            return;
        }

        // 使用VS Code内置的颜色选择器
        const customColorHex = await this.showColorPicker();

        if (!customColorHex) {
            return; // 用户取消了选择
        }

        // 验证并解析自定义颜色
        if (!customColorHex || !customColorHex.match(/^#[0-9A-Fa-f]{6}$/)) {
            vscode.window.showErrorMessage('Invalid color format. Please use hex format #RRGGBB.');
            return;
        }

        // 安全地将hex颜色转换为rgba，设置透明度
        const r = parseInt(customColorHex.slice(1, 3), 16);
        const g = parseInt(customColorHex.slice(3, 5), 16);
        const b = parseInt(customColorHex.slice(5, 7), 16);

        // 验证解析结果
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            vscode.window.showErrorMessage('Invalid color values. Please try again.');
            return;
        }

        const customColor = {
            light: { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.4)` },
            dark: { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.3)` }
        };
        const colorId = colorPool.length; // 使用一个超出内置颜色范围的ID

        const terms = this.getTerms();
        const caseSensitive = vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);
        const termIndex = terms.findIndex(
            (t) => caseSensitive ? t.text === textToHighlight : t.text.toLowerCase() === textToHighlight.toLowerCase()
        );

        if (termIndex !== -1) {
            // 更新现有高亮的颜色
            terms[termIndex].colorId = colorId;
            terms[termIndex].isCustomColor = true;
            terms[termIndex].customColor = customColor;
        } else {
            // 添加新高亮
            terms.push({
                text: textToHighlight,
                colorId,
                isCustomColor: true,
                customColor
            });
        }

        this.context.globalState.update(GLOBAL_STATE_KEY, terms);

        // 创建新的decoration type
        const customDecorationType = vscode.window.createTextEditorDecorationType({
            light: {
                ...customColor.light,
                color: "#000000",
            },
            dark: {
                ...customColor.dark,
                color: "#FFFFFF",
            },
            borderRadius: "2px",
            overviewRulerColor: customColor.light.backgroundColor.replace('rgba', 'rgb').replace(/[\d.]+\)$/, '1)'),
            overviewRulerLane: vscode.OverviewRulerLane.Full
        });

        // 存储自定义颜色decoration type
        if (!this.customDecorationTypes) {
            this.customDecorationTypes = new Map();
        }
        this.customDecorationTypes.set(textToHighlight, customDecorationType);

        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );

        // 刷新侧边栏
        if (this.treeProvider) {
            this.treeProvider.refresh();
        }

        vscode.window.showInformationMessage(`Highlight added with custom color: ${customColorHex}`);
    }

    public jumpToHighlight(text: string): void {
        // 验证输入参数
        if (!text || typeof text !== 'string') {
            vscode.window.showErrorMessage('Invalid highlight text provided.');
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        const textContent = editor.document.getText();
        const caseSensitive = vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);

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

        const position = editor.document.positionAt(index);
        const range = new vscode.Range(position, position.translate(0, text.length));

        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    public jumpToNextHighlight(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        const terms = this.getTerms();
        if (terms.length === 0) {
            vscode.window.showInformationMessage("No highlights found.");
            return;
        }

        const currentPosition = editor.selection.active;
        const document = editor.document;
        const textContent = document.getText();
        const caseSensitive = vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);

        // 获取当前文件中所有高亮的位置
        const allHighlights: Array<{ text: string, index: number, range: vscode.Range }> = [];

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
            }
        }

        if (allHighlights.length === 0) {
            vscode.window.showInformationMessage("No highlights found in current file.");
            return;
        }

        // 按位置排序
        allHighlights.sort((a, b) => a.index - b.index);

        // 找到当前位置之后的高亮（循环查找）
        const currentOffset = document.offsetAt(currentPosition);
        let nextHighlight = allHighlights.find(h => h.index > currentOffset);

        // 如果当前位置后面没有高亮，则跳转到第一个高亮（循环）
        if (!nextHighlight) {
            nextHighlight = allHighlights[0];
        }

        if (nextHighlight) {
            editor.selection = new vscode.Selection(nextHighlight.range.start, nextHighlight.range.end);
            editor.revealRange(nextHighlight.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
    }

    public jumpToPrevHighlight(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        const terms = this.getTerms();
        if (terms.length === 0) {
            vscode.window.showInformationMessage("No highlights found.");
            return;
        }

        const currentPosition = editor.selection.active;
        const document = editor.document;
        const textContent = document.getText();
        const caseSensitive = vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);

        // 获取当前文件中所有高亮的位置
        const allHighlights: Array<{ text: string, index: number, range: vscode.Range }> = [];

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
            }
        }

        if (allHighlights.length === 0) {
            vscode.window.showInformationMessage("No highlights found in current file.");
            return;
        }

        // 按位置排序
        allHighlights.sort((a, b) => a.index - b.index);

        // 找到当前位置之前的高亮（循环查找）
        const currentOffset = document.offsetAt(currentPosition);
        let prevHighlight = null;

        // 从后往前找，找到第一个小于当前位置的高亮
        for (let i = allHighlights.length - 1; i >= 0; i--) {
            if (allHighlights[i].index < currentOffset) {
                prevHighlight = allHighlights[i];
                break;
            }
        }

        // 如果当前位置前面没有高亮，则跳转到最后一个高亮（循环）
        if (!prevHighlight) {
            prevHighlight = allHighlights[allHighlights.length - 1];
        }

        if (prevHighlight) {
            editor.selection = new vscode.Selection(prevHighlight.range.start, prevHighlight.range.end);
            editor.revealRange(prevHighlight.range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
    }

    
    private applyHighlightsToEditor(editor: vscode.TextEditor, highlights: CachedHighlight[]) {
        // 清空现有装饰
        decorationTypes.forEach((dt) => editor.setDecorations(dt, []));
        if (this.customDecorationTypes) {
            this.customDecorationTypes.forEach((dt) => editor.setDecorations(dt, []));
        }

        // 分类整理高亮
        const colorHighlights = new Map<number, vscode.Range[]>();
        const customHighlights = new Map<string, { ranges: vscode.Range[], highlight: CachedHighlight }>();

        for (let i = 0; i < colorPool.length; i++) {
            colorHighlights.set(i, []);
        }

        for (const highlight of highlights) {
            if (highlight.isCustomColor && highlight.customColor) {
                const colorKey = `${highlight.text}_${highlight.customColor.light.backgroundColor}`;
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

        // 应用内置颜色
        colorHighlights.forEach((ranges, colorId) => {
            if (colorId < decorationTypes.length) {
                editor.setDecorations(decorationTypes[colorId], ranges);
            }
        });

        // 应用自定义颜色
        customHighlights.forEach(({ ranges, highlight }) => {
            const colorKey = `${highlight.text}_${highlight.customColor!.light.backgroundColor}`;
            if (!this.customDecorationTypes!.has(colorKey)) {
                const customDecorationType = vscode.window.createTextEditorDecorationType({
                    light: {
                        ...highlight.customColor!.light,
                        color: "#000000",
                    },
                    dark: {
                        ...highlight.customColor!.dark,
                        color: "#FFFFFF",
                    },
                    borderRadius: "2px",
                    overviewRulerColor: highlight.customColor!.light.backgroundColor.replace('rgba', 'rgb').replace(/[\d.]+\)$/, '1)'),
                    overviewRulerLane: vscode.OverviewRulerLane.Full
                });
                this.customDecorationTypes!.set(colorKey, customDecorationType);
            }
            const decorationType = this.customDecorationTypes!.get(colorKey)!;
            editor.setDecorations(decorationType, ranges);
        });
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
            // 如果没有高亮词，清空所有装饰
            decorationTypes.forEach((dt) => editor.setDecorations(dt, []));
            // 清空自定义颜色装饰
            if (this.customDecorationTypes) {
                this.customDecorationTypes.forEach((dt) => editor.setDecorations(dt, []));
            }
            this.highlightCache.delete(editor.document);
            return;
        }

        // 统一使用全量更新
        const highlights: CachedHighlight[] = [];
        const text = editor.document.getText();

        terms.forEach((term) => {
            // 根据配置决定是否区分大小写
            const caseSensitive = vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);
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
     * 合并高亮结果
     */
    private mergeHighlights(existing: CachedHighlight[], newHighlights: CachedHighlight[]): CachedHighlight[] {
        const highlightMap = new Map<string, CachedHighlight>();

        // 添加现有的高亮
        existing.forEach(highlight => {
            highlightMap.set(highlight.text, {
                ...highlight,
                ranges: [...highlight.ranges]
            });
        });

        // 合并新的高亮
        newHighlights.forEach(newHighlight => {
            const existing = highlightMap.get(newHighlight.text);
            if (existing) {
                existing.ranges.push(...newHighlight.ranges);
            } else {
                highlightMap.set(newHighlight.text, {
                    ...newHighlight,
                    ranges: [...newHighlight.ranges]
                });
            }
        });

        return Array.from(highlightMap.values());
    }

    /**
     * 简单的sleep函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 创建支持中英文的正则表达式
 */
function createHighlightRegex(searchText: string, caseSensitive: boolean = false): RegExp {
    const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = caseSensitive ? 'g' : 'gi';

    // 检查是否包含非英文字符
    const hasNonEnglish = /[^a-zA-Z0-9_]/.test(searchText);

    if (hasNonEnglish) {
        // 对于非英文文本，使用更灵活的边界匹配
        // 使用 (?<!\w) 和 (?!\w) 来模拟词边界，但支持非英文字符
        return new RegExp(`(?<!\\w)${escapedText}(?!\\w)`, flags);
    } else {
        // 对于英文文本，使用标准的 \b 边界
        return new RegExp(`\\b${escapedText}\\b`, flags);
    }
}

/**
 * 全字匹配搜索函数 - 支持英文和非英文文本
 */
function findWholeWord(text: string, searchText: string, caseSensitive: boolean = false): number {
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