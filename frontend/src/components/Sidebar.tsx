'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
    Settings, 
    LayoutDashboard, 
    History, 
    FileText, 
    ChevronRight, 
    Briefcase as BriefcaseIcon, 
    Database,
    Gavel,
    Scale,
    Users,
    Calendar,
    Zap,
    Link as LinkIcon,
    Mic2
} from 'lucide-react'
import { type Case } from '@/lib/types'

type ViewState = 'overview' | 'briefcase' | 'facts' | 'pisp' | 'saos' | 'settings'

interface SidebarProps {
    activeCase: Case | null;
    activeView: ViewState;
    onViewChange: (view: ViewState) => void;
}

export function Sidebar({ activeCase, activeView }: SidebarProps) {
    const [pispConnected, setPispConnected] = useState(false);
    const isPispEnabled = activeCase && activeCase.signature && activeCase.appellation;

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch('/api/pisp/status');
                const data = await res.json();
                setPispConnected(data.connected);
            } catch (e) {}
        };
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const navItems = [
        { id: 'overview', label: 'Ogólne', icon: LayoutDashboard },
        { id: 'briefcase', label: 'Aktówka', icon: BriefcaseIcon },
        { id: 'facts', label: 'Baza Faktów', icon: Database },
    ]

    return (
        <div className="flex w-64 flex-col bg-card border-r border-border h-full">
            <div className="flex-1 overflow-y-auto">
                {!activeCase ? (
                    <nav className="px-4 py-6 space-y-2">
                        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Menu Główne
                        </div>
                        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-indigo-500 dark:text-indigo-400 bg-accent transition-colors">
                            <LayoutDashboard className="h-4 w-4" />
                            <span>Wybierz Sprawę</span>
                        </button>
                    </nav>
                ) : (
                    <div className="px-4 py-6 space-y-6">
                        <div className="px-3">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Kontekst Sprawy
                            </div>
                            <div className="text-foreground text-sm font-bold truncate">
                                {activeCase.title}
                            </div>
                        </div>

                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/cases/${activeCase.id}/${item.id}`}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeView === item.id ? 'text-indigo-500 dark:text-indigo-400 bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </div>
                                    {activeView === item.id && <ChevronRight className="h-4 w-4" />}
                                </Link>
                            ))}
                        </nav>

                        <div className="space-y-1">
                            <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                                Integracje
                            </div>
                            <nav className="space-y-1">
                                {isPispEnabled && (
                                    <Link
                                        href={`/cases/${activeCase.id}/pisp`}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeView === 'pisp' ? 'text-indigo-500 dark:text-indigo-400 bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Gavel className="h-4 w-4 opacity-70" />
                                                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-background ${pispConnected ? 'bg-green-500' : 'bg-muted-foreground/30'}`}></span>
                                            </div>
                                            <span>Portal PISP</span>
                                        </div>
                                        {activeView === 'pisp' && <ChevronRight className="h-4 w-4" />}
                                    </Link>
                                )}
                                <Link
                                    href={`/cases/${activeCase.id}/saos`}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeView === 'saos' ? 'text-indigo-500 dark:text-indigo-400 bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Scale className="h-4 w-4 opacity-70" />
                                        <span>Orzecznictwo SAOS</span>
                                    </div>
                                    {activeView === 'saos' && <ChevronRight className="h-4 w-4" />}
                                </Link>
                            </nav>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-border">
                <Link
                    href="/settings"
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeView === 'settings' ? 'text-indigo-500 bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                >
                    <Settings className="h-4 w-4" />
                    <span>Ustawienia AI</span>
                </Link>
            </div>
        </div>
    )
}
