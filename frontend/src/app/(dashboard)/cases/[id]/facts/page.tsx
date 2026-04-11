'use client'

import { useCaseContext } from '@/contexts/CaseContext'
import { FactsView } from '@/components/FactsView'

export default function FactsPage() {
    const { activeCase } = useCaseContext()

    if (!activeCase) return null

    return (
        <FactsView caseId={activeCase.id} />
    )
}