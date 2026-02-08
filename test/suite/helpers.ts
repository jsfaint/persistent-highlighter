import * as vscode from 'vscode';
import { HighlightedTerm } from '../../src/types';

/**
 * 创建模拟的 ExtensionContext
 */
export function createMockContext(): vscode.ExtensionContext {
    const mockContext: any = {
        globalState: {
            get: (key: string, defaultValue?: any) => defaultValue || [],
            update: (key: string, value: any) => Promise.resolve(),
            keys: []
        },
        workspaceState: {
            get: () => {},
            update: () => Promise.resolve(),
            keys: []
        },
        subscriptions: [],
        extensionPath: '/mock/extension/path',
        storagePath: '/mock/storage/path',
        globalStoragePath: '/mock/global/storage/path',
        asAbsolutePath: (path: string) => path,
        extensionUri: vscode.Uri.parse('file:///mock/extension/path'),
        logPath: '/mock/log/path',
        languageModelAccessInformation: {} as any,
        secrets: {} as any
    };
    return mockContext as vscode.ExtensionContext;
}

/**
 * 创建模拟的 TextDocument
 */
export function createMockDocument(content: string, uri?: string): vscode.TextDocument {
    const mockDocument: any = {
        getText: () => content,
        get uri(): vscode.Uri {
            return vscode.Uri.parse(uri || 'file:///mock/document.txt');
        },
        get fileName(): string {
            return uri || 'mock-document.txt';
        },
        get lineCount(): number {
            return content.split('\n').length;
        },
        positionAt: (offset: number) => {
            const text = content.substring(0, offset);
            const lines = text.split('\n');
            const line = lines.length - 1;
            const character = lines[lines.length - 1].length;
            return new vscode.Position(line, character);
        },
        offsetAt: (position: vscode.Position) => {
            const lines = content.split('\n');
            let offset = 0;
            for (let i = 0; i < position.line; i++) {
                offset += lines[i].length + 1;
            }
            return offset + position.character;
        },
        getWordRangeAtPosition: () => undefined,
        lineAt: () => ({} as vscode.TextLine),
        save: () => Promise.resolve(true)
    };
    return mockDocument as vscode.TextDocument;
}

/**
 * 创建模拟的 TextEditor
 */
export function createMockEditor(document: vscode.TextDocument): vscode.TextEditor {
    const mockEditor: any = {
        document: document,
        selection: new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        ),
        selections: [],
        edit: (callback: (editBuilder: vscode.TextEditorEdit) => void) => {
            const editBuilder: any = {};
            callback(editBuilder);
            return Promise.resolve(true);
        },
        setDecorations: () => {},
        revealRange: () => {},
        show: () => {}
    };
    return mockEditor as vscode.TextEditor;
}

/**
 * 创建模拟的 Range
 */
export function createMockRange(startLine: number, startChar: number, endLine: number, endChar: number): vscode.Range {
    return new vscode.Range(
        new vscode.Position(startLine, startChar),
        new vscode.Position(endLine, endChar)
    );
}

/**
 * 创建测试用的高亮数据
 */
export function createMockTerms(): HighlightedTerm[] {
    return [
        { text: 'test', colorId: 0 },
        { text: 'highlight', colorId: 1 },
        { text: 'code', colorId: 2 }
    ];
}

/**
 * 创建模拟的 WorkspaceConfiguration
 */
export function createMockConfiguration(caseSensitive: boolean = false): vscode.WorkspaceConfiguration {
    const mockConfig: any = {
        get: (section: string, defaultValue?: any) => {
            if (section === 'persistent-highlighter.caseSensitive') {
                return caseSensitive;
            }
            return defaultValue;
        },
        has: (section: string) => section === 'persistent-highlighter.caseSensitive',
        update: () => Promise.resolve(),
        inspect: () => undefined
    };
    return mockConfig as vscode.WorkspaceConfiguration;
}

/**
 * 设置 vscode 模拟环境
 */
export function setupVSCodeMocks() {
    // Mock vscode.window - 避免使用展开运算符访问需要 API proposal 的属性
    (vscode as any).window = {
        activeTextEditor: undefined,
        visibleTextEditors: [],
        createTextEditorDecorationType: () => ({} as vscode.TextEditorDecorationType),
        showInformationMessage: () => Promise.resolve(''),
        showWarningMessage: () => Promise.resolve(''),
        showErrorMessage: () => Promise.resolve(''),
        showQuickPick: () => Promise.resolve(undefined),
        showInputBox: () => Promise.resolve(undefined),
        onDidChangeActiveTextEditor: () => ({ dispose: () => {} })
    };

    // Mock vscode.workspace
    (vscode as any).workspace = {
        getConfiguration: () => createMockConfiguration(),
        onDidChangeTextDocument: () => ({ dispose: () => {} }),
        onDidCloseTextDocument: () => ({ dispose: () => {} })
    };
}

/**
 * 清理 vscode 模拟环境
 */
export function cleanupVSCodeMocks() {
    // 恢复原始对象（如果需要）
    // 注意：这只是一个占位符，实际实现取决于你的测试框架
}
