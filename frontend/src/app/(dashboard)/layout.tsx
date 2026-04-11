'use client'

import { CaseProvider } from '@/contexts/CaseContext'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { ChatArea } from '@/components/ChatArea'
import { useCaseContext } from '@/contexts/CaseContext'
import { usePathname } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState, useEffect } from 'react'

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
