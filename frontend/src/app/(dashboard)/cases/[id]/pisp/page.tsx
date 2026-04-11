'use client'

import { useCaseContext } from '@/contexts/CaseContext'
import { PispView } from '@/components/PispView'

export default function PispPage() {
    const { activeCase, handleUpdateCase } = useCaseContext()

    if (!activeCase) return null

    return (
        <PispView 
            activeCase={activeCase} 
            onUpdateCase={handleUpdateCase} 
        />
    )
}