import * as vscode from "vscode";
import type { HighlightsTreeProvider } from "./highlightsTreeProvider";
import type {
    CachedHighlight,
    HighlightColor,
    HighlightMatchMode,
    HighlightPosition,
    HighlightScopeType,
    HighlightedTerm
} from "./types";
import { GLOBAL_STATE_KEY, colorPool, CUSTOM_COLOR_ID_OFFSET, presetColorPalette } from "./constants";
import { DecoratorManager } from "./utils/decorator-manager";
import { EditorUtils } from "./utils/editor-utils";
import { ColorUtils } from "./utils/color-utils";
import {
    doesHighlightApplyToDocument,
    getHighlightMatchModeLabel,
    getHighlightScopeLabel,
    highlightedTermsNeedMigration,
    normalizeHighlightedTerm,
    normalizeHighlightedTerms
} from "./utils/highlight-term-utils";
import { createHighlightRegex } from "./utils/regex-cache";

type HighlightRuleAction =
    | "editText"
    | "changeScope"
    | "toggleEnabled"
    | "toggleCaseSensitive"
    | "changeMatchMode";

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
        void this.#migrateStoredTerms();
        this.#initializeHighlights();
    }

    /**
     * 注册事件监听器
     */
    #registerEventListeners(): void {
        vscode.window.onDidChangeActiveTextEditor(
            (editor) => {
                if (editor) {
                    this.#updateDecorations(editor);
                }
            },
            null,
            this.#context.subscriptions
        );

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

        vscode.workspace.onDidCloseTextDocument(
            (document) => {
                this.#highlightCache.delete(document);
            },
            null,
            this.#context.subscriptions
        );

        vscode.workspace.onDidChangeConfiguration(
            (event) => {
                if (event.affectsConfiguration("persistent-highlighter.caseSensitive")) {
                    void this.#migrateStoredTerms();
                    this.#refreshAllEditors();
                    this.#refreshSidebar();
                }
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
        terms.push(this.#createStandardHighlight(trimmedText, colorId));

        void this.#updateGlobalState(terms);
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
        const termIndex = this.#findTermIndex(terms, textToRemove, editor.document);

        if (termIndex === -1) {
            vscode.window.showInformationMessage(`'${textToRemove}' is not currently highlighted.`);
            return;
        }

        this.#removeTermAtIndex(terms, termIndex);
    }

    /**
     * 根据规则 id 移除高亮
     */
    removeHighlightById(ruleId: string): void {
        if (!ruleId) {
            return;
        }

        const terms = this.#getTerms();
        const termIndex = terms.findIndex((term) => term.id === ruleId);
        if (termIndex === -1) {
            return;
        }

        this.#removeTermAtIndex(terms, termIndex);
    }

    /**
     * 切换高亮（添加或移除）
     */
    toggleHighlight(): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
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
        const terms = this.#getApplicableTerms(editor.document, true);
        const highlightsAtPosition = EditorUtils.findHighlightsAtPosition(
            editor,
            currentPosition,
            terms.filter((term) => term.enabled !== false),
            caseSensitive
        );

        if (highlightsAtPosition.length > 0) {
            const firstHighlight = highlightsAtPosition.at(0);
            if (firstHighlight) {
                this.#removeHighlightByText(firstHighlight, editor.document);
            }
            return;
        }

        this.#addHighlightAtEditor(editor);
    }

    /**
     * 配置单条高亮规则
     */
    async editHighlightRule(ruleId?: string): Promise<void> {
        const terms = this.#getTerms();
        if (terms.length === 0) {
            vscode.window.showInformationMessage("There are no highlights to edit.");
            return;
        }

        const selectedRule = ruleId
            ? terms.find((term) => term.id === ruleId)
            : await this.#pickHighlightRule(terms);

        if (!selectedRule) {
            return;
        }

        const action = await this.#pickRuleAction(selectedRule);
        if (!action) {
            return;
        }

        const updatedRule = await this.#applyRuleAction(selectedRule, action, terms);
        if (!updatedRule) {
            return;
        }

        const updatedTerms = terms.map((term) => term.id === selectedRule.id ? updatedRule : term);

        if (selectedRule.text !== updatedRule.text || selectedRule.isCustomColor) {
            this.#decoratorManager.disposeDecorationsForText(selectedRule.text);
        }

        if (updatedRule.isCustomColor && updatedRule.customColor) {
            this.#decoratorManager.registerCustomDecorationType(updatedRule.text, updatedRule.customColor);
        }

        await this.#updateGlobalState(updatedTerms);
    }

    /**
     * 根据文本移除高亮
     */
    #removeHighlightByText(text: string, document?: vscode.TextDocument): void {
        const terms = this.#getTerms();
        const termIndex = this.#findTermIndex(terms, text, document);

        if (termIndex !== -1) {
            this.#removeTermAtIndex(terms, termIndex);
        }
    }

    #removeTermAtIndex(terms: HighlightedTerm[], termIndex: number): void {
        this.#decoratorManager.disposeDecorationsForText(terms[termIndex].text);
        terms.splice(termIndex, 1);
        void this.#updateGlobalState(terms);
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
        const termIndex = this.#findTermIndex(terms, trimmedText, editor.document);

        if (termIndex !== -1) {
            terms.splice(termIndex, 1);
        } else {
            const colorId = terms.length % colorPool.length;
            terms.push(this.#createStandardHighlight(trimmedText, colorId));
        }

        void this.#updateGlobalState(terms);
    }

    #createStandardHighlight(text: string, colorId: number): HighlightedTerm {
        return normalizeHighlightedTerm(
            {
                text,
                colorId,
                enabled: true,
                caseSensitive: this.#getCaseSensitiveConfig(),
                matchMode: "wholeWord",
                scopeType: "global"
            },
            this.#getCaseSensitiveConfig()
        );
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

        this.#decoratorManager.dispose();

        void this.#updateGlobalState([]);
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
        const currentRule = termIndex !== -1 ? terms[termIndex] : undefined;

        const highlightData = normalizeHighlightedTerm(
            {
                ...currentRule,
                text,
                colorId: CUSTOM_COLOR_ID_OFFSET,
                enabled: currentRule?.enabled ?? true,
                caseSensitive: currentRule?.caseSensitive ?? this.#getCaseSensitiveConfig(),
                matchMode: currentRule?.matchMode ?? "wholeWord",
                scopeType: currentRule?.scopeType ?? "global",
                scopeValue: currentRule?.scopeValue,
                isCustomColor: true,
                customColor: color
            },
            this.#getCaseSensitiveConfig()
        );

        if (termIndex !== -1) {
            terms[termIndex] = highlightData;
        } else {
            terms.push(highlightData);
        }

        void this.#context.globalState.update(GLOBAL_STATE_KEY, terms);
    }

    /**
     * 跳转到指定高亮
     */
    jumpToHighlight(text: string): void {
        if (!text || typeof text !== 'string') {
            vscode.window.showErrorMessage('Invalid highlight text provided.');
            return;
        }

        const editor = EditorUtils.validateActiveEditor();
        if (!editor) {
            return;
        }

        const caseSensitive = this.#getCaseSensitiveConfig();
        const matchedRule = this.#getApplicableTerms(editor.document, false)
            .find((term) => EditorUtils.textEquals(term.text, text, caseSensitive));

        const ranges = EditorUtils.findHighlightRanges(
            editor.document,
            matchedRule ?? this.#createStandardHighlight(text, 0),
            caseSensitive
        );
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
        const terms = this.#getApplicableTerms(editor.document, false);
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
            const nextHighlight = highlights.find((h) => h.index > currentOffset);
            return nextHighlight ?? highlights.at(0) ?? null;
        }

        const prevHighlight = highlights.findLast((h) => h.index < currentOffset);
        return prevHighlight ?? highlights.at(-1) ?? null;
    }

    /**
     * 更新编辑器装饰
     */
    #updateDecorations(editor: vscode.TextEditor): void {
        const terms = this.#getApplicableTerms(editor.document, false);
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

        this.#highlightCache.set(editor.document, highlights);
        this.#decoratorManager.applyHighlightsToEditor(editor, highlights);
    }

    #getApplicableTerms(document: vscode.TextDocument, includeDisabled: boolean): HighlightedTerm[] {
        return this.#getTerms().filter((term) => {
            if (!doesHighlightApplyToDocument(term, document)) {
                return false;
            }
            return includeDisabled || term.enabled !== false;
        });
    }

    async #migrateStoredTerms(): Promise<void> {
        const rawTerms = this.#context.globalState.get<HighlightedTerm[]>(GLOBAL_STATE_KEY, []);
        if (!highlightedTermsNeedMigration(rawTerms, this.#getCaseSensitiveConfig())) {
            return;
        }

        const normalizedTerms = normalizeHighlightedTerms(rawTerms, this.#getCaseSensitiveConfig());
        await this.#updateGlobalState(normalizedTerms);
    }

    async #pickHighlightRule(terms: HighlightedTerm[]): Promise<HighlightedTerm | undefined> {
        const selected = await vscode.window.showQuickPick(
            terms.map((term) => ({
                label: term.text,
                description: [term.enabled === false ? "Disabled" : undefined, getHighlightScopeLabel(term)].filter(Boolean).join(" · "),
                detail: getHighlightMatchModeLabel(term),
                term
            })),
            {
                placeHolder: "Select a highlight rule to edit",
                title: "Edit Highlight Rule"
            }
        );

        return selected?.term;
    }

    async #pickRuleAction(term: HighlightedTerm): Promise<HighlightRuleAction | undefined> {
        const selected = await vscode.window.showQuickPick(
            [
                {
                    label: "$(edit) Edit Text",
                    description: term.text,
                    detail: "Rename the stored highlight text",
                    action: "editText" as HighlightRuleAction
                },
                {
                    label: "$(symbol-namespace) Change Scope",
                    description: getHighlightScopeLabel(term),
                    detail: "Switch between global, workspace, file, and language scope",
                    action: "changeScope" as HighlightRuleAction
                },
                {
                    label: "$(pass) Toggle Enabled",
                    description: term.enabled === false ? "Disabled" : "Enabled",
                    detail: "Disable or re-enable this rule without deleting it",
                    action: "toggleEnabled" as HighlightRuleAction
                },
                {
                    label: "$(case-sensitive) Toggle Case Sensitive",
                    description: term.caseSensitive ? "Case Sensitive" : "Case Insensitive",
                    detail: "Control whether matching respects casing",
                    action: "toggleCaseSensitive" as HighlightRuleAction
                },
                {
                    label: "$(regex) Change Match Mode",
                    description: getHighlightMatchModeLabel(term),
                    detail: "Choose whole word, substring, or regex matching",
                    action: "changeMatchMode" as HighlightRuleAction
                }
            ],
            {
                placeHolder: `Edit rule: ${term.text}`,
                title: "Highlight Rule"
            }
        );

        return selected?.action;
    }

    async #applyRuleAction(
        term: HighlightedTerm,
        action: HighlightRuleAction,
        terms: HighlightedTerm[]
    ): Promise<HighlightedTerm | undefined> {
        switch (action) {
            case "editText":
                return this.#editRuleText(term, terms);
            case "changeScope":
                return this.#changeRuleScope(term);
            case "toggleEnabled":
                return normalizeHighlightedTerm(
                    { ...term, enabled: !(term.enabled ?? true) },
                    this.#getCaseSensitiveConfig()
                );
            case "toggleCaseSensitive":
                return normalizeHighlightedTerm(
                    { ...term, caseSensitive: !term.caseSensitive },
                    this.#getCaseSensitiveConfig()
                );
            case "changeMatchMode":
                return this.#changeRuleMatchMode(term);
            default:
                return undefined;
        }
    }

    async #editRuleText(term: HighlightedTerm, terms: HighlightedTerm[]): Promise<HighlightedTerm | undefined> {
        const newText = await vscode.window.showInputBox({
            prompt: "Edit highlight text",
            value: term.text,
            validateInput: (value) => this.#validateEditedRuleText(value, term, terms)
        });

        if (!newText || newText.trim() === term.text) {
            return undefined;
        }

        const validationMessage = this.#validateEditedRuleText(newText, term, terms);
        if (validationMessage) {
            vscode.window.showErrorMessage(validationMessage);
            return undefined;
        }

        return normalizeHighlightedTerm(
            {
                ...term,
                text: newText.trim()
            },
            this.#getCaseSensitiveConfig()
        );
    }

    #validateEditedRuleText(
        value: string,
        term: HighlightedTerm,
        terms: HighlightedTerm[]
    ): string | null {
        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) {
            return "Highlight text cannot be empty.";
        }

        const duplicateIndex = this.#findTermIndex(
            terms,
            trimmedValue,
            undefined,
            term.id
        );
        if (duplicateIndex !== -1) {
            return "This highlight already exists.";
        }

        if (term.matchMode === "regex") {
            try {
                createHighlightRegex(trimmedValue, term.caseSensitive, "regex");
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return `Invalid regular expression: ${message}`;
            }
        }

        return null;
    }

    async #changeRuleScope(term: HighlightedTerm): Promise<HighlightedTerm | undefined> {
        const editor = vscode.window.activeTextEditor;
        const scopeOptions = [
            {
                label: "Global",
                detail: "Apply to every file",
                scopeType: "global" as HighlightScopeType
            },
            {
                label: "Current Workspace",
                detail: "Only apply inside the current workspace folder",
                scopeType: "workspace" as HighlightScopeType
            },
            {
                label: "Current File",
                detail: "Only apply to the active file",
                scopeType: "file" as HighlightScopeType
            },
            {
                label: "Current Language",
                detail: "Only apply to the active editor language",
                scopeType: "language" as HighlightScopeType
            }
        ];

        const selectedScope = await vscode.window.showQuickPick(scopeOptions, {
            placeHolder: `Current scope: ${getHighlightScopeLabel(term)}`,
            title: "Change Highlight Scope"
        });

        if (!selectedScope) {
            return undefined;
        }

        const scopeValue = this.#getScopeValueForSelection(selectedScope.scopeType, editor);
        if (selectedScope.scopeType !== "global" && !scopeValue) {
            return undefined;
        }

        return normalizeHighlightedTerm(
            {
                ...term,
                scopeType: selectedScope.scopeType,
                scopeValue
            },
            this.#getCaseSensitiveConfig()
        );
    }

    #getScopeValueForSelection(
        scopeType: HighlightScopeType,
        editor: vscode.TextEditor | undefined
    ): string | undefined {
        if (scopeType === "global") {
            return undefined;
        }

        if (!editor) {
            vscode.window.showWarningMessage("Open an editor before changing to file, workspace, or language scope.");
            return undefined;
        }

        switch (scopeType) {
            case "workspace": {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
                if (!workspaceFolder) {
                    vscode.window.showWarningMessage("The active file is not inside a workspace folder.");
                    return undefined;
                }
                return workspaceFolder.uri.toString();
            }
            case "file":
                return editor.document.uri.toString();
            case "language":
                return editor.document.languageId;
            default:
                return undefined;
        }
    }

    async #changeRuleMatchMode(term: HighlightedTerm): Promise<HighlightedTerm | undefined> {
        const options = [
            {
                label: "Whole Word",
                detail: "Match full words only",
                matchMode: "wholeWord" as HighlightMatchMode
            },
            {
                label: "Substring",
                detail: "Match any occurrence of the text",
                matchMode: "substring" as HighlightMatchMode
            },
            {
                label: "Regex",
                detail: "Treat the highlight text as a regular expression",
                matchMode: "regex" as HighlightMatchMode
            }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: `Current mode: ${getHighlightMatchModeLabel(term)}`,
            title: "Change Match Mode"
        });

        if (!selected || selected.matchMode === term.matchMode) {
            return undefined;
        }

        if (selected.matchMode === "regex") {
            try {
                createHighlightRegex(term.text, term.caseSensitive, "regex");
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Invalid regular expression: ${message}`);
                return undefined;
            }
        }

        return normalizeHighlightedTerm(
            {
                ...term,
                matchMode: selected.matchMode
            },
            this.#getCaseSensitiveConfig()
        );
    }

    /**
     * 获取颜色选择器选项
     */
    #getColorPickerOptions(): {
        label: string;
        description: string;
        detail: string;
        value: string;
    }[] {
        return [
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
    }

    /**
     * 显示颜色选择器
     */
    async #showColorPicker(): Promise<string | undefined> {
        const colorOptions = this.#getColorPickerOptions();

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
        const terms = this.#context.globalState.get<HighlightedTerm[]>(GLOBAL_STATE_KEY, []);
        return normalizeHighlightedTerms(terms, this.#getCaseSensitiveConfig());
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
    #findTermIndex(
        terms: HighlightedTerm[],
        text: string,
        document?: vscode.TextDocument,
        excludeId?: string
    ): number {
        const caseSensitive = this.#getCaseSensitiveConfig();
        return terms.findIndex((term) => {
            if (excludeId && term.id === excludeId) {
                return false;
            }
            if (document && !doesHighlightApplyToDocument(term, document)) {
                return false;
            }
            return EditorUtils.textEquals(term.text, text, caseSensitive);
        });
    }

    /**
     * 释放所有资源
     */
    dispose(): void {
        this.#decoratorManager.dispose();
        this.#highlightCache.clear();
    }
}
