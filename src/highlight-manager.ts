import * as vscode from "vscode";
import type { HighlightsTreeProvider } from "./highlightsTreeProvider";
import type { HighlightedTerm, HighlightPosition, CachedHighlight, HighlightColor } from "./types";
import { GLOBAL_STATE_KEY, colorPool, CUSTOM_COLOR_ID_OFFSET, presetColorPalette } from "./constants";
import { DecoratorManager } from "./utils/decorator-manager";
import { EditorUtils } from "./utils/editor-utils";
import { ColorUtils } from "./utils/color-utils";

/**
 * 高亮管理器
 * 管理所有高亮相关的操作，包括添加、删除、显示和跳转
 */
export class HighlightManager implements vscode.Disposable {
    readonly #context: vscode.ExtensionContext;
    readonly #treeProvider: HighlightsTreeProvider | undefined;
    readonly #decoratorManager: DecoratorManager;
    readonly #highlightCache = new Map<vscode.TextDocument, CachedHighlight[]>();

    constructor(context: vscode.ExtensionContext, treeProvider?: HighlightsTreeProvider) {
        this.#context = context;
        this.#treeProvider = treeProvider;
        this.#decoratorManager = new DecoratorManager();

        this.#registerEventListeners();
        this.#initializeHighlights();
    }

    /**
     * 注册事件监听器
     * @remarks
     * 生命周期管理:
     * - 所有事件监听器通过 this.#context.subscriptions 自动管理
     * - 当扩展停用时,VS Code 会自动释放这些监听器
     * - 无需手动存储和释放返回的 Disposable 对象
     *
     * 监听的事件:
     * 1. onDidChangeActiveTextEditor - 活动编辑器切换时更新高亮
     * 2. onDidChangeTextDocument - 文档内容变化时更新高亮
     * 3. onDidCloseTextDocument - 文档关闭时清理缓存
     */
    #registerEventListeners(): void {
        // 监听活动编辑器的变化
        vscode.window.onDidChangeActiveTextEditor(
            (editor) => {
                if (editor) {
                    this.#updateDecorations(editor);
                }
            },
            null,
            this.#context.subscriptions
        );

