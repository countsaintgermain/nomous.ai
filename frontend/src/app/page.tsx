'use client'

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"
import { ChatArea } from "@/components/ChatArea"
import { CaseDetails, type Case } from "@/components/CaseDetails"
import { Briefcase } from "@/components/Briefcase"
import { FactsView } from "@/components/FactsView"
import { TopBar } from "@/components/TopBar"

export type ViewState = 'overview' | 'briefcase' | 'facts'

export default function Home() {
    const [cases, setCases] = useState<Case[]>([])
    const [activeCase, setActiveCase] = useState<Case | null>(null)
    const [activeView, setActiveView] = useState<ViewState>('overview')

    // Pobranie listy spraw dla hardkodowanego Usera z Backendu (Port 8000)
    useEffect(() => {
        fetch("http://localhost:8000/api/cases")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCases(data)
                } else {
                    console.error("Expected array from /api/cases, got:", data)
                    setCases([])
                }
            })
            .catch(err => {
                console.error("Error loading cases:", err)
            })
    }, [])

    const handleSelectCase = (c: Case) => {
        setActiveCase(c)
        setActiveView('overview') // Default view when switching cases
    }

    const handleAddCase = (newCase: Case) => {
        setCases([newCase, ...cases])
        setActiveCase(newCase)
        setActiveView('overview')
    }

    const handleUpdateCase = (updatedCase: Case) => {
        setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c))
        if (activeCase?.id === updatedCase.id) {
            setActiveCase(updatedCase)
        }
    }

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background text-foreground font-sans">
            <TopBar
                cases={cases}
                activeCaseId={activeCase?.id || null}
                onSelectCase={handleSelectCase}
                onAddCase={handleAddCase}
            />
            <main className="flex flex-1 overflow-hidden">
                <Sidebar
                    activeCase={activeCase}
                    activeView={activeView}
                    onViewChange={setActiveView}
                />
                <div className="flex-1 flex overflow-hidden">
                    {/* Renderujemy widok zgodnie z panelem bocznym. Jesli brak sprawy to tylko placeholder. */}
                    {!activeCase ? (
                        <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
                            <div className="text-center text-muted-foreground">Wybierz lub utwórz sprawę na górnym pasku, aby zacząć pracę.</div>
                        </div>
                    ) : (
                        <>
                            {activeView === 'overview' && <CaseDetails selectedCase={activeCase} onUpdateCase={handleUpdateCase} />}
                            {activeView === 'briefcase' && <Briefcase caseId={activeCase.id} onAnalyze={(docId, filename) => console.log('analyze', docId)} />}
                            {activeView === 'facts' && <FactsView caseId={activeCase.id} />}
                        </>
                    )}

                    {/* Chat zawsze widoczny, dostosowujący swój system prompt do activeCase */}
                    <ChatArea caseId={activeCase?.id || null} />
                </div>
            </main>
        </div>
    )
}
