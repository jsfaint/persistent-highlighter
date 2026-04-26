import * as vscode from 'vscode';
import { GLOBAL_STATE_KEY } from './constants';
import { EditorUtils } from './utils/editor-utils';
import type { HighlightMatchLocation, HighlightedTerm } from './types';
import { WorkspaceMatchUtils } from './utils/workspace-match-utils';
import {
    doesHighlightApplyToDocument,
    getHighlightMatchModeLabel,
    getHighlightScopeLabel,
    normalizeHighlightedTerms
} from './utils/highlight-term-utils';

type HighlightTreeItem = HighlightItem | MatchLocationItem;

export class HighlightItem extends vscode.TreeItem {
    constructor(
        public readonly ruleId: string,
        public readonly text: string,
        public readonly colorId: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly isEnabled: boolean,
        public readonly scopeLabel: string,
        public readonly matchModeLabel: string,
        public readonly isCustomColor?: boolean,
        public readonly customColor?: {
            light: { backgroundColor: string };
            dark: { backgroundColor: string };
        },
        public readonly activeFileMatchCount?: number,
        public readonly workspaceMatchCount: number = 0
    ) {
        super(text, workspaceMatchCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : collapsibleState);

        const colorLabel = isCustomColor ? 'Custom Color' : `Color ${colorId + 1}`;
        const statusLabel = isEnabled ? undefined : 'Disabled';
        const matchLabel = this.createMatchLabel(activeFileMatchCount, workspaceMatchCount);
        this.description = [statusLabel, matchLabel, scopeLabel, matchModeLabel, colorLabel].filter(Boolean).join(' · ');
        this.iconPath = new vscode.ThemeIcon('symbol-color');
        this.contextValue = 'highlightItem';
        this.tooltip = `Click to jump to first occurrence of "${text}"`;
        this.command = {
            command: 'persistent-highlighter.jumpToHighlight',
            title: 'Jump to Highlight',
            arguments: [text]
        };
    }

    private createMatchLabel(activeFileMatchCount: number | undefined, workspaceMatchCount: number): string | undefined {
        if (workspaceMatchCount > 0) {
            if (activeFileMatchCount === undefined) {
                return `${workspaceMatchCount} in workspace`;
            }

            return `${activeFileMatchCount} in file · ${workspaceMatchCount} in workspace`;
        }

        if (activeFileMatchCount !== undefined && activeFileMatchCount > 0) {
            return `${activeFileMatchCount} in file`;
        }

        return undefined;
    }
}

export class MatchLocationItem extends vscode.TreeItem {
    constructor(public readonly match: HighlightMatchLocation) {
        super(`${match.fileName}:${match.line}:${match.character}`, vscode.TreeItemCollapsibleState.None);
        this.description = match.preview;
        this.tooltip = `${match.fileName}:${match.line}:${match.character}\n${match.preview}`;
        this.iconPath = new vscode.ThemeIcon('location');
        this.contextValue = 'highlightMatchLocation';
        this.command = {
            command: 'persistent-highlighter.openMatchLocation',
            title: 'Open Match Location',
            arguments: [match]
        };
    }
}

