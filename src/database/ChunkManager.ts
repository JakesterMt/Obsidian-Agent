import { v4 as uuidv4 } from 'uuid'

export interface DocumentChunk {
    id: string
    content: string
    file: string
    start: number
    end: number
    lineStart: number
    lineEnd: number
    lastUpdated: number
    embedding?: number[]
}

export class ChunkManager {
    private db: IDBDatabase

    constructor(db: IDBDatabase) {
        this.db = db
    }

    async addChunk(chunk: Omit<DocumentChunk, 'id'>): Promise<string> {
        return new Promise((resolve, reject) => {
            const id = uuidv4()
            const transaction = this.db.transaction(['document_chunks'], 'readwrite')
            const store = transaction.objectStore('document_chunks')

            const request = store.add({
                ...chunk,
                id,
                lastUpdated: Date.now()
            })

            request.onsuccess = () => resolve(id)
            request.onerror = () => reject(request.error)
        })
    }

    async getChunk(id: string): Promise<DocumentChunk | null> {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['document_chunks'], 'readonly')
            const store = transaction.objectStore('document_chunks')
            const request = store.get(id)

            request.onsuccess = () => resolve(request.result || null)
            request.onerror = () => reject(request.error)
        })
    }

    async updateChunk(chunk: DocumentChunk): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['document_chunks'], 'readwrite')
            const store = transaction.objectStore('document_chunks')
            const request = store.put({
                ...chunk,
                lastUpdated: Date.now()
            })

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    async deleteChunk(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['document_chunks'], 'readwrite')
            const store = transaction.objectStore('document_chunks')
            const request = store.delete(id)

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }

    async deleteChunksByFile(file: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['document_chunks'], 'readwrite')
            const store = transaction.objectStore('document_chunks')
            const index = store.index('file')
            const request = index.getAll(file)

            request.onsuccess = () => {
                const chunks = request.result
                const deletePromises = chunks.map(chunk => this.deleteChunk(chunk.id))
                Promise.all(deletePromises)
                    .then(() => resolve())
                    .catch(reject)
            }
            request.onerror = () => reject(request.error)
        })
    }

    async getAllChunks(): Promise<DocumentChunk[]> {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['document_chunks'], 'readonly')
            const store = transaction.objectStore('document_chunks')
            const request = store.getAll()

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }

    async getChunksByFile(file: string): Promise<DocumentChunk[]> {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['document_chunks'], 'readonly')
            const store = transaction.objectStore('document_chunks')
            const index = store.index('file')
            const request = index.getAll(file)

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }
} 