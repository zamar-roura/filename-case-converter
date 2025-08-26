'use strict';

var obsidian = require('obsidian');

const DEFAULT_SETTINGS = {
    lastSelectedFolder: '',
    enableLowercase: true,
    enableUppercase: false,
    enableCapitalize: false
};
class FileCaseConverterPlugin extends obsidian.Plugin {
    settings;
    async onload() {
        await this.loadSettings();
        // Add file menu (right-click context menu) items
        this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
            // Only add menu items for files and folders, not abstract files
            if (file instanceof obsidian.TFile || file instanceof obsidian.TFolder) {
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
                    if (file instanceof obsidian.TFolder) {
                        menu.addItem((item) => {
                            item
                                .setTitle('Lowercase all')
                                .setIcon('folder-down')
                                .onClick(async () => {
                                const confirmed = await this.showQuickConfirmation(`Lowercase all in "${file.name}"?`, 'This will recursively lowercase all files and subfolders. This cannot be undone.');
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
                    if (file instanceof obsidian.TFolder) {
                        menu.addItem((item) => {
                            item
                                .setTitle('Uppercase all')
                                .setIcon('folder-up')
                                .onClick(async () => {
                                const confirmed = await this.showQuickConfirmation(`Uppercase all in "${file.name}"?`, 'This will recursively uppercase all files and subfolders. This cannot be undone.');
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
                    if (file instanceof obsidian.TFolder) {
                        menu.addItem((item) => {
                            item
                                .setTitle('Capitalize all')
                                .setIcon('heading')
                                .onClick(async () => {
                                const confirmed = await this.showQuickConfirmation(`Capitalize all in "${file.name}"?`, 'This will recursively capitalize all files and subfolders. This cannot be undone.');
                                if (confirmed) {
                                    await this.capitalizeFilesRecursively(file.path);
                                }
                            });
                        });
                    }
                }
            }
        }));
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
    async lowercaseSingleItem(file) {
        try {
            const originalName = file.name;
            const lowerCaseName = originalName.toLowerCase();
            if (originalName === lowerCaseName) {
                new obsidian.Notice(`"${originalName}" is already lowercase`);
                return;
            }
            if (file instanceof obsidian.TFile) {
                await this.processFile(file, 'lowercase');
            }
            else if (file instanceof obsidian.TFolder) {
                await this.processFolderRename(file, 'lowercase');
            }
            new obsidian.Notice(`Renamed "${originalName}" to "${lowerCaseName}"`);
        }
        catch (error) {
            console.error('Error lowercasing item:', error);
            new obsidian.Notice('Error occurred while lowercasing. Check console for details.');
        }
    }
    async uppercaseSingleItem(file) {
        try {
            const originalName = file.name;
            const upperCaseName = originalName.toUpperCase();
            if (originalName === upperCaseName) {
                new obsidian.Notice(`"${originalName}" is already uppercase`);
                return;
            }
            if (file instanceof obsidian.TFile) {
                await this.processFile(file, 'uppercase');
            }
            else if (file instanceof obsidian.TFolder) {
                await this.processFolderRename(file, 'uppercase');
            }
            new obsidian.Notice(`Renamed "${originalName}" to "${upperCaseName}"`);
        }
        catch (error) {
            console.error('Error uppercasing item:', error);
            new obsidian.Notice('Error occurred while uppercasing. Check console for details.');
        }
    }
    async capitalizeSingleItem(file) {
        try {
            const originalName = file.name;
            const capitalizedName = this.capitalizeFirstLetter(originalName);
            if (originalName === capitalizedName) {
                new obsidian.Notice(`"${originalName}" is already capitalized`);
                return;
            }
            if (file instanceof obsidian.TFile) {
                await this.processFile(file, 'capitalize');
            }
            else if (file instanceof obsidian.TFolder) {
                await this.processFolderRename(file, 'capitalize');
            }
            new obsidian.Notice(`Renamed "${originalName}" to "${capitalizedName}"`);
        }
        catch (error) {
            console.error('Error capitalizing item:', error);
            new obsidian.Notice('Error occurred while capitalizing. Check console for details.');
        }
    }
    capitalizeFirstLetter(str) {
        if (str.length === 0)
            return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    async showQuickConfirmation(title, message) {
        return new Promise((resolve) => {
            const modal = new obsidian.Modal(this.app);
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
    async lowercaseFilesRecursively(folderPath) {
        await this.processFilesRecursively(folderPath, 'lowercase');
    }
    async uppercaseFilesRecursively(folderPath) {
        await this.processFilesRecursively(folderPath, 'uppercase');
    }
    async capitalizeFilesRecursively(folderPath) {
        await this.processFilesRecursively(folderPath, 'capitalize');
    }
    async processFilesRecursively(folderPath, caseType) {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !(folder instanceof obsidian.TFolder)) {
            new obsidian.Notice('Invalid folder path');
            return;
        }
        try {
            // Process all contents of the folder first
            await this.processFolder(folder, caseType);
            // Then rename the folder itself
            await this.processFolderRename(folder, caseType);
            const actionName = caseType === 'lowercase' ? 'lowercased' : caseType === 'uppercase' ? 'uppercased' : 'capitalized';
            new obsidian.Notice(`Successfully ${actionName} all!`);
        }
        catch (error) {
            console.error(`Error ${caseType}ing files:`, error);
            new obsidian.Notice(`Error occurred while ${caseType}ing files. Check console for details.`);
        }
    }
    async processFolder(folder, caseType) {
        const children = [...folder.children];
        // Process files first
        for (const child of children) {
            if (child instanceof obsidian.TFile) {
                await this.processFile(child, caseType);
            }
        }
        // Process subfolders recursively
        for (const child of children) {
            if (child instanceof obsidian.TFolder) {
                await this.processFolder(child, caseType);
                await this.processFolderRename(child, caseType);
            }
        }
    }
    async processFile(file, caseType) {
        const fileName = file.name;
        let newFileName;
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
            const normalizedNewPath = obsidian.normalizePath(newPath);
            // Check if a file with the new name already exists
            const existingFile = this.app.vault.getAbstractFileByPath(normalizedNewPath);
            if (existingFile && existingFile !== file) {
                console.warn(`Cannot rename ${file.path} to ${normalizedNewPath}: file already exists`);
                new obsidian.Notice(`Skipped ${fileName}: ${caseType} version already exists`);
                return;
            }
            try {
                await this.app.vault.rename(file, normalizedNewPath);
                // File renamed successfully
            }
            catch (error) {
                console.error(`Failed to rename file ${file.path}:`, error);
            }
        }
    }
    async processFolderRename(folder, caseType) {
        const folderName = folder.name;
        let newFolderName;
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
            const normalizedNewPath = obsidian.normalizePath(newPath);
            // Check if a folder with the new name already exists
            const existingFolder = this.app.vault.getAbstractFileByPath(normalizedNewPath);
            if (existingFolder && existingFolder !== folder) {
                console.warn(`Cannot rename ${folder.path} to ${normalizedNewPath}: folder already exists`);
                new obsidian.Notice(`Skipped ${folderName}: ${caseType} version already exists`);
                return;
            }
            try {
                await this.app.vault.rename(folder, normalizedNewPath);
                // Folder renamed successfully
            }
            catch (error) {
                console.error(`Failed to rename folder ${folder.path}:`, error);
            }
        }
    }
}
class FileCaseConverterSettingTab extends obsidian.PluginSettingTab {
    plugin;
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('p', {
            text: 'Enable the case conversion options you want to see in the right-click context menu. Each enabled option will show both "single item" and "recursive" choices.',
            cls: 'setting-item-description'
        });
        // Lowercase toggle
        new obsidian.Setting(containerEl)
            .setName('Enable Lowercase')
            .setDesc('Show lowercase options in context menu')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableLowercase)
            .onChange(async (value) => {
            this.plugin.settings.enableLowercase = value;
            await this.plugin.saveSettings();
        }));
        // Uppercase toggle
        new obsidian.Setting(containerEl)
            .setName('Enable Uppercase')
            .setDesc('Show uppercase options in context menu')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableUppercase)
            .onChange(async (value) => {
            this.plugin.settings.enableUppercase = value;
            await this.plugin.saveSettings();
        }));
        // Capitalize toggle
        new obsidian.Setting(containerEl)
            .setName('Enable Capitalize')
            .setDesc('Show capitalize options in context menu')
            .addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableCapitalize)
            .onChange(async (value) => {
            this.plugin.settings.enableCapitalize = value;
            await this.plugin.saveSettings();
        }));
        new obsidian.Setting(containerEl)
            .setName('Last Selected Folder')
            .setDesc('The folder that was last selected for processing')
            .addText(text => text
            .setPlaceholder('No folder selected')
            .setValue(this.plugin.settings.lastSelectedFolder)
            .setDisabled(true));
        new obsidian.Setting(containerEl)
            .setName('About')
            .setHeading();
        containerEl.createEl('p', {
            text: 'This plugin converts file and folder name cases. Right-click on any file or folder to see the enabled options. Each enabled option will show both "single item" and "recursive" (for folders) choices. Use with caution as these operations cannot be undone.'
        });
    }
}

module.exports = FileCaseConverterPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL21haW4udHMiXSwic291cmNlc0NvbnRlbnQiOm51bGwsIm5hbWVzIjpbIlBsdWdpbiIsIlRGaWxlIiwiVEZvbGRlciIsIk5vdGljZSIsIk1vZGFsIiwibm9ybWFsaXplUGF0aCIsIlBsdWdpblNldHRpbmdUYWIiLCJTZXR0aW5nIl0sIm1hcHBpbmdzIjoiOzs7O0FBU0EsTUFBTSxnQkFBZ0IsR0FBOEI7QUFDbkQsSUFBQSxrQkFBa0IsRUFBRSxFQUFFO0FBQ3RCLElBQUEsZUFBZSxFQUFFLElBQUk7QUFDckIsSUFBQSxlQUFlLEVBQUUsS0FBSztBQUN0QixJQUFBLGdCQUFnQixFQUFFLEtBQUs7Q0FDdkIsQ0FBQTtBQUVvQixNQUFBLHVCQUF3QixTQUFRQSxlQUFNLENBQUE7QUFDMUQsSUFBQSxRQUFRLENBQTRCO0FBRXBDLElBQUEsTUFBTSxNQUFNLEdBQUE7QUFDWCxRQUFBLE1BQU0sSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDOztBQUcxQixRQUFBLElBQUksQ0FBQyxhQUFhLENBQ2pCLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxLQUFJOztZQUVqRCxJQUFJLElBQUksWUFBWUMsY0FBSyxJQUFJLElBQUksWUFBWUMsZ0JBQU8sRUFBRTs7QUFHckQsZ0JBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRTtBQUNsQyxvQkFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFJO3dCQUNyQixJQUFJOzZCQUNGLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQzs2QkFDMUIsT0FBTyxDQUFDLE1BQU0sQ0FBQzs2QkFDZixPQUFPLENBQUMsWUFBVztBQUNuQiw0QkFBQSxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0Qyx5QkFBQyxDQUFDLENBQUM7QUFDTCxxQkFBQyxDQUFDLENBQUM7QUFFSCxvQkFBQSxJQUFJLElBQUksWUFBWUEsZ0JBQU8sRUFBRTtBQUM1Qix3QkFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFJOzRCQUNyQixJQUFJO2lDQUNGLFFBQVEsQ0FBQyxlQUFlLENBQUM7aUNBQ3pCLE9BQU8sQ0FBQyxhQUFhLENBQUM7aUNBQ3RCLE9BQU8sQ0FBQyxZQUFXO0FBQ25CLGdDQUFBLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUNqRCxDQUFxQixrQkFBQSxFQUFBLElBQUksQ0FBQyxJQUFJLENBQUEsRUFBQSxDQUFJLEVBQ2xDLGtGQUFrRixDQUNsRixDQUFDO2dDQUNGLElBQUksU0FBUyxFQUFFO29DQUNkLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQ0FDaEQ7QUFDRiw2QkFBQyxDQUFDLENBQUM7QUFDTCx5QkFBQyxDQUFDLENBQUM7cUJBQ0g7aUJBQ0Q7O0FBR0QsZ0JBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRTtBQUNsQyxvQkFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFJO3dCQUNyQixJQUFJOzZCQUNGLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQzs2QkFDMUIsT0FBTyxDQUFDLE1BQU0sQ0FBQzs2QkFDZixPQUFPLENBQUMsWUFBVztBQUNuQiw0QkFBQSxNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0Qyx5QkFBQyxDQUFDLENBQUM7QUFDTCxxQkFBQyxDQUFDLENBQUM7QUFFSCxvQkFBQSxJQUFJLElBQUksWUFBWUEsZ0JBQU8sRUFBRTtBQUM1Qix3QkFBQSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxLQUFJOzRCQUNyQixJQUFJO2lDQUNGLFFBQVEsQ0FBQyxlQUFlLENBQUM7aUNBQ3pCLE9BQU8sQ0FBQyxXQUFXLENBQUM7aUNBQ3BCLE9BQU8sQ0FBQyxZQUFXO0FBQ25CLGdDQUFBLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUNqRCxDQUFxQixrQkFBQSxFQUFBLElBQUksQ0FBQyxJQUFJLENBQUEsRUFBQSxDQUFJLEVBQ2xDLGtGQUFrRixDQUNsRixDQUFDO2dDQUNGLElBQUksU0FBUyxFQUFFO29DQUNkLE1BQU0sSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQ0FDaEQ7QUFDRiw2QkFBQyxDQUFDLENBQUM7QUFDTCx5QkFBQyxDQUFDLENBQUM7cUJBQ0g7aUJBQ0Q7O0FBR0QsZ0JBQUEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFO0FBQ25DLG9CQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUk7d0JBQ3JCLElBQUk7NkJBQ0YsUUFBUSxDQUFDLGlCQUFpQixDQUFDOzZCQUMzQixPQUFPLENBQUMsTUFBTSxDQUFDOzZCQUNmLE9BQU8sQ0FBQyxZQUFXO0FBQ25CLDRCQUFBLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZDLHlCQUFDLENBQUMsQ0FBQztBQUNMLHFCQUFDLENBQUMsQ0FBQztBQUVILG9CQUFBLElBQUksSUFBSSxZQUFZQSxnQkFBTyxFQUFFO0FBQzVCLHdCQUFBLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUk7NEJBQ3JCLElBQUk7aUNBQ0YsUUFBUSxDQUFDLGdCQUFnQixDQUFDO2lDQUMxQixPQUFPLENBQUMsU0FBUyxDQUFDO2lDQUNsQixPQUFPLENBQUMsWUFBVztBQUNuQixnQ0FBQSxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FDakQsQ0FBc0IsbUJBQUEsRUFBQSxJQUFJLENBQUMsSUFBSSxDQUFBLEVBQUEsQ0FBSSxFQUNuQyxtRkFBbUYsQ0FDbkYsQ0FBQztnQ0FDRixJQUFJLFNBQVMsRUFBRTtvQ0FDZCxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7aUNBQ2pEO0FBQ0YsNkJBQUMsQ0FBQyxDQUFDO0FBQ0wseUJBQUMsQ0FBQyxDQUFDO3FCQUNIO2lCQUNEO2FBQ0Q7U0FDRCxDQUFDLENBQ0YsQ0FBQzs7QUFHRixRQUFBLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSwyQkFBMkIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDcEU7SUFFRCxRQUFRLEdBQUE7O0tBRVA7QUFFRCxJQUFBLE1BQU0sWUFBWSxHQUFBO0FBQ2pCLFFBQUEsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0tBQzNFO0FBRUQsSUFBQSxNQUFNLFlBQVksR0FBQTtRQUNqQixNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ25DO0lBRUQsTUFBTSxtQkFBbUIsQ0FBQyxJQUFxQixFQUFBO0FBQzlDLFFBQUEsSUFBSTtBQUNILFlBQUEsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztBQUMvQixZQUFBLE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUVqRCxZQUFBLElBQUksWUFBWSxLQUFLLGFBQWEsRUFBRTtBQUNuQyxnQkFBQSxJQUFJQyxlQUFNLENBQUMsQ0FBQSxDQUFBLEVBQUksWUFBWSxDQUFBLHNCQUFBLENBQXdCLENBQUMsQ0FBQztnQkFDckQsT0FBTzthQUNQO0FBRUQsWUFBQSxJQUFJLElBQUksWUFBWUYsY0FBSyxFQUFFO2dCQUMxQixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2FBQzFDO0FBQU0saUJBQUEsSUFBSSxJQUFJLFlBQVlDLGdCQUFPLEVBQUU7Z0JBQ25DLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQzthQUNsRDtZQUVELElBQUlDLGVBQU0sQ0FBQyxDQUFZLFNBQUEsRUFBQSxZQUFZLFNBQVMsYUFBYSxDQUFBLENBQUEsQ0FBRyxDQUFDLENBQUM7U0FDOUQ7UUFBQyxPQUFPLEtBQUssRUFBRTtBQUNmLFlBQUEsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNoRCxZQUFBLElBQUlBLGVBQU0sQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1NBQzNFO0tBQ0Q7SUFFRCxNQUFNLG1CQUFtQixDQUFDLElBQXFCLEVBQUE7QUFDOUMsUUFBQSxJQUFJO0FBQ0gsWUFBQSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQy9CLFlBQUEsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBRWpELFlBQUEsSUFBSSxZQUFZLEtBQUssYUFBYSxFQUFFO0FBQ25DLGdCQUFBLElBQUlBLGVBQU0sQ0FBQyxDQUFBLENBQUEsRUFBSSxZQUFZLENBQUEsc0JBQUEsQ0FBd0IsQ0FBQyxDQUFDO2dCQUNyRCxPQUFPO2FBQ1A7QUFFRCxZQUFBLElBQUksSUFBSSxZQUFZRixjQUFLLEVBQUU7Z0JBQzFCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDMUM7QUFBTSxpQkFBQSxJQUFJLElBQUksWUFBWUMsZ0JBQU8sRUFBRTtnQkFDbkMsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2FBQ2xEO1lBRUQsSUFBSUMsZUFBTSxDQUFDLENBQVksU0FBQSxFQUFBLFlBQVksU0FBUyxhQUFhLENBQUEsQ0FBQSxDQUFHLENBQUMsQ0FBQztTQUM5RDtRQUFDLE9BQU8sS0FBSyxFQUFFO0FBQ2YsWUFBQSxPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2hELFlBQUEsSUFBSUEsZUFBTSxDQUFDLDhEQUE4RCxDQUFDLENBQUM7U0FDM0U7S0FDRDtJQUVELE1BQU0sb0JBQW9CLENBQUMsSUFBcUIsRUFBQTtBQUMvQyxRQUFBLElBQUk7QUFDSCxZQUFBLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDL0IsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDO0FBRWpFLFlBQUEsSUFBSSxZQUFZLEtBQUssZUFBZSxFQUFFO0FBQ3JDLGdCQUFBLElBQUlBLGVBQU0sQ0FBQyxDQUFBLENBQUEsRUFBSSxZQUFZLENBQUEsd0JBQUEsQ0FBMEIsQ0FBQyxDQUFDO2dCQUN2RCxPQUFPO2FBQ1A7QUFFRCxZQUFBLElBQUksSUFBSSxZQUFZRixjQUFLLEVBQUU7Z0JBQzFCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7YUFDM0M7QUFBTSxpQkFBQSxJQUFJLElBQUksWUFBWUMsZ0JBQU8sRUFBRTtnQkFDbkMsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQ25EO1lBRUQsSUFBSUMsZUFBTSxDQUFDLENBQVksU0FBQSxFQUFBLFlBQVksU0FBUyxlQUFlLENBQUEsQ0FBQSxDQUFHLENBQUMsQ0FBQztTQUNoRTtRQUFDLE9BQU8sS0FBSyxFQUFFO0FBQ2YsWUFBQSxPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ2pELFlBQUEsSUFBSUEsZUFBTSxDQUFDLCtEQUErRCxDQUFDLENBQUM7U0FDNUU7S0FDRDtBQUVPLElBQUEscUJBQXFCLENBQUMsR0FBVyxFQUFBO0FBQ3hDLFFBQUEsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUM7QUFBRSxZQUFBLE9BQU8sR0FBRyxDQUFDO0FBQ2pDLFFBQUEsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7S0FDaEU7QUFFRCxJQUFBLE1BQU0scUJBQXFCLENBQUMsS0FBYSxFQUFFLE9BQWUsRUFBQTtBQUN6RCxRQUFBLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEtBQUk7WUFDOUIsTUFBTSxLQUFLLEdBQUcsSUFBSUMsY0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQyxZQUFBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxLQUFLLENBQUM7WUFFNUIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztBQUMxQyxZQUFBLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsa0NBQWtDLEVBQUUsQ0FBQyxDQUFDO1lBRXBGLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUUzRSxZQUFBLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7QUFDNUUsWUFBQSxZQUFZLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQUs7Z0JBQzNDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDZCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEIsYUFBQyxDQUFDLENBQUM7QUFFSCxZQUFBLE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFO0FBQ3hELGdCQUFBLElBQUksRUFBRSxjQUFjO0FBQ3BCLGdCQUFBLEdBQUcsRUFBRSxhQUFhO0FBQ2xCLGFBQUEsQ0FBQyxDQUFDO0FBQ0gsWUFBQSxhQUFhLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQUs7Z0JBQzVDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDZixhQUFDLENBQUMsQ0FBQztZQUVILEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNkLFNBQUMsQ0FBQyxDQUFDO0tBQ0g7SUFFRCxNQUFNLHlCQUF5QixDQUFDLFVBQWtCLEVBQUE7UUFDakQsTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0tBQzVEO0lBRUQsTUFBTSx5QkFBeUIsQ0FBQyxVQUFrQixFQUFBO1FBQ2pELE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztLQUM1RDtJQUVELE1BQU0sMEJBQTBCLENBQUMsVUFBa0IsRUFBQTtRQUNsRCxNQUFNLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7S0FDN0Q7QUFFTyxJQUFBLE1BQU0sdUJBQXVCLENBQUMsVUFBa0IsRUFBRSxRQUFrRCxFQUFBO0FBQzNHLFFBQUEsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFaEUsSUFBSSxDQUFDLE1BQU0sSUFBSSxFQUFFLE1BQU0sWUFBWUYsZ0JBQU8sQ0FBQyxFQUFFO0FBQzVDLFlBQUEsSUFBSUMsZUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDbEMsT0FBTztTQUNQO0FBRUQsUUFBQSxJQUFJOztZQUVILE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7O1lBRTNDLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUNqRCxNQUFNLFVBQVUsR0FBRyxRQUFRLEtBQUssV0FBVyxHQUFHLFlBQVksR0FBRyxRQUFRLEtBQUssV0FBVyxHQUFHLFlBQVksR0FBRyxhQUFhLENBQUM7QUFDckgsWUFBQSxJQUFJQSxlQUFNLENBQUMsQ0FBQSxhQUFBLEVBQWdCLFVBQVUsQ0FBQSxLQUFBLENBQU8sQ0FBQyxDQUFDO1NBQzlDO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUEsTUFBQSxFQUFTLFFBQVEsQ0FBWSxVQUFBLENBQUEsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNwRCxZQUFBLElBQUlBLGVBQU0sQ0FBQyxDQUFBLHFCQUFBLEVBQXdCLFFBQVEsQ0FBQSxxQ0FBQSxDQUF1QyxDQUFDLENBQUM7U0FDcEY7S0FDRDtBQUVPLElBQUEsTUFBTSxhQUFhLENBQUMsTUFBZSxFQUFFLFFBQWtELEVBQUE7UUFDOUYsTUFBTSxRQUFRLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQzs7QUFHdEMsUUFBQSxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRTtBQUM3QixZQUFBLElBQUksS0FBSyxZQUFZRixjQUFLLEVBQUU7Z0JBQzNCLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7YUFDeEM7U0FDRDs7QUFHRCxRQUFBLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxFQUFFO0FBQzdCLFlBQUEsSUFBSSxLQUFLLFlBQVlDLGdCQUFPLEVBQUU7Z0JBQzdCLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQzthQUNoRDtTQUNEO0tBQ0Q7QUFFTyxJQUFBLE1BQU0sV0FBVyxDQUFDLElBQVcsRUFBRSxRQUFrRCxFQUFBO0FBQ3hGLFFBQUEsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztBQUMzQixRQUFBLElBQUksV0FBbUIsQ0FBQztRQUV4QixRQUFRLFFBQVE7QUFDZixZQUFBLEtBQUssV0FBVztBQUNmLGdCQUFBLFdBQVcsR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3JDLE1BQU07QUFDUCxZQUFBLEtBQUssV0FBVztBQUNmLGdCQUFBLFdBQVcsR0FBRyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3JDLE1BQU07QUFDUCxZQUFBLEtBQUssWUFBWTtBQUNoQixnQkFBQSxXQUFXLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNuRCxNQUFNO1NBQ1A7QUFFRCxRQUFBLElBQUksUUFBUSxLQUFLLFdBQVcsRUFBRTtZQUM3QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUcsRUFBQSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBSSxDQUFBLEVBQUEsV0FBVyxFQUFFLEdBQUcsV0FBVyxDQUFDO0FBQ2pGLFlBQUEsTUFBTSxpQkFBaUIsR0FBR0csc0JBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQzs7QUFHakQsWUFBQSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzdFLFlBQUEsSUFBSSxZQUFZLElBQUksWUFBWSxLQUFLLElBQUksRUFBRTtnQkFDMUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFpQixjQUFBLEVBQUEsSUFBSSxDQUFDLElBQUksQ0FBTyxJQUFBLEVBQUEsaUJBQWlCLENBQXVCLHFCQUFBLENBQUEsQ0FBQyxDQUFDO2dCQUN4RixJQUFJRixlQUFNLENBQUMsQ0FBVyxRQUFBLEVBQUEsUUFBUSxLQUFLLFFBQVEsQ0FBQSx1QkFBQSxDQUF5QixDQUFDLENBQUM7Z0JBQ3RFLE9BQU87YUFDUDtBQUVELFlBQUEsSUFBSTtBQUNILGdCQUFBLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDOzthQUVyRDtZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBeUIsc0JBQUEsRUFBQSxJQUFJLENBQUMsSUFBSSxDQUFHLENBQUEsQ0FBQSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQzVEO1NBQ0Q7S0FDRDtBQUVPLElBQUEsTUFBTSxtQkFBbUIsQ0FBQyxNQUFlLEVBQUUsUUFBa0QsRUFBQTtBQUNwRyxRQUFBLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDL0IsUUFBQSxJQUFJLGFBQXFCLENBQUM7UUFFMUIsUUFBUSxRQUFRO0FBQ2YsWUFBQSxLQUFLLFdBQVc7QUFDZixnQkFBQSxhQUFhLEdBQUcsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6QyxNQUFNO0FBQ1AsWUFBQSxLQUFLLFdBQVc7QUFDZixnQkFBQSxhQUFhLEdBQUcsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6QyxNQUFNO0FBQ1AsWUFBQSxLQUFLLFlBQVk7QUFDaEIsZ0JBQUEsYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDdkQsTUFBTTtTQUNQO0FBRUQsUUFBQSxJQUFJLFVBQVUsS0FBSyxhQUFhLEVBQUU7WUFDakMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFHLEVBQUEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUksQ0FBQSxFQUFBLGFBQWEsRUFBRSxHQUFHLGFBQWEsQ0FBQztBQUN6RixZQUFBLE1BQU0saUJBQWlCLEdBQUdFLHNCQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBR2pELFlBQUEsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUMvRSxZQUFBLElBQUksY0FBYyxJQUFJLGNBQWMsS0FBSyxNQUFNLEVBQUU7Z0JBQ2hELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBaUIsY0FBQSxFQUFBLE1BQU0sQ0FBQyxJQUFJLENBQU8sSUFBQSxFQUFBLGlCQUFpQixDQUF5Qix1QkFBQSxDQUFBLENBQUMsQ0FBQztnQkFDNUYsSUFBSUYsZUFBTSxDQUFDLENBQVcsUUFBQSxFQUFBLFVBQVUsS0FBSyxRQUFRLENBQUEsdUJBQUEsQ0FBeUIsQ0FBQyxDQUFDO2dCQUN4RSxPQUFPO2FBQ1A7QUFFRCxZQUFBLElBQUk7QUFDSCxnQkFBQSxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzs7YUFFdkQ7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLENBQTJCLHdCQUFBLEVBQUEsTUFBTSxDQUFDLElBQUksQ0FBRyxDQUFBLENBQUEsRUFBRSxLQUFLLENBQUMsQ0FBQzthQUNoRTtTQUNEO0tBQ0Q7QUFDRCxDQUFBO0FBRUQsTUFBTSwyQkFBNEIsU0FBUUcseUJBQWdCLENBQUE7QUFDekQsSUFBQSxNQUFNLENBQTBCO0lBRWhDLFdBQVksQ0FBQSxHQUFRLEVBQUUsTUFBK0IsRUFBQTtBQUNwRCxRQUFBLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDbkIsUUFBQSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztLQUNyQjtJQUVELE9BQU8sR0FBQTtBQUNOLFFBQUEsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQztRQUM3QixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7QUFFcEIsUUFBQSxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtBQUN6QixZQUFBLElBQUksRUFBRSwrSkFBK0o7QUFDckssWUFBQSxHQUFHLEVBQUUsMEJBQTBCO0FBQy9CLFNBQUEsQ0FBQyxDQUFDOztRQUdILElBQUlDLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQzthQUMzQixPQUFPLENBQUMsd0NBQXdDLENBQUM7QUFDakQsYUFBQSxTQUFTLENBQUMsTUFBTSxJQUFJLE1BQU07YUFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztBQUM5QyxhQUFBLFFBQVEsQ0FBQyxPQUFPLEtBQUssS0FBSTtZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO0FBQzdDLFlBQUEsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1NBQ2pDLENBQUMsQ0FBQyxDQUFDOztRQUdOLElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQzthQUMzQixPQUFPLENBQUMsd0NBQXdDLENBQUM7QUFDakQsYUFBQSxTQUFTLENBQUMsTUFBTSxJQUFJLE1BQU07YUFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztBQUM5QyxhQUFBLFFBQVEsQ0FBQyxPQUFPLEtBQUssS0FBSTtZQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO0FBQzdDLFlBQUEsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1NBQ2pDLENBQUMsQ0FBQyxDQUFDOztRQUdOLElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQzthQUM1QixPQUFPLENBQUMseUNBQXlDLENBQUM7QUFDbEQsYUFBQSxTQUFTLENBQUMsTUFBTSxJQUFJLE1BQU07YUFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDO0FBQy9DLGFBQUEsUUFBUSxDQUFDLE9BQU8sS0FBSyxLQUFJO1lBQ3pCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztBQUM5QyxZQUFBLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztTQUNqQyxDQUFDLENBQUMsQ0FBQztRQUVOLElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQzthQUMvQixPQUFPLENBQUMsa0RBQWtELENBQUM7QUFDM0QsYUFBQSxPQUFPLENBQUMsSUFBSSxJQUFJLElBQUk7YUFDbkIsY0FBYyxDQUFDLG9CQUFvQixDQUFDO2FBQ3BDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQztBQUNqRCxhQUFBLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRXRCLElBQUlBLGdCQUFPLENBQUMsV0FBVyxDQUFDO2FBQ3RCLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDaEIsYUFBQSxVQUFVLEVBQUUsQ0FBQztBQUNmLFFBQUEsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7QUFDekIsWUFBQSxJQUFJLEVBQUUsK1BBQStQO0FBQ3JRLFNBQUEsQ0FBQyxDQUFDO0tBQ0g7QUFDRDs7OzsifQ==
