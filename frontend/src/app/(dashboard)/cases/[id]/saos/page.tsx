'use client'

import { useCaseContext } from '@/contexts/CaseContext'
import { SaosView } from '@/components/SaosView'

export default function SaosPage() {
    const { activeCase } = useCaseContext()

    if (!activeCase) return null

    return (
        <SaosView activeCase={activeCase} />
    )
}