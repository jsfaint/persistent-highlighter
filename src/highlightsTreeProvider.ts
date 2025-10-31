import * as vscode from 'vscode';

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

    constructor(private context: vscode.ExtensionContext) {
        // 初始化当前编辑器
        this.currentEditor = vscode.window.activeTextEditor;

        // 监听活动编辑器变化
        vscode.window.onDidChangeActiveTextEditor((editor) => {
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
        } else {
            const terms = this.getTerms();

            // 如果没有当前编辑器，显示提示信息
            if (!this.currentEditor) {
                const noEditorItem = new vscode.TreeItem('No active editor', vscode.TreeItemCollapsibleState.None);
                noEditorItem.description = 'Open a file to see highlights';
                noEditorItem.iconPath = new vscode.ThemeIcon('info');
                noEditorItem.contextValue = 'noEditor';
                return Promise.resolve([noEditorItem as HighlightItem]);
            }

            // 获取当前文件内容
            const currentDocument = this.currentEditor.document;
            const fileContent = currentDocument.getText();
            const caseSensitive = vscode.workspace.getConfiguration('persistent-highlighter').get<boolean>('caseSensitive', false);

            // 只显示在当前文件中存在的高亮项
            const activeTerms = terms.filter(term => {
                if (!term.text || typeof term.text !== 'string') {
                    return false;
                }

                try {
                    if (caseSensitive) {
                        return fileContent.includes(term.text);
                    } else {
                        return fileContent.toLowerCase().includes(term.text.toLowerCase());
                    }
                } catch (error) {
                    return false;
                }
            });

            // 如果当前文件没有高亮项，显示提示
            if (activeTerms.length === 0) {
                const noHighlightsItem = new vscode.TreeItem('No highlights in current file');
                noHighlightsItem.description = 'Add highlights to see them here';
                noHighlightsItem.iconPath = new vscode.ThemeIcon('symbol-color');
                noHighlightsItem.contextValue = 'noHighlights';
                return Promise.resolve([noHighlightsItem as HighlightItem]);
            }

            return Promise.resolve(
                activeTerms.map(term =>
                    new HighlightItem(
                        term.text,
                        term.colorId,
                        vscode.TreeItemCollapsibleState.None,
                        term.isCustomColor,
                        term.customColor,
                        true // 有活跃编辑器，启用跳转
                    )
                )
            );
        }
    }

    private getTerms(): Array<{ text: string, colorId: number, isCustomColor?: boolean, customColor?: { light: { backgroundColor: string }, dark: { backgroundColor: string } } }> {
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