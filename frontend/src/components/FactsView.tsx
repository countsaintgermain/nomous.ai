'use client'

import React, { useState, useEffect } from 'react'
import { Database, Plus, Trash2, Calendar, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface CaseFact {
    id: number
    content: string
    case_id: number
    source_doc_id: number | null
    created_date: string
}

export function FactsView({ caseId }: { caseId: number }) {
    const [facts, setFacts] = useState<CaseFact[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchFacts()
    }, [caseId])

    const fetchFacts = async () => {
        try {
            const res = await fetch(`/api/cases/${caseId}/facts`)
            const data = await res.json()
            setFacts(data)
        } catch (err) {
            console.error('Error fetching facts:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await fetch(`/api/cases/${caseId}/facts/${id}`, { method: 'DELETE' })
            setFacts(facts.filter(f => f.id !== id))
        } catch (err) {
            console.error('Delete failed:', err)
        }
    }

    const filteredFacts = facts.filter(f => 
        f.content.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-border bg-card/40">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Database className="h-6 w-6 text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground tracking-wider uppercase">Baza Faktów</h2>
                </div>
                
                <div className="flex items-center gap-4 w-96">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Szukaj w faktach..." 
                            className="pl-10 bg-background border-border"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    {filteredFacts.map((fact) => (
                        <Card key={fact.id} className="bg-card border-border hover:border-indigo-500/30 transition-all group">
                            <CardContent className="p-5">
                                <div className="flex justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <p className="text-foreground leading-relaxed">
                                            {fact.content}
                                        </p>
                                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3" />
                                                <span>Dodano: {new Date(fact.created_date).toLocaleString('pl-PL')}</span>
                                            </div>
                                            {fact.source_doc_id && (
                                                <div className="flex items-center gap-1.5 text-indigo-400">
                                                    <FileText className="h-3 w-3" />
                                                    <span>Dokument źródłowy #{fact.source_doc_id}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDelete(fact.id)}
                                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {filteredFacts.length === 0 && !loading && (
                        <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                            <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>Brak faktów spełniających kryteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
