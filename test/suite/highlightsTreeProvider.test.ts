import * as assert from 'assert';
import * as vscode from 'vscode';
import { HighlightsTreeProvider, HighlightItem } from '../../src/highlightsTreeProvider';
import {
    createMockContext,
    createMockDocument,
    createMockEditor,
    getMockVSCodeWindow,
    setupVSCodeMocks
} from './helpers';
import type { HighlightedTerm } from '../../src/types';
import type { MockExtensionContext } from './helpers';

suite('HighlightsTreeProvider 测试', () => {
    let mockContext: MockExtensionContext;
    let treeProvider: HighlightsTreeProvider;
    let mockDocument: vscode.TextDocument;
    let mockEditor: vscode.TextEditor;

    setup(() => {
        // 设置 VS Code mocks
        setupVSCodeMocks();

        // 创建测试数据
        mockContext = createMockContext();

        // 设置初始测试数据到 globalState
        let testTerms: HighlightedTerm[] = [
            { id: 'highlight:test', text: 'test', colorId: 0, enabled: true, caseSensitive: false, matchMode: 'wholeWord', scopeType: 'global' },
            { id: 'highlight:highlight', text: 'highlight', colorId: 1, enabled: true, caseSensitive: false, matchMode: 'wholeWord', scopeType: 'global' },
            { id: 'highlight:code', text: 'code', colorId: 2, enabled: true, caseSensitive: false, matchMode: 'wholeWord', scopeType: 'global' }
        ];
        mockContext.globalState.get = <T>(key: string, defaultValue?: T) => {
            if (key === 'persistentHighlighterTerms') {
                return testTerms as unknown as T;
            }
            return defaultValue as T;
        };
        mockContext.globalState.update = async (key: string, value: unknown) => {
            if (key === 'persistentHighlighterTerms') {
                testTerms = value as HighlightedTerm[];
            }
        };

        // 创建 mock 编辑器
        const testContent = 'This is a test document with highlight and code inside.\n' +
                           'The test should work correctly.';
        mockDocument = createMockDocument(testContent);
        mockEditor = createMockEditor(mockDocument);

        // 设置 activeTextEditor
        getMockVSCodeWindow().activeTextEditor = mockEditor;

        // 创建 TreeProvider
        treeProvider = new HighlightsTreeProvider(mockContext);
    });

    test('HighlightItem: 创建高亮项', () => {
        const item = new HighlightItem(
            'highlight:test',
            'test',
            0,
            vscode.TreeItemCollapsibleState.None,
            true,
            'Global',
            'Whole Word'
        );

        assert.strictEqual(item.label, 'test');
        assert.strictEqual(item.colorId, 0);
        assert.strictEqual(item.description, 'Global · Whole Word · Color 1');
        assert.strictEqual(item.contextValue, 'highlightItem');
        assert.ok(item.command);
    });

    test('HighlightItem: 自定义颜色高亮项', () => {
        const customColor = {
            light: { backgroundColor: 'rgba(255, 0, 0, 0.4)' },
            dark: { backgroundColor: 'rgba(255, 0, 0, 0.3)' }
        };

        const item = new HighlightItem(
            'highlight:test',
            'test',
            25,
            vscode.TreeItemCollapsibleState.None,
            true,
            'Global',
            'Whole Word',
            true,
            customColor
        );

        assert.strictEqual(item.label, 'test');
        assert.strictEqual(item.isCustomColor, true);
        assert.strictEqual(item.description, 'Global · Whole Word · Custom Color');
    });

    test('HighlightItem: uses command wiring without active editor state', () => {
        const item = new HighlightItem(
            'highlight:test',
            'test',
            0,
            vscode.TreeItemCollapsibleState.None,
            true,
            'Global',
            'Whole Word',
            false,
            undefined,
            undefined,
            2
        );

        assert.strictEqual(Object.prototype.hasOwnProperty.call(item, 'hasActiveEditor'), false);
        assert.strictEqual(item.tooltip, 'Click to jump to first occurrence of "test"');
        assert.ok(item.command);
        assert.strictEqual(item.command.command, 'persistent-highlighter.jumpToHighlight');
        assert.strictEqual(item.description, '2 in workspace · Global · Whole Word · Color 1');
    });

    test('HighlightsTreeProvider: 创建实例', () => {
        assert.ok(treeProvider);
        assert.strictEqual(typeof treeProvider.refresh, 'function');
        assert.strictEqual(typeof treeProvider.getChildren, 'function');
        assert.strictEqual(typeof treeProvider.getTreeItem, 'function');
    });

    test('HighlightsTreeProvider: 获取根节点子元素', async () => {
        const children = await treeProvider.getChildren();
        assert.ok(Array.isArray(children));
        assert.ok(children.length > 0);
    });

    test('HighlightsTreeProvider: 获取 TreeItem', async () => {
        const children = await treeProvider.getChildren();
        if (children.length > 0) {
            const treeItem = treeProvider.getTreeItem(children[0]);
            assert.ok(treeItem);
            assert.ok(treeItem instanceof vscode.TreeItem);
        }
    });

    test('HighlightsTreeProvider: rule items include active file and workspace match counts', async () => {
        const children = await treeProvider.getChildren();
        const testItem = children.find((child) => child instanceof HighlightItem && child.text === 'test') as HighlightItem | undefined;

        assert.ok(testItem);
        assert.ok(testItem.description?.toString().includes('2 in file'));
        assert.ok(testItem.description?.toString().includes('2 in workspace'));
    });

    test('HighlightsTreeProvider: rule items expose match location children', async () => {
        const children = await treeProvider.getChildren();
        const testItem = children.find((child) => child instanceof HighlightItem && child.text === 'test') as HighlightItem | undefined;

        assert.ok(testItem);
        const matchChildren = await treeProvider.getChildren(testItem);

        assert.ok(matchChildren.length > 0);
        assert.ok(matchChildren[0].command);
        assert.strictEqual(matchChildren[0].contextValue, 'highlightMatchLocation');
    });

    test('HighlightsTreeProvider: workspace-only matches are shown even when active file does not match the rule scope', async () => {
        await mockContext.globalState.update('persistentHighlighterTerms', [
            {
                id: 'highlight:workspace-test',
                text: 'test',
                colorId: 0,
                enabled: true,
                caseSensitive: false,
                matchMode: 'wholeWord',
                scopeType: 'file',
                scopeValue: 'file:///mock/document.txt'
            }
        ]);
        const activeDocument = createMockDocument('This active file does not contain the term.', 'file:///mock/active.txt');
        getMockVSCodeWindow().activeTextEditor = createMockEditor(activeDocument);

        const provider = new HighlightsTreeProvider(mockContext);
        const children = await provider.getChildren();
        const testItem = children.find((child) => child instanceof HighlightItem && child.text === 'test') as HighlightItem | undefined;

        assert.ok(testItem);
        assert.ok(testItem.description?.toString().includes('0 in file'));
        assert.ok(testItem.description?.toString().includes('2 in workspace'));
        provider.dispose();
    });

    test('HighlightsTreeProvider: refresh 方法', () => {
        // refresh 方法不应该抛出错误
        assert.doesNotThrow(() => {
            treeProvider.refresh();
        });
    });

    test('HighlightsTreeProvider: getTotalHighlights', () => {
        const total = treeProvider.getTotalHighlights();
        assert.strictEqual(total, 3);
    });

    test('HighlightsTreeProvider: removeHighlight', () => {
        const totalBefore = treeProvider.getTotalHighlights();
        treeProvider.removeHighlight('highlight:test');
        const totalAfter = treeProvider.getTotalHighlights();
        assert.strictEqual(totalAfter, totalBefore - 1);
    });

    test('HighlightsTreeProvider: editHighlight', () => {
        treeProvider.editHighlight('test', 'updated');
        const total = treeProvider.getTotalHighlights();
        assert.strictEqual(total, 3); // 数量不变
    });

    test('HighlightsTreeProvider: clearAllHighlights', () => {
        treeProvider.clearAllHighlights();
        const total = treeProvider.getTotalHighlights();
        assert.strictEqual(total, 0);
    });

    test('HighlightsTreeProvider: 移除不存在的高亮', () => {
        const totalBefore = treeProvider.getTotalHighlights();
        treeProvider.removeHighlight('nonexistent');
        const totalAfter = treeProvider.getTotalHighlights();
        assert.strictEqual(totalAfter, totalBefore); // 数量不变
    });

    test('HighlightsTreeProvider: 编辑不存在的高亮', () => {
        const totalBefore = treeProvider.getTotalHighlights();
        treeProvider.editHighlight('nonexistent', 'updated');
        const totalAfter = treeProvider.getTotalHighlights();
        assert.strictEqual(totalAfter, totalBefore); // 数量不变
    });

    test('HighlightsTreeProvider: 空列表时获取子元素', async () => {
        // 清空所有高亮
        treeProvider.clearAllHighlights();

        const children = await treeProvider.getChildren();
        assert.ok(Array.isArray(children));
        // 应该返回 "No highlights" 提示项
        if (children.length > 0) {
            assert.ok(children[0].label?.toString().includes('No highlights'));
        }
    });

    test('HighlightsTreeProvider: no active editor shows saved rules', async () => {
        getMockVSCodeWindow().activeTextEditor = undefined;

        const newProvider = new HighlightsTreeProvider(mockContext);
        const children = await newProvider.getChildren();
        const testItem = children.find((child) => child instanceof HighlightItem && child.text === 'test') as HighlightItem | undefined;

        assert.strictEqual(children.some((child) => child.label?.toString().includes('No active editor')), false);
        assert.ok(testItem);
        assert.ok(testItem.command);
        assert.strictEqual(testItem.command.command, 'persistent-highlighter.jumpToHighlight');
        assert.ok(testItem.description?.toString().includes('2 in workspace'));
        assert.strictEqual(testItem.description?.toString().includes('0 in file'), false);

        const matchChildren = await newProvider.getChildren(testItem);
        assert.ok(matchChildren.length > 0);
        assert.strictEqual(matchChildren[0].contextValue, 'highlightMatchLocation');
        assert.ok(matchChildren[0].command);
        newProvider.dispose();
    });

    test('HighlightsTreeProvider: onDidChangeTreeData 事件', (done) => {
        let eventFired = false;

        treeProvider.onDidChangeTreeData(() => {
            eventFired = true;
        });

        treeProvider.refresh();

        // 由于 refresh 是同步触发事件，检查是否触发
        assert.ok(eventFired);
        done();
    });

    test('HighlightsTreeProvider: dispose 方法释放事件监听器', () => {
        const newProvider = new HighlightsTreeProvider(mockContext);

        // dispose 不应该抛出错误
        assert.doesNotThrow(() => {
            newProvider.dispose();
        });
    });

    test('HighlightsTreeProvider: 多次 dispose 不应该报错', () => {
        const newProvider = new HighlightsTreeProvider(mockContext);

        assert.doesNotThrow(() => {
            newProvider.dispose();
            newProvider.dispose(); // 第二次调用
        });
    });
});
