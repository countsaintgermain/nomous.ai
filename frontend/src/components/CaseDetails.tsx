'use client'

import { useState, useEffect } from "react"
import { FileText, Tag, AlignLeft, Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export type Case = {
    id: number
    title: string
    signature?: string
    description?: string
    status: string
}

export function CaseDetails({ 
    selectedCase,
    onUpdateCase
}: { 
    selectedCase: Case | null,
    onUpdateCase?: (updatedCase: Case) => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedDescription, setEditedDescription] = useState(selectedCase?.description || "")
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        setEditedDescription(selectedCase?.description || "")
        setIsEditing(false)
    }, [selectedCase])

    const handleSave = async () => {
        if (!selectedCase) return
        setIsSaving(true)
        try {
            const res = await fetch(`http://localhost:8000/api/cases/${selectedCase.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: editedDescription })
            })
            if (res.ok) {
                const updatedCase = await res.json()
                onUpdateCase?.(updatedCase)
                setIsEditing(false)
            } else {
                console.error("Failed to update case description")
            }
        } catch (error) {
            console.error("Error updating case description:", error)
        } finally {
            setIsSaving(false)
        }
    }

    if (!selectedCase) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground p-8 text-center h-full">
                <div className="bg-accent rounded-full p-4 mb-4">
                    <FileText className="h-8 w-8 text-indigo-500" />
                </div>
                <h2 className="text-xl font-medium text-foreground mb-2">Nomous.ia Workspace</h2>
                <p className="max-w-md">Wybierz istniejącą sprawę z listy na górze, aby zobaczyć szczegóły i rozpocząć konwersację z asystentem prawnym.</p>
            </div>
        )
    }

    return (
        <div className="flex-1 bg-background p-8 h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8 mt-10">

                {/* Header */}
                <div className="border-b border-border pb-6">
                    <h1 className="text-3xl font-semibold text-foreground mb-2">
                        {selectedCase.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent border border-border text-foreground">
                            <Tag className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                            Sygnatura: {selectedCase.signature || "Brak sygnatury"}
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent border border-border text-foreground">
                            Status: <span className="capitalize">{selectedCase.status}</span>
                        </span>
                    </div>
                </div>

                {/* Description */}
                <div className="group relative space-y-3 p-6 bg-accent/50 rounded-xl border border-border/80 transition-all hover:bg-accent/70">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                            <AlignLeft className="h-4 w-4 text-muted-foreground" />
                            Krótki Opis Sprawy
                        </h3>
                        {!isEditing && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsEditing(true)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    
                    {isEditing ? (
                        <div className="space-y-3">
                            <Textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="bg-background border-border text-foreground min-h-[120px] resize-none focus-visible:ring-indigo-500"
                                placeholder="Wprowadź opis sprawy..."
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsEditing(false)
                                        setEditedDescription(selectedCase.description || "")
                                    }}
                                    className="bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground h-8 px-3"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Anuluj
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-3"
                                >
                                    <Check className="h-4 w-4 mr-1" />
                                    {isSaving ? "Zapisywanie..." : "Zapisz"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
                            {selectedCase.description || "Brak opisu dla tej sprawy."}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
