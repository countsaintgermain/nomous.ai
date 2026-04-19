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
    ThumbsDown,
    Wand2,
    ChevronDown,
    ChevronUp,
    RefreshCw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Case, type SavedJudgment, type SaosJudgment } from '@/lib/types'
import { formatJudgmentType, formatCourtType } from '@/lib/i18n'
import { toast } from 'sonner'

interface SaosViewProps {
    activeCase: Case;
}

export function SaosView({ activeCase }: SaosViewProps) {
    const [view, setView] = useState<'auto' | 'search' | 'saved'>('auto');
    const [savedTab, setSavedTab] = useState<'manual' | 'ai'>('manual');
    const [keywords, setKeywords] = useState('');
    const [useRocchio, setUseRocchio] = useState(false);
    const [useSummaries, setUseSummaries] = useState(false);
    const [generateQueries, setGenerateQueries] = useState(false);
    const [useAgent, setUseAgent] = useState(false);
    const [usePro, setUsePro] = useState(false);
    const [searchResults, setSearchResults] = useState<SaosJudgment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Auto Search State
    const [autoRemarks, setAutoRemarks] = useState('');
    const [autoPrompts, setAutoPrompts] = useState<string[]>([]);
    const [showPrompts, setShowPrompts] = useState(false);
    const [autoResults, setAutoResults] = useState<SaosJudgment[]>([]);
    const [isAutoLoading, setIsAutoLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);
    const [currentSearchQuery, setCurrentSearchQuery] = useState('');
    
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
        toast("Czy na pewno chcesz usunąć to orzeczenie z aktówki?", {
            action: {
                label: "Usuń",
                onClick: async () => {
                    try {
                        const res = await fetch(`/api/saos/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            setSavedJudgments(prev => prev.filter(j => j.id !== id));
                            toast.success("Orzeczenie usunięte z aktówki.");
                        } else {
                            toast.error("Błąd podczas usuwania orzeczenia.");
                        }
                    } catch (error) {
                        console.error("Error deleting judgment:", error);
                        toast.error("Wystąpił błąd podczas usuwania.");
                    }
                }
            },
            cancel: {
                label: "Anuluj",
                onClick: () => {}
            }
        });
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!keywords.trim()) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                case_id: activeCase.id.toString(),
                query: keywords,
                top_k: '20',
                use_rocchio: useRocchio.toString(),
                use_summaries: useSummaries.toString(),
                generate_queries: generateQueries.toString(),
                use_agent: useAgent.toString(),
                use_pro: usePro.toString()
            });
            const res = await fetch(`/api/search/semantic?${params.toString()}`, {
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
                    aiScore: j.ai_score,
                    aiReason: j.ai_reason,
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
                toast.info("Brak dostępnej sygnatury dla tego orzeczenia.");
            }
        } catch (error) {
            console.error("Error fetching judgment details:", error);
            toast.error("Błąd podczas pobierania szczegółów orzeczenia.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveManual = async (judgment: SaosJudgment, quiet = false, source: 'MANUAL' | 'AI' = 'MANUAL') => {
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
                    judgment_type: judgment.judgmentType,
                    division_name: judgment.division?.name,
                    judges: judgment.judges,
                    content: judgment.textContent,
                    summary: judgment.summary,
                    source: source
                })
            });
            if (res.ok) {
                if (!quiet) toast.success("Orzeczenie zostało zapisane w aktówce.");
                loadSavedJudgments();
            } else {
                toast.error("Błąd podczas zapisywania orzeczenia.");
            }
        } catch (error) {
            console.error("Error saving judgment:", error);
            toast.error("Wystąpił nieoczekiwany błąd podczas zapisu.");
        }
    };

    const handleAutoSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const apiBase = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
            ? 'http://localhost:8000' 
            : '';

        // KROK 1: Generowanie promptów
        setIsAutoLoading(true);
        setAutoPrompts([]);
        setAutoResults([]);
        setShowPrompts(false);
        
        try {
            const genRes = await fetch(`${apiBase}/api/saos/${activeCase.id}/auto-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ remarks: autoRemarks })
            });

            if (genRes.ok) {
                const genData = await genRes.json();
                const prompts = genData.prompts || [];
                setAutoPrompts(prompts);
                setShowPrompts(true);
                setIsAutoLoading(false); // Koniec fazy generowania

                if (prompts.length === 0) {
                    toast.info("Nie udało się wygenerować zapytań.");
                    return;
                }

                // KROK 2: Inicjacja asynchronicznego wyszukiwania
                setIsSearching(true);
                setSearchProgress(0);
                setCurrentSearchQuery('');
                
                const taskRes = await fetch(`${apiBase}/api/saos/${activeCase.id}/auto-search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompts: prompts })
                });

                if (taskRes.ok) {
                    const data = await taskRes.json();
                    const task_id = data.task_id;
                    
                    if (!task_id) {
                        setIsSearching(false);
                        toast.error("Nie udało się utworzyć zadania wyszukiwania.");
                        return;
                    }
                    
                    // Polling statusu zadania
                    const pollInterval = setInterval(async () => {
                        try {
                            const statusRes = await fetch(`${apiBase}/api/saos/task-status/${task_id}`);
                            if (statusRes.ok) {
                                const statusData = await statusRes.json();
                                setSearchProgress(statusData.progress);
                                setCurrentSearchQuery(statusData.current_query || '');
                                
                                if (statusData.status === 'SUCCESS' || statusData.status === 'FAILURE') {
                                    clearInterval(pollInterval);
                                    setIsSearching(false);
                                    
                                    if (statusData.status === 'SUCCESS') {
                                        const mapped = (statusData.results || []).map((j: any) => ({
                                            id: j.saos_id,
                                            judgmentDate: j.judgment_date,
                                            courtType: j.court_type,
                                            judgmentType: j.judgment_type,
                                            signatures: j.signatures,
                                            courtCases: j.signatures ? j.signatures.map((s: string) => ({ caseNumber: s })) : [],
                                            textContent: j.content || j.chunk_text,
                                            chunk_text: j.chunk_text,
                                            summary: j.summary,
                                            aiScore: j.ai_score,
                                            aiReason: j.ai_reason,
                                            division: {
                                                name: j.division_name,
                                                court: { name: j.court_name }
                                            },
                                            judges: j.judges
                                        }));
                                        setAutoResults(mapped);
                                        toast.success(`Znaleziono ${mapped.length} orzeczeń.`);
                                    } else {
                                        toast.error("Zadanie wyszukiwania zakończyło się błędem.");
                                    }
                                }
                            } else if (statusRes.status === 404) {
                                clearInterval(pollInterval);
                                setIsSearching(false);
                            }
                        } catch (err) {
                            console.error("Polling error:", err);
                            clearInterval(pollInterval);
                            setIsSearching(false);
                        }
                    }, 2000);

                } else {
                    toast.error("Błąd podczas inicjacji wyszukiwania orzeczeń.");
                    setIsSearching(false);
                }
            } else {
                const errorData = await genRes.json().catch(() => ({}));
                toast.error(`Błąd: ${errorData.detail || "Błąd podczas generowania promptów."}`);
                setIsAutoLoading(false);
            }
        } catch (error) {
            console.error("Error in auto search flow:", error);
            toast.error("Wystąpił błąd podczas komunikacji z serwerem.");
            setIsAutoLoading(false);
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

    const renderJudgmentsList = (results: SaosJudgment[], loadingState: boolean, emptyMsg: string, source: 'MANUAL' | 'AI') => {
        if (loadingState) {
            return (
                <div className="text-center py-12 text-muted-foreground italic">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    Pobieranie danych...
                </div>
            );
        }

        if (results.length === 0) {
            return (
                <div className="text-center py-12 text-muted-foreground italic">
                    {emptyMsg}
                </div>
            );
        }

        const groups: Record<string, SaosJudgment[]> = {
            "ALL": results
        };
        
        results.forEach(j => {
            const type = j.courtType || "UNKNOWN";
            if (!groups[type]) groups[type] = [];
            groups[type].push(j);
        });

        const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
            if (a === "ALL") return -1;
            if (b === "ALL") return 1;
            return a.localeCompare(b);
        });

        return (
            <Tabs defaultValue="ALL" className="w-full animate-in fade-in duration-500">
                <TabsList className="mb-6 bg-muted/50 p-1 flex-wrap h-auto gap-1">
                    {sortedGroupKeys.map(key => (
                        <TabsTrigger key={key} value={key} className="text-xs px-4 py-2">
                            {key === "ALL" ? "Wszystkie" : formatCourtType(key)}
                            <Badge variant="secondary" className="ml-2 text-[10px] px-1 h-4 bg-background/50">
                                {groups[key].length}
                            </Badge>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {sortedGroupKeys.map(key => (
                    <TabsContent key={key} value={key} className="space-y-4 focus-visible:outline-none">
                        {groups[key].map((judgment) => (
                            <Card key={judgment.id} className="hover:border-indigo-500/50 transition-colors cursor-pointer" onClick={() => handleViewDetails(judgment)}>
                                <CardHeader className="pt-4 pb-2 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-3 text-xs">
                                                <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/20">{formatCourtType(judgment.courtType)}</Badge>
                                                {judgment.aiScore && (
                                                    <Badge className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-sm">
                                                        <Bot className="h-3 w-3 mr-1" />
                                                        Agent: {judgment.aiScore}%
                                                    </Badge>
                                                )}
                                                <span className="flex items-center gap-1 font-medium text-muted-foreground"><Calendar className="h-3 w-3" /> {judgment.judgmentDate}</span>
                                                <span className="font-bold text-indigo-500">
                                                    {formatJudgmentType(judgment.judgmentType)}
                                                    {judgment.signatures?.[0] && ` (${judgment.signatures[0]})`}
                                                </span>
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
                                            <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); handleSaveManual(judgment, false, source); }}>
                                                <Save className="h-4 w-4 mr-2" /> Zapisz
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 pb-4">
                                    {(judgment.summary || judgment.textContent || judgment.chunk_text) && (
                                        <div className="space-y-3">
                                            <div className="text-sm text-muted-foreground line-clamp-5 leading-relaxed overflow-hidden font-serif" 
                                                 dangerouslySetInnerHTML={{ __html: judgment.chunk_text || judgment.summary || judgment.textContent || "" }} />
                                            
                                            {judgment.aiReason && (
                                                <div className="flex gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg animate-in slide-in-from-left-2">
                                                    <Bot className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] text-emerald-700 italic leading-snug">
                                                        <strong>Agent:</strong> {judgment.aiReason}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>
                ))}
            </Tabs>
        );
    };

    const renderSearchResults = () => renderJudgmentsList(searchResults, isLoading, "Wpisz zapytanie, aby przeszukać bazę SAOS.", 'MANUAL');

    const renderAutoSearch = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            <section className="space-y-4">
                <Card className="border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <Bot className="h-5 w-5" />
                            Pobierz Orzecznictwo (AI)
                        </CardTitle>
                        <CardDescription>
                            System przeanalizuje akta sprawy i automatycznie dobierze najbardziej trafne orzeczenia z bazy SAOS.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAutoSearch} className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dodatkowe wytyczne (opcjonalnie)</label>
                                    <span className="text-[10px] text-muted-foreground italic">np. numery artykułów, konkretne zagadnienia</span>
                                </div>
                                <textarea
                                    className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-serif"
                                    placeholder="Wpisz tutaj dodatkowe uwagi, które mają nakierować AI..."
                                    value={autoRemarks}
                                    onChange={(e) => setAutoRemarks(e.target.value)}
                                />
                            </div>
                            <Button 
                                type="submit" 
                                size="lg" 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 h-12 font-bold" 
                                disabled={isAutoLoading || isSearching}
                            >
                                {(isAutoLoading || isSearching) ? (
                                    <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Przetwarzanie...</>
                                ) : (
                                    <><RefreshCw className="h-5 w-5 mr-2" /> Rozpocznij analizę i pobieranie</>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </section>

            {/* FAZA 1: Generowanie Promptów (Duży Spinner) */}
            {isAutoLoading && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 bg-muted/20 rounded-2xl border border-dashed border-border animate-in fade-in duration-500">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-indigo-500/50" />
                        <Bot className="h-6 w-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center space-y-1">
                        <h4 className="text-sm font-bold text-foreground">Analizowanie akt sprawy</h4>
                        <p className="text-xs text-muted-foreground italic">Gemini przygotowuje optymalną strategię wyszukiwania...</p>
                    </div>
                </div>
            )}

            {/* FAZA 2: Lista Wygenerowanych Promptów */}
            {autoPrompts.length > 0 && !isAutoLoading && (
                <section className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <RefreshCw className={`h-3 w-3 ${isSearching ? 'animate-spin' : ''}`} />
                            Zaplanowane zapytania AI
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-indigo-500 hover:text-indigo-600 p-0 hover:bg-transparent uppercase font-bold"
                            onClick={() => setShowPrompts(!showPrompts)}
                        >
                            {showPrompts ? "Ukryj" : "Pokaż"} {showPrompts ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                        </Button>
                    </div>
                    {showPrompts && (
                        <div className="grid gap-2">
                            {autoPrompts.map((p, idx) => (
                                <div key={idx} className={`p-3 border rounded-xl text-xs font-serif leading-relaxed transition-all ${isSearching && currentSearchQuery === p ? 'bg-indigo-500/10 border-indigo-500 shadow-sm ring-1 ring-indigo-500/50' : 'bg-card border-border text-foreground/70'}`}>
                                    <span className="font-bold text-indigo-500 mr-2">{idx + 1}.</span> {p}
                                    {isSearching && currentSearchQuery === p && (
                                        <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* FAZA 3: Postęp Wyszukiwania */}
            {isSearching && (
                <div className="space-y-4 p-8 bg-indigo-600 shadow-xl shadow-indigo-500/10 rounded-2xl animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-end mb-1">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Wyszukiwanie orzeczeń w SAOS</span>
                            <p className="text-sm font-medium text-white truncate max-w-md italic">
                                &quot;{currentSearchQuery || "Inicjalizacja połączenia..."}&quot;
                            </p>
                        </div>
                        <span className="text-2xl font-black text-white">{searchProgress}%</span>
                    </div>
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <div 
                            className="h-full bg-white rounded-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(255,255,255,0.5)]" 
                            style={{ width: `${searchProgress}%` }} 
                        />
                    </div>
                </div>
            )}

            {/* FAZA 4: Wyniki */}
            {autoResults.length > 0 && !isSearching && (
                <section className="space-y-6 animate-in fade-in duration-1000">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground px-4">
                            Pobrane Orzeczenia ({autoResults.length})
                        </h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                    {renderJudgmentsList(autoResults, false, "Nie znaleziono pasujących orzeczeń.", 'AI')}
                </section>
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
                                            {formatJudgmentType(j.judgmentType)} z dn. {j.judgmentDate}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            {selectedJudgments.map((j, idx) => (
                                <TabsContent key={idx} value={idx.toString()} className="flex-1 overflow-y-auto p-6 md:p-8 m-0 space-y-6 custom-scrollbar focus-visible:outline-none">
                                    
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline">{formatCourtType(j.courtType)}</Badge>
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
                                                <Save className="h-4 w-4 mr-2" /> Zapisz w aktówce
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
                                            <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/20">{formatCourtType(j.court_type)}</Badge>
                                            <span className="flex items-center gap-1 font-medium text-muted-foreground"><Calendar className="h-3 w-3" /> {j.judgment_date}</span>
                                            <span className="font-bold text-indigo-500">
                                                {formatJudgmentType(j.judgment_type)}
                                                {j.signature && ` (${j.signature})`}
                                            </span>
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
                        onClick={() => setView('auto')} 
                        className={`pb-4 text-sm font-semibold transition-all relative ${view === 'auto' ? 'text-indigo-500' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Pobierz orzecznictwo
                        {view === 'auto' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
                    </button>
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
                    {view === 'auto' ? (
                        renderAutoSearch()
                    ) : view === 'search' ? (
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
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-1">
                                    <label 
                                        htmlFor="useRocchio" 
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${useRocchio ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-card border-border hover:border-indigo-500/30'}`}
                                    >
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${useRocchio ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Scale className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-bold leading-none mb-1">Algorytm Rocchio</p>
                                            <p className="text-[10px] text-muted-foreground leading-tight">Wektory dokumentów</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            id="useRocchio" 
                                            checked={useRocchio} 
                                            onChange={(e) => setUseRocchio(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                        />
                                    </label>

                                    <label 
                                        htmlFor="useSummaries" 
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${useSummaries ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-card border-border hover:border-indigo-500/30'}`}
                                    >
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${useSummaries ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-bold leading-none mb-1">Streszczenia</p>
                                            <p className="text-[10px] text-muted-foreground leading-tight">Kontekst aktówki</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            id="useSummaries" 
                                            checked={useSummaries} 
                                            onChange={(e) => setUseSummaries(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                        />
                                    </label>

                                    <label 
                                        htmlFor="generateQueries" 
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${generateQueries ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-card border-border hover:border-indigo-500/30'}`}
                                    >
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${generateQueries ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Bot className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-bold leading-none mb-1">Rozbudowa AI</p>
                                            <p className="text-[10px] text-muted-foreground leading-tight">Generuj 5 zapytań</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            id="generateQueries" 
                                            checked={generateQueries} 
                                            onChange={(e) => setGenerateQueries(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                        />
                                    </label>

                                    <label 
                                        htmlFor="useAgent" 
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${useAgent ? 'bg-emerald-500/10 border-emerald-500/50 shadow-sm' : 'bg-card border-border hover:border-emerald-500/30'}`}
                                    >
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${useAgent ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Wand2 className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-bold leading-none mb-1">Agent Ewaluacji</p>
                                            <p className="text-[10px] text-muted-foreground leading-tight">Oceń trafność i szukaj podobnych</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            id="useAgent" 
                                            checked={useAgent} 
                                            onChange={(e) => setUseAgent(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                        />
                                    </label>

                                    <label 
                                        htmlFor="usePro" 
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${usePro ? 'bg-amber-500/10 border-amber-500/50 shadow-sm' : 'bg-card border-border hover:border-amber-500/30'}`}
                                    >
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${usePro ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                            <Wand2 className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[11px] font-bold leading-none mb-1">Model Pro (3.1)</p>
                                            <p className="text-[10px] text-muted-foreground leading-tight">Najwyższa inteligencja</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            id="usePro" 
                                            checked={usePro} 
                                            onChange={(e) => setUsePro(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600 cursor-pointer"
                                        />
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
