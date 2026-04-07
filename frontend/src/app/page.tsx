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
import { SettingsView } from "@/components/SettingsView"
import { type Case } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, RefreshCw } from "lucide-react"

export type ViewState = 'overview' | 'briefcase' | 'facts' | 'pisp' | 'saos' | 'settings'

export default function Home() {
    const [cases, setCases] = useState<Case[]>([])
    const [activeCase, setActiveCase] = useState<Case | null>(null)
    const [activeView, setActiveView] = useState<ViewState>('overview')
    const [isPispModalOpen, setIsPispModalOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    // Pobranie listy spraw
    useEffect(() => {
        fetch("/api/cases")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCases(data)
                    if (data.length > 0 && !activeCase) {
                        setActiveCase(data[0]);
                    }
                } else {
                    setCases([])
                }
            })
            .catch(err => console.error("Error loading cases:", err))
    }, [])

    const handleUpdateCase = (updatedCase: Case) => {
        setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c))
        if (activeCase?.id === updatedCase.id) {
            setActiveCase(updatedCase)
        }
    }

    // Logika synchronizacji z PISP
    const syncWithPisp = async (caseId: number) => {
        setIsSyncing(true);
        try {
            const syncRes = await fetch(`/api/pisp/sync/${caseId}`, { method: 'POST' });
            if (syncRes.ok) {
                // Pobieramy ŚWIEŻE dane sprawy z dokumentami
                const freshCase = await fetch(`/api/cases/${caseId}`).then(r => r.json());

                // Uaktualnij listę spraw
                setCases(prev => prev.map(c => c.id === freshCase.id ? freshCase : c));

                // BEZPOŚREDNIO uaktualnij aktywną sprawę, wymuszając re-render
                setActiveCase(current => current?.id === freshCase.id ? freshCase : current);
            }
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            setIsSyncing(false);
        }
    }

    const handleSelectCase = async (c: Case) => {
        // Natychmiast ustawiamy sprawę, by UI zareagowało
        setActiveCase(c)
        setActiveView('overview')

        if (c.signature && c.appellation) {
            try {
                // Aktywacja kontekstu (apelacji) i oczekiwanie na jej zakonczenie
                await fetch(`/api/pisp/activate-context/${c.id}`, { method: 'POST' });
            } catch (err) {
                console.error("Error in PISP context:", err);
            }

            // Synchronizacja w tle - teraz z AWAIT by spinner nie zniknął za szybko
            await syncWithPisp(c.id);
        }
    }

    const handleAddCase = (newCase: Case) => {
        setCases([newCase, ...cases])
        setActiveCase(newCase)
        setActiveView('overview')
    }

    // Polling dla aktywnej sprawy (opcjonalnie, zostawiam dla spójności)
    useEffect(() => {
        if (activeCase && !isSyncing) {
            const interval = setInterval(() => {
                fetch(`/api/cases/${activeCase.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (JSON.stringify(data) !== JSON.stringify(activeCase)) {
                            handleUpdateCase(data);
                        }
                    })
                    .catch(console.error);
            }, 10000);
            return () => clearInterval(interval);
        }
    }, [activeCase?.id, isSyncing]);

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background text-foreground font-sans">
            {isSyncing && (
                <div className="fixed bottom-6 right-6 z-[60] bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Synchronizowanie z PISP...</span>
                </div>
            )}

            <Dialog open={isPispModalOpen} onOpenChange={setIsPispModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Logowanie do PISP</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-center text-sm text-muted-foreground">
                        Integracja z PISP jest teraz dostępna bezpośrednio w menu dodawania sprawy.
                    </div>
                </DialogContent>
            </Dialog>

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
                    {activeView === 'settings' ? (
                        <SettingsView />
                    ) : !activeCase ? (
                        <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
                            <div className="text-center text-muted-foreground">Wybierz lub utwórz sprawę na górnym pasku, aby zacząć pracę.</div>
                        </div>
                    ) : (
                        <>
                            {activeView === 'overview' && (
                                <CaseDetails
                                    selectedCase={activeCase}
                                    onUpdateCase={handleUpdateCase}
                                    onTriggerSync={syncWithPisp}
                                />
                            )}
                            {activeView === 'briefcase' && <Briefcase caseId={activeCase.id} onAnalyze={(docId, filename) => console.log('analyze', docId)} />}
                            {activeView === 'facts' && <FactsView caseId={activeCase.id} />}
                            {activeView === 'pisp' && <PispView activeCase={activeCase} onUpdateCase={handleUpdateCase} />}
                            {activeView === 'saos' && <SaosView activeCase={activeCase} />}
                        </>
                    )}

                    {activeView !== 'settings' && <ChatArea key={activeCase?.id || 'none'} caseId={activeCase?.id || null} />}
                </div>
            </main>
        </div>
    )
}
