import { App, PluginSettingTab, Setting } from 'obsidian'
import { AgentPlugin } from '../../main'
import { AgentSettings } from './schema/settings'

export class AgentSettingTab extends PluginSettingTab {
    plugin: AgentPlugin
    settings: AgentSettings

    constructor(app: App, plugin: AgentPlugin) {
        super(app, plugin)
        this.plugin = plugin
        this.settings = plugin.settings
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        containerEl.createEl('h2', { text: 'Agent Settings' })

        new Setting(containerEl)
            .setName('Chunk Size')
            .setDesc('Number of characters per chunk')
            .addText(text => text
                .setValue(this.settings.chunkSize.toString())
                .onChange(async (value) => {
                    const numValue = Number(value)
                    if (!isNaN(numValue) && numValue >= 100 && numValue <= 2000) {
                        this.settings.chunkSize = numValue
                        await this.plugin.saveSettings()
                    }
                }))

        new Setting(containerEl)
            .setName('Overlap Size')
            .setDesc('Number of characters to overlap between chunks')
            .addText(text => text
                .setValue(this.settings.overlapSize.toString())
                .onChange(async (value) => {
                    const numValue = Number(value)
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 200) {
                        this.settings.overlapSize = numValue
                        await this.plugin.saveSettings()
                    }
                }))

        new Setting(containerEl)
            .setName('Include Patterns')
            .setDesc('Glob patterns for files to include (one per line)')
            .addTextArea(text => text
                .setValue(this.settings.includePatterns.join('\n'))
                .onChange(async (value) => {
                    this.settings.includePatterns = value.split('\n').filter(p => p.trim())
                    await this.plugin.saveSettings()
                }))

        new Setting(containerEl)
            .setName('Exclude Patterns')
            .setDesc('Glob patterns for files to exclude (one per line)')
            .addTextArea(text => text
                .setValue(this.settings.excludePatterns.join('\n'))
                .onChange(async (value) => {
                    this.settings.excludePatterns = value.split('\n').filter(p => p.trim())
                    await this.plugin.saveSettings()
                }))

        new Setting(containerEl)
            .setName('Embedding Model')
            .setDesc('Model to use for generating embeddings')
            .addDropdown(dropdown => dropdown
                .addOption('tf-idf', 'TF-IDF')
                .addOption('word2vec', 'Word2Vec')
                .setValue(this.settings.embedModel)
                .onChange(async (value: 'tf-idf' | 'word2vec') => {
                    this.settings.embedModel = value
                    await this.plugin.saveSettings()
                }))

        if (this.settings.embedModel === 'word2vec') {
            new Setting(containerEl)
                .setName('API Key')
                .setDesc('API key for the embedding service')
                .addText(text => text
                    .setValue(this.settings.apiKey || '')
                    .setPlaceholder('Enter your API key')
                    .onChange(async (value) => {
                        this.settings.apiKey = value
                        await this.plugin.saveSettings()
                    }))
        }
    }
} 