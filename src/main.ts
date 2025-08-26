import { App, Plugin, PluginSettingTab, Setting, Modal, Notice, TFile, TFolder, normalizePath } from 'obsidian';

interface FileCaseConverterSettings {
	lastSelectedFolder: string;
	enableLowercase: boolean;
	enableUppercase: boolean;
	enableCapitalize: boolean;
}

const DEFAULT_SETTINGS: FileCaseConverterSettings = {
	lastSelectedFolder: '',
	enableLowercase: true,
	enableUppercase: false,
	enableCapitalize: false
}

export default class FileCaseConverterPlugin extends Plugin {
	settings: FileCaseConverterSettings;

	async onload() {
		await this.loadSettings();

		// Add file menu (right-click context menu) items
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				// Only add menu items for files and folders, not abstract files
				if (file instanceof TFile || file instanceof TFolder) {
					
					// Add lowercase options if enabled
					if (this.settings.enableLowercase) {
						menu.addItem((item) => {
							item
								.setTitle('Lowercase name')
								.setIcon('type')
								.onClick(async () => {
									await this.lowercaseSingleItem(file);
								});
						});
						
						if (file instanceof TFolder) {
							menu.addItem((item) => {
								item
									.setTitle('Lowercase all')
									.setIcon('folder-down')
									.onClick(async () => {
										const confirmed = await this.showQuickConfirmation(
											`Lowercase all in "${file.name}"?`,
											'This will recursively lowercase all files and subfolders. This cannot be undone.'
										);
										if (confirmed) {
											await this.lowercaseFilesRecursively(file.path);
										}
									});
							});
						}
					}

					// Add uppercase options if enabled
					if (this.settings.enableUppercase) {
						menu.addItem((item) => {
							item
								.setTitle('Uppercase name')
								.setIcon('type')
								.onClick(async () => {
									await this.uppercaseSingleItem(file);
								});
						});
						
						if (file instanceof TFolder) {
							menu.addItem((item) => {
								item
									.setTitle('Uppercase all')
									.setIcon('folder-up')
									.onClick(async () => {
										const confirmed = await this.showQuickConfirmation(
											`Uppercase all in "${file.name}"?`,
											'This will recursively uppercase all files and subfolders. This cannot be undone.'
										);
										if (confirmed) {
											await this.uppercaseFilesRecursively(file.path);
										}
									});
							});
						}
					}

					// Add capitalize options if enabled
					if (this.settings.enableCapitalize) {
						menu.addItem((item) => {
							item
								.setTitle('Capitalize name')
								.setIcon('type')
								.onClick(async () => {
									await this.capitalizeSingleItem(file);
								});
						});
						
						if (file instanceof TFolder) {
							menu.addItem((item) => {
								item
									.setTitle('Capitalize all')
									.setIcon('heading')
									.onClick(async () => {
										const confirmed = await this.showQuickConfirmation(
											`Capitalize all in "${file.name}"?`,
											'This will recursively capitalize all files and subfolders. This cannot be undone.'
										);
										if (confirmed) {
											await this.capitalizeFilesRecursively(file.path);
										}
									});
							});
						}
					}
				}
			})
		);

		// Add settings tab
		this.addSettingTab(new FileCaseConverterSettingTab(this.app, this));
	}

	onunload() {
		// Cleanup if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async lowercaseSingleItem(file: TFile | TFolder): Promise<void> {
		try {
			const originalName = file.name;
			const lowerCaseName = originalName.toLowerCase();
			
			if (originalName === lowerCaseName) {
				new Notice(`"${originalName}" is already lowercase`);
				return;
			}

			if (file instanceof TFile) {
				await this.processFile(file, 'lowercase');
			} else if (file instanceof TFolder) {
				await this.processFolderRename(file, 'lowercase');
			}
			
			new Notice(`Renamed "${originalName}" to "${lowerCaseName}"`);
		} catch (error) {
			console.error('Error lowercasing item:', error);
			new Notice('Error occurred while lowercasing. Check console for details.');
		}
	}

	async uppercaseSingleItem(file: TFile | TFolder): Promise<void> {
		try {
			const originalName = file.name;
			const upperCaseName = originalName.toUpperCase();
			
			if (originalName === upperCaseName) {
				new Notice(`"${originalName}" is already uppercase`);
				return;
			}

			if (file instanceof TFile) {
				await this.processFile(file, 'uppercase');
			} else if (file instanceof TFolder) {
				await this.processFolderRename(file, 'uppercase');
			}
			
			new Notice(`Renamed "${originalName}" to "${upperCaseName}"`);
		} catch (error) {
			console.error('Error uppercasing item:', error);
			new Notice('Error occurred while uppercasing. Check console for details.');
		}
	}

	async capitalizeSingleItem(file: TFile | TFolder): Promise<void> {
		try {
			const originalName = file.name;
			const capitalizedName = this.capitalizeFirstLetter(originalName);
			
			if (originalName === capitalizedName) {
				new Notice(`"${originalName}" is already capitalized`);
				return;
			}

			if (file instanceof TFile) {
				await this.processFile(file, 'capitalize');
			} else if (file instanceof TFolder) {
				await this.processFolderRename(file, 'capitalize');
			}
			
			new Notice(`Renamed "${originalName}" to "${capitalizedName}"`);
		} catch (error) {
			console.error('Error capitalizing item:', error);
			new Notice('Error occurred while capitalizing. Check console for details.');
		}
	}

	private capitalizeFirstLetter(str: string): string {
		if (str.length === 0) return str;
		return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	}

	async showQuickConfirmation(title: string, message: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			const { contentEl } = modal;
			
			contentEl.createEl('h3', { text: title });
			contentEl.createEl('p', { text: message, cls: 'file-case-converter-warning-text' });

			const buttonContainer = contentEl.createDiv('file-case-converter-buttons');
			
			const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
			cancelButton.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			const confirmButton = buttonContainer.createEl('button', { 
				text: 'Yes, Proceed',
				cls: 'mod-warning'
			});
			confirmButton.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}

	async lowercaseFilesRecursively(folderPath: string): Promise<void> {
		await this.processFilesRecursively(folderPath, 'lowercase');
	}

	async uppercaseFilesRecursively(folderPath: string): Promise<void> {
		await this.processFilesRecursively(folderPath, 'uppercase');
	}

	async capitalizeFilesRecursively(folderPath: string): Promise<void> {
		await this.processFilesRecursively(folderPath, 'capitalize');
	}

	private async processFilesRecursively(folderPath: string, caseType: 'lowercase' | 'uppercase' | 'capitalize'): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(folderPath);
		
		if (!folder || !(folder instanceof TFolder)) {
			new Notice('Invalid folder path');
			return;
		}

		try {
			// Process all contents of the folder first
			await this.processFolder(folder, caseType);
			// Then rename the folder itself
			await this.processFolderRename(folder, caseType);
			const actionName = caseType === 'lowercase' ? 'lowercased' : caseType === 'uppercase' ? 'uppercased' : 'capitalized';
			new Notice(`Successfully ${actionName} all!`);
		} catch (error) {
			console.error(`Error ${caseType}ing files:`, error);
			new Notice(`Error occurred while ${caseType}ing files. Check console for details.`);
		}
	}

	private async processFolder(folder: TFolder, caseType: 'lowercase' | 'uppercase' | 'capitalize'): Promise<void> {
		const children = [...folder.children];
		
		// Process files first
		for (const child of children) {
			if (child instanceof TFile) {
				await this.processFile(child, caseType);
			}
		}

		// Process subfolders recursively
		for (const child of children) {
			if (child instanceof TFolder) {
				await this.processFolder(child, caseType);
				await this.processFolderRename(child, caseType);
			}
		}
	}

	private async processFile(file: TFile, caseType: 'lowercase' | 'uppercase' | 'capitalize'): Promise<void> {
		const fileName = file.name;
		let newFileName: string;
		
		switch (caseType) {
			case 'lowercase':
				newFileName = fileName.toLowerCase();
				break;
			case 'uppercase':
				newFileName = fileName.toUpperCase();
				break;
			case 'capitalize':
				newFileName = this.capitalizeFirstLetter(fileName);
				break;
		}
		
		if (fileName !== newFileName) {
			const newPath = file.parent ? `${file.parent.path}/${newFileName}` : newFileName;
			const normalizedNewPath = normalizePath(newPath);
			
			// Check if a file with the new name already exists
			const existingFile = this.app.vault.getAbstractFileByPath(normalizedNewPath);
			if (existingFile && existingFile !== file) {
				console.warn(`Cannot rename ${file.path} to ${normalizedNewPath}: file already exists`);
				new Notice(`Skipped ${fileName}: ${caseType} version already exists`);
				return;
			}
			
			try {
				await this.app.vault.rename(file, normalizedNewPath);
				// File renamed successfully
			} catch (error) {
				console.error(`Failed to rename file ${file.path}:`, error);
			}
		}
	}

	private async processFolderRename(folder: TFolder, caseType: 'lowercase' | 'uppercase' | 'capitalize'): Promise<void> {
		const folderName = folder.name;
		let newFolderName: string;
		
		switch (caseType) {
			case 'lowercase':
				newFolderName = folderName.toLowerCase();
				break;
			case 'uppercase':
				newFolderName = folderName.toUpperCase();
				break;
			case 'capitalize':
				newFolderName = this.capitalizeFirstLetter(folderName);
				break;
		}
		
		if (folderName !== newFolderName) {
			const newPath = folder.parent ? `${folder.parent.path}/${newFolderName}` : newFolderName;
			const normalizedNewPath = normalizePath(newPath);
			
			// Check if a folder with the new name already exists
			const existingFolder = this.app.vault.getAbstractFileByPath(normalizedNewPath);
			if (existingFolder && existingFolder !== folder) {
				console.warn(`Cannot rename ${folder.path} to ${normalizedNewPath}: folder already exists`);
				new Notice(`Skipped ${folderName}: ${caseType} version already exists`);
				return;
			}
			
			try {
				await this.app.vault.rename(folder, normalizedNewPath);
				// Folder renamed successfully
			} catch (error) {
				console.error(`Failed to rename folder ${folder.path}:`, error);
			}
		}
	}
}