        // 监听文档内容的变化
        vscode.workspace.onDidChangeTextDocument(
            (event) => {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && event.document === activeEditor.document) {
                    this.#updateDecorations(activeEditor);
                }
            },
            null,
            this.#context.subscriptions
        );

        // 监听文档关闭事件，清理缓存
        vscode.workspace.onDidCloseTextDocument(
            (document) => {
                this.#highlightCache.delete(document);
            },
            null,
            this.#context.subscriptions
        );
    }

    /**
     * 初始化高亮 - 为当前打开的文件更新一次高亮
     */
    #initializeHighlights(): void {
        vscode.window.visibleTextEditors.forEach((editor) => this.#updateDecorations(editor));
    }

    /**
     * 添加高亮
     */
    addHighlight(): void {
        const editor = EditorUtils.validateActiveEditor();
        if (!editor) {
            return;
        }

        const textToHighlight = EditorUtils.getSelectedText(editor);
        if (!textToHighlight || textToHighlight.trim() === "") {
            vscode.window.showWarningMessage("No text selected or word under cursor.");
            return;
        }

        const terms = this.#getTerms();
        const caseSensitive = this.#getCaseSensitiveConfig();
        const trimmedText = textToHighlight.trim();

        if (terms.some((t) => EditorUtils.textEquals(t.text, trimmedText, caseSensitive))) {
            vscode.window.showInformationMessage(`'${trimmedText}' is already highlighted.`);
            return;
        }

        const colorId = terms.length % colorPool.length;
        terms.push({ text: trimmedText, colorId });

        this.#updateGlobalState(terms);
    }

    /**
     * 移除高亮
     */
    removeHighlight(): void {
        const editor = EditorUtils.validateActiveEditor();
        if (!editor) {
            return;
        }

        const textToRemove = EditorUtils.getSelectedText(editor);
        if (!textToRemove) {
            vscode.window.showWarningMessage("No text selected or word under cursor to remove.");
            return;
        }

        const terms = this.#getTerms();
        const termIndex = this.#findTermIndex(terms, textToRemove);

        if (termIndex === -1) {
            vscode.window.showInformationMessage(`'${textToRemove}' is not currently highlighted.`);
            return;
        }

        this.#decoratorManager.disposeDecorationsForText(terms[termIndex].text);
        terms.splice(termIndex, 1);
        this.#updateGlobalState(terms);
    }

    /**
     * 切换高亮（添加或移除）
     */
    toggleHighlight(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            // 尝试从 visibleTextEditors 中获取第一个编辑器
            const visibleEditors = vscode.window.visibleTextEditors;
            if (visibleEditors.length > 0) {
                this.#toggleHighlightForEditor(visibleEditors[0]);
                return;
            }

            vscode.window.showWarningMessage("No active editor found.");
            return;
        }

        this.#toggleHighlightForEditor(editor);
    }

    #toggleHighlightForEditor(editor: vscode.TextEditor): void {
        const currentPosition = editor.selection.active;
        const caseSensitive = this.#getCaseSensitiveConfig();
        const terms = this.#getTerms();
        const highlightsAtPosition = EditorUtils.findHighlightsAtPosition(
            editor, currentPosition, terms, caseSensitive
        );

        if (highlightsAtPosition.length > 0) {
            const firstHighlight = highlightsAtPosition.at(0);
            if (firstHighlight) {
                this.#removeHighlightByText(firstHighlight);
            }
            return;
        }

        this.#addHighlightAtEditor(editor);
    }

    /**
     * 根据文本移除高亮
     */
    #removeHighlightByText(text: string): void {
        const terms = this.#getTerms();
        const termIndex = this.#findTermIndex(terms, text);

        if (termIndex !== -1) {
            this.#decoratorManager.disposeDecorationsForText(terms[termIndex].text);
            terms.splice(termIndex, 1);
            this.#updateGlobalState(terms);
        }
    }

    /**
     * 在编辑器中添加高亮
     */
    #addHighlightAtEditor(editor: vscode.TextEditor): void {
        const textToToggle = EditorUtils.getSelectedText(editor);
        if (!textToToggle || textToToggle.trim() === "") {
            vscode.window.showWarningMessage("No text selected or word under cursor.");
            return;
        }

        const terms = this.#getTerms();
        const trimmedText = textToToggle.trim();
        const termIndex = this.#findTermIndex(terms, trimmedText);

        if (termIndex !== -1) {
            terms.splice(termIndex, 1);
        } else {
            const colorId = terms.length % colorPool.length;
            terms.push({ text: trimmedText, colorId });
        }

        this.#updateGlobalState(terms);
    }

    /**
     * 清除所有高亮
     */
    clearAllHighlights(): void {
        const terms = this.#getTerms();
        if (terms.length === 0) {
            vscode.window.showInformationMessage("There are no highlights to clear.");
            return;
        }

        // 释放所有自定义装饰器
        this.#decoratorManager.dispose();

        this.#updateGlobalState([]);
        vscode.window.showInformationMessage("All highlights have been cleared.");
    }

    /**
     * 刷新所有高亮
     */
    refreshHighlights(): void {
        this.#refreshAllEditors();
    }

    /**
     * 添加自定义颜色高亮
     */
    async addHighlightWithCustomColor(): Promise<void> {
        const editor = EditorUtils.validateActiveEditor();
        if (!editor) {
            return;
        }

        const textToHighlight = EditorUtils.getSelectedText(editor);
        if (!textToHighlight || textToHighlight.trim() === "") {
            vscode.window.showWarningMessage("No text selected or word under cursor.");
            return;
        }

        const customColorHex = await this.#showColorPicker();
        if (!customColorHex) {
            return;
        }

        const customColor = ColorUtils.parseHexToColor(customColorHex);
        if (!customColor) {
            vscode.window.showErrorMessage('Invalid color format. Please use hex format #RRGGBB.');
            return;
        }

        this.#addOrUpdateHighlightWithColor(textToHighlight.trim(), customColor);
        this.#decoratorManager.registerCustomDecorationType(textToHighlight.trim(), customColor);
        this.#refreshAllEditors();
        this.#refreshSidebar();

        vscode.window.showInformationMessage(`Highlight added with custom color: ${customColorHex}`);
    }

    /**
     * 添加或更新带自定义颜色的高亮
     */
    #addOrUpdateHighlightWithColor(text: string, color: HighlightColor): void {
        const terms = this.#getTerms();
        const termIndex = this.#findTermIndex(terms, text);

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

        this.#context.globalState.update(GLOBAL_STATE_KEY, terms);
    }

    /**
     * 跳转到指定高亮
     */
    jumpToHighlight(text: string): void {
        // 验证输入参数
        if (!text || typeof text !== 'string') {
            vscode.window.showErrorMessage('Invalid highlight text provided.');
            return;
        }

        const editor = EditorUtils.validateActiveEditor();
        if (!editor) {
            return;
        }

        const caseSensitive = this.#getCaseSensitiveConfig();

        const ranges = EditorUtils.findHighlightRanges(editor.document, { text, colorId: 0 }, caseSensitive);
        const firstRange = ranges.at(0);

        if (!firstRange) {
            vscode.window.showInformationMessage(`"${text}" not found in current file.`);
            return;
        }

        EditorUtils.selectAndRevealRange(editor, firstRange);
    }

    /**
     * 跳转到下一个高亮
     */
    jumpToNextHighlight(): void {
        this.#jumpToHighlightByDirection(1);
    }

    /**
     * 跳转到上一个高亮
     */
    jumpToPrevHighlight(): void {
        this.#jumpToHighlightByDirection(-1);
    }

    /**
     * 按方向跳转到高亮（1=下一个，-1=上一个）
     */
    #jumpToHighlightByDirection(direction: 1 | -1): void {
        const editor = EditorUtils.validateActiveEditor();
        if (!editor) {
            return;
        }

        const allHighlights = this.#getAllHighlightsInEditor(editor);
        if (allHighlights.length === 0) {
            vscode.window.showInformationMessage("No highlights found.");
            return;
        }

        const currentOffset = editor.document.offsetAt(editor.selection.active);
        const targetHighlight = this.#findHighlightByDirection(allHighlights, currentOffset, direction);

        if (targetHighlight) {
            EditorUtils.selectAndRevealRange(editor, targetHighlight.range);
        }
    }

    /**
     * 获取编辑器中的所有高亮并排序
     */
    #getAllHighlightsInEditor(editor: vscode.TextEditor): HighlightPosition[] {
        const terms = this.#getTerms();
        if (terms.length === 0) {
            return [];
        }

        const caseSensitive = this.#getCaseSensitiveConfig();
        const allHighlights = EditorUtils.findAllHighlightsInEditor(editor, terms, caseSensitive);
        allHighlights.sort((a: HighlightPosition, b: HighlightPosition) => a.index - b.index);
        return allHighlights;
    }

    /**
     * 根据方向查找目标高亮
     */
    #findHighlightByDirection(
        highlights: HighlightPosition[],
        currentOffset: number,
        direction: 1 | -1
    ): HighlightPosition | null {
        if (direction === 1) {
            // 找下一个
            const nextHighlight = highlights.find((h) => h.index > currentOffset);
            return nextHighlight ?? highlights.at(0) ?? null;
        } else {
            // 找上一个
            const prevHighlight = highlights.findLast((h) => h.index < currentOffset);
            return prevHighlight ?? highlights.at(-1) ?? null;
        }
    }

    /**
     * 更新编辑器装饰
     */
    #updateDecorations(editor: vscode.TextEditor): void {
        const terms = this.#getTerms();
        if (terms.length === 0) {
            this.#decoratorManager.clearAllEditorDecorations(editor);
            this.#highlightCache.delete(editor.document);
            return;
        }

        const highlights: CachedHighlight[] = [];
        const caseSensitive = this.#getCaseSensitiveConfig();

        for (const term of terms) {
            const ranges = EditorUtils.findHighlightRanges(editor.document, term, caseSensitive);

            if (ranges.length > 0) {
                highlights.push({
                    text: term.text,
                    ranges,
                    colorId: term.colorId,
                    isCustomColor: term.isCustomColor,
                    customColor: term.customColor
                });
            }
        }

        // 缓存结果
        this.#highlightCache.set(editor.document, highlights);

        // 应用高亮到编辑器
        this.#decoratorManager.applyHighlightsToEditor(editor, highlights);
    }

    /**
     * 显示颜色选择器
     */
    async #showColorPicker(): Promise<string | undefined> {
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

        if (!selected) {
            return undefined;
        }

        if (selected.value === "custom") {
            return vscode.window.showInputBox({
                prompt: "Enter hex color code (e.g., #FF5733)",
                placeHolder: "#FF5733",
                validateInput: (value) => {
                    if (!value) {
                        return null;
                    }
                    return value.match(/^#[0-9A-Fa-f]{6}$/) ? null : "Please enter a valid hex color code (e.g., #FF5733)";
                }
            });
        }

        return selected.value;
    }

    /**
     * 获取所有高亮词项
     */
    #getTerms(): HighlightedTerm[] {
        return this.#context.globalState.get<HighlightedTerm[]>(GLOBAL_STATE_KEY, []);
    }

    /**
     * 获取大小写敏感配置
     */
    #getCaseSensitiveConfig(): boolean {
        return vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);
    }

    /**
     * 刷新侧边栏
     */
    #refreshSidebar(): void {
        this.#treeProvider?.refresh();
    }

    /**
     * 刷新所有编辑器的高亮
     */
    #refreshAllEditors(): void {
        vscode.window.visibleTextEditors.forEach((editor) => this.#updateDecorations(editor));
    }

    /**
     * 更新全局状态并刷新界面
     */
    async #updateGlobalState(terms: HighlightedTerm[]): Promise<void> {
        await this.#context.globalState.update(GLOBAL_STATE_KEY, terms);
        this.#refreshAllEditors();
        this.#refreshSidebar();
    }

    /**
     * 根据文本查找高亮词索引
     */
    #findTermIndex(terms: HighlightedTerm[], text: string): number {
        const caseSensitive = this.#getCaseSensitiveConfig();
        return terms.findIndex((t) => EditorUtils.textEquals(t.text, text, caseSensitive));
    }

    /**
     * 释放所有资源
     */
    dispose(): void {
        this.#decoratorManager.dispose();
        this.#highlightCache.clear();
    }
}