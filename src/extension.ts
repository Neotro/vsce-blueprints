import { Enum } from '@neotro/core';
import { $Directory, $File } from '@neotro/system';
import { exec } from 'child_process';
import { match } from 'minimatch';
import * as path from 'path';
import * as vscode from 'vscode';

export interface IBlueprintVariable {
	name: string;
	description?: string;
	default?: string;
}

export interface IBlueprintConfig {
	file?: string;
	name: string;
	variableFiles?: string[];
	variables?: IBlueprintVariable[];
	prescripts?: string[];
	postscripts?: string[];
}

const BLUEPRINTS_DIRECTORY = path.join(process.env.HOME || process.env.USERPROFILE, '.blueprints');

export enum BlueprintsCommands { OpenBlueprintsFolder = 'Open Blueprints Folder', CreateBlueprint = 'Create Blueprint', GenerateBlueprint = 'Generate Blueprint' };

export function activate(context: vscode.ExtensionContext) {
	$Directory.create(BLUEPRINTS_DIRECTORY);
	context.subscriptions.push(
		vscode.commands.registerCommand('blueprints.blueprints', async (...args) => {
			const targetPath = args[0]?.fsPath || vscode.workspace.rootPath;
			const command = await vscode.window.showQuickPick(Enum.getValues(BlueprintsCommands), { placeHolder: 'Blueprints' });
			switch (command) {
				case BlueprintsCommands.OpenBlueprintsFolder:
					exec(`start "" "${BLUEPRINTS_DIRECTORY}"`);
					break;
				case BlueprintsCommands.CreateBlueprint:
					vscode.window.showInputBox({ placeHolder: 'Blueprint Name' }).then(async name => {
						if (name) {
							const folder = path.join(BLUEPRINTS_DIRECTORY, name);
							if (!$Directory.exists(folder)) {
								$Directory.create(folder);
								const config: IBlueprintConfig = {
									name,
									variableFiles: [
										'*.txt',
										'*.ts',
										'*.js'
									],
									variables: [],
									prescripts: [],
									postscripts: []
								};
								$File.create(path.join(folder, 'blueprint.json'), JSON.stringify(config, null, '\t'));
								exec(`start "" "${folder}"`);

							} else {
								vscode.window.showInformationMessage('A blueprint with the same name already exists.');
							}
						}
					});
					break;
				case BlueprintsCommands.GenerateBlueprint:
					try {
						if (targetPath) {
							const blueprints: IBlueprintConfig[] = $File.getAll(BLUEPRINTS_DIRECTORY, { recursive: true, pattern: '**/blueprint.json' }).map(file => ({ ...$File.readJson(file), file }));
							if (blueprints.length) {
								const name = await vscode.window.showQuickPick(blueprints.map(blueprint => blueprint.name), { placeHolder: 'Blueprints' });
								if (name) {
									const blueprint = blueprints.find(_blueprint => _blueprint.name === name);
									const variables: { [key: string]: string } = {};
									for (const variable of blueprint.variables || []) {
										const value = await vscode.window.showInputBox({ prompt: variable.description, placeHolder: variable.name, value: variable.default });
										variables[variable.name] = value;
									}
									await vscode.window.withProgress({ title: `Generating blueprint ${blueprint.name}...`, location: vscode.ProgressLocation.Notification }, async () => {
										function applyVariables(data: string): string {
											for (const variable of (blueprint.variables || []).map(variable => variable.name)) {
												data = data
													.split(`$[${variable}]`).join(variables[variable])
													.split(`$[=${variable}]`).join(variables[variable].toPascalCase())
													.split(`$[~${variable}]`).join(variables[variable].toCamelCase())
													.split(`$[_${variable}]`).join(variables[variable].toSnakeCase())
													.split(`$[-${variable}]`).join(variables[variable].toKebabCase());
											}
											return data;
										}
										for (const script of blueprint.prescripts || []) {
											exec(`cd "${targetPath}" && ${script}`)
										}
										try {
											const source = path.dirname(blueprint.file);
											for (const file of $File.getAll(source, { recursive: true, pattern: '!**/blueprint.json' })) {
												const sub = path.relative(source, file);
												if (blueprint.variableFiles?.some(mime => match([sub], mime, { dot: true }).length)) {
													$File.write(path.join(targetPath, path.dirname(sub), applyVariables(path.basename(sub))), applyVariables($File.read(file)));
												} else {
													$File.copy(file, path.join(targetPath, path.dirname(sub), applyVariables(path.basename(sub))));
												}
											}
										} catch (error) {
											vscode.window.showErrorMessage(`Failed to generate blueprint ${blueprint.name}. ${error.message || error}`)
										}
										for (const script of blueprint.postscripts || []) {
											exec(`cd "${targetPath}" && ${script}`)
										}
									});
									vscode.window.showInformationMessage(`Done generating blueprint ${blueprint.name}.`);
								}
							} else {
								vscode.window.showInformationMessage('There are no blueprints available.');
							}
						} else {
							vscode.window.showInformationMessage('Unable to generate blueprint. Invalid directory specified.');
						}
					} catch (error) {
						vscode.window.showErrorMessage(error.message || error);
					}
					break;
			}
		})
	);
}

export function deactivate() { }
