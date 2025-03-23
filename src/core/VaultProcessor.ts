import { App, TFile } from 'obsidian'
import { DocumentProcessor } from './document/DocumentProcessor'
import { DatabaseManager } from '../database/DatabaseManager'
import { AgentSettings } from '../settings/schema/settings'
import { EmbeddingService } from './embedding/EmbeddingService'

export interface ProcessingProgress {
    type: 'file' | 'vault'
    processedFiles: number
    totalFiles: number
}

export class VaultProcessor {
    private app: App
    private dbManager: DatabaseManager
    private settings: AgentSettings
    private documentProcessor: DocumentProcessor
    private embeddingService: EmbeddingService

    constructor(app: App, dbManager: DatabaseManager, settings: AgentSettings) {
        this.app = app
        this.dbManager = dbManager
        this.settings = settings
        this.documentProcessor = new DocumentProcessor(settings)
        this.embeddingService = new EmbeddingService()
    }

    updateSettings(settings: AgentSettings) {
        this.settings = settings
        this.documentProcessor.updateSettings(settings)
    }

    async processFile(file: TFile, onProgress?: (progress: ProcessingProgress) => void): Promise<void> {
        const fileContent = await this.app.vault.read(file)
        const chunks = await this.documentProcessor.processDocument(fileContent, file.path)

        // Delete existing chunks for this file
        await this.dbManager.getChunkManager().deleteChunksForFile(file.path)

        // Process chunks and generate embeddings
        const chunksWithEmbeddings = chunks.map(chunk => ({
            chunk,
            embedding: this.embeddingService.addDocument(chunk.content)
        }))

        // Store chunks with embeddings
        await this.dbManager.getChunkManager().insertChunksWithEmbeddings(chunksWithEmbeddings)

        if (onProgress) {
            onProgress({
                type: 'file',
                processedFiles: 1,
                totalFiles: 1
            })
        }
    }

    async processVault(onProgress?: (progress: ProcessingProgress) => void): Promise<void> {
        const files = this.app.vault.getMarkdownFiles()
        let processedFiles = 0

        // Reset embedding service before processing the vault
        this.embeddingService.reset()

        for (const file of files) {
            try {
                await this.processFile(file)
                processedFiles++

                if (onProgress) {
                    onProgress({
                        type: 'vault',
                        processedFiles,
                        totalFiles: files.length
                    })
                }
            } catch (error) {
                console.error(`Error processing file ${file.path}:`, error)
            }
        }
    }

    async getRelevantChunks(query: string, limit: number = 5): Promise<Array<{ chunk: any; similarity: number }>> {
        const queryEmbedding = this.embeddingService.getEmbedding(query)
        const chunks = await this.dbManager.getChunkManager().getChunksWithEmbeddings()

        // Calculate similarities and sort by relevance
        const chunksWithSimilarities = chunks.map(chunk => ({
            chunk,
            similarity: this.embeddingService.calculateSimilarity(queryEmbedding, chunk.embeddingArray)
        }))

        // Sort by similarity (descending) and return top results
        return chunksWithSimilarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
    }
} 