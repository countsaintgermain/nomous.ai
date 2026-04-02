'use client'

import React from 'react'
import { Gavel, Users, Calendar, History, Link as LinkIcon, FileText, Building2, Scale, Eye, Download, ShieldCheck, ExternalLink, Briefcase as BriefcaseIcon, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { type Case, type CaseEntity, type CaseActivity, type CaseHearing, type Document } from '@/lib/types'
import { getAppLocale } from '@/lib/i18n'

interface PispViewProps {
    activeCase: Case;
    onUpdateCase?: (updatedCase: Case) => void;
}

export function PispView({ activeCase, onUpdateCase }: PispViewProps) {
    const [view, setView] = React.useState<'details' | 'entities' | 'hearings' | 'activities' | 'documents' | 'connections'>('details');
    const [importingIds, setImportingIds] = React.useState<number[]>([]);

    const formatDate = (dateInput: string | undefined) => {
        if (!dateInput) return '-';
        try {
            const date = new Date(dateInput);
            return date.toLocaleString('pl-PL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) { return dateInput; }
    };

    const formatDateOnly = (dateInput: string | undefined | Date) => {
        if (!dateInput) return '-';
        try {
            const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
            return date.toLocaleDateString('pl-PL');
        } catch (e) { return String(dateInput); }
    };

    const handlePreview = (pispId: number) => {
        const url = `/api/pisp/document/${pispId}/preview`;
        window.open(url, '_blank');
    };

    const handleImport = async (docId: number) => {
        setImportingIds(prev => [...prev, docId]);
        try {
            const res = await fetch(`/api/pisp/document/${docId}/import`, { method: 'POST' });
            if (res.ok) {
                // Po udanym imporcie pobieramy świeże dane o sprawie i wymuszamy re-render
                const updatedCaseRes = await fetch(`/api/cases/${activeCase.id}`);
                if (updatedCaseRes.ok) {
                    const freshCase = await updatedCaseRes.json();
                    if (onUpdateCase) onUpdateCase(freshCase);
                }
            }
        } catch (e) {
            console.error("Import error:", e);
        } finally {
            setImportingIds(prev => prev.filter(id => id !== docId));
        }
    };

    const renderEntities = () => (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                            <th className="px-4 py-3 font-semibold w-1/4">Rola</th>
                            <th className="px-4 py-3 font-semibold w-1/2">Nazwa podmiotu</th>
                            <th className="px-4 py-3 font-semibold w-1/4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {activeCase.entities?.length > 0 ? (
                            activeCase.entities.map((entity: CaseEntity, i: number) => (
                                <tr key={i} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-4 py-4 font-medium text-indigo-600 dark:text-indigo-400">{entity.role}</td>
                                    <td className="px-4 py-4">
                                        <div className="font-semibold">{entity.name}</div>
                                        <div className="text-[10px] text-muted-foreground opacity-70">{entity.address}</div>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 border-emerald-500/20 text-[10px]">
                                            {entity.status || 'Aktywny'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">Brak danych o podmiotach.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderHearings = () => (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                            <th className="px-4 py-3 font-semibold w-1/4">Data i czas</th>
                            <th className="px-4 py-3 font-semibold w-1/4">Sala / Sędzia</th>
                            <th className="px-4 py-3 font-semibold w-1/2">Wynik / Przedmiot</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {activeCase.hearings?.length > 0 ? (
                            activeCase.hearings.map((hearing: CaseHearing, i: number) => (
                                <tr key={i} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-4 py-4 font-medium text-indigo-600 dark:text-indigo-400">{formatDate(hearing.date)}</td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm font-semibold">Sala: {hearing.room || "-"}</div>
                                        <div className="text-xs text-muted-foreground">{hearing.judge}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-xs font-bold text-foreground/80">{hearing.result}</div>
                                        <div className="text-[10px] text-muted-foreground italic mt-1">{hearing.subject}</div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">Brak planowanych lub odbytych posiedzeń.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderActivities = () => (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                            <th className="px-4 py-3 font-semibold w-1/2">Czynność / Sygnatura</th>
                            <th className="px-4 py-3 font-semibold w-1/4">Data</th>
                            <th className="px-4 py-3 font-semibold w-1/4">Nadawca / Sąd</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {activeCase.activities?.length > 0 ? (
                            activeCase.activities.map((activity: CaseActivity, i: number) => (
                                <tr key={i} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-4 py-4">
                                        <div className="font-semibold text-foreground/90">{activity.activity}</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">{activity.signature}</div>
                                    </td>
                                    <td className="px-4 py-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{formatDateOnly(activity.date)}</td>
                                    <td className="px-4 py-4 text-xs text-muted-foreground">{activity.submitted_by}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">Brak odnotowanych czynności.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderDocuments = () => (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                            <th className="px-4 py-3 font-semibold w-2/3">Nazwa dokumentu</th>
                            <th className="px-4 py-3 font-semibold w-1/3 text-right">Dostępne akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {activeCase.documents?.length > 0 ? (
                            activeCase.documents.map((doc: Document, i: number) => {
                                const isRemote = doc.status === 'pisp_remote';
                                const downloadUrl = `/api/documents/${activeCase.id}/documents/${doc.id}/download`;
                                
                                return (
                                    <tr key={i} className="hover:bg-accent/30 transition-colors">
                                        <td className="px-4 py-4 font-medium min-w-[200px]">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold break-words">
                                                    {doc.document_name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[9px] py-0 px-1 bg-muted/50 text-muted-foreground border-border font-normal">
                                                        {formatDateOnly(doc.document_date)}
                                                    </Badge>
                                                    {isRemote ? (
                                                        <span className="text-[10px] text-orange-500 italic">Dostępny w PISP</span>
                                                    ) : (
                                                        <span className="text-[10px] text-emerald-500 italic font-semibold">W aktówce</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right min-w-[300px]">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Podgląd jest zawsze dostępny - albo z PISP, albo z lokalnego PDF */}
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 text-[11px] gap-1.5 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => {
                                                        if (isRemote) {
                                                            doc.pisp_id && handlePreview(doc.pisp_id);
                                                        } else {
                                                            window.open(`${downloadUrl}?format=pdf`, '_blank');
                                                        }
                                                    }}
                                                >
                                                    <ExternalLink size={12} />
                                                    Podgląd
                                                </Button>

                                                {isRemote ? (
                                                    <Button 
                                                        variant="default" 
                                                        size="sm" 
                                                        className="h-8 text-[11px] gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                        onClick={() => handleImport(doc.id)}
                                                        disabled={importingIds.includes(doc.id)}
                                                    >
                                                        {importingIds.includes(doc.id) ? <RefreshCw className="h-3 w-3 animate-spin" /> : <BriefcaseIcon size={12} />}
                                                        Zapisz w aktówce
                                                    </Button>
                                                ) : (
                                                    <a href={`${downloadUrl}?format=source`} target="_blank" rel="noopener noreferrer">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-[11px] gap-1.5 text-indigo-600 hover:bg-indigo-50 font-semibold"
                                                        >
                                                            <Download size={12} />
                                                            Oryginał
                                                        </Button>
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">Brak dokumentów w tej sprawie.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderDetails = () => (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section>
                <h2 className="text-2xl font-bold mb-6 text-foreground/90">Dane podstawowe</h2>
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-y-6 p-6 md:p-8">
                        <div>
                            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 opacity-70">Sygnatura</p>
                            <p className="font-bold text-base">{activeCase.signature || "Brak"}</p>
                        </div>
                        <div className="md:col-span-1">
                            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 opacity-70">Sąd</p>
                            <p className="font-bold text-sm leading-tight">{activeCase.court || "Brak danych"}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 opacity-70">Wydział</p>
                            <p className="font-bold text-sm">{activeCase.department || "Brak danych"}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 opacity-70">Status</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <p className="font-bold text-sm">{activeCase.status}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            <section>
                <h2 className="text-2xl font-bold mb-6 text-foreground/90">Dane dodatkowe</h2>
                <div className="bg-card border border-border rounded-xl shadow-sm p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 opacity-70">Przedmiot sprawy</p>
                            <p className="text-sm leading-relaxed">{activeCase.case_subject || "-"}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider mb-1.5 opacity-70">Rozstrzygnięcie</p>
                            <p className="text-sm font-bold">{activeCase.resolution || "-"}</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );

    const renderConnections = () => (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                        <tr className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                            <th className="px-4 py-3 font-semibold w-1/4">Sygnatura</th>
                            <th className="px-4 py-3 font-semibold w-1/4">Typ / Organ</th>
                            <th className="px-4 py-3 font-semibold w-1/4">Data wpływu</th>
                            <th className="px-4 py-3 font-semibold w-1/4 text-right">Wynik</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {activeCase.relations?.length > 0 ? (
                            activeCase.relations.map((rel: any, i: number) => (
                                <tr key={i} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-4 py-4 font-medium text-indigo-600 dark:text-indigo-400">{rel.signature}</td>
                                    <td className="px-4 py-4">
                                        <div className="text-sm font-semibold">{rel.relation_type}</div>
                                        <div className="text-xs text-muted-foreground">{rel.authority}</div>
                                    </td>
                                    <td className="px-4 py-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">{formatDateOnly(rel.receipt_date)}</td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="text-xs font-bold text-foreground/80">{rel.result || "-"}</div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">Brak odnotowanych powiązań.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="px-8 pt-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-8 overflow-x-auto no-scrollbar pb-px">
                    <button onClick={() => setView('details')} className={`pb-4 text-sm font-semibold transition-all whitespace-nowrap relative ${view === 'details' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}>
                        Szczegóły sprawy
                        {view === 'details' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                    <button onClick={() => setView('entities')} className={`pb-4 text-sm font-semibold transition-all whitespace-nowrap relative ${view === 'entities' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}>
                        Podmioty
                        {view === 'entities' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                    <button onClick={() => setView('hearings')} className={`pb-4 text-sm font-semibold transition-all whitespace-nowrap relative ${view === 'hearings' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}>
                        Posiedzenia
                        {view === 'hearings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                    <button onClick={() => setView('activities')} className={`pb-4 text-sm font-semibold transition-all whitespace-nowrap relative ${view === 'activities' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}>
                        Czynności
                        {view === 'activities' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                    <button onClick={() => setView('documents')} className={`pb-4 text-sm font-semibold transition-all whitespace-nowrap relative ${view === 'documents' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}>
                        Dokumenty
                        {view === 'documents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                    <button onClick={() => setView('connections')} className={`pb-4 text-sm font-semibold transition-all whitespace-nowrap relative ${view === 'connections' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}>
                        Powiązania
                        {view === 'connections' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {view === 'details' && renderDetails()}
                {view === 'entities' && renderEntities()}
                {view === 'activities' && renderActivities()}
                {view === 'hearings' && renderHearings()}
                {view === 'documents' && renderDocuments()}
                {view === 'connections' && renderConnections()}
            </div>
        </div>
    );
}
