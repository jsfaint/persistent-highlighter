import * as vscode from 'vscode';

// 1. 定义颜色池和 DecorationType
// 提供一组高对比度的颜色，并为亮色和暗色主题分别指定样式
const colorPool = [
    { light: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }, dark: { backgroundColor: 'rgba(255, 255, 0, 0.3)' } }, // Yellow
    { light: { backgroundColor: 'rgba(173, 216, 230, 0.5)' }, dark: { backgroundColor: 'rgba(173, 216, 230, 0.4)' } }, // Light Blue
    { light: { backgroundColor: 'rgba(144, 238, 144, 0.5)' }, dark: { backgroundColor: 'rgba(144, 238, 144, 0.4)' } }, // Light Green
    { light: { backgroundColor: 'rgba(255, 182, 193, 0.5)' }, dark: { backgroundColor: 'rgba(255, 182, 193, 0.4)' } }, // Light Pink
    { light: { backgroundColor: 'rgba(218, 112, 214, 0.5)' }, dark: { backgroundColor: 'rgba(218, 112, 214, 0.4)' } }, // Orchid
    { light: { backgroundColor: 'rgba(255, 160, 122, 0.5)' }, dark: { backgroundColor: 'rgba(255, 160, 122, 0.4)' } }, // Light Salmon
    { light: { backgroundColor: 'rgba(240, 230, 140, 0.5)' }, dark: { backgroundColor: 'rgba(240, 230, 140, 0.4)' } }, // Khaki
    { light: { backgroundColor: 'rgba(152, 251, 152, 0.5)' }, dark: { backgroundColor: 'rgba(152, 251, 152, 0.4)' } }, // Pale Green
    { light: { backgroundColor: 'rgba(255, 218, 185, 0.5)' }, dark: { backgroundColor: 'rgba(255, 218, 185, 0.4)' } }, // Peach Puff
    { light: { backgroundColor: 'rgba(221, 160, 221, 0.5)' }, dark: { backgroundColor: 'rgba(221, 160, 221, 0.4)' } }, // Plum
];

// 为颜色池中的每种颜色创建一个 DecorationType
const decorationTypes = colorPool.map(color => vscode.window.createTextEditorDecorationType({
    light: {
        ...color.light,
        // 保证前景文字颜色与背景形成对比
        color: '#000000'
    },
    dark: {
        ...color.dark,
        color: '#FFFFFF'
    },
    borderRadius: '2px',
}));

// 定义存储在 globalState 中的对象结构
type HighlightedTerm = {
    text: string;
    colorId: number;
};

const GLOBAL_STATE_KEY = 'persistentHighlighterTerms';

// 激活扩展
export function activate(context: vscode.ExtensionContext) {
    console.log('Persistent Highlighter is now active!');

    const highlightManager = new HighlightManager(context);

    // 注册添加高亮的命令
    const addHighlightCommand = vscode.commands.registerCommand('persistent-highlighter.addHighlight', () => {
        highlightManager.addHighlight();
    });

    // 注册移除高亮的命令
    const removeHighlightCommand = vscode.commands.registerCommand('persistent-highlighter.removeHighlight', () => {
        highlightManager.removeHighlight();
    });

    context.subscriptions.push(addHighlightCommand);
    context.subscriptions.push(removeHighlightCommand);

    const toggleHighlightCommand = vscode.commands.registerCommand('persistent-highlighter.toggleHighlight', () => {
        highlightManager.toggleHighlight();
    });

    context.subscriptions.push(toggleHighlightCommand);

    const clearAllHighlightsCommand = vscode.commands.registerCommand('persistent-highlighter.clearAllHighlights', () => {
        highlightManager.clearAllHighlights();
    });

    context.subscriptions.push(clearAllHighlightsCommand);
}

export function deactivate() {}

class HighlightManager {
    private context: vscode.ExtensionContext;
    private activeEditor: vscode.TextEditor | undefined;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.activeEditor = vscode.window.activeTextEditor;

        // 监听活动编辑器的变化
        vscode.window.onDidChangeActiveTextEditor(editor => {
            this.activeEditor = editor;
            if (editor) {
                this.updateDecorations(editor);
            }
        }, null, context.subscriptions);

