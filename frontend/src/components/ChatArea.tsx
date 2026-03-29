'use client'

import { useRef, useEffect, useState } from "react"
import { useChat } from "ai/react"
import { Send, UploadCloud, FileText, Bot, User, ChevronRight, MessageSquareText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import Markdown from "markdown-to-jsx"

export function ChatArea({
    caseId
}: {
    caseId: number | null
}) {
    const [isOpen, setIsOpen] = useState(true)
    const { messages, setMessages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: "/api/chat/",
        body: { 
            case_id: caseId,
            session_id: `case_${caseId}`
        } 
    })

    // Pobierz historię przy zmianie sprawy
    useEffect(() => {
        if (!caseId) return;

        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/chat/${caseId}/history?session_id=case_${caseId}`);
                if (res.ok) {
                    const data = await res.json();
                    // Mapowanie na format v-ai SDK (id jest wymagane dla mapowania)
                    const formatted = data.messages.map((m: any, i: number) => ({
                        id: `${caseId}_${i}`,
                        role: m.role,
                        content: m.content
                    }));
                    setMessages(formatted);
                }
            } catch (err) {
                console.error("Failed to fetch history:", err);
            }
        };

        fetchHistory();
    }, [caseId, setMessages]);

    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Autoscroll w dół przy nowej wiadomości
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, isLoading])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !caseId) return

        // Prosty formularz FormData by wysłać plik PDF zgodnie z naszym PythonEndpoint
        const formData = new FormData()
        formData.append("file", e.target.files[0])
        formData.append("case_id", caseId.toString())

        try {
            const res = await fetch("/api/cases/" + caseId + "/documents", {
                method: "POST",
                body: formData,
            })
            if (res.ok) alert("Plik wgrany i przetwarzany w tle!")
            else alert("Błąd przetwarzania.")
        } catch (err) {
            console.error("Upload error", err)
        }
    }

    // Pusty stan, gdy nie wybrano sprawy z menu
    if (!caseId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground p-8 text-center">
                <div className="bg-accent rounded-full p-4 mb-4">
                    <FileText className="h-8 w-8 text-indigo-500" />
                </div>
                <h2 className="text-xl font-medium text-foreground mb-2">Nomous.ia Workspace</h2>
                <p className="max-w-md">Wybierz istniejącą sprawę z listy na górze, aby rozpocząć konwersację z asystentem prawnym, lub utwórz nową.</p>
            </div>
        )
    }

    if (!isOpen) {
        return (
            <div className="h-full border-l border-border bg-background flex flex-col items-center py-4 w-16 transition-all duration-300">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(true)}
                    className="text-muted-foreground hover:text-foreground hover:bg-accent"
                    title="Otwórz czat"
                >
                    <MessageSquareText className="h-5 w-5" />
                </Button>
            </div>
        )
    }

    return (
        <div className="h-full w-[400px] flex flex-col bg-background relative border-l border-border transition-all duration-300 shrink-0 min-h-0">
            {/* Pasek Górny */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/50 backdrop-blur-sm z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(false)}
                        className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 ml-[-8px]"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <h2 className="font-medium text-foreground text-sm flex items-center gap-2">
                        <span>Czat Ai</span>
                    </h2>
                </div>

                <div>
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileUpload}
                    />
                    <Button variant="outline" size="sm" className="gap-2 border-border bg-background hover:bg-accent text-muted-foreground h-8 px-2" asChild>
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <UploadCloud className="h-4 w-4" />
                            <span className="sr-only">Wgraj Dokument</span>
                        </label>
                    </Button>
                </div>
            </div>

            {/* Obszar Rozmowy */}
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                <div className="p-4 md:p-6 space-y-6 flex-1">
                    {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground mt-20">
                            <Bot className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-sm">Wgraj dokumenty badź zadaj pytanie.</p>
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div
                                key={m.id}
                                className={cn(
                                    "flex gap-4 p-4 rounded-xl",
                                    m.role === 'user' ? "bg-transparent" : "bg-accent border border-border"
                                )}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                                    m.role === 'user' ? "bg-accent border border-border" : "bg-indigo-100 dark:bg-indigo-600"
                                )}>
                                    {m.role === 'user' ? <User className="h-5 w-5 text-foreground" /> : <Bot className="h-5 w-5 text-indigo-700 dark:text-white" />}
                                </div>
                                <div className="flex-1 min-w-0 space-y-2 mt-1">
                                    <div className="text-foreground leading-relaxed text-sm prose prose-sm dark:prose-invert max-w-none">
                                        <Markdown options={{ forceBlock: true }}>
                                            {m.content}
                                        </Markdown>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex gap-4 p-4 bg-accent border border-border rounded-xl animate-pulse">
                            <div className="h-8 w-8 rounded-md bg-indigo-100 dark:bg-indigo-600/50 flex items-center justify-center shrink-0">
                                <Bot className="h-5 w-5 text-indigo-700/50 dark:text-white/50" />
                            </div>
                            <div className="flex-1 space-y-2 mt-2">
                                <div className="h-4 bg-background rounded w-3/4"></div>
                                <div className="h-4 bg-background rounded w-1/2"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-px" />
                </div>
            </div>

            {/* Input / Pole wpisywania - teraz w normalnym przepływie flex, nie absolute */}
            <div className="p-4 bg-background border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                <div className="max-w-3xl mx-auto">
                    <form
                        onSubmit={handleSubmit}
                        className="relative flex items-end overflow-hidden rounded-xl border border-border bg-background p-1 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
                    >
                        <textarea
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Zadaj pytanie..."
                            className="w-full resize-none bg-transparent px-4 py-3 sm:text-sm focus-visible:outline-none text-foreground placeholder:text-muted-foreground min-h-[52px] max-h-32"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    if (input.trim()) handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
                                }
                            }}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !input.trim()}
                            className="shrink-0 mb-1 mr-1 h-9 w-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                        >
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Wyślij</span>
                        </Button>
                    </form>
                    <div className="text-center mt-2 text-[10px] text-muted-foreground">
                        AI generuje odpowiedzi na podstawie akt sprawy.
                    </div>
                </div>
            </div>
        </div>
    )
}
