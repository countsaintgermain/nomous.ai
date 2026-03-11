'use client'

import { Settings, LayoutDashboard, History, FileText, ChevronRight, Briefcase as BriefcaseIcon, Database } from "lucide-react"

interface Case {
    id: number;
    title: string;
}

interface SidebarProps {
    activeCase: Case | null;
    activeView: 'overview' | 'briefcase' | 'facts';
    onViewChange: (view: 'overview' | 'briefcase' | 'facts') => void;
}

export function Sidebar({ activeCase, activeView, onViewChange }: SidebarProps) {
    return (
        <div className="flex w-64 flex-col bg-card border-r border-border">
            {/* Globalne Menu (Widoczne gdy nie ma wybranej sprawy) */}
            {!activeCase ? (
                <nav className="flex-1 px-4 py-6 space-y-2">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Menu Główne
                    </div>
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-indigo-500 dark:text-indigo-400 bg-accent transition-colors">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Wybierz Sprawę</span>
                    </button>
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <History className="h-4 w-4" />
                        <span>Ostatnie Sprawy</span>
                    </button>
                </nav>
            ) : (
                /* Kontekstowe Menu Sprawy */
                <nav className="flex-1 px-4 py-6 space-y-2">
                    <div className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 truncate">
                        Kontekst Sprawy
                        <div className="text-foreground text-sm font-medium mt-1 truncate">{activeCase.title}</div>
                    </div>
                    <div className="h-4"></div>
                    <button
                        onClick={() => onViewChange('overview')}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeView === 'overview' ? 'text-indigo-500 dark:text-indigo-400 bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    >
                        <div className="flex items-center gap-3">
                            <LayoutDashboard className="h-4 w-4" />
                            <span>Ogólne</span>
                        </div>
                        {activeView === 'overview' && <ChevronRight className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => onViewChange('briefcase')}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeView === 'briefcase' ? 'text-indigo-500 dark:text-indigo-400 bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    >
                        <div className="flex items-center gap-3">
                            <BriefcaseIcon className="h-4 w-4" />
                            <span>Aktówka</span>
                        </div>
                        {activeView === 'briefcase' && <ChevronRight className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={() => onViewChange('facts')}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeView === 'facts' ? 'text-indigo-500 dark:text-indigo-400 bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                    >
                        <div className="flex items-center gap-3">
                            <Database className="h-4 w-4" />
                            <span>Baza Faktów</span>
                        </div>
                        {activeView === 'facts' && <ChevronRight className="h-4 w-4" />}
                    </button>

                </nav>
            )}

            {/* Stopka Uzytkownika */}
            <div className="border-t border-border p-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <Settings className="h-4 w-4" />
                    <span>Ustawienia Systemu</span>
                </div>
            </div>
        </div>
    )
}
