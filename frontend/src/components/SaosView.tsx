'use client'

import React, { useState, useEffect } from 'react'
import { 
    Search, 
    FileText, 
    Save, 
    ExternalLink, 
    Scale, 
    Bot, 
    User,
    Calendar,
    Gavel,
    Loader2,
    Trash2,
    ThumbsUp,
    ThumbsDown
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Case, type SavedJudgment, type SaosJudgment } from '@/lib/types'

interface SaosViewProps {
    activeCase: Case;
}

export function SaosView({ activeCase }: SaosViewProps) {
    const [view, setView] = useState<'search' | 'saved'>('search');
    const [savedTab, setSavedTab] = useState<'manual' | 'ai'>('manual');
    const [keywords, setKeywords] = useState('');
    const [includeContext, setIncludeContext] = useState(true);
    const [searchResults, setSearchResults] = useState<SaosJudgment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [selectedJudgments, setSelectedJudgments] = useState<SaosJudgment[]>([]);
    const [activeDetailsTab, setActiveDetailsTab] = useState<number>(0);
    const [extractedQuotes, setExtractedQuotes] = useState<string[]>([]);
    const [extractingQuotes, setExtractingQuotes] = useState(false);
    
    const [savedJudgments, setSavedJudgments] = useState<SavedJudgment[]>([]);
    const [feedback, setFeedback] = useState<Record<string, 'up' | 'down' | 'none'>>({});

    useEffect(() => {
        loadFeedback();
        if (view === 'saved') {
            loadSavedJudgments();
        }
    }, [view, activeCase.id]);

    useEffect(() => {
        if (selectedJudgments.length > 0 && view === 'search') {
             const activeJudgment = selectedJudgments[activeDetailsTab];
             if (activeJudgment && keywords && activeJudgment.textContent) {
                 fetchQuotes(activeJudgment.textContent);
             }
        }
    }, [selectedJudgments, activeDetailsTab]);

    const fetchQuotes = async (text: string) => {
        setExtractingQuotes(true);
        try {
            const res = await fetch('/api/saos/extract_quotes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: keywords, text })
            });
            if (res.ok) {
                const data = await res.json();
                setExtractedQuotes(data.quotes || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setExtractingQuotes(false);
        }
    }

    const loadFeedback = async () => {
        try {
            const res = await fetch(`/api/search/feedback/${activeCase.id}`);
            if (res.ok) {
                const data = await res.json();
                const fbMap: Record<string, 'up' | 'down' | 'none'> = {};
                data.forEach((fb: any) => {
                    const key = fb.saos_id ? `saos_${fb.saos_id}` : `doc_${fb.document_id}`;
                    fbMap[key] = fb.is_positive ? 'up' : 'down';
                });
                setFeedback(fbMap);
            }
        } catch (e) {}
    };

    const handleFeedback = async (e: React.MouseEvent, saosId: number | null, docId: number | null, vote: 'up' | 'down', autoSaveObj?: SaosJudgment) => {
        e.stopPropagation();
        const key = saosId ? `saos_${saosId}` : `doc_${docId}`;
        const currentVote = feedback[key];
        const newVote = currentVote === vote ? 'none' : vote;

        try {
            const res = await fetch('/api/search/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    case_id: activeCase.id,
                    saos_id: saosId,
                    document_id: docId,
                    vote: newVote
                })
            });
            if (res.ok) {
                setFeedback(prev => ({ ...prev, [key]: newVote }));
                
                if (autoSaveObj && newVote !== 'none') {
                    const alreadySaved = savedJudgments.find(j => j.saos_id === autoSaveObj.id);
                    if (!alreadySaved) {
                        handleSaveManual(autoSaveObj, true);
                    }
                }
            }
        } catch (error) {
            console.error("Error saving feedback:", error);
        }
    };

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
        if (!keywords.trim()) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/search/semantic?case_id=${activeCase.id}&query=${encodeURIComponent(keywords)}&top_k=20&include_context=${includeContext}`, {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                const results = data.map((j: any) => ({
                    id: j.saos_id,
                    judgmentDate: j.judgment_date,
                    courtType: j.court_type,
                    judgmentType: j.judgment_type,
                    signatures: j.signatures,
                    courtCases: j.signatures ? j.signatures.map((s: string) => ({ caseNumber: s })) : [],
                    textContent: j.content || j.chunk_text,
                    chunk_text: j.chunk_text,
                    summary: j.summary,
                    division: {
                        name: j.division_name,
                        court: { name: j.court_name }
                    },
                    judges: j.judges
                }));
                setSearchResults(results);
            }
        } catch (error) {
            console.error("Error in semantic search:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewDetails = async (judgment: SaosJudgment) => {
        setIsLoading(true);
        setExtractedQuotes([]);
        try {
            if (judgment.signatures && judgment.signatures.length > 0) {
                const res = await fetch(`/api/saos/detailsBySignatures`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signatures: judgment.signatures })
                });
                const data = await res.json();
                const mappedDetails = data.map((d: any) => ({
                    id: d.saos_id || d.id,
                    judgmentDate: d.judgment_date || d.judgmentDate,
                    courtType: d.court_type || d.courtType,
                    judgmentType: d.judgment_type || d.judgmentType,
                    signatures: d.signatures,
                    courtCases: d.signatures ? d.signatures.map((s: string) => ({ caseNumber: s })) : [{ caseNumber: d.signatures?.[0] }],
                    textContent: d.text_content || d.textContent || d.content,
                    summary: d.summary,
                    division: {
                        name: d.division?.name || d.division_name,
                        court: { name: d.court?.name || d.court_name }
                    },
                    judges: d.judges,
                    chunk_text: judgment.chunk_text
                }));
                mappedDetails.sort((a: any, b: any) => new Date(b.judgmentDate).getTime() - new Date(a.judgmentDate).getTime());
                setSelectedJudgments(mappedDetails);
                setActiveDetailsTab(0);
            } else {
                alert("Brak dostępnej sygnatury dla tego orzeczenia.");
            }
        } catch (error) {
            console.error("Error fetching judgment details:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveManual = async (judgment: SaosJudgment, quiet = false) => {
        try {
            const res = await fetch('/api/saos/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    saos_id: judgment.id,
                    case_id: activeCase.id,
                    signature: judgment.courtCases?.[0]?.caseNumber || judgment.signatures?.[0],
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
                if (!quiet) alert("Orzeczenie zostało zapisane w aktówce.");
                loadSavedJudgments();
            }
        } catch (error) {
            console.error("Error saving judgment:", error);
        }
    };

    const renderHighlightedText = (text?: string, chunkText?: string, quotes: string[] = []) => {
        if (!text) return "Brak treści.";
        let result = text;

        quotes.forEach(quote => {
            if (!quote.trim()) return;
            const quoteRegex = new RegExp(`(${quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            result = result.replace(quoteRegex, '<mark class="bg-green-200 dark:bg-green-800/50 text-inherit px-1 rounded">$1</mark>');
        });

        if (chunkText && chunkText.trim()) {
            const chunkRegex = new RegExp(`(${chunkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            result = result.replace(chunkRegex, '<mark class="bg-yellow-200 dark:bg-yellow-800/50 text-inherit px-1 rounded">$1</mark>');
        }

        return <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif" dangerouslySetInnerHTML={{ __html: result }} />;
    };

    const renderSearchResults = () => (
        <div className="space-y-4">
            {searchResults.length > 0 ? (
                searchResults.map((judgment) => (
                    <Card key={judgment.id} className="hover:border-indigo-500/50 transition-colors cursor-pointer" onClick={() => handleViewDetails(judgment)}>
                        <CardHeader className="pt-4 pb-2 space-y-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-3 text-xs">
                                        <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/20">{judgment.courtType}</Badge>
                                        <span className="flex items-center gap-1 font-medium text-muted-foreground"><Calendar className="h-3 w-3" /> {judgment.judgmentDate}</span>
                                        {judgment.judgmentType && (
                                            <span className="font-bold text-indigo-500">{judgment.judgmentType}</span>
                                        )}
                                    </div>
                                    
                                    <CardTitle className="text-base text-indigo-600 dark:text-indigo-400 flex flex-wrap items-center gap-x-2">
                                        {judgment.division?.court?.name && (
                                            <span className="flex items-center gap-1"><Gavel className="h-4 w-4" /> {judgment.division.court.name}</span>
                                        )}
                                        {judgment.division?.name && (
                                            <span className="text-muted-foreground font-normal text-sm opacity-80">— {judgment.division.name}</span>
                                        )}
                                    </CardTitle>
                                    
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
                                    <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className={`h-7 w-7 p-0 ${feedback[`saos_${judgment.id}`] === 'up' ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground'}`}
                                            onClick={(e) => handleFeedback(e, judgment.id, null, 'up', judgment)}
                                        >
                                            <ThumbsUp className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className={`h-7 w-7 p-0 ${feedback[`saos_${judgment.id}`] === 'down' ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground'}`}
                                            onClick={(e) => handleFeedback(e, judgment.id, null, 'down', judgment)}
                                        >
                                            <ThumbsDown className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); handleSaveManual(judgment); }}>
                                        <Save className="h-4 w-4 mr-2" /> Zapisz
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-4">
                            {(judgment.summary || judgment.textContent || judgment.chunk_text) && (
                                <div className="text-sm text-muted-foreground line-clamp-5 leading-relaxed overflow-hidden font-serif" 
                                     dangerouslySetInnerHTML={{ __html: judgment.chunk_text || judgment.summary || judgment.textContent || "" }} />
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
        if (selectedJudgments.length === 0) return null;

        const currentSig = selectedJudgments[0]?.courtCases?.[0]?.caseNumber || "Nieznana sygnatura";

        return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
                <Card className="w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col shadow-2xl border-indigo-500/20">
                    <CardHeader className="border-b bg-muted/30">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl text-indigo-600">
                                    Sprawa: {currentSig}
                                </CardTitle>
                                <CardDescription>
                                    Znaleziono powiązanych orzeczeń: {selectedJudgments.length}
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedJudgments([])}>
                                    Zamknij
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                        <Tabs value={activeDetailsTab.toString()} onValueChange={(v) => setActiveDetailsTab(parseInt(v))} className="w-full h-full flex flex-col">
                            <div className="px-6 pt-4 bg-muted/10 border-b border-border">
                                <TabsList className="mb-0 bg-transparent gap-2 h-auto flex-wrap">
                                    {selectedJudgments.map((j, idx) => (
                                        <TabsTrigger 
                                            key={idx} 
                                            value={idx.toString()}
                                            className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-md px-4 py-2 text-xs"
                                        >
                                            {j.judgmentType || "Orzeczenie"} z dn. {j.judgmentDate}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            {selectedJudgments.map((j, idx) => (
                                <TabsContent key={idx} value={idx.toString()} className="flex-1 overflow-y-auto p-6 md:p-8 m-0 space-y-6 custom-scrollbar focus-visible:outline-none">
                                    
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline">{j.courtType}</Badge>
                                            <span className="text-sm font-medium">{j.division?.court?.name}</span>
                                            {extractingQuotes && <Badge variant="secondary" className="animate-pulse"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analiza AI</Badge>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className={`h-8 w-8 p-0 ${feedback[`saos_${j.id}`] === 'up' ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground'}`}
                                                    onClick={(e) => handleFeedback(e, j.id, null, 'up', j)}
                                                >
                                                    <ThumbsUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className={`h-8 w-8 p-0 ${feedback[`saos_${j.id}`] === 'down' ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground'}`}
                                                    onClick={(e) => handleFeedback(e, j.id, null, 'down', j)}
                                                >
                                                    <ThumbsDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => handleSaveManual(j)}>
                                                <Save className="h-4 w-4 mr-2" /> Zapisz w sprawie
                                            </Button>
                                        </div>
                                    </div>

                                    {j.summary && (
                                        <section>
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                                <FileText className="h-4 w-4" /> Teza / Podsumowanie
                                            </h3>
                                            <div className="text-sm leading-relaxed p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 italic text-foreground/90" 
                                                 dangerouslySetInnerHTML={{ __html: j.summary }} />
                                        </section>
                                    )}
                                    <section>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                                            <Scale className="h-4 w-4" /> Treść orzeczenia
                                        </h3>
                                        {renderHighlightedText(j.textContent, j.chunk_text, extractedQuotes)}
                                    </section>
                                </TabsContent>
                            ))}
                        </Tabs>
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
                        <Card key={j.id} className="hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => handleViewDetails(j as unknown as SaosJudgment)}>
                            <CardHeader className="pt-4 pb-2 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center gap-3 text-xs">
                                            <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/20">{j.court_type || 'COMMON'}</Badge>
                                            <span className="flex items-center gap-1 font-medium text-muted-foreground"><Calendar className="h-3 w-3" /> {j.judgment_date}</span>
                                        </div>
                                        
                                        <CardTitle className="text-base text-indigo-600 dark:text-indigo-400 flex flex-wrap items-center gap-x-2">
                                            {j.court_name && (
                                                <span className="flex items-center gap-1"><Gavel className="h-4 w-4" /> {j.court_name}</span>
                                            )}
                                            {j.division_name && (
                                                <span className="text-muted-foreground font-normal text-sm opacity-80">— {j.division_name}</span>
                                            )}
                                        </CardTitle>

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
                                        <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); handleViewDetails(j as unknown as SaosJudgment); }}>
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
                                    <Button type="submit" size="lg" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading || !keywords.trim()}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Szukaj"}
                                    </Button>
                                </form>
                                <div className="flex items-center gap-2 px-1">
                                    <input 
                                        type="checkbox" 
                                        id="includeContext" 
                                        checked={includeContext} 
                                        onChange={(e) => setIncludeContext(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                    />
                                    <label htmlFor="includeContext" className="text-xs text-muted-foreground cursor-pointer select-none">
                                        Uwzględnij kontekst sprawy (polubione dokumenty)
                                    </label>
                                </div>
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
