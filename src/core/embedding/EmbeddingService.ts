export class EmbeddingService {
    private vocabulary: Map<string, number> = new Map()
    private documentFrequency: Map<string, number> = new Map()
    private documentCount: number = 0

    private preprocessText(text: string): string[] {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0)
    }

    private updateVocabulary(words: string[]) {
        const uniqueWords = new Set(words)
        uniqueWords.forEach(word => {
            if (!this.vocabulary.has(word)) {
                this.vocabulary.set(word, this.vocabulary.size)
            }
            this.documentFrequency.set(
                word,
                (this.documentFrequency.get(word) || 0) + 1
            )
        })
    }

    private calculateTfIdf(text: string): number[] {
        const words = this.preprocessText(text)
        const wordFreq = new Map<string, number>()
        
        // Calculate term frequency
        words.forEach(word => {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
        })

        // Initialize vector with zeros
        const vector = new Array(this.vocabulary.size).fill(0)

        // Calculate TF-IDF for each word
        wordFreq.forEach((freq, word) => {
            const index = this.vocabulary.get(word)
            if (index !== undefined) {
                const tf = freq / words.length
                const df = this.documentFrequency.get(word) || 0
                const idf = Math.log((this.documentCount + 1) / (df + 1))
                vector[index] = tf * idf
            }
        })

        return vector
    }

    private cosineSimilarity(vec1: number[], vec2: number[]): number {
        if (vec1.length !== vec2.length) return 0

        let dotProduct = 0
        let norm1 = 0
        let norm2 = 0

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i]
            norm1 += vec1[i] * vec1[i]
            norm2 += vec2[i] * vec2[i]
        }

        norm1 = Math.sqrt(norm1)
        norm2 = Math.sqrt(norm2)

        if (norm1 === 0 || norm2 === 0) return 0
        return dotProduct / (norm1 * norm2)
    }

    addDocument(text: string): number[] {
        const words = this.preprocessText(text)
        this.updateVocabulary(words)
        this.documentCount++
        return this.calculateTfIdf(text)
    }

    getEmbedding(text: string): number[] {
        return this.calculateTfIdf(text)
    }

    calculateSimilarity(embedding1: number[], embedding2: number[]): number {
        return this.cosineSimilarity(embedding1, embedding2)
    }

    reset() {
        this.vocabulary.clear()
        this.documentFrequency.clear()
        this.documentCount = 0
    }
} 