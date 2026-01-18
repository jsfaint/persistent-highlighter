import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		// VS Code 测试文件夹
		const extensionDevelopmentPath = path.resolve(__dirname, '../');

		// 测试运行文件夹
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// 下载并运行测试
		await runTests({ extensionDevelopmentPath, extensionTestsPath });
	} catch (err) {
		console.error('Failed to run tests');
		process.exit(1);
	}
}

main();
