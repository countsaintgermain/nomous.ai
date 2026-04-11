'use client'

import { useCaseContext } from '@/contexts/CaseContext'

export default function DashboardIndex() {
    const { activeCase } = useCaseContext()

    return (
        <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
            <div className="text-center text-muted-foreground">
                {!activeCase ? 'Wybierz lub utwórz sprawę na górnym pasku, aby zacząć pracę.' : 'Wybierz zakładkę z lewego menu.'}
            </div>
        </div>
    )
}