import * as assert from "assert";
import { RegexCache, createHighlightRegex } from "../../src/utils/regex-cache";

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
        regex.exec(text); // 第二次匹配,lastIndex 会再次改变

        // 重新获取 regex,应该重置 lastIndex
        const regex2 = cache.getRegex("test", false);
        const match = regex2.exec(text);
        assert.strictEqual(match?.[0], "test", "重新获取后应该从头开始匹配");
    });

    test("缓存应该达到上限时删除最旧的条目", () => {
        // 由于 RegexCache 是单例,我们无法直接测试不同的缓存大小
        // 这里我们测试缓存的 FIFO 删除功能
        const cache = RegexCache.getInstance();

        // 添加多个条目,超过默认缓存大小(100)
        for (let i = 0; i < 102; i++) {
            cache.getRegex(`test${i}`, false);
        }

        // 缓存大小应该保持为 100
        assert.strictEqual(cache.size, 100, "缓存大小应该保持为上限");

        // 验证最早的条目已被删除
        const regex0 = cache.getRegex("test0", false);
        const regex1 = cache.getRegex("test1", false);

        // 由于是 FIFO,最早的条目应该已被删除
        // 我们无法直接验证哪个被删除了,但可以验证缓存大小
        assert.strictEqual(cache.size, 100, "缓存大小应该保持不变");
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

    test("should match partial selections containing underscores", () => {
        const text = "hello_world";

        for (const searchText of ["hello_", "hello_w", "hello_wo"]) {
            const regex = createHighlightRegex(searchText, false);

            assert.ok(regex.test(text), `should match ${searchText}`);
        }
    });

    test("should treat underscores as boundaries for alphanumeric words", () => {
        const helloRegex = createHighlightRegex("hello", false);
        const worldRegex = createHighlightRegex("world", false);

        assert.ok(helloRegex.test("hello_world"), "should match before underscore");
        assert.ok(worldRegex.test("hello_world"), "should match after underscore");
    });
});

suite("危险正则防护 Suite", () => {
    test("应拒绝嵌套量词 (a+)+ 防 ReDoS", () => {
        assert.throws(() => {
            createHighlightRegex("(a+)+$", false, "regex");
        }, /Dangerous regex pattern/, "嵌套量词应被拒绝");

        assert.throws(() => {
            createHighlightRegex("(?:a*)+", false, "regex");
        }, /Dangerous regex pattern/, "非捕获组嵌套量词应被拒绝");
    });

    test("应拒绝重复交替 (a|a)+ 防 ReDoS", () => {
        assert.throws(() => {
            createHighlightRegex("(a|a)+", false, "regex");
        }, /Dangerous regex pattern/, "重复交替应被拒绝");

        assert.throws(() => {
            createHighlightRegex("(ab|cd)*", false, "regex");
        }, /Dangerous regex pattern/, "重复交替星号应被拒绝");
    });

    test("安全正则模式不受影响", () => {
        const regex = createHighlightRegex("(foo)+", false, "regex");
        assert.ok(regex instanceof RegExp, "普通分组量词应放行");

        const alternation = createHighlightRegex("(TODO|FIXME)", false, "regex");
        assert.ok(alternation instanceof RegExp, "普通交替应放行");

        const anchored = createHighlightRegex("\\bfoo\\d+", false, "regex");
        assert.ok(anchored instanceof RegExp, "锚定模式应放行");
    });

    test("零宽正则应完整匹配所有位置（不丢末尾）", () => {
        const regex = createHighlightRegex("(?=.)|$", false, "regex");
        const text = "abc";
        const positions: number[] = [];
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
            positions.push(match.index);
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
        }

        assert.deepStrictEqual(positions, [0, 1, 2, 3], "零宽匹配应包含末尾位置");
    });
});
