import { z } from 'zod'

export const AgentSettingsSchema = z.object({
    chunkSize: z.number().min(100).max(2000).default(500),
    overlapSize: z.number().min(0).max(200).default(50),
    includePatterns: z.array(z.string()).default(['**/*.md']),
    excludePatterns: z.array(z.string()).default([]),
    embedModel: z.enum(['tf-idf', 'word2vec']).default('tf-idf'),
    apiKey: z.string().optional(),
})

export type AgentSettings = z.infer<typeof AgentSettingsSchema>

export const DEFAULT_SETTINGS: AgentSettings = {
    chunkSize: 500,
    overlapSize: 50,
    includePatterns: ['**/*.md'],
    excludePatterns: [],
    embedModel: 'tf-idf',
}

export function parseAgentSettings(settings: any): AgentSettings {
    return AgentSettingsSchema.parse({
        ...DEFAULT_SETTINGS,
        ...settings,
    })
} 