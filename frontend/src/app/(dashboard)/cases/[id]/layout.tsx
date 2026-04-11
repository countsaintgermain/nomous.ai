'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCaseContext } from '@/contexts/CaseContext'

export default function CaseLayout({ children }: { children: React.ReactNode }) {
    const { id } = useParams()
    const { setActiveCaseById, cases } = useCaseContext()

    // Sync state with URL parameter
    useEffect(() => {
        if (id) {
            setActiveCaseById(parseInt(id as string))
        }
    }, [id, cases, setActiveCaseById])

    return (
        <div className="flex-1 w-full h-full flex flex-col relative min-h-0 min-w-0">
            {children}
        </div>
    )
}