export class HighlightsTreeProvider implements vscode.TreeDataProvider<HighlightTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HighlightTreeItem | undefined | null | void> = new vscode.EventEmitter<HighlightTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HighlightTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
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

    getTreeItem(element: HighlightTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: HighlightTreeItem): Promise<HighlightTreeItem[]> {
        if (element) {
            if (element instanceof HighlightItem) {
                const term = this.getTerms().find((candidate) => candidate.id === element.ruleId);
                if (!term) {
                    return [];
                }

                const workspaceFolder = WorkspaceMatchUtils.getCurrentWorkspaceFolder(this.currentEditor);
                if (!workspaceFolder) {
                    return [];
                }

                const matches = await WorkspaceMatchUtils.findMatchesForTerm(term, workspaceFolder, this.getCaseSensitiveConfig());
                return matches.map((match) => new MatchLocationItem(match));
            }

            return [];
        }

        const activeTerms = await this.getVisibleTermsForCurrentContext();
        if (activeTerms.length === 0) {
            return [this.createNoHighlightsItem()];
        }

        return activeTerms.map(({ term, activeFileMatchCount, workspaceMatchCount }) =>
            this.createHighlightItem(term, activeFileMatchCount, workspaceMatchCount)
        );
    }

    private createNoHighlightsItem(): HighlightItem {
        const item = new vscode.TreeItem('No highlights in current file');
        item.description = 'Add highlights to see them here';
        item.iconPath = new vscode.ThemeIcon('symbol-color');
        item.contextValue = 'noHighlights';
        return item as HighlightItem;
    }

    private createHighlightItem(
        term: HighlightedTerm,
        activeFileMatchCount: number | undefined,
        workspaceMatchCount: number
    ): HighlightItem {
        return new HighlightItem(
            term.id ?? term.text,
            term.text,
            term.colorId,
            workspaceMatchCount > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            term.enabled ?? true,
            getHighlightScopeLabel(term),
            getHighlightMatchModeLabel(term),
            term.isCustomColor,
            term.customColor,
            activeFileMatchCount,
            workspaceMatchCount
        );
    }

    private async getVisibleTermsForCurrentContext(): Promise<{
        term: HighlightedTerm;
        activeFileMatchCount: number | undefined;
        workspaceMatchCount: number;
    }[]> {
        const terms = this.getTerms();
        const currentEditor = this.currentEditor;
        const caseSensitive = this.getCaseSensitiveConfig();
        const workspaceFolder = WorkspaceMatchUtils.getCurrentWorkspaceFolder(currentEditor);
        const result: {
            term: HighlightedTerm;
            activeFileMatchCount: number | undefined;
            workspaceMatchCount: number;
        }[] = [];

        if (!currentEditor) {
            for (const term of terms) {
                const workspaceMatchCount = workspaceFolder
                    ? (await WorkspaceMatchUtils.findMatchesForTerm(term, workspaceFolder, caseSensitive)).length
                    : 0;
                result.push({ term, activeFileMatchCount: undefined, workspaceMatchCount });
            }

            return result;
        }

        for (const term of terms.filter((candidate) => candidate.enabled !== false)) {
            const activeFileMatchCount = doesHighlightApplyToDocument(term, currentEditor.document)
                ? EditorUtils.findHighlightRanges(currentEditor.document, term, caseSensitive).length
                : 0;
            const workspaceMatchCount = workspaceFolder
                ? (await WorkspaceMatchUtils.findMatchesForTerm(term, workspaceFolder, caseSensitive)).length
                : 0;

            if (activeFileMatchCount > 0 || workspaceMatchCount > 0) {
                result.push({ term, activeFileMatchCount, workspaceMatchCount });
            }
        }

        return result;
    }

    private getCaseSensitiveConfig(): boolean {
        return vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);
    }

    private getTerms(): HighlightedTerm[] {
        const terms = this.context.globalState.get<HighlightedTerm[]>(GLOBAL_STATE_KEY, []);
        return normalizeHighlightedTerms(terms, this.getCaseSensitiveConfig());
    }

    removeHighlight(identifier: string): void {
        const terms = this.getTerms();
        const termIndex = terms.findIndex((t) => t.id === identifier || t.text === identifier);
        if (termIndex !== -1) {
            terms.splice(termIndex, 1);
            this.context.globalState.update(GLOBAL_STATE_KEY, terms);
            this.refresh();
        }
    }

    editHighlight(oldText: string, newText: string): void {
        const terms = this.getTerms();
        const termIndex = terms.findIndex(t => t.text === oldText);
        if (termIndex !== -1) {
            terms[termIndex].text = newText;
            this.context.globalState.update(GLOBAL_STATE_KEY, terms);
            this.refresh();
        }
    }

    clearAllHighlights(): void {
        this.context.globalState.update(GLOBAL_STATE_KEY, []);
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
