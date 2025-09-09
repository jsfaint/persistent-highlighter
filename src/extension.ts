import * as vscode from "vscode";
import { HighlightsTreeProvider, HighlightItem } from "./highlightsTreeProvider";

// 1. 定义颜色池和 DecorationType
// 提供一组高对比度的颜色，并为亮色和暗色主题分别指定样式
const colorPool = [
    // 基础颜色 (10个原有的)
    {
        light: { backgroundColor: "rgba(255, 255, 0, 0.4)" },
        dark: { backgroundColor: "rgba(255, 255, 0, 0.3)" },
    }, // Yellow
    {
        light: { backgroundColor: "rgba(173, 216, 230, 0.5)" },
        dark: { backgroundColor: "rgba(173, 216, 230, 0.4)" },
    }, // Light Blue
    {
        light: { backgroundColor: "rgba(144, 238, 144, 0.5)" },
        dark: { backgroundColor: "rgba(144, 238, 144, 0.4)" },
    }, // Light Green
    {
        light: { backgroundColor: "rgba(255, 182, 193, 0.5)" },
        dark: { backgroundColor: "rgba(255, 182, 193, 0.4)" },
    }, // Light Pink
    {
        light: { backgroundColor: "rgba(218, 112, 214, 0.5)" },
        dark: { backgroundColor: "rgba(218, 112, 214, 0.4)" },
    }, // Orchid
    {
        light: { backgroundColor: "rgba(255, 160, 122, 0.5)" },
        dark: { backgroundColor: "rgba(255, 160, 122, 0.4)" },
    }, // Light Salmon
    {
        light: { backgroundColor: "rgba(240, 230, 140, 0.5)" },
        dark: { backgroundColor: "rgba(240, 230, 140, 0.4)" },
    }, // Khaki
    {
        light: { backgroundColor: "rgba(152, 251, 152, 0.5)" },
        dark: { backgroundColor: "rgba(152, 251, 152, 0.4)" },
    }, // Pale Green
    {
        light: { backgroundColor: "rgba(255, 218, 185, 0.5)" },
        dark: { backgroundColor: "rgba(255, 218, 185, 0.4)" },
    }, // Peach Puff
    {
        light: { backgroundColor: "rgba(221, 160, 221, 0.5)" },
        dark: { backgroundColor: "rgba(221, 160, 221, 0.4)" },
    }, // Plum

    // 新增颜色 (15个额外的)
    {
        light: { backgroundColor: "rgba(255, 99, 71, 0.4)" },
        dark: { backgroundColor: "rgba(255, 99, 71, 0.3)" },
    }, // Tomato
    {
        light: { backgroundColor: "rgba(255, 165, 0, 0.4)" },
        dark: { backgroundColor: "rgba(255, 165, 0, 0.3)" },
    }, // Orange
    {
        light: { backgroundColor: "rgba(255, 215, 0, 0.4)" },
        dark: { backgroundColor: "rgba(255, 215, 0, 0.3)" },
    }, // Gold
    {
        light: { backgroundColor: "rgba(154, 205, 50, 0.4)" },
        dark: { backgroundColor: "rgba(154, 205, 50, 0.3)" },
    }, // Yellow Green
    {
        light: { backgroundColor: "rgba(0, 255, 127, 0.4)" },
        dark: { backgroundColor: "rgba(0, 255, 127, 0.3)" },
    }, // Spring Green
    {
        light: { backgroundColor: "rgba(64, 224, 208, 0.4)" },
        dark: { backgroundColor: "rgba(64, 224, 208, 0.3)" },
    }, // Turquoise
    {
        light: { backgroundColor: "rgba(0, 191, 255, 0.4)" },
        dark: { backgroundColor: "rgba(0, 191, 255, 0.3)" },
    }, // Deep Sky Blue
    {
        light: { backgroundColor: "rgba(138, 43, 226, 0.4)" },
        dark: { backgroundColor: "rgba(138, 43, 226, 0.3)" },
    }, // Blue Violet
    {
        light: { backgroundColor: "rgba(255, 20, 147, 0.4)" },
        dark: { backgroundColor: "rgba(255, 20, 147, 0.3)" },
    }, // Deep Pink
    {
        light: { backgroundColor: "rgba(255, 105, 180, 0.4)" },
        dark: { backgroundColor: "rgba(255, 105, 180, 0.3)" },
    }, // Hot Pink
    {
        light: { backgroundColor: "rgba(199, 21, 133, 0.4)" },
        dark: { backgroundColor: "rgba(199, 21, 133, 0.3)" },
    }, // Medium Violet Red
    {
        light: { backgroundColor: "rgba(255, 127, 80, 0.4)" },
        dark: { backgroundColor: "rgba(255, 127, 80, 0.3)" },
    }, // Coral
    {
        light: { backgroundColor: "rgba(255, 69, 0, 0.4)" },
        dark: { backgroundColor: "rgba(255, 69, 0, 0.3)" },
    }, // Red Orange
    {
        light: { backgroundColor: "rgba(218, 165, 32, 0.4)" },
        dark: { backgroundColor: "rgba(218, 165, 32, 0.3)" },
    }, // Goldenrod
    {
        light: { backgroundColor: "rgba(107, 142, 35, 0.4)" },
        dark: { backgroundColor: "rgba(107, 142, 35, 0.3)" },
    }, // Olive Drab
    {
        light: { backgroundColor: "rgba(70, 130, 180, 0.4)" },
        dark: { backgroundColor: "rgba(70, 130, 180, 0.3)" },
    }, // Steel Blue
    {
        light: { backgroundColor: "rgba(123, 104, 238, 0.4)" },
        dark: { backgroundColor: "rgba(123, 104, 238, 0.3)" },
    }, // Medium Slate Blue
];

