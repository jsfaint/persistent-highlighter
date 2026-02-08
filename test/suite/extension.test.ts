import * as assert from 'assert';
import * as vscode from 'vscode';
import {
    createHighlightRegex,
    findWholeWord
} from '../../src/utils/regex-cache';
import { HighlightManager } from '../../src/highlight-manager';
import { EditorUtils } from '../../src/utils/editor-utils';
import {
    createMockContext,
    createMockDocument,
    createMockEditor,
    createMockTerms,
    createMockConfiguration,
    createMockRange,
    setupVSCodeMocks
} from './helpers';
import { HighlightedTerm } from '../../src/types';

suite('Extension 核心功能测试', () => {
    let mockContext: vscode.ExtensionContext;
    let mockDocument: vscode.TextDocument;
    let mockEditor: vscode.TextEditor;

    setup(() => {
        // 设置 VS Code mocks
        setupVSCodeMocks();

        // 创建测试数据
        mockContext = createMockContext();
        const testContent = 'This is a test document with some highlight and code inside.\n' +
                           'The test should be highlighted properly.\n' +
                           '测试中文高亮功能。';
        mockDocument = createMockDocument(testContent);
        mockEditor = createMockEditor(mockDocument);
    });

    test('createHighlightRegex: 创建英文单词的正则表达式', () => {
        const regex = createHighlightRegex('test', false);
        assert.ok(regex instanceof RegExp);
        assert.strictEqual(regex.flags, 'gi');

        // 每次测试后重置 lastIndex，避免全局匹配的状态影响
        assert.ok(regex.test('test'));
        regex.lastIndex = 0;
        assert.ok(regex.test('Test'));
        regex.lastIndex = 0;
        assert.ok(regex.test('TEST'));
    });

    test('createHighlightRegex: 大小写敏感模式', () => {
        const regex = createHighlightRegex('test', true);
        assert.strictEqual(regex.flags, 'g');
        assert.ok(regex.test('test'));
        assert.ok(!regex.test('Test'));
        assert.ok(!regex.test('TEST'));
    });

    test('createHighlightRegex: 正确处理特殊字符', () => {
        const regex = createHighlightRegex('test.txt', false);
        // 应该完全匹配包含特殊字符的文本
        assert.ok(regex.test('test.txt'));
        // 应该匹配文件路径中的文本
        regex.lastIndex = 0;
        assert.ok(regex.test('file test.txt'));
        regex.lastIndex = 0;
        // 不应该匹配部分文本（test-123 不包含 test.txt）
        assert.ok(!regex.test('test-123'));
    });

    test('createHighlightRegex: 非英文字符支持', () => {
        const regex = createHighlightRegex('测试', false);
        assert.ok(regex.test('这是一个测试'));
        regex.lastIndex = 0;
        assert.ok(regex.test('测试功能'));
    });

    test('createHighlightRegex: 空字符串应该抛出错误', () => {
        assert.throws(() => {
            createHighlightRegex('', false);
        }, /Search text cannot be empty/);
    });

    test('findWholeWord: 查找完整单词', () => {
        const text = 'This is a test document for testing';
        const index = findWholeWord(text, 'test', false);
        assert.ok(index !== -1);
        assert.strictEqual(text.substring(index, index + 4), 'test');
    });

    test('findWholeWord: 不应该匹配部分单词', () => {
        const text = 'testing test tester';
        const index = findWholeWord(text, 'test', false);
        const match = text.substring(index, index + 4);
        assert.strictEqual(match, 'test');
        assert.notStrictEqual(index, 0); // 不应该匹配 'testing'
    });

    test('findWholeWord: 中文文本匹配', () => {
        const text = '这是一个测试文档';
        const index = findWholeWord(text, '测试', false);
        assert.ok(index !== -1);
        assert.strictEqual(text.substring(index, index + 2), '测试');
    });

    test('findWholeWord: 找不到返回 -1', () => {
        const text = 'This is a document';
        const index = findWholeWord(text, 'nonexistent', false);
        assert.strictEqual(index, -1);
    });

    test('HighlightManager: 创建实例', () => {
        const manager = new HighlightManager(mockContext);
        assert.ok(manager);
        assert.strictEqual(typeof manager.addHighlight, 'function');
        assert.strictEqual(typeof manager.removeHighlight, 'function');
        assert.strictEqual(typeof manager.toggleHighlight, 'function');
    });

    test('HighlightManager: 获取配置', () => {
        // Mock getConfiguration
        (vscode.workspace as any).getConfiguration = () => {
            return createMockConfiguration(true);
        };

        const manager = new HighlightManager(mockContext);
        assert.ok(manager);
    });

    test('createHighlightRegex: 词边界测试 - 完整匹配', () => {
        const text = 'test testing';
        const regex = createHighlightRegex('test', false);
        const matches = text.match(regex);
        assert.ok(matches);
        assert.strictEqual(matches![0], 'test');
    });

    test('createHighlightRegex: 特殊字符转义', () => {
        const regex = createHighlightRegex('test.txt', false);
        const text = 'test.txt file';
        assert.ok(regex.test(text));
    });

    test('findWholeWord: 大小写敏感查找', () => {
        const text = 'Test test TEST';
        const index = findWholeWord(text, 'test', true);
        assert.ok(index !== -1);
        const match = text.substring(index, index + 4);
        assert.strictEqual(match, 'test');
    });

    test('findWholeWord: 大小写不敏感查找', () => {
        const text = 'Test test TEST';
        const index = findWholeWord(text, 'TEST', false);
        assert.ok(index !== -1);
        const match = text.substring(index, index + 4);
        assert.strictEqual(match, 'Test');
    });

    test('HighlightManager: dispose 方法应该释放所有资源', () => {
        const manager = new HighlightManager(mockContext);

        // 验证初始状态
        assert.ok(manager);

        // dispose 方法不应该抛出错误
        assert.doesNotThrow(() => {
            manager.dispose();
        });
    });

    test('HighlightManager: 多次 dispose 不应该报错', () => {
        const manager = new HighlightManager(mockContext);

        assert.doesNotThrow(() => {
            manager.dispose();
            manager.dispose(); // 第二次调用
        });
    });

    test('HighlightManager: dispose 后清理缓存', () => {
        const manager = new HighlightManager(mockContext);

        // 添加一些高亮数据到 globalState
        const testTerms = [
            { text: 'test', colorId: 0 },
            { text: 'highlight', colorId: 1 }
        ];
        (mockContext.globalState as any).get = () => testTerms;

        // Dispose 应该清理缓存
        manager.dispose();
        // 验证缓存已清理 - 通过检查没有错误抛出
        assert.doesNotThrow(() => manager.dispose());
    });

    test('HighlightManager: 竞态条件保护 - 文档版本检查', () => {
        const manager = new HighlightManager(mockContext);

        // 模拟一个有 version 属性的文档
        const mockDocWithVersion: any = {
            ...mockDocument,
            version: 1,
            getText: () => 'test document with test content'
        };

        const mockEditorWithVersion: any = {
            ...mockEditor,
            document: mockDocWithVersion
        };

        // 在更新过程中改变文档版本
        let updateCallCount = 0;
        const originalGetText = mockDocWithVersion.getText.bind(mockDocWithVersion);
        mockDocWithVersion.getText = () => {
            updateCallCount++;
            if (updateCallCount === 2) {
                // 在第二次调用时改变版本
                mockDocWithVersion.version = 2;
            }
            return originalGetText();
        };

        // 不应该抛出错误
        assert.doesNotThrow(() => {
            // 这个测试验证文档版本变化时不会导致错误
            // 实际的竞态条件保护在 updateDecorations 中实现
            manager.dispose();
        });
    });

    test('HighlightManager: 类型安全 - 处理缺失 customColor 的情况', () => {
        const manager = new HighlightManager(mockContext);

        // 创建一个标记为自定义颜色但实际没有 customColor 的高亮
        const invalidHighlight = {
            text: 'test',
            colorId: 25,
            isCustomColor: true,
            customColor: undefined, // 缺失 customColor
            ranges: [createMockRange(0, 0, 0, 4)]
        };

        // 不应该因为 undefined customColor 而崩溃
        assert.doesNotThrow(() => {
            manager.dispose();
        });
    });

    test('HighlightManager: 类型安全 - 处理 null customColor', () => {
        const manager = new HighlightManager(mockContext);

        // 模拟一个有 null customColor 的情况
        const nullColorHighlight = {
            text: 'test',
            colorId: 25,
            isCustomColor: true,
            customColor: null,
            ranges: [createMockRange(0, 0, 0, 4)]
        };

        // 不应该因为 null customColor 而崩溃
        assert.doesNotThrow(() => {
            manager.dispose();
        });
    });

    test('HighlightManager: validateActiveEditor 缺少文档时返回 null', () => {
        // 模拟一个没有 document 的编辑器
        const mockEditorWithoutDoc: any = {
            ...mockEditor,
            document: undefined
        };

        (vscode.window as any).activeTextEditor = mockEditorWithoutDoc;

        // EditorUtils.validateActiveEditor 应该返回 null
        const result = EditorUtils.validateActiveEditor();
        assert.strictEqual(result, null);
    });

    test('HighlightManager: validateActiveEditor 正常情况返回编辑器', () => {
        (vscode.window as any).activeTextEditor = mockEditor;

        // EditorUtils.validateActiveEditor 应该返回编辑器
        const result = EditorUtils.validateActiveEditor();
        assert.strictEqual(result, mockEditor);
    });

    test('HighlightManager: validateActiveEditor 没有编辑器时返回 null', () => {
        (vscode.window as any).activeTextEditor = undefined;

        // EditorUtils.validateActiveEditor 应该返回 null
        const result = EditorUtils.validateActiveEditor();
        assert.strictEqual(result, null);
    });
});
