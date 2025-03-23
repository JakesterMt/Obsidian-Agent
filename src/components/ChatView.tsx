import { ItemView, WorkspaceLeaf } from 'obsidian'
import * as React from 'react'
import ReactDOM from 'react-dom/client'
import type AgentPlugin from '../../main'

export const CHAT_VIEW_TYPE = 'agent-chat-view'

interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

interface ChatViewProps {
    plugin: AgentPlugin
}

const ChatViewComponent: React.FC<ChatViewProps> = ({ plugin }) => {
    const [messages, setMessages] = React.useState<ChatMessage[]>([])
    const [inputValue, setInputValue] = React.useState('')
    const messagesEndRef = React.useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    React.useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        const userMessage: ChatMessage = {
            role: 'user',
            content: inputValue,
            timestamp: Date.now()
        }

        setMessages(prev => [...prev, userMessage])
        setInputValue('')

        // TODO: Process the message and get response
        const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: 'This is a placeholder response. The agent functionality will be implemented soon.',
            timestamp: Date.now()
        }

        setMessages(prev => [...prev, assistantMessage])
    }

    return (
        <div className="agent-chat-container">
            <div className="agent-chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`agent-chat-message ${msg.role}`}>
                        <div className="agent-chat-message-content">
                            {msg.content}
                        </div>
                        <div className="agent-chat-message-timestamp">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="agent-chat-input-form">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type your message..."
                    className="agent-chat-input"
                />
                <button type="submit" className="agent-chat-submit">
                    Send
                </button>
            </form>
        </div>
    )
}

export class ChatView extends ItemView {
    plugin: AgentPlugin
    root: ReactDOM.Root | null = null

    constructor(leaf: WorkspaceLeaf, plugin: AgentPlugin) {
        super(leaf)
        this.plugin = plugin
    }

    getViewType(): string {
        return CHAT_VIEW_TYPE
    }

    getDisplayText(): string {
        return 'Agent Chat'
    }

    async onOpen(): Promise<void> {
        this.root = ReactDOM.createRoot(this.containerEl.children[1])
        this.root.render(
            <ChatViewComponent plugin={this.plugin} />
        )
    }

    async onClose(): Promise<void> {
        this.root?.unmount()
    }
} 