        // 监听文档内容的变化
        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.activeEditor && event.document === this.activeEditor.document) {
                this.updateDecorations(this.activeEditor);
            }
        }, null, context.subscriptions);

        // 初始化时为当前打开的文件更新一次高亮
        vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor));
    }

    public addHighlight() {
        const editor = this.activeEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
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

        if (!textToHighlight || textToHighlight.trim() === '') {
            vscode.window.showWarningMessage('No text selected or word under cursor.');
            return;
        }

        const terms = this.getTerms();
        if (terms.some(t => t.text === textToHighlight)) {
            vscode.window.showInformationMessage(`'${textToHighlight}' is already highlighted.`);
            return;
        }

        const colorId = terms.length % colorPool.length;
        terms.push({ text: textToHighlight, colorId });

        this.context.globalState.update(GLOBAL_STATE_KEY, terms);
        vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor));
    }

    public removeHighlight() {
        const editor = this.activeEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
            return;
        }

        let textToRemove: string | undefined;
        const selection = editor.selection;

        if (!selection.isEmpty) {
            textToRemove = editor.document.getText(selection);
        } else {
            const wordRange = editor.document.getWordRangeAtPosition(selection.active);
            if (wordRange) {
                textToRemove = editor.document.getText(wordRange);
            }
        }

        if (!textToRemove) {
            vscode.window.showWarningMessage('No text selected or word under cursor to remove.');
            return;
        }

        const terms = this.getTerms();
        const termIndex = terms.findIndex(t => t.text.toLowerCase() === textToRemove.toLowerCase());

        if (termIndex === -1) {
            vscode.window.showInformationMessage(`'${textToRemove}' is not currently highlighted.`);
            return;
        }

        terms.splice(termIndex, 1);
        this.context.globalState.update(GLOBAL_STATE_KEY, terms);
        vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor));
    }

    public toggleHighlight() {
        const editor = this.activeEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found.');
            return;
        }

        let textToToggle: string | undefined;
        const selection = editor.selection;

        if (!selection.isEmpty) {
            textToToggle = editor.document.getText(selection);
        } else {
            const wordRange = editor.document.getWordRangeAtPosition(selection.active);
            if (wordRange) {
                textToToggle = editor.document.getText(wordRange);
            }
        }

        if (!textToToggle || textToToggle.trim() === '') {
            vscode.window.showWarningMessage('No text selected or word under cursor.');
            return;
        }

        const terms = this.getTerms();
        const termIndex = terms.findIndex(t => t.text.toLowerCase() === textToToggle!.toLowerCase());

        if (termIndex !== -1) {
            // Term exists, so remove it
            terms.splice(termIndex, 1);
            this.context.globalState.update(GLOBAL_STATE_KEY, terms);
            vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor));
        } else {
            // Term does not exist, so add it
            const colorId = terms.length % colorPool.length;
            terms.push({ text: textToToggle, colorId });
            this.context.globalState.update(GLOBAL_STATE_KEY, terms);
            vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor));
        }
    }

    public clearAllHighlights() {
        const terms = this.getTerms();
        if (terms.length === 0) {
            vscode.window.showInformationMessage('There are no highlights to clear.');
            return;
        }

        this.context.globalState.update(GLOBAL_STATE_KEY, []);
        vscode.window.visibleTextEditors.forEach(editor => this.updateDecorations(editor));
        vscode.window.showInformationMessage('All highlights have been cleared.');
    }

    private getTerms(): HighlightedTerm[] {
        return this.context.globalState.get<HighlightedTerm[]>(GLOBAL_STATE_KEY, []);
    }

    private updateDecorations(editor: vscode.TextEditor) {
        const terms = this.getTerms();
        if (terms.length === 0) {
            // 如果没有高亮词，清空所有装饰
            decorationTypes.forEach(dt => editor.setDecorations(dt, []));
            return;
        }

        const decorations: Map<number, vscode.Range[]> = new Map();
        for (let i = 0; i < colorPool.length; i++) {
            decorations.set(i, []);
        }

        const text = editor.document.getText();
        
        terms.forEach(term => {
            // 使用正则表达式进行全局、不区分大小写的匹配
            const regex = new RegExp(term.text, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                const startPos = editor.document.positionAt(match.index);
                const endPos = editor.document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                
                const colorDecorations = decorations.get(term.colorId);
                if (colorDecorations) {
                    colorDecorations.push(range);
                }
            }
        });

        decorations.forEach((ranges, colorId) => {
            editor.setDecorations(decorationTypes[colorId], ranges);
        });
    }
}