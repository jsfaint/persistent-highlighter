# 测试指南

本项目使用 Mocha 作为测试框架，配合 VS Code Test Electron 进行测试。

## 运行测试

### 编译并运行所有测试

```bash
npm test
```

### 仅编译测试代码

```bash
npm run compile:test
```

### 监听模式编译测试

```bash
npm run watch:test
```

## 测试结构

```
test/
├── runTest.ts              # 测试运行器入口
├── suite/
│   ├── index.ts           # 测试套件入口
│   ├── helpers.ts         # 测试辅助工具和 Mock 对象
│   ├── extension.test.ts  # extension.ts 核心功能测试
│   └── highlightsTreeProvider.test.ts  # TreeProvider 测试
```

## 测试覆盖

### extension.test.ts

- ✅ `createHighlightRegex`: 正则表达式创建功能
  - 英文单词匹配
  - 大小写敏感/不敏感模式
  - 特殊字符转义
  - 非英文字符支持（中文、日文等）
  - 空字符串错误处理

- ✅ `findWholeWord`: 全字匹配查找
  - 完整单词匹配
  - 避免部分单词匹配
  - 中文文本匹配
  - 大小写敏感/不敏感查找

- ✅ `HighlightManager`: 核心管理类
  - 实例化
  - 配置获取

### highlightsTreeProvider.test.ts

- ✅ `HighlightItem`: 高亮项类
  - 创建高亮项
  - 自定义颜色支持
  - 无编辑器时禁用跳转

- ✅ `HighlightsTreeProvider`: 树视图提供者
  - 创建实例
  - 获取子元素
  - 获取 TreeItem
  - refresh 方法
  - 增删改查操作
  - 空列表处理
  - 无编辑器处理
  - 事件触发

## 添加新测试

1. 在 `test/suite/` 目录下创建新的测试文件（例如 `myFeature.test.ts`）
2. 使用 `suite()` 和 `test()` 定义测试套件和测试用例
3. 使用 `assert` 模块进行断言
4. 从 `helpers.ts` 导入需要的 Mock 对象

示例：

```typescript
import * as assert from 'assert';
import { createMockContext } from './helpers';

suite('My Feature 测试', () => {
    test('should do something', () => {
        const context = createMockContext();
        // 测试代码
        assert.strictEqual(true, true);
    });
});
```

## Mock 对象

`helpers.ts` 提供了以下 Mock 对象：

- `createMockContext()`: 模拟 ExtensionContext
- `createMockDocument(content)`: 模拟 TextDocument
- `createMockEditor(document)`: 模拟 TextEditor
- `createMockRange(...)`: 模拟 Range
- `createMockTerms()`: 创建测试用高亮数据
- `createMockConfiguration(caseSensitive)`: 模拟 WorkspaceConfiguration
- `setupVSCodeMocks()`: 设置 VS Code 全局 Mock
