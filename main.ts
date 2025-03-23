import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CHAT_VIEW_TYPE, ChatView } from './src/components/ChatView';
import { DatabaseManager } from './src/database/DatabaseManager';
import { AgentSettings, DEFAULT_SETTINGS, parseAgentSettings } from './src/settings/schema/settings';
import { AgentSettingTab } from './src/settings/SettingTab';
import { VaultProcessor, ProcessingProgress } from './src/core/VaultProcessor';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class AgentPlugin extends Plugin {
	settings: AgentSettings;
	dbManager: DatabaseManager | null = null;
	vaultProcessor: VaultProcessor | null = null;
	private dbManagerInitPromise: Promise<DatabaseManager> | null = null;

	async onload() {
		await this.loadSettings();

		// Register views
		this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf));

		// Add ribbon icon
		this.addRibbonIcon('message-circle', 'Open Agent Chat', () => {
			this.activateChatView();
		});

		// Add commands
		this.addCommand({
			id: 'open-agent-chat',
			name: 'Open chat',
			callback: () => this.activateChatView(),
		});

		this.addCommand({
			id: 'process-vault',
			name: 'Process vault documents',
			callback: async () => {
				const notice = new Notice('Processing vault documents...', 0);
				try {
					await this.processVault((progress) => {
						notice.setMessage(
							`Processing documents: ${progress.processedFiles}/${progress.totalFiles}`
						);
					});
				} catch (error) {
					console.error('Error processing vault:', error);
					notice.setMessage('Error processing vault documents');
				} finally {
					setTimeout(() => notice.hide(), 2000);
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new AgentSettingTab(this.app, this));

		// Initialize database and processor
		try {
			const dbManager = await this.getDbManager();
			this.vaultProcessor = new VaultProcessor(this.app, dbManager, this.settings);
		} catch (error) {
			console.error('Failed to initialize:', error);
			new Notice('Failed to initialize plugin');
		}

		// Register file change events
		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				if (this.vaultProcessor) {
					await this.vaultProcessor.processFile(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('create', async (file) => {
				if (this.vaultProcessor && file.extension === 'md') {
					await this.vaultProcessor.processFile(file);
				}
			})
		);
	}

	async onunload() {
		await this.dbManager?.cleanup();
		this.dbManager = null;
		this.dbManagerInitPromise = null;
		this.vaultProcessor = null;
	}

	async loadSettings() {
		this.settings = parseAgentSettings(await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async setSettings(newSettings: AgentSettings) {
		this.settings = newSettings;
		await this.saveData(newSettings);
		this.vaultProcessor?.updateSettings(newSettings);
	}

	async getDbManager(): Promise<DatabaseManager> {
		if (this.dbManager) {
			return this.dbManager;
		}

		if (!this.dbManagerInitPromise) {
			this.dbManagerInitPromise = DatabaseManager.create(this.app)
				.then(manager => {
					this.dbManager = manager;
					return manager;
				})
				.catch(error => {
					this.dbManagerInitPromise = null;
					throw error;
				});
		}

		return this.dbManagerInitPromise;
	}

	async activateChatView() {
		const leaf = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];
		
		if (leaf) {
			this.app.workspace.revealLeaf(leaf);
			return;
		}

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: CHAT_VIEW_TYPE,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0]
		);
	}

	async processVault(onProgress?: (progress: ProcessingProgress) => void) {
		if (!this.vaultProcessor) {
			throw new Error('VaultProcessor not initialized');
		}
		await this.vaultProcessor.processVault(onProgress);
	}

	async getRelevantChunks(query: string, limit?: number): Promise<Array<{ chunk: any; similarity: number }>> {
		if (!this.vaultProcessor) {
			throw new Error('VaultProcessor not initialized');
		}
		return this.vaultProcessor.getRelevantChunks(query, limit);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: AgentPlugin;

	constructor(app: App, plugin: AgentPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
