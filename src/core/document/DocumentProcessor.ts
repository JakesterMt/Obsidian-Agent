import { TFile, Vault } from 'obsidian'
import { minimatch } from 'minimatch'
import { AgentSettings } from '../../settings/schema/settings'

export interface DocumentChunk {
    content: string
    file: string
    start: number
    end: number
    lineStart: number
    lineEnd: number
}

export class DocumentProcessor {
    private vault: Vault
    private settings: AgentSettings
    private chunkSize: number
    private includePatterns: string[]
    private excludePatterns: string[]

    constructor(
        vault: Vault,
        settings: AgentSettings,
        chunkSize: number,
        includePatterns: string[],
        excludePatterns: string[]
    ) {
        this.vault = vault
        this.settings = settings
        this.chunkSize = chunkSize
        this.includePatterns = includePatterns
        this.excludePatterns = excludePatterns
    }

    async processFile(file: TFile): Promise<DocumentChunk[]> {
        if (!this.shouldProcessFile(file.path)) {
            return []
        }

        const content = await this.vault.cachedRead(file)
        return this.processDocument(content, file.path)
    }

    private shouldProcessFile(filePath: string): boolean {
        // Check if file matches any exclude pattern
        if (this.excludePatterns.some(pattern => minimatch(filePath, pattern))) {
            return false
        }

        // Check if file matches any include pattern
        return this.includePatterns.some(pattern => minimatch(filePath, pattern))
    }

    async processDocument(content: string, filePath: string): Promise<DocumentChunk[]> {
        const chunks: DocumentChunk[] = []
        const lines = content.split('\n')
        let currentChunk = ''
        let chunkStart = 0
        let lineStart = 0

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line

            if (potentialChunk.length >= this.settings.chunkSize) {
                // Add current chunk before starting a new one
                if (currentChunk) {
                    chunks.push({
                        content: currentChunk,
                        file: filePath,
                        start: chunkStart,
                        end: chunkStart + currentChunk.length,
                        lineStart: lineStart,
                        lineEnd: i - 1
                    })
                }

                // Start a new chunk with overlap
                const lastChunkEnd = Math.max(0, line.length - this.settings.overlapSize)
                currentChunk = line.slice(lastChunkEnd)
                chunkStart = chunkStart + lastChunkEnd
                lineStart = i
            } else {
                currentChunk = potentialChunk
            }
        }

        // Add the final chunk if there's any content left
        if (currentChunk) {
            chunks.push({
                content: currentChunk,
                file: filePath,
                start: chunkStart,
                end: chunkStart + currentChunk.length,
                lineStart: lineStart,
                lineEnd: lines.length - 1
            })
        }

        return chunks
    }

    async processVault(): Promise<DocumentChunk[]> {
        const files = this.vault.getFiles()
        const allChunks: DocumentChunk[] = []

        for (const file of files) {
            const chunks = await this.processFile(file)
            allChunks.push(...chunks)
        }

        return allChunks
    }

    // Helper method to update settings
    updateSettings(settings: AgentSettings) {
        this.settings = settings
    }
} 