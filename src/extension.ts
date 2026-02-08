import * as vscode from "vscode";
import { HighlightsTreeProvider, HighlightItem } from "./highlightsTreeProvider";
import { HighlightManager } from "./highlight-manager";

// 保存全局实例用于资源清理
let highlightManagerInstance: HighlightManager | undefined;
let treeProviderInstance: HighlightsTreeProvider | undefined;

/**
 * 激活扩展
 */
export function activate(context: vscode.ExtensionContext): void {
    const treeProvider = new HighlightsTreeProvider(context);
    const highlightManager = new HighlightManager(context, treeProvider);

    // 保存实例引用用于清理
    highlightManagerInstance = highlightManager;
    treeProviderInstance = treeProvider;

    // 注册侧边栏视图
    vscode.window.registerTreeDataProvider('highlightsView', treeProvider);

    // 创建树视图
    const treeView = vscode.window.createTreeView('highlightsView', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });

    // 注册所有命令
    const disposables = registerCommands(highlightManager, treeProvider);

    // 将所有订阅添加到上下文
    context.subscriptions.push(
        ...disposables,
        treeView,
        highlightManager,
        treeProvider
    );
}

/**
 * 获取命令配置
 */
function getCommandConfig(highlightManager: HighlightManager, treeProvider: HighlightsTreeProvider): {
    command: string;
    callback: (...args: unknown[]) => unknown;
}[] {
    return [
        { command: "persistent-highlighter.addHighlight", callback: () => highlightManager.addHighlight() },
        { command: "persistent-highlighter.removeHighlight", callback: () => highlightManager.removeHighlight() },
        { command: "persistent-highlighter.toggleHighlight", callback: () => highlightManager.toggleHighlight() },
        { command: "persistent-highlighter.clearAllHighlights", callback: () => highlightManager.clearAllHighlights() },
        { command: "persistent-highlighter.addHighlightWithCustomColor", callback: () => highlightManager.addHighlightWithCustomColor() },
        { command: "persistent-highlighter.jumpToHighlight", callback: (text: unknown) => highlightManager.jumpToHighlight(text as string) },
        { command: "persistent-highlighter.jumpToNextHighlight", callback: () => highlightManager.jumpToNextHighlight() },
        { command: "persistent-highlighter.jumpToPrevHighlight", callback: () => highlightManager.jumpToPrevHighlight() },
        { command: "persistent-highlighter.refreshTree", callback: () => treeProvider.refresh() },
        {
            command: "persistent-highlighter.removeHighlightFromTree",
            callback: (item: unknown) => {
                const hi = item as HighlightItem;
                treeProvider.removeHighlight(hi.text);
                highlightManager.refreshHighlights();
            }
        },
        {
            command: "persistent-highlighter.editHighlight",
            callback: async (item: unknown) => {
                const hi = item as HighlightItem;
                const newText = await vscode.window.showInputBox({
                    prompt: 'Edit highlight text',
                    value: hi.text
                });
                if (newText && newText !== hi.text) {
                    treeProvider.editHighlight(hi.text, newText);
                    highlightManager.refreshHighlights();
                }
            }
        },
        // 右键菜单命令
        { command: "persistent-highlighter.contextMenuAddHighlight", callback: () => highlightManager.addHighlight() },
        { command: "persistent-highlighter.contextMenuRemoveHighlight", callback: () => highlightManager.removeHighlight() },
        { command: "persistent-highlighter.contextMenuToggleHighlight", callback: () => highlightManager.toggleHighlight() },
        { command: "persistent-highlighter.contextMenuCustomColor", callback: () => highlightManager.addHighlightWithCustomColor() },
    ];
}

/**
 * 注册所有命令
 */
function registerCommands(
    highlightManager: HighlightManager,
    treeProvider: HighlightsTreeProvider
): vscode.Disposable[] {
    const commands = getCommandConfig(highlightManager, treeProvider);
    return commands.map(({ command, callback }) => vscode.commands.registerCommand(command, callback));
}

/**
 * 停用扩展
 */
export function deactivate(): void {
    // 释放 HighlightManager 的资源
    if (highlightManagerInstance) {
        highlightManagerInstance.dispose();
        highlightManagerInstance = undefined;
    }

    // 释放 HighlightsTreeProvider 的资源
    if (treeProviderInstance) {
        treeProviderInstance.dispose();
        treeProviderInstance = undefined;
    }
}
