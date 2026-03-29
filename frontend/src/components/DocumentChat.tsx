'use client'

import React, { useState } from 'react'
import { Send, Bot, User, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
}

export function DocumentChat({
    docId,
    filename,
    onClose
}: {
    docId: number,
    filename: string,
    onClose: () => void
}) {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: `Cześć! Jestem Twoim asystentem dla dokumentu "${filename}". O co chcesz zapytać?` }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setIsLoading(true)

        // TODO: Implement actual API call for document-specific analysis
        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `To jest symulowana odpowiedź dla dokumentu ID ${docId}. W pełnej wersji tutaj pojawi się analiza RAG.`
            }
            setMessages(prev => [...prev, aiMsg])
            setIsLoading(false)
        }, 1000)
    }

    return (
        <div className="flex flex-col h-full bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-border bg-accent/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium truncate max-w-[200px]">{filename}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4">
                <div className="space-y-4">
                    {messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-3", m.role === 'user' ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "max-w-[80%] p-3 rounded-lg text-sm",
                                m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-accent border border-border"
                            )}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-accent border border-border p-3 rounded-lg animate-pulse">
                                <div className="h-2 w-8 bg-muted-foreground/20 rounded"></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-background/50 backdrop-blur flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Zapytaj o ten dokument..."
                    className="flex-1 bg-transparent border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-8 w-8">
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    )
}