class FileCaseConverterSettingTab extends PluginSettingTab {
	plugin: FileCaseConverterPlugin;

	constructor(app: App, plugin: FileCaseConverterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('p', {
			text: 'Enable the case conversion options you want to see in the right-click context menu. Each enabled option will show both "single item" and "recursive" choices.',
			cls: 'setting-item-description'
		});

		// Lowercase toggle
		new Setting(containerEl)
			.setName('Enable Lowercase')
			.setDesc('Show lowercase options in context menu')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableLowercase)
				.onChange(async (value) => {
					this.plugin.settings.enableLowercase = value;
					await this.plugin.saveSettings();
				}));

		// Uppercase toggle
		new Setting(containerEl)
			.setName('Enable Uppercase')
			.setDesc('Show uppercase options in context menu')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableUppercase)
				.onChange(async (value) => {
					this.plugin.settings.enableUppercase = value;
					await this.plugin.saveSettings();
				}));

		// Capitalize toggle
		new Setting(containerEl)
			.setName('Enable Capitalize')
			.setDesc('Show capitalize options in context menu')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableCapitalize)
				.onChange(async (value) => {
					this.plugin.settings.enableCapitalize = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Last Selected Folder')
			.setDesc('The folder that was last selected for processing')
			.addText(text => text
				.setPlaceholder('No folder selected')
				.setValue(this.plugin.settings.lastSelectedFolder)
				.setDisabled(true));

		new Setting(containerEl)
			.setName('About')
			.setHeading();
		containerEl.createEl('p', { 
			text: 'This plugin converts file and folder name cases. Right-click on any file or folder to see the enabled options. Each enabled option will show both "single item" and "recursive" (for folders) choices. Use with caution as these operations cannot be undone.'
		});
	}
}
