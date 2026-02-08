import * as vscode from 'vscode';
import { EditorUtils } from './utils/editor-utils';
import type { HighlightedTerm } from './types';

export class HighlightItem extends vscode.TreeItem {
    constructor(
        public readonly text: string,
        public readonly colorId: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isCustomColor?: boolean,
        public readonly customColor?: {
            light: { backgroundColor: string };
            dark: { backgroundColor: string };
        },
        public readonly hasActiveEditor: boolean = true
    ) {
        super(text, collapsibleState);

        this.description = isCustomColor ? `Custom Color` : `Color ${colorId + 1}`;
        this.iconPath = new vscode.ThemeIcon('symbol-color');
        this.contextValue = 'highlightItem';

        if (hasActiveEditor) {
            this.tooltip = `Click to jump to first occurrence of "${text}"`;
            this.command = {
                command: 'persistent-highlighter.jumpToHighlight',
                title: 'Jump to Highlight',
                arguments: [text]
            };
        } else {
            this.tooltip = `No active editor - cannot jump to "${text}"`;
            this.command = undefined; // 禁用跳转
        }
    }
}

export class HighlightsTreeProvider implements vscode.TreeDataProvider<HighlightItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HighlightItem | undefined | null | void> = new vscode.EventEmitter<HighlightItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HighlightItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private currentEditor: vscode.TextEditor | undefined;
    private editorChangeListener: vscode.Disposable;

    constructor(private context: vscode.ExtensionContext) {
        this.currentEditor = vscode.window.activeTextEditor;

        this.editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
            this.currentEditor = editor;
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HighlightItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HighlightItem): Thenable<HighlightItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        if (!this.currentEditor) {
            return Promise.resolve([this.createNoEditorItem()]);
        }

        const activeTerms = this.getActiveTermsForCurrentFile();
        if (activeTerms.length === 0) {
            return Promise.resolve([this.createNoHighlightsItem()]);
        }

        return Promise.resolve(
            activeTerms.map(term => this.createHighlightItem(term))
        );
    }

    private createNoEditorItem(): HighlightItem {
        const item = new vscode.TreeItem('No active editor', vscode.TreeItemCollapsibleState.None);
        item.description = 'Open a file to see highlights';
        item.iconPath = new vscode.ThemeIcon('info');
        item.contextValue = 'noEditor';
        return item as HighlightItem;
    }

    private createNoHighlightsItem(): HighlightItem {
        const item = new vscode.TreeItem('No highlights in current file');
        item.description = 'Add highlights to see them here';
        item.iconPath = new vscode.ThemeIcon('symbol-color');
        item.contextValue = 'noHighlights';
        return item as HighlightItem;
    }

    private createHighlightItem(term: HighlightedTerm): HighlightItem {
        return new HighlightItem(
            term.text,
            term.colorId,
            vscode.TreeItemCollapsibleState.None,
            term.isCustomColor,
            term.customColor,
            true
        );
    }

    private getActiveTermsForCurrentFile(): HighlightedTerm[] {
        const terms = this.getTerms();
        if (!this.currentEditor) {
            return [];
        }

        const fileContent = this.currentEditor.document.getText();
        const caseSensitive = this.getCaseSensitiveConfig();

        return terms.filter(term => EditorUtils.isTermInFile(term, fileContent, caseSensitive));
    }

    private getCaseSensitiveConfig(): boolean {
        return vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);
    }

    private getTerms(): HighlightedTerm[] {
        return this.context.globalState.get('persistentHighlighterTerms', []);
    }

    removeHighlight(text: string): void {
        const terms = this.getTerms();
        const termIndex = terms.findIndex(t => t.text === text);
        if (termIndex !== -1) {
            terms.splice(termIndex, 1);
            this.context.globalState.update('persistentHighlighterTerms', terms);
            this.refresh();
        }
    }

    editHighlight(oldText: string, newText: string): void {
        const terms = this.getTerms();
        const termIndex = terms.findIndex(t => t.text === oldText);
        if (termIndex !== -1) {
            terms[termIndex].text = newText;
            this.context.globalState.update('persistentHighlighterTerms', terms);
            this.refresh();
        }
    }

    clearAllHighlights(): void {
        this.context.globalState.update('persistentHighlighterTerms', []);
        this.refresh();
    }

    getTotalHighlights(): number {
        return this.getTerms().length;
    }

    /**
     * 释放事件监听器，防止内存泄漏
     */
    dispose(): void {
        this._onDidChangeTreeData.dispose();
        this.editorChangeListener.dispose();
    }
}