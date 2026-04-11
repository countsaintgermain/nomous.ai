'use client'

import { useCaseContext } from '@/contexts/CaseContext'
import { Briefcase } from '@/components/Briefcase'

export default function BriefcasePage() {
    const { activeCase } = useCaseContext()

    if (!activeCase) return null

    return (
        <Briefcase 
            caseId={activeCase.id} 
            onAnalyze={(docId, filename) => console.log('analyze', docId)} 
        />
    )
}