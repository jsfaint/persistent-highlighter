import * as assert from 'assert';
import * as vscode from 'vscode';
import { HighlightsTreeProvider, HighlightItem } from '../../src/highlightsTreeProvider';
import {
    createMockContext,
    createMockDocument,
    createMockEditor,
    setupVSCodeMocks
} from './helpers';

suite('HighlightsTreeProvider 测试', () => {
    let mockContext: vscode.ExtensionContext;
    let treeProvider: HighlightsTreeProvider;
    let mockDocument: vscode.TextDocument;
    let mockEditor: vscode.TextEditor;

    setup(() => {
        // 设置 VS Code mocks
        setupVSCodeMocks();

        // 创建测试数据
        mockContext = createMockContext();

        // 设置初始测试数据到 globalState
        let testTerms = [
            { text: 'test', colorId: 0 },
            { text: 'highlight', colorId: 1 },
            { text: 'code', colorId: 2 }
        ];
        (mockContext.globalState as any).get = (key: string) => {
            if (key === 'persistentHighlighterTerms') {
                return testTerms;
            }
            return [];
        };
        (mockContext.globalState as any).update = (key: string, value: any) => {
            if (key === 'persistentHighlighterTerms') {
                testTerms = value;
            }
            return Promise.resolve();
        };

        // 创建 mock 编辑器
        const testContent = 'This is a test document with highlight and code inside.\n' +
                           'The test should work correctly.';
        mockDocument = createMockDocument(testContent);
        mockEditor = createMockEditor(mockDocument);

        // 设置 activeTextEditor
        (vscode.window as any).activeTextEditor = mockEditor;

        // 创建 TreeProvider
        treeProvider = new HighlightsTreeProvider(mockContext);
    });

    test('HighlightItem: 创建高亮项', () => {
        const item = new HighlightItem(
            'test',
            0,
            vscode.TreeItemCollapsibleState.None
        );

        assert.strictEqual(item.label, 'test');
        assert.strictEqual(item.colorId, 0);
        assert.strictEqual(item.description, 'Color 1');
        assert.strictEqual(item.contextValue, 'highlightItem');
        assert.ok(item.command);
    });

    test('HighlightItem: 自定义颜色高亮项', () => {
        const customColor = {
            light: { backgroundColor: 'rgba(255, 0, 0, 0.4)' },
            dark: { backgroundColor: 'rgba(255, 0, 0, 0.3)' }
        };

        const item = new HighlightItem(
            'test',
            25,
            vscode.TreeItemCollapsibleState.None,
            true,
            customColor
        );

        assert.strictEqual(item.label, 'test');
        assert.strictEqual(item.isCustomColor, true);
        assert.strictEqual(item.description, 'Custom Color');
    });

    test('HighlightItem: 无编辑器时禁用跳转', () => {
        const item = new HighlightItem(
            'test',
            0,
            vscode.TreeItemCollapsibleState.None,
            false,
            undefined,
            false // hasActiveEditor = false
        );

        assert.strictEqual(item.hasActiveEditor, false);
        assert.strictEqual(item.tooltip, 'No active editor - cannot jump to "test"');
        assert.strictEqual(item.command, undefined);
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
        treeProvider.removeHighlight('test');
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

    test('HighlightsTreeProvider: 无编辑器时获取子元素', async () => {
        // 设置无编辑器状态
        (vscode.window as any).activeTextEditor = undefined;

        const newProvider = new HighlightsTreeProvider(mockContext);
        const children = await newProvider.getChildren();

        assert.ok(Array.isArray(children));
        // 应该返回 "No active editor" 提示项
        if (children.length > 0) {
            assert.ok(children[0].label?.toString().includes('No active editor'));
        }
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
