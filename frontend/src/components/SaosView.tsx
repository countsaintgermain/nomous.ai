'use client'

import React, { useState, useEffect } from 'react'
import { 
    Search, 
    Filter, 
    ChevronDown, 
    ChevronUp, 
    FileText, 
    Save, 
    ExternalLink, 
    Scale, 
    History, 
    Bot, 
    User,
    Calendar,
    Gavel,
    Loader2,
    Trash2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { type Case, type SavedJudgment, type SaosJudgment } from '@/lib/types'
import { getAppLocale } from '@/lib/i18n'

interface SaosViewProps {
    activeCase: Case;
}

export function SaosView({ activeCase }: SaosViewProps) {
    const [view, setView] = useState<'search' | 'saved'>('search');
    const [savedTab, setSavedTab] = useState<'manual' | 'ai'>('manual');
    const [keywords, setKeywords] = useState('');
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<SaosJudgment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedJudgment, setSelectedJudgment] = useState<SaosJudgment | null>(null);
    const [savedJudgments, setSavedJudgments] = useState<SavedJudgment[]>([]);

    // Filtry
    const [courtType, setCourtType] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (view === 'saved') {
            loadSavedJudgments();
        }
    }, [view, activeCase.id]);

    const loadSavedJudgments = async () => {
        try {
            const res = await fetch(`/api/saos/case/${activeCase.id}`);
            const data = await res.json();
            setSavedJudgments(data);
        } catch (error) {
            console.error("Error loading saved judgments:", error);
        }
    };

    const handleDeleteSaved = async (id: number) => {
        if (!confirm("Czy na pewno chcesz usunąć to orzeczenie z aktówki?")) return;
        try {
            const res = await fetch(`/api/saos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSavedJudgments(prev => prev.filter(j => j.id !== id));
            }
        } catch (error) {
            console.error("Error deleting judgment:", error);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                keywords,
                page_size: '20'
            });
            if (courtType) params.append('court_type', courtType);
            if (dateFrom) params.append('judgment_date_from', dateFrom);
            if (dateTo) params.append('judgment_date_to', dateTo);

            const res = await fetch(`/api/saos/search?${params.toString()}`);
            const data = await res.json();
            setSearchResults(data.items || []);
        } catch (error) {
            console.error("Error searching SAOS:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = async (judgmentId: number) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/saos/judgment/${judgmentId}`);
            const data = await res.json();
            setSelectedJudgment(data.data);
        } catch (error) {
            console.error("Error fetching judgment details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveManual = async (judgment: SaosJudgment) => {
        try {
            const res = await fetch('/api/saos/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    saos_id: judgment.id,
                    case_id: activeCase.id,
                    signature: judgment.courtCases?.[0]?.caseNumber,
                    judgment_date: judgment.judgmentDate,
                    court_name: judgment.division?.court?.name || judgment.courtType,
                    court_type: judgment.courtType,
                    division_name: judgment.division?.name,
                    judges: judgment.judges,
                    content: judgment.textContent,
                    summary: judgment.summary,
                    source: 'MANUAL'
                })
            });
            if (res.ok) {
                alert("Orzeczenie zostało zapisane w aktówce.");
                loadSavedJudgments();
            }
        } catch (error) {
            console.error("Error saving judgment:", error);
        }
    };

    const renderSearchResults = () => (
        <div className="space-y-4">
            {searchResults.length > 0 ? (
                searchResults.map((judgment) => (
                    <Card key={judgment.id} className="hover:border-indigo-500/50 transition-colors cursor-pointer" onClick={() => handleViewDetails(judgment.id)}>
                        <CardHeader className="pt-4 pb-2 space-y-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1.5 flex-1">
                                    {/* Data i Typ na samej górze */}
                                    <div className="flex items-center gap-3 text-xs">
                                        <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/20">{judgment.courtType}</Badge>
                                        <span className="flex items-center gap-1 font-medium text-muted-foreground"><Calendar className="h-3 w-3" /> {judgment.judgmentDate}</span>
                                    </div>
                                    
                                    {/* Sąd i Wydział pod datą */}
                                    <CardTitle className="text-base text-indigo-600 dark:text-indigo-400 flex flex-wrap items-center gap-x-2">
                                        {judgment.division?.court?.name && (
                                            <span className="flex items-center gap-1"><Gavel className="h-4 w-4" /> {judgment.division.court.name}</span>
                                        )}
                                        {judgment.division?.name && (
                                            <span className="text-muted-foreground font-normal text-sm opacity-80">— {judgment.division.name}</span>
                                        )}
                                    </CardTitle>
                                    
                                    {/* Skład sędziowski bliżej nazwy sądu */}
                                    {judgment.judges && judgment.judges.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <span className="text-[10px] font-bold text-muted-foreground mr-1 mt-0.5 uppercase tracking-wider">Skład:</span>
                                            {judgment.judges.map((j, idx) => (
                                                <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 h-4.5 bg-muted/50 border-none">
                                                    {j.name}{j.specialRoles?.includes('PRESIDING_JUDGE') && ' (Przew.)'}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); handleSaveManual(judgment); }}>
                                        <Save className="h-4 w-4 mr-2" /> Zapisz
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-4">
                            {/* Treść orzeczenia z minimalnym odstępem od nagłówka */}
                            {(judgment.summary || judgment.textContent) && (
                                <div className="text-sm text-muted-foreground line-clamp-5 leading-relaxed overflow-hidden font-serif" 
                                     dangerouslySetInnerHTML={{ __html: judgment.summary || judgment.textContent || "" }} />
                            )}
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div className="text-center py-12 text-muted-foreground italic">
                    {isLoading ? <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" /> : "Wpisz zapytanie, aby przeszukać bazę SAOS."}
                </div>
            )}
        </div>
    );

    const renderJudgmentDetails = () => {
        if (!selectedJudgment) return null;
        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
                <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-indigo-500/20">
                    <CardHeader className="border-b bg-muted/30">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl text-indigo-600">
                                    Orzeczenie {selectedJudgment.courtCases?.[0]?.caseNumber}
                                </CardTitle>
                                <CardDescription>
                                    {selectedJudgment.courtType} • {selectedJudgment.judgmentDate}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSaveManual(selectedJudgment)}>
                                    <Save className="h-4 w-4 mr-2" /> Zapisz w sprawie
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedJudgment(null)}>
                                    Zamknij
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
                        {selectedJudgment.summary && (
                            <section>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Teza / Podsumowanie
                                </h3>
                                <div className="text-sm leading-relaxed p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 italic text-foreground/90" 
                                     dangerouslySetInnerHTML={{ __html: selectedJudgment.summary }} />
                            </section>
                        )}
                        <section>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                <Scale className="h-4 w-4" /> Treść orzeczenia
                            </h3>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif" 
                                 dangerouslySetInnerHTML={{ __html: selectedJudgment.textContent || "Brak treści." }} />
                        </section>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderSavedJudgments = () => {
        const filtered = savedJudgments.filter(j => j.source === (savedTab === 'manual' ? 'MANUAL' : 'AI'));
        return (
            <div className="space-y-4">
                <div className="flex gap-4 border-b border-border mb-6">
                    <button 
                        onClick={() => setSavedTab('manual')}
                        className={`pb-2 text-sm font-semibold flex items-center gap-2 relative ${savedTab === 'manual' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <User className="h-4 w-4" /> Zapisane ręcznie
                        {savedTab === 'manual' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                    <button 
                        onClick={() => setSavedTab('ai')}
                        className={`pb-2 text-sm font-semibold flex items-center gap-2 relative ${savedTab === 'ai' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <Bot className="h-4 w-4" /> Pobrane przez AI
                        {savedTab === 'ai' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                </div>

                {filtered.length > 0 ? (
                    filtered.map((j) => (
                        <Card key={j.id} className="hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => handleViewDetails(j.saos_id)}>
                            <CardHeader className="pt-4 pb-2 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1.5 flex-1">
                                        {/* Data i Typ na samej górze */}
                                        <div className="flex items-center gap-3 text-xs">
                                            <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/20">{j.court_type || 'COMMON'}</Badge>
                                            <span className="flex items-center gap-1 font-medium text-muted-foreground"><Calendar className="h-3 w-3" /> {j.judgment_date}</span>
                                        </div>
                                        
                                        {/* Sąd i Wydział pod datą */}
                                        <CardTitle className="text-base text-indigo-600 dark:text-indigo-400 flex flex-wrap items-center gap-x-2">
                                            {j.court_name && (
                                                <span className="flex items-center gap-1"><Gavel className="h-4 w-4" /> {j.court_name}</span>
                                            )}
                                            {j.division_name && (
                                                <span className="text-muted-foreground font-normal text-sm opacity-80">— {j.division_name}</span>
                                            )}
                                        </CardTitle>

                                        {/* Skład sędziowski */}
                                        {j.judges && j.judges.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                <span className="text-[10px] font-bold text-muted-foreground mr-1 mt-0.5 uppercase tracking-wider">Skład:</span>
                                                {j.judges.map((judge, idx) => (
                                                    <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 h-4.5 bg-muted/50 border-none">
                                                        {judge.name}{judge.specialRoles?.includes('PRESIDING_JUDGE') && ' (Przew.)'}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-8 text-muted-foreground hover:text-destructive" 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSaved(j.id); }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); handleViewDetails(j.saos_id); }}>
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4">
                                {(j.summary || j.content) && (
                                    <div className="text-sm text-muted-foreground line-clamp-5 leading-relaxed overflow-hidden font-serif" 
                                         dangerouslySetInnerHTML={{ __html: j.summary || j.content || "" }} />
                                )}
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-12 text-muted-foreground italic">
                        Brak zapisanych orzeczeń w tej kategorii.
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            {/* Header / Tabs */}
            <div className="px-8 pt-6 border-b border-border bg-card/50">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Scale className="h-5 w-5 text-indigo-500" />
                        System Analizy Orzeczeń Sądowych
                    </h1>
                </div>
                <div className="flex items-center gap-8">
                    <button 
                        onClick={() => setView('search')} 
                        className={`pb-4 text-sm font-semibold transition-all relative ${view === 'search' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Wyszukiwarka
                        {view === 'search' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                    <button 
                        onClick={() => setView('saved')} 
                        className={`pb-4 text-sm font-semibold transition-all relative ${view === 'saved' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Moja Aktówka Orzeczeń
                        {view === 'saved' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-5xl mx-auto p-8">
                    {view === 'search' ? (
                        <div className="space-y-8">
                            {/* Search Bar & Filters */}
                            <section className="space-y-4">
                                <form onSubmit={handleSearch} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Wpisz słowa kluczowe (np. 'umowa najmu', 'odszkodowanie')..." 
                                            className="pl-10 h-11 border-indigo-500/20 focus-visible:ring-indigo-500"
                                            value={keywords}
                                            onChange={(e) => setKeywords(e.target.value)}
                                        />
                                    </div>
                                    <Button type="submit" size="lg" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Szukaj"}
                                    </Button>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="lg" 
                                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                        className={isFiltersOpen ? "bg-accent" : ""}
                                    >
                                        <Filter className="h-4 w-4 mr-2" /> Filtry
                                        {isFiltersOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                                    </Button>
                                </form>

                                {isFiltersOpen && (
                                    <Card className="border-indigo-500/10 bg-muted/20 animate-in fade-in slide-in-from-top-2">
                                        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Typ Sądu</label>
                                                <select 
                                                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                                                    value={courtType}
                                                    onChange={(e) => setCourtType(e.target.value)}
                                                >
                                                    <option value="">Wszystkie</option>
                                                    <option value="COMMON">Sądy Powszechne</option>
                                                    <option value="SUPREME">Sąd Najwyższy</option>
                                                    <option value="ADMINISTRATIVE">Sądy Administracyjne</option>
                                                    <option value="CONSTITUTIONAL_TRIBUNAL">Trybunał Konstytucyjny</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Data od</label>
                                                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Data do</label>
                                                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Wyniki wyszukiwania</h3>
                                {renderSearchResults()}
                            </section>
                        </div>
                    ) : (
                        renderSavedJudgments()
                    )}
                </div>
            </div>

            {renderJudgmentDetails()}
        </div>
    );
}
