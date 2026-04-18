import * as vscode from 'vscode';
import { HighlightedTerm } from '../../src/types';

export type MockMemento = vscode.Memento & {
    get<T>(key: string, defaultValue?: T): T;
    update(key: string, value: unknown): Promise<void>;
    keys(): readonly string[];
};

export interface MockSecretStorage extends vscode.SecretStorage {
    delete(key: string): Thenable<void>;
    get(key: string): Thenable<string | undefined>;
    onDidChange: vscode.Event<vscode.SecretStorageChangeEvent>;
    store(key: string, value: string): Thenable<void>;
}

export type MockExtensionContext = vscode.ExtensionContext & {
    globalState: MockMemento;
    workspaceState: MockMemento;
    secrets: MockSecretStorage;
};

export interface MockVSCodeWindow {
    activeTextEditor: vscode.TextEditor | undefined;
    visibleTextEditors: vscode.TextEditor[];
    createTextEditorDecorationType: typeof vscode.window.createTextEditorDecorationType;
    showInformationMessage: typeof vscode.window.showInformationMessage;
    showWarningMessage: typeof vscode.window.showWarningMessage;
    showErrorMessage: typeof vscode.window.showErrorMessage;
    showQuickPick: typeof vscode.window.showQuickPick;
    showInputBox: typeof vscode.window.showInputBox;
    onDidChangeActiveTextEditor: typeof vscode.window.onDidChangeActiveTextEditor;
}

export interface MockVSCodeWorkspace {
    getConfiguration: typeof vscode.workspace.getConfiguration;
    getWorkspaceFolder: typeof vscode.workspace.getWorkspaceFolder;
    onDidChangeTextDocument: typeof vscode.workspace.onDidChangeTextDocument;
    onDidCloseTextDocument: typeof vscode.workspace.onDidCloseTextDocument;
    onDidChangeConfiguration: typeof vscode.workspace.onDidChangeConfiguration;
}

function createMockMemento(): MockMemento {
    return {
        get: <T>(_: string, defaultValue?: T): T => defaultValue as T,
        update: async () => {},
        keys: () => []
    } as MockMemento;
}

function createMockSecrets(): MockSecretStorage {
    return {
        delete: async () => {},
        get: async () => undefined,
        onDidChange: () => ({ dispose: () => {} }),
        store: async () => {}
    };
}

type MutableVSCodeBindings = {
    window: MockVSCodeWindow;
    workspace: MockVSCodeWorkspace;
};

export function getMockVSCodeWindow(): MockVSCodeWindow {
    return (vscode as unknown as MutableVSCodeBindings).window;
}

export function getMockVSCodeWorkspace(): MockVSCodeWorkspace {
    return (vscode as unknown as MutableVSCodeBindings).workspace;
}

/**
 * 创建模拟的 ExtensionContext
 */
export function createMockContext(): MockExtensionContext {
    const mockContext = {
        globalState: createMockMemento(),
        workspaceState: createMockMemento(),
        subscriptions: [],
        extensionPath: '/mock/extension/path',
        storagePath: '/mock/storage/path',
        globalStoragePath: '/mock/global/storage/path',
        asAbsolutePath: (path: string) => path,
        extensionUri: vscode.Uri.parse('file:///mock/extension/path'),
        logPath: '/mock/log/path',
        languageModelAccessInformation: {} as unknown as vscode.LanguageModelAccessInformation,
        secrets: createMockSecrets()
    };
    return mockContext as unknown as MockExtensionContext;
}

/**
 * 创建模拟的 TextDocument
 */
export function createMockDocument(content: string, uri?: string): vscode.TextDocument {
    const resolvedUri = vscode.Uri.parse(uri || 'file:///mock/document.txt');
    const mockDocument = {
        getText: () => content,
        languageId: 'typescript',
        uri: resolvedUri,
        fileName: uri || 'mock-document.txt',
        lineCount: content.split('\n').length,
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
    return mockDocument as unknown as vscode.TextDocument;
}

/**
 * 创建模拟的 TextEditor
 */
export function createMockEditor(document: vscode.TextDocument): vscode.TextEditor {
    const mockEditor = {
        document: document,
        selection: new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, 0)
        ),
        selections: [],
        edit: (callback: (editBuilder: vscode.TextEditorEdit) => void) => {
            const editBuilder = {} as unknown as vscode.TextEditorEdit;
            callback(editBuilder);
            return Promise.resolve(true);
        },
        setDecorations: () => {},
        revealRange: () => {},
        show: () => {}
    };
    return mockEditor as unknown as vscode.TextEditor;
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
        { id: 'highlight:test', text: 'test', colorId: 0, enabled: true, caseSensitive: false, matchMode: 'wholeWord', scopeType: 'global' },
        { id: 'highlight:highlight', text: 'highlight', colorId: 1, enabled: true, caseSensitive: false, matchMode: 'wholeWord', scopeType: 'global' },
        { id: 'highlight:code', text: 'code', colorId: 2, enabled: true, caseSensitive: false, matchMode: 'wholeWord', scopeType: 'global' }
    ];
}

/**
 * 创建模拟的 WorkspaceConfiguration
 */
export function createMockConfiguration(caseSensitive: boolean = false): vscode.WorkspaceConfiguration {
    const mockConfig = {
        get: <T>(section: string, defaultValue?: T) => {
            if (section === 'persistent-highlighter.caseSensitive' || section === 'caseSensitive') {
                return caseSensitive as T;
            }
            return defaultValue;
        },
        has: (section: string) => section === 'persistent-highlighter.caseSensitive',
        update: () => Promise.resolve(),
        inspect: () => undefined
    };
    return mockConfig as unknown as vscode.WorkspaceConfiguration;
}

/**
 * 设置 vscode 模拟环境
 */
export function setupVSCodeMocks() {
    // Mock vscode.window - 避免使用展开运算符访问需要 API proposal 的属性
    const mockWindow: MockVSCodeWindow = {
        activeTextEditor: undefined,
        visibleTextEditors: [],
        createTextEditorDecorationType: () => ({} as vscode.TextEditorDecorationType),
        showInformationMessage: (async () => '') as MockVSCodeWindow['showInformationMessage'],
        showWarningMessage: (async () => '') as MockVSCodeWindow['showWarningMessage'],
        showErrorMessage: (async () => '') as MockVSCodeWindow['showErrorMessage'],
        showQuickPick: (async () => undefined) as MockVSCodeWindow['showQuickPick'],
        showInputBox: (async () => undefined) as MockVSCodeWindow['showInputBox'],
        onDidChangeActiveTextEditor: () => ({ dispose: () => {} })
    };

    // Mock vscode.workspace
    const mockWorkspace: MockVSCodeWorkspace = {
        getConfiguration: () => createMockConfiguration(),
        getWorkspaceFolder: () => ({
            uri: vscode.Uri.parse('file:///mock'),
            name: 'mock',
            index: 0
        }),
        onDidChangeTextDocument: () => ({ dispose: () => {} }),
        onDidCloseTextDocument: () => ({ dispose: () => {} }),
        onDidChangeConfiguration: () => ({ dispose: () => {} })
    };

    const mutableVscode = vscode as unknown as MutableVSCodeBindings;
    mutableVscode.window = mockWindow;
    mutableVscode.workspace = mockWorkspace;
}

/**
 * 清理 vscode 模拟环境
 */
export function cleanupVSCodeMocks() {
    // 恢复原始对象（如果需要）
    // 注意：这只是一个占位符，实际实现取决于你的测试框架
}