// 为颜色池中的每种颜色创建一个 DecorationType
const decorationTypes = colorPool.map((color) =>
    vscode.window.createTextEditorDecorationType({
        light: {
            ...color.light,
            // 保证前景文字颜色与背景形成对比
            color: "#000000",
        },
        dark: {
            ...color.dark,
            color: "#FFFFFF",
        },
        borderRadius: "2px",
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

// VS Code预设调色板颜色
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

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
    console.log("Persistent Highlighter is now active!");

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

    const clearAllFromTreeCommand = vscode.commands.registerCommand(
        'persistent-highlighter.clearAllFromTree',
        () => {
            treeProvider.clearAllHighlights();
            highlightManager.refreshHighlights();
            // 侧边栏的清除操作已经内置了refresh，这里不需要额外刷新
        }
    );

    context.subscriptions.push(
        jumpToHighlightCommand,
        removeHighlightFromTreeCommand,
        editHighlightCommand,
        refreshTreeCommand,
        clearAllFromTreeCommand,
        treeView
    );
}

export function deactivate() { }

class HighlightManager {
    private context: vscode.ExtensionContext;
    private activeEditor: vscode.TextEditor | undefined;
    private treeProvider: HighlightsTreeProvider | undefined;
    private customDecorationTypes: Map<string, vscode.TextEditorDecorationType> | undefined;

    constructor(context: vscode.ExtensionContext, treeProvider?: HighlightsTreeProvider) {
        this.context = context;
        this.activeEditor = vscode.window.activeTextEditor;
        this.treeProvider = treeProvider;
        this.customDecorationTypes = new Map();

        // 监听活动编辑器的变化
        vscode.window.onDidChangeActiveTextEditor(
            (editor) => {
                this.activeEditor = editor;
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
                if (
                    this.activeEditor &&
                    event.document === this.activeEditor.document
                ) {
                    this.updateDecorations(this.activeEditor);
                }
            },
            null,
            context.subscriptions
        );

        // 初始化时为当前打开的文件更新一次高亮
        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );
    }

    public addHighlight() {
        const editor = this.activeEditor;
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
        const editor = this.activeEditor;
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
        const termIndex = terms.findIndex(
            (t) => t.text.toLowerCase() === textToRemove.toLowerCase()
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
        const editor = this.activeEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

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

        const terms = this.getTerms();
        const termIndex = terms.findIndex(
            (t) => t.text.toLowerCase() === textToToggle!.toLowerCase()
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

        // 颜色选择器选项
        const colorOptions = [
            ...colorPool.map((color, index) => ({
                label: `$(symbol-color) Color ${index + 1}`,
                description: `Use built-in color ${index + 1}`,
                id: index,
                isCustom: false
            })),
            {
                label: "$(color-mode) Custom Color",
                description: "Choose a custom color",
                id: -1,
                isCustom: true
            }
        ];

        const selectedOption = await vscode.window.showQuickPick(colorOptions, {
            placeHolder: "Choose a color for the highlight"
        });

        if (!selectedOption) {
            return; // 用户取消了选择
        }

        let colorId: number;
        let customColor: { light: { backgroundColor: string }; dark: { backgroundColor: string } } | undefined;

        if (selectedOption.isCustom) {
            // 显示调色板选择
            const selectedColor = await this.showColorPalette();

            if (!selectedColor) {
                return; // 用户取消了选择
            }

            let customColorHex: string;

            if (selectedColor === "custom") {
                // 自定义输入
                const customInput = await vscode.window.showInputBox({
                    prompt: "Enter a hex color code (e.g., #FF5733)",
                    placeHolder: "#FF5733",
                    validateInput: (value) => {
                        if (!value.match(/^#[0-9A-Fa-f]{6}$/)) {
                            return "Please enter a valid hex color code (e.g., #FF5733)";
                        }
                        return null;
                    }
                });

                if (!customInput) {
                    return; // 用户取消了输入
                }

                customColorHex = customInput;
            } else {
                // 使用预设调色板颜色
                customColorHex = selectedColor;
            }

            // 将hex颜色转换为rgba，设置透明度
            const r = parseInt(customColorHex.slice(1, 3), 16);
            const g = parseInt(customColorHex.slice(3, 5), 16);
            const b = parseInt(customColorHex.slice(5, 7), 16);

            customColor = {
                light: { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.4)` },
                dark: { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.3)` }
            };
            colorId = colorPool.length; // 使用一个超出内置颜色范围的ID
        } else {
            colorId = selectedOption.id;
        }

        const terms = this.getTerms();
        const termIndex = terms.findIndex(
            (t) => t.text.toLowerCase() === textToHighlight.toLowerCase()
        );

        if (termIndex !== -1) {
            // 更新现有高亮的颜色
            terms[termIndex].colorId = colorId;
            terms[termIndex].isCustomColor = selectedOption.isCustom;
            terms[termIndex].customColor = customColor;
        } else {
            // 添加新高亮
            terms.push({
                text: textToHighlight,
                colorId,
                isCustomColor: selectedOption.isCustom,
                customColor
            });
        }

        this.context.globalState.update(GLOBAL_STATE_KEY, terms);

        // 如果是自定义颜色，创建新的decoration type
        if (selectedOption.isCustom && customColor) {
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
            });

            // 存储自定义颜色decoration type
            if (!this.customDecorationTypes) {
                this.customDecorationTypes = new Map();
            }
            this.customDecorationTypes.set(textToHighlight, customDecorationType);
        }

        vscode.window.visibleTextEditors.forEach((editor) =>
            this.updateDecorations(editor)
        );

        // 刷新侧边栏
        if (this.treeProvider) {
            this.treeProvider.refresh();
        }

        vscode.window.showInformationMessage(`Highlight added with ${selectedOption.isCustom ? 'custom' : 'built-in'} color.`);
    }

    public jumpToHighlight(text: string): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        const textContent = editor.document.getText();
        const index = textContent.toLowerCase().indexOf(text.toLowerCase());

        if (index === -1) {
            vscode.window.showInformationMessage(`"${text}" not found in current file.`);
            return;
        }

        const position = editor.document.positionAt(index);
        const range = new vscode.Range(position, position.translate(0, text.length));

        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    private async showColorPalette(): Promise<string | undefined> {
        const colorOptions = [
            ...presetColorPalette.map((color, index) => ({
                label: `$(symbol-color) ${color.name}`,
                description: `Color ${index + 1}`,
                detail: `Hex: ${color.hex}`,
                value: color.hex
            })),
            {
                label: "$(edit) Custom Hex Color",
                description: "Enter custom hex color code",
                detail: "Input your own color (e.g., #FF5733)",
                value: "custom"
            }
        ];

        const selected = await vscode.window.showQuickPick(colorOptions, {
            placeHolder: "Choose a color from the palette",
            title: "Color Palette Selection"
        });

        return selected?.value;
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
            return;
        }

        const decorations: Map<number, vscode.Range[]> = new Map();
        for (let i = 0; i < colorPool.length; i++) {
            decorations.set(i, []);
        }

        // 自定义颜色的decorations
        const customDecorations = new Map<string, vscode.Range[]>();

        const text = editor.document.getText();

        terms.forEach((term) => {
            // 使用正则表达式进行全局、不区分大小写的匹配
            const regex = new RegExp(term.text, "gi");
            let match;
            while ((match = regex.exec(text)) !== null) {
                const startPos = editor.document.positionAt(match.index);
                const endPos = editor.document.positionAt(
                    match.index + match[0].length
                );
                const range = new vscode.Range(startPos, endPos);

                if (term.isCustomColor && term.customColor) {
                    // 自定义颜色
                    const colorKey = `${term.text}_${term.customColor.light.backgroundColor}`;
                    if (!customDecorations.has(colorKey)) {
                        customDecorations.set(colorKey, []);
                    }
                    customDecorations.get(colorKey)!.push(range);
                } else {
                    // 内置颜色
                    const colorDecorations = decorations.get(term.colorId);
                    if (colorDecorations) {
                        colorDecorations.push(range);
                    }
                }
            }
        });

        // 应用内置颜色
        decorations.forEach((ranges, colorId) => {
            editor.setDecorations(decorationTypes[colorId], ranges);
        });

        // 应用自定义颜色
        customDecorations.forEach((ranges, colorKey) => {
            const [text] = colorKey.split('_');
            const term = terms.find(t => t.text === text && t.isCustomColor);
            if (term && term.customColor) {
                // 确保自定义decoration type存在
                if (!this.customDecorationTypes!.has(text)) {
                    const customDecorationType = vscode.window.createTextEditorDecorationType({
                        light: {
                            ...term.customColor.light,
                            color: "#000000",
                        },
                        dark: {
                            ...term.customColor.dark,
                            color: "#FFFFFF",
                        },
                        borderRadius: "2px",
                    });
                    this.customDecorationTypes!.set(text, customDecorationType);
                }
                const decorationType = this.customDecorationTypes!.get(text)!;
                editor.setDecorations(decorationType, ranges);
            }
        });
    }
}
