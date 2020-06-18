import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as path from 'path';

export function deleteFolder(folder: string) {
	if (fs.existsSync(folder)) {
		for (const entry of fs.readdirSync(folder)) {
			const location = path.join(folder, entry);
			if (fs.lstatSync(location).isDirectory()) {
				deleteFolder(location);
			} else {
				fs.unlinkSync(location);
			}
		}
		fs.rmdirSync(folder);
	}
};

function copyFileSync(source: string, target: string) {

	var targetFile = target;

	//if target is a directory a new file with the same name will be created
	if (fs.existsSync(target)) {
		if (fs.lstatSync(target).isDirectory()) {
			targetFile = path.join(target, path.basename(source));
		}
	}

	fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source: string, target: string) {
	var files = [];

	//check if folder needs to be created or integrated
	var targetFolder = path.join(target, path.basename(source));
	if (!fs.existsSync(targetFolder)) {
		fs.mkdirSync(targetFolder);
	}

	//copy
	if (fs.lstatSync(source).isDirectory()) {
		files = fs.readdirSync(source);
		files.forEach(function (file) {
			var curSource = path.join(source, file);
			if (fs.lstatSync(curSource).isDirectory()) {
				copyFolderRecursiveSync(curSource, targetFolder);
			} else {
				copyFileSync(curSource, targetFolder);
			}
		});
	}
}

export interface IBlueprintVariable {
	name: string;
	value?: string;
	default?: string;
}

export interface IBlueprintConfig {
	name: string;
	variables?: IBlueprintVariable[];
	prescripts?: string[];
	postscripts?: string[];
}

const BLUEPRINTS_DIRECTORY = `${__dirname}/blueprints`;

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('blueprints.blueprints', async (...args) => {
			const targetPath = args[0].fsPath;
			const command = await vscode.window.showQuickPick(['Create', 'Generate'], { placeHolder: 'Blueprints' });
			switch (command) {
				case 'Create':
					fs.mkdirSync(BLUEPRINTS_DIRECTORY, { recursive: true });
					vscode.window.showInputBox({ placeHolder: 'Blueprint Name' }).then(async name => {
						if (name) {
							const folder = `${BLUEPRINTS_DIRECTORY}/${name}`;
							if (!fs.existsSync(folder)) {
								fs.mkdirSync(folder, { recursive: true });
								const config: IBlueprintConfig = {
									name,
									variables: [],
									prescripts: [],
									postscripts: []
								};
								fs.writeFileSync(`${folder}/blueprint.json`, JSON.stringify(config, null, '\t'));
								exec(`start "" "${folder}"`);

							} else {
								vscode.window.showInformationMessage('A blueprint with the same name already exists!');
							}
						}
					});
					break;
				case 'Generate':
					if (targetPath) {

					} else {
						vscode.window.showInformationMessage('Unable to generate blueprint. Invalid directory specified!');
					}
					break;
				default:

			}
		})
	);
}

// this method is called when your extension is deactivated
export function deactivate() { }
