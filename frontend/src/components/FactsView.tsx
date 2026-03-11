'use client'

import React, { useState, useEffect } from 'react'
import { Database, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Fact {
    id: number
    content: string
    metadata_json: any
    source_doc_id: number
    created_at: string
}

export function FactsView({ caseId }: { caseId: number }) {
    const [facts, setFacts] = useState<Fact[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchFacts()
    }, [caseId])

    const fetchFacts = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/cases/${caseId}/facts`)
            if (!res.ok) throw new Error('Fetch failed')
            const data = await res.json()
            setFacts(data)
        } catch (err) {
            console.error('Error fetching facts:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-zinc-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
    }

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-background">
            <h2 className="text-2xl font-bold flex items-center gap-3 mb-6 text-foreground">
                <Database className="h-6 w-6 text-indigo-500" />
                Baza Faktów Sprawy
            </h2>

            <div className="space-y-4">
                {facts.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/20">
                        <Database className="h-10 w-10 mx-auto mb-4 opacity-20" />
                        <p className="text-lg text-foreground">Brak faktów w bazie.</p>
                        <p className="text-sm opacity-60">Przeanalizuj dokumenty z Aktówki, aby zasilić bazę wiedzy RAG.</p>
                    </div>
                ) : (
                    facts.map(fact => (
                        <Card key={fact.id} className="bg-card border-border">
                            <CardContent className="p-4">
                                <p className="text-card-foreground">{fact.content}</p>
                                <div className="text-xs text-muted-foreground mt-2 flex justify-between">
                                    <span>Z dokumentu #{fact.source_doc_id}</span>
                                    <span>{new Date(fact.created_at).toLocaleString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
