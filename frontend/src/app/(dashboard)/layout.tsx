'use client'

import { CaseProvider } from '@/contexts/CaseContext'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { ChatArea } from '@/components/ChatArea'
import { useCaseContext } from '@/contexts/CaseContext'
import { usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const { cases, activeCase, isSyncing, handleSelectCase, handleAddCase } = useCaseContext()
    const pathname = usePathname()
    const [isPispModalOpen, setIsPispModalOpen] = useState(false)

    // Logika wyciągnięcia ViewState ze ścieżki
    const getActiveView = () => {
        if (pathname.includes('/settings')) return 'settings'
        if (pathname.includes('/overview')) return 'overview'
        if (pathname.includes('/briefcase')) return 'briefcase'
        if (pathname.includes('/facts')) return 'facts'
        if (pathname.includes('/pisp')) return 'pisp'
        if (pathname.includes('/saos')) return 'saos'
        return 'overview'
    }

    const activeView = getActiveView()

    // Ukrywamy chat w ustawieniach i na widoku szczegółów dokumentu (który ma własną logikę)
    const shouldHideChat = activeView === 'settings' || pathname.includes('/documents/')

    return (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-background overflow-hidden relative font-sans antialiased selection:bg-indigo-500/30">
            {mounted && (
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
            )}

            <TopBar
                cases={cases}
                activeCaseId={activeCase?.id || null}
                onSelectCase={handleSelectCase}
                onAddCase={handleAddCase}
            />
            <main className="flex flex-1 overflow-hidden relative">
                <Sidebar
                    activeCase={activeCase}
                    activeView={activeView as any}
                    onViewChange={() => {}} // Zastąpione linkami w nowym Sidebar
                />
                <div className="flex-1 flex overflow-hidden min-h-0 relative">
                    {children}
                    {!shouldHideChat && <ChatArea key={activeCase?.id || 'none'} caseId={activeCase?.id || null} />}
                </div>
            </main>

            {isSyncing && (
                <div className="fixed bottom-6 right-6 z-[100] bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 border border-white/20 backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-semibold tracking-wide">Pobieranie danych z PISP...</span>
                    <div className="flex gap-1">
                        <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1 h-1 bg-white/40 rounded-full animate-bounce"></span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <CaseProvider>
            <DashboardLayoutContent>
                {children}
            </DashboardLayoutContent>
        </CaseProvider>
    )
}
