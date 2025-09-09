import * as vscode from 'vscode';

export class HighlightItem extends vscode.TreeItem {
    constructor(
        public readonly text: string,
        public readonly colorId: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(text, collapsibleState);

        this.tooltip = `Click to jump to first occurrence of "${text}"`;
        this.description = `Color ${colorId + 1}`;
        this.iconPath = new vscode.ThemeIcon('symbol-color');
        this.contextValue = 'highlightItem';
        this.command = {
            command: 'persistent-highlighter.jumpToHighlight',
            title: 'Jump to Highlight',
            arguments: [text]
        };
    }
}

export class HighlightsTreeProvider implements vscode.TreeDataProvider<HighlightItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HighlightItem | undefined | null | void> = new vscode.EventEmitter<HighlightItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HighlightItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HighlightItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HighlightItem): Thenable<HighlightItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            const terms = this.getTerms();
            return Promise.resolve(
                terms.map(term =>
                    new HighlightItem(
                        term.text,
                        term.colorId,
                        vscode.TreeItemCollapsibleState.None
                    )
                )
            );
        }
    }

    private getTerms(): Array<{ text: string, colorId: number }> {
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
}