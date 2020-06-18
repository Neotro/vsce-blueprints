import * as vscode from 'vscode';
import { exec } from 'child_process';
import { $Directory, $File } from '@neotro/system';
import * as path from 'path';

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
					vscode.window.showInputBox({ placeHolder: 'Blueprint Name' }).then(async name => {
						if (name) {
							const folder = `${BLUEPRINTS_DIRECTORY}/${name}`;
							if (!$Directory.exists(folder)) {
								$Directory.create(folder);
								const config: IBlueprintConfig = {
									name,
									variables: [],
									prescripts: [],
									postscripts: []
								};
								$File.create(`${folder}/blueprint.json`, JSON.stringify(config, null, '\t'));
								exec(`start "" "${folder}"`);

							} else {
								vscode.window.showInformationMessage('A blueprint with the same name already exists!');
							}
						}
					});
					break;
				case 'Generate':
					console.log(targetPath);
					if (targetPath) {
						console.log('Generating...');
						const names = $Directory.getAll(BLUEPRINTS_DIRECTORY).map(folder => path.basename(folder));
						console.log(names);
						const command = await vscode.window.showQuickPick(['Item'].concat(names), { placeHolder: 'Blueprints' });
					} else {
						vscode.window.showInformationMessage('Unable to generate blueprint. Invalid directory specified!');
					}
					break;
				default:
					console.error('Error');
			}
		})
	);
}

export function deactivate() { }
