import { Enum, json } from '@neotro/core';
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

const USER_BLUEPRINTS_DIRECTORY = path.join(process.env.HOME || process.env.USERPROFILE, '.blueprints');
const WORKSPACE_BLUEPRINTS_DIRECTORY = path.join(vscode.workspace.rootPath, '.blueprints');

export enum CommandPicks { OpenBlueprintsFolder = 'Open Blueprints Folder', CreateBlueprint = 'Create Blueprint', GenerateBlueprint = 'Generate Blueprint' };
export enum FolderPicks { User = 'User', Workspace = 'Workspace' };

export function activate(context: vscode.ExtensionContext) {
	$Directory.create(USER_BLUEPRINTS_DIRECTORY);
	context.subscriptions.push(
		vscode.commands.registerCommand('blueprints.blueprints', async (...args) => {
			const targetPath = args[0]?.fsPath || vscode.workspace.rootPath;
			const commandPick = await vscode.window.showQuickPick(Enum.getValues(CommandPicks), { placeHolder: 'Blueprints' });
			switch (commandPick) {
				case CommandPicks.OpenBlueprintsFolder:
					if ($Directory.exists(WORKSPACE_BLUEPRINTS_DIRECTORY)) {
						const folderPick = await vscode.window.showQuickPick(Enum.getValues(FolderPicks), { placeHolder: 'Blueprints Folder' });
						switch (folderPick) {
							case FolderPicks.User:
								exec(`start "" "${USER_BLUEPRINTS_DIRECTORY}"`);
								break;
							case FolderPicks.Workspace:
								exec(`start "" "${WORKSPACE_BLUEPRINTS_DIRECTORY}"`);
								break;
						}
					} else {
						exec(`start "" "${USER_BLUEPRINTS_DIRECTORY}"`);
					}
					break;
				case CommandPicks.CreateBlueprint:
					const folderPick = await vscode.window.showQuickPick(Enum.getValues(FolderPicks), { placeHolder: 'Blueprints Folder' });
					if (folderPick) {
						vscode.window.showInputBox({ placeHolder: 'Blueprint Name' }).then(async name => {
							if (name) {
								const folder = path.join(folderPick === FolderPicks.User ? USER_BLUEPRINTS_DIRECTORY : WORKSPACE_BLUEPRINTS_DIRECTORY, name);
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
									$File.create(path.join(folder, 'blueprint.json'), json(config));
									exec(`start "" "${folder}"`);

								} else {
									vscode.window.showInformationMessage('A blueprint with the same name already exists.');
								}
							}
						});
					}
					break;
				case CommandPicks.GenerateBlueprint:
					try {
						const folderPick = await vscode.window.showQuickPick(Enum.getValues(FolderPicks), { placeHolder: 'Blueprints Folder' });
						if (folderPick) {
							if (targetPath) {
								const blueprints: IBlueprintConfig[] = $File.getAll(folderPick === FolderPicks.User ? USER_BLUEPRINTS_DIRECTORY : WORKSPACE_BLUEPRINTS_DIRECTORY, { recursive: true, pattern: '**/blueprint.json' }).map(file => ({ ...$File.readJson(file), file }));
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
													const parsedSub = applyVariables(sub);
													if (blueprint.variableFiles?.some(mime => match([sub], mime, { dot: true }).length)) {
														$File.write(path.join(targetPath, parsedSub), applyVariables($File.read(file)));
													} else {
														$File.copy(file, path.join(targetPath, parsedSub));
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
