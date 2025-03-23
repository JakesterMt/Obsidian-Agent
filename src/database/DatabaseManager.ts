import { App, Notice } from 'obsidian'
import { ChunkManager } from './ChunkManager'

export class DatabaseManager {
    private app: App
    private db: IDBDatabase | null = null
    private chunkManager: ChunkManager | null = null
    private static DB_NAME = 'obsidian-agent-db'
    private static DB_VERSION = 1

    constructor(app: App) {
        this.app = app
    }

    static async create(app: App): Promise<DatabaseManager> {
        const dbManager = new DatabaseManager(app)
        await dbManager.initialize()
        console.log('Agent database initialized.', dbManager)
        return dbManager
    }

    private async initialize() {
        try {
            this.db = await this.openDatabase()
            this.chunkManager = new ChunkManager(this.db)
        } catch (error) {
            console.error('Failed to initialize database:', error)
            new Notice('Failed to initialize database')
            throw error
        }
    }

    private openDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DatabaseManager.DB_NAME, DatabaseManager.DB_VERSION)

            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result
                if (!db.objectStoreNames.contains('document_chunks')) {
                    const store = db.createObjectStore('document_chunks', { keyPath: 'id' })
                    store.createIndex('file', 'file', { unique: false })
                    store.createIndex('last_updated', 'last_updated', { unique: false })
                }
            }
        })
    }

    getDb() {
        return this.db
    }

    getChunkManager(): ChunkManager {
        if (!this.chunkManager) {
            throw new Error('Database not initialized')
        }
        return this.chunkManager
    }

    async save(): Promise<void> {
        // IndexedDB saves automatically, no need to implement this
    }

    async cleanup() {
        if (this.db) {
            this.db.close()
        }
        this.chunkManager = null
        this.db = null
    }
} 