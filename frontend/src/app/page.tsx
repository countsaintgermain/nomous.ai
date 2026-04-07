'use client'

import { useState, useEffect, Suspense, useMemo, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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
import { Loader2 } from "lucide-react"

export type ViewState = 'overview' | 'briefcase' | 'facts' | 'pisp' | 'saos' | 'settings'

function DashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const [cases, setCases] = useState<Case[]>([])
    const [isPispModalOpen, setIsPispModalOpen] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    // WYCIĄGANIE STANU Z URL (Single Source of Truth)
    const activeView = (searchParams.get('view') as ViewState) || 'overview'
    const activeCaseId = searchParams.get('caseId') ? parseInt(searchParams.get('caseId')!) : null

    const activeCase = useMemo(() => {
        return cases.find(c => c.id === activeCaseId) || null
    }, [cases, activeCaseId])

    // Pobranie listy spraw
    useEffect(() => {
        fetch("/api/cases")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCases(data)
                } else {
                    setCases([])
                }
            })
            .catch(err => console.error("Error loading cases:", err))
    }, [])

    // Funkcje zmieniające stan poprzez URL
    const updateUrl = useCallback((params: Record<string, string | null>) => {
        const newParams = new URLSearchParams(searchParams.toString())
        Object.entries(params).forEach(([key, value]) => {
            if (value === null) {
                newParams.delete(key)
            } else {
                newParams.set(key, value)
            }
        })
        router.push(`${pathname}?${newParams.toString()}`, { scroll: false })
    }, [pathname, router, searchParams])

    const setActiveView = (view: ViewState) => updateUrl({ view })
    
    const handleSelectCase = async (c: Case) => {
        updateUrl({ caseId: c.id.toString(), view: 'overview' })

        if (c.signature && c.appellation) {
            try {
                await fetch(`/api/pisp/activate-context/${c.id}`, { method: 'POST' });
            } catch (err) {
                console.error("Error in PISP context:", err);
            }
            await syncWithPisp(c.id);
        }
    }

    const handleAddCase = (newCase: Case) => {
        setCases(prev => [newCase, ...prev])
        updateUrl({ caseId: newCase.id.toString(), view: 'overview' })
    }

    const handleUpdateCase = (updatedCase: Case) => {
        setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c))
    }

    // Logika synchronizacji z PISP
    const syncWithPisp = async (caseId: number) => {
        setIsSyncing(true);
        try {
            const syncRes = await fetch(`/api/pisp/sync/${caseId}`, { method: 'POST' });
            if (syncRes.ok) {
                const freshCase = await fetch(`/api/cases/${caseId}`).then(r => r.json());
                setCases(prev => prev.map(c => c.id === freshCase.id ? freshCase : c));
            }
        } catch (e) {
            console.error("Sync error:", e);
        } finally {
            setIsSyncing(false);
        }
    }

    // Polling dla aktywnej sprawy
    useEffect(() => {
        if (activeCaseId && !isSyncing) {
            const interval = setInterval(() => {
                fetch(`/api/cases/${activeCaseId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.id === activeCaseId) {
                            setCases(prev => prev.map(c => c.id === data.id ? data : c));
                        }
                    })
                    .catch(() => {});
            }, 15000);
            return () => clearInterval(interval);
        }
    }, [activeCaseId, isSyncing]);

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden">
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
                activeCaseId={activeCaseId}
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

                    {activeView !== 'settings' && <ChatArea key={activeCaseId || 'none'} caseId={activeCaseId} />}
                </div>
            </main>
        </div>
    )
}

export default function Home() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-background text-indigo-500">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    )
}
