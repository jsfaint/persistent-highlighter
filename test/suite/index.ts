import * as path from 'path';
import * as Mocha from 'mocha';

export function run(): Promise<void> {
	// 创建 Mocha 测试实例
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise(async (c, e) => {
		try {
			// 动态导入 glob (ESM only)
			const { glob } = await import('glob');

			const files: string[] = await glob('**/**.test.js', { cwd: testsRoot });

			// 添加测试文件
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// 运行测试
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				});
			} catch (err) {
				console.error(err);
				e(err);
			}
		} catch (err) {
			e(err);
		}
	});
}
