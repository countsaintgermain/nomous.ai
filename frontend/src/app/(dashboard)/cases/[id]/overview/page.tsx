'use client'

import { useCaseContext } from '@/contexts/CaseContext'
import { CaseDetails } from '@/components/CaseDetails'

export default function OverviewPage() {
    const { activeCase, handleUpdateCase, syncWithPisp } = useCaseContext()

    if (!activeCase) return null

    return (
        <CaseDetails
            selectedCase={activeCase}
            onUpdateCase={handleUpdateCase}
            onTriggerSync={syncWithPisp}
        />
    )
}