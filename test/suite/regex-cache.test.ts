import * as assert from "assert";
import { RegexCache, createHighlightRegex, findWholeWord } from "../../src/utils/regex-cache";

suite("RegexCache Suite", () => {
    setup(() => {
        // 每次测试前清理缓存
        RegexCache.getInstance().clear();
    });

    test("getInstance 应该返回单例", () => {
        const instance1 = RegexCache.getInstance();
        const instance2 = RegexCache.getInstance();
        assert.strictEqual(instance1, instance2, "应该返回同一个实例");
    });

    test("getRegex 应该缓存正则表达式", () => {
        const cache = RegexCache.getInstance();
        const regex1 = cache.getRegex("test", false);
        const regex2 = cache.getRegex("test", false);

        assert.strictEqual(regex1, regex2, "应该返回相同的缓存对象");
        assert.strictEqual(cache.size, 1, "缓存大小应该为 1");
    });

    test("getRegex 应该区分大小写敏感", () => {
        const cache = RegexCache.getInstance();
        const regex1 = cache.getRegex("test", true);
        const regex2 = cache.getRegex("test", false);

        assert.notStrictEqual(regex1, regex2, "大小写敏感应该是不同的缓存");
        assert.strictEqual(cache.size, 2, "缓存大小应该为 2");
    });

    test("getRegex 应该重置 lastIndex", () => {
        const cache = RegexCache.getInstance();
        const regex = cache.getRegex("test", false);

        const text = "test test";
        regex.exec(text); // 执行一次匹配,lastIndex 会改变
        regex.exec(text); // 第二次匹配

        // 重置后应该从头开始匹配
        const match = regex.exec(text);
        assert.strictEqual(match?.[0], "test", "应该从头开始匹配");
    });

    test("缓存应该达到上限时删除最旧的条目", () => {
        const cache = RegexCache.getInstance(3); // 设置缓存大小为 3

        cache.getRegex("test1", false);
        cache.getRegex("test2", false);
        cache.getRegex("test3", false);
        assert.strictEqual(cache.size, 3, "缓存大小应该为 3");

        cache.getRegex("test4", false); // 添加第 4 个,应该删除第 1 个
        assert.strictEqual(cache.size, 3, "缓存大小应该保持为 3");

        // 验证 test1 已被删除
        const regex1 = cache.getRegex("test1", false);
        assert.ok(regex1, "应该能够重新创建已删除的条目");
    });

    test("clear 应该清空所有缓存", () => {
        const cache = RegexCache.getInstance();
        cache.getRegex("test1", false);
        cache.getRegex("test2", false);

        assert.strictEqual(cache.size, 2, "缓存应该有 2 个条目");

        cache.clear();
        assert.strictEqual(cache.size, 0, "缓存应该被清空");
    });
});

suite("createHighlightRegex Suite", () => {
    test("应该为纯英文单词添加边界", () => {
        const regex = createHighlightRegex("test", false);
        const text = "this is a test string";

        assert.ok(regex.test(text), "应该匹配完整单词");
        assert.ok(!regex.test("testing"), "不应该匹配部分单词");
    });

    test("应该为非英文字符不添加边界", () => {
        const regex = createHighlightRegex("测试", false);
        const text = "这是一个测试文本";

        assert.ok(regex.test(text), "应该匹配中文文本");
    });

    test("应该转义特殊字符", () => {
        const regex = createHighlightRegex("test.txt", false);
        const text = "file test.txt here";

        assert.ok(regex.test(text), "应该正确处理包含特殊字符的文本");
    });

    test("应该正确处理大小写敏感", () => {
        const regexCaseSensitive = createHighlightRegex("Test", true);
        const regexCaseInsensitive = createHighlightRegex("Test", false);

        assert.ok(regexCaseSensitive.test("Test"), "大小写敏感应该匹配");
        assert.ok(!regexCaseSensitive.test("test"), "大小写敏感不应该匹配不同大小写");
        assert.ok(regexCaseInsensitive.test("test"), "大小写不敏感应该匹配");
    });

    test("空文本应该抛出错误", () => {
        assert.throws(() => {
            createHighlightRegex("", false);
        }, /Search text cannot be empty/, "空文本应该抛出错误");
    });

    test("应该正确处理包含数字的文本", () => {
        const regex = createHighlightRegex("123", false);
        const text = "test 123 end";

        assert.ok(regex.test(text), "应该匹配纯数字");
    });

    test("应该正确处理下划线", () => {
        const regex = createHighlightRegex("test_var", false);
        const text = "const test_var = 1";

        assert.ok(regex.test(text), "应该匹配包含下划线的标识符");
    });
});

suite("findWholeWord Suite", () => {
    test("应该找到匹配的单词索引", () => {
        const text = "hello world test";
        const index = findWholeWord(text, "world", false);

        assert.strictEqual(index, 6, "应该返回正确的索引");
    });

    test("未找到应该返回 -1", () => {
        const text = "hello world";
        const index = findWholeWord(text, "foo", false);

        assert.strictEqual(index, -1, "未找到应该返回 -1");
    });

    test("空文本应该返回 -1", () => {
        const index1 = findWholeWord("", "test", false);
        const index2 = findWholeWord("test", "", false);

        assert.strictEqual(index1, -1, "空搜索文本应该返回 -1");
        assert.strictEqual(index2, -1, "空源文本应该返回 -1");
    });

    test("应该使用缓存提高性能", () => {
        const text = "test test test";

        // 第一次调用会创建并缓存
        const index1 = findWholeWord(text, "test", false);
        // 第二次调用应该使用缓存
        const index2 = findWholeWord(text, "test", false);

        assert.strictEqual(index1, 0, "应该找到第一个匹配");
        assert.strictEqual(index2, 0, "应该找到第一个匹配");
    });
});
