'use client'

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/Sidebar"
import { ChatArea } from "@/components/ChatArea"
import { CaseDetails } from "@/components/CaseDetails"
import { Briefcase } from "@/components/Briefcase"
import { FactsView } from "@/components/FactsView"
import { TopBar } from "@/components/TopBar"
import { PispView } from "@/components/PispView"
import { SaosView } from "@/components/SaosView"
import { type Case } from "@/lib/types"

export type ViewState = 'overview' | 'briefcase' | 'facts' | 'pisp' | 'saos'

export default function Home() {
    const [cases, setCases] = useState<Case[]>([])
    const [activeCase, setActiveCase] = useState<Case | null>(null)
    const [activeView, setActiveView] = useState<ViewState>('overview')

    // Pobranie listy spraw dla hardkodowanego Usera z Backendu
    useEffect(() => {
        fetch("/api/cases")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCases(data)
                    if (data.length > 0 && !activeCase) {
                        setActiveCase(data[0]);
                        setActiveView('pisp');
                    }
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
        setActiveView('overview') 
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

    useEffect(() => {
        if (activeCase) {
            const interval = setInterval(() => {
                fetch(`/api/cases/${activeCase.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (JSON.stringify(data) !== JSON.stringify(activeCase)) {
                            handleUpdateCase(data);
                        }
                    })
                    .catch(console.error);
            }, 5000); 
            return () => clearInterval(interval);
        }
    }, [activeCase?.id]);

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
                <div className="flex-1 flex overflow-hidden min-h-0">
                    {!activeCase ? (
                        <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
                            <div className="text-center text-muted-foreground">Wybierz lub utwórz sprawę na górnym pasku, aby zacząć pracę.</div>
                        </div>
                    ) : (
                        <>
                            {activeView === 'overview' && <CaseDetails selectedCase={activeCase} onUpdateCase={handleUpdateCase} />}
                            {activeView === 'briefcase' && <Briefcase caseId={activeCase.id} onAnalyze={(docId, filename) => console.log('analyze', docId)} />}
                            {activeView === 'facts' && <FactsView caseId={activeCase.id} />}
                            {activeView === 'pisp' && <PispView activeCase={activeCase} />}
                            {activeView === 'saos' && <SaosView activeCase={activeCase} />}
                        </>
                    )}

                    <ChatArea key={activeCase?.id || 'none'} caseId={activeCase?.id || null} />
                </div>
            </main>
        </div>
    )
}
