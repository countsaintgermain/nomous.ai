'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { type Case } from '@/lib/types'
import { useRouter, usePathname } from 'next/navigation'

interface CaseContextType {
    cases: Case[]
    activeCase: Case | null
    isSyncing: boolean
    handleSelectCase: (c: Case) => Promise<void>
    handleAddCase: (newCase: Case) => void
    handleUpdateCase: (updatedCase: Case) => void
    syncWithPisp: (caseId: number) => Promise<void>
    setActiveCaseById: (id: number | null) => void
}

const CaseContext = createContext<CaseContextType | undefined>(undefined)

export function CaseProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()

    const [cases, setCases] = useState<Case[]>([])
    const [activeCase, setActiveCase] = useState<Case | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)

    // Pobranie listy spraw przy pierwszym renderze
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

    const setActiveCaseById = useCallback((id: number | null) => {
        if (id === null) {
            setActiveCase(null)
            return
        }
        const found = cases.find(c => c.id === id)
        if (found) {
            setActiveCase(found)
        }
    }, [cases])

    // Logika synchronizacji z PISP
    const syncWithPisp = async (caseId: number) => {
        setIsSyncing(true)
        try {
            const syncRes = await fetch(`/api/pisp/sync/${caseId}`, { method: 'POST' })
            if (syncRes.ok) {
                const freshCase = await fetch(`/api/cases/${caseId}`).then(r => r.json())
                setCases(prev => prev.map(c => c.id === freshCase.id ? freshCase : c))
                setActiveCase(current => current?.id === freshCase.id ? freshCase : current)
            }
        } catch (e) {
            console.error("Sync error:", e)
        } finally {
            setIsSyncing(false)
        }
    }

    const handleSelectCase = async (c: Case) => {
        setActiveCase(c)
        // Nawigacja do overview po wyborze sprawy
        router.push(`/cases/${c.id}/overview`)

        if (c.signature && c.appellation) {
            try {
                await fetch(`/api/pisp/activate-context/${c.id}`, { method: 'POST' })
            } catch (err) {
                console.error("Error in PISP context:", err)
            }
            await syncWithPisp(c.id)
        }
    }

    const handleAddCase = (newCase: Case) => {
        setCases(prev => [newCase, ...prev])
        setActiveCase(newCase)
        router.push(`/cases/${newCase.id}/overview`)
    }

    const handleUpdateCase = (updatedCase: Case) => {
        setCases(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c))
        setActiveCase(current => current?.id === updatedCase.id ? updatedCase : current)
    }

    // Polling dla aktywnej sprawy (opcjonalny, zostawiony ze starych założeń)
    useEffect(() => {
        if (activeCase?.id && !isSyncing) {
            const interval = setInterval(() => {
                fetch(`/api/cases/${activeCase.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.id === activeCase.id) {
                            setCases(prev => prev.map(c => c.id === data.id ? data : c))
                            setActiveCase(prev => {
                                if (!prev) return data;
                                if (JSON.stringify(prev.documents) !== JSON.stringify(data.documents)) {
                                    return data;
                                }
                                return prev;
                            });
                        }
                    })
                    .catch(() => {})
            }, 15000)
            return () => clearInterval(interval)
        }
    }, [activeCase?.id, isSyncing])

    return (
        <CaseContext.Provider value={{
            cases,
            activeCase,
            isSyncing,
            handleSelectCase,
            handleAddCase,
            handleUpdateCase,
            syncWithPisp,
            setActiveCaseById
        }}>
            {children}
        </CaseContext.Provider>
    )
}

export function useCaseContext() {
    const context = useContext(CaseContext)
    if (context === undefined) {
        throw new Error('useCaseContext must be used within a CaseProvider')
    }
    return context
}