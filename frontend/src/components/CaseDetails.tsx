'use client'

import { useState, useEffect } from "react"
import { FileText, Tag, AlignLeft, Pencil, Check, X, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { type Case } from "@/lib/types"
import { APPELLATIONS } from "./TopBar"

export function CaseDetails({ 
    selectedCase,
    onUpdateCase,
    onTriggerSync
}: { 
    selectedCase: Case | null,
    onUpdateCase?: (updatedCase: Case) => void,
    onTriggerSync?: (caseId: number) => void
}) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedDescription, setEditedDescription] = useState(selectedCase?.description || "")
    const [editedSignature, setEditedSignature] = useState(selectedCase?.signature || "")
    const [editedAppellation, setEditedAppellation] = useState(selectedCase?.appellation || "")
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        setEditedDescription(selectedCase?.description || "")
        setEditedSignature(selectedCase?.signature || "")
        setEditedAppellation(selectedCase?.appellation || "")
        setIsEditing(false)
    }, [selectedCase])

    const handleSave = async () => {
        if (!selectedCase) return
        setIsSaving(true)
        try {
            const res = await fetch(`/api/cases/${selectedCase.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    description: editedDescription,
                    signature: editedSignature,
                    appellation: editedAppellation
                })
            })
            if (res.ok) {
                const updatedCase = await res.json()
                onUpdateCase?.(updatedCase)
                setIsEditing(false)
                
                // Trigger sync if both signature and appellation are present
                if (updatedCase.signature && updatedCase.appellation) {
                    onTriggerSync?.(updatedCase.id)
                }
            } else {
                console.error("Failed to update case")
            }
        } catch (error) {
            console.error("Error updating case:", error)
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

                {/* Info & Description */}
                <div className="group relative space-y-3 p-6 bg-accent/50 rounded-xl border border-border/80 transition-all hover:bg-accent/70">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                            <AlignLeft className="h-4 w-4 text-muted-foreground" />
                            Szczegóły i Opis Sprawy
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
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sygnatura</label>
                                    <Input 
                                        value={editedSignature}
                                        onChange={(e) => setEditedSignature(e.target.value)}
                                        placeholder="np. II K 829/24"
                                        className="bg-background border-border h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Apelacja</label>
                                    <select 
                                        value={editedAppellation}
                                        onChange={(e) => setEditedAppellation(e.target.value)}
                                        className="w-full h-9 p-2 text-sm border rounded-md bg-background border-border focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Wybierz apelację...</option>
                                        {APPELLATIONS.map(a => (
                                            <option key={a.id} value={a.id}>{a.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opis</label>
                                <Textarea
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    className="bg-background border-border text-foreground min-h-[120px] resize-none focus-visible:ring-indigo-500"
                                    placeholder="Wprowadź opis sprawy..."
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setIsEditing(false)
                                        setEditedDescription(selectedCase.description || "")
                                        setEditedSignature(selectedCase.signature || "")
                                        setEditedAppellation(selectedCase.appellation || "")
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
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">Apelacja</span>
                                    <span className="flex items-center gap-2 font-medium">
                                        <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                                        {selectedCase.appellation || "Nie wybrano"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider mb-1">ID PISP</span>
                                    <span className="font-mono text-xs bg-accent px-1.5 py-0.5 rounded border">
                                        {selectedCase.pisp_id || "Brak synchronizacji"}
                                    </span>
                                </div>
                            </div>
                            <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap pt-2 border-t border-border/50">
                                {selectedCase.description || "Brak opisu dla tej sprawy."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
