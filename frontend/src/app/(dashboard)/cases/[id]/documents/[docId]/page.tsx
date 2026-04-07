'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Tag, Calendar, Eye, Download, CheckCircle, RefreshCw, Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Document } from '@/lib/types'
import { getAppLocale } from '@/lib/i18n'

export default function DocumentDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const caseId = params.id as string
    const docId = params.docId as string

    const [doc, setDoc] = useState<Document | null>(null)
    const [loading, setLoading] = useState(true)
    const [retrying, setRetrying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [factContent, setFactContent] = useState('')
    const [savingFact, setSavingFact] = useState(false)
    
    // Edycja daty
    const [isEditingDate, setIsEditingDate] = useState(false)
    const [editDate, setEditDate] = useState('')

    const fetchDocument = async () => {
        try {
            const res = await fetch(`/api/documents/${caseId}/documents/${docId}`)
            if (!res.ok) throw new Error('Nie udało się pobrać szczegółów dokumentu')
            const data = await res.json()
            setDoc(data)
            if (data.document_date) {
                setEditDate(new Date(data.document_date).toISOString().split('T')[0])
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDocument()
        
        let interval: any;
        if (doc?.status === 'processing' || doc?.status === 'uploaded') {
            interval = setInterval(fetchDocument, 5000);
        }
        return () => { if(interval) clearInterval(interval); }
    }, [caseId, docId, doc?.status])

    const handlePreviewPdf = () => {
        window.open(`/api/documents/${caseId}/documents/${docId}/download?format=pdf`, '_blank')
    }

    const handleDownloadSource = () => {
        const link = document.createElement('a');
        link.href = `/api/documents/${caseId}/documents/${docId}/download?format=source`;
        link.setAttribute('download', doc?.filename || 'dokument');
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    const handleRetryAnalysis = async () => {
        try {
            setRetrying(true)
            const res = await fetch(`/api/documents/${caseId}/documents/${docId}/analyze`, { method: 'POST' })
            if (!res.ok) throw new Error('Nie udało się rozpocząć analizy')
            setTimeout(() => {
                fetchDocument()
                setRetrying(false)
            }, 3000)
        } catch (err: any) {
            setError(err.message)
            setRetrying(false)
        }
    }

    const handleSaveDate = async () => {
        try {
            const res = await fetch(`/api/documents/${caseId}/documents/${docId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ document_date: editDate })
            })
            if (res.ok) {
                const updated = await res.json()
                setDoc(updated)
                setIsEditingDate(false)
            }
        } catch (err) {
            console.error('Error saving date:', err)
        }
    }

    const handleUseSuggestedFact = (fact: string) => {
        setFactContent(fact)
        document.getElementById('new-fact-form')?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSaveFact = async () => {
        if (!factContent.trim()) return
        setSavingFact(true)
        try {
            const res = await fetch(`/api/cases/${caseId}/facts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: factContent,
                    source_doc_id: parseInt(docId)
                })
            })
            if (res.ok) {
                setFactContent('')
            }
        } catch (err) {
            console.error('Error saving fact:', err)
        } finally {
            setSavingFact(false)
        }
    }

    if (loading && !doc) {
        return <div className="p-8"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-[400px] w-full" /></div>
    }

    if (error || !doc) {
        return (
            <div className="flex-1 p-8 text-center bg-background">
                <p className="text-red-500 mb-4 font-semibold">Wystąpił błąd: {error}</p>
                <Button variant="outline" onClick={() => router.back()}>Wróć do aktówki</Button>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-border bg-card/40 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-muted">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-indigo-500" />
                            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate max-w-2xl">
                                {doc.document_name || doc.filename}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 px-1">
                            <Badge variant="outline" className="text-[10px] uppercase">{doc.tag}</Badge>
                            
                            {/* DATA DOKUMENTU - EDYTOWALNA */}
                            <div className="flex items-center gap-2 group/date">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {isEditingDate ? (
                                    <div className="flex items-center gap-1">
                                        <Input 
                                            type="date" 
                                            value={editDate} 
                                            onChange={(e) => setEditDate(e.target.value)}
                                            className="h-6 text-[10px] py-0 w-32"
                                        />
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-green-500" onClick={handleSaveDate}>
                                            <Save className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setIsEditingDate(false)}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-muted-foreground">
                                            {doc.document_date ? new Date(doc.document_date).toLocaleDateString(getAppLocale()) : 'Brak daty dokumentu'}
                                        </span>
                                        {doc.tag !== 'PISP' && (
                                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/date:opacity-100 transition-opacity" onClick={() => setIsEditingDate(true)}>
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Badge variant="secondary" className={doc.status === 'ready' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}>
                                {doc.status === 'ready' ? 'Przeanalizowano' : 'W trakcie analizy'}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button 
                        onClick={handleRetryAnalysis} 
                        variant="outline" 
                        size="sm" 
                        className="border-border"
                        disabled={retrying || doc.status === 'processing'}
                    >
                        {retrying || doc.status === 'processing' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {retrying || doc.status === 'processing' ? 'Analizowanie...' : 'Ponów analizę'}
                    </Button>
                    {doc.has_pdf && (
                        <Button onClick={handlePreviewPdf} variant="outline" size="sm" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                            <Eye className="mr-2 h-4 w-4" />
                            Podgląd PDF
                        </Button>
                    )}
                    {doc.has_source && (
                        <Button onClick={handleDownloadSource} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Download className="mr-2 h-4 w-4" />
                            Pobierz oryginał
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Card className="bg-card border-border shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg text-indigo-400 flex items-center gap-2">
                                    Streszczenie AI
                                </CardTitle>
                                <CardDescription>Zwięzłe podsumowanie zawartości wygenerowane na podstawie treści.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 bg-muted/30 rounded-lg border border-border min-h-[80px]">
                                    {doc.status === 'ready' ? (
                                        <p className="text-sm leading-relaxed text-foreground/90 italic">"{doc.summary}"</p>
                                    ) : (
                                        <div className="flex items-center justify-center py-4 text-muted-foreground italic gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Trwa generowanie...
                                        </div>
                                    )}
                                </div>

                                {doc.status === 'ready' && doc.suggested_facts && doc.suggested_facts.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <CheckCircle className="h-3 w-3 text-indigo-500" />
                                            Sugerowane Fakty (AI)
                                        </p>
                                        <div className="grid gap-2">
                                            {doc.suggested_facts.map((fact, i) => (
                                                <div key={i} className="group flex items-start justify-between p-3 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg border border-indigo-500/10 transition-colors">
                                                    <p className="text-xs leading-relaxed pr-4">{fact}</p>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="h-7 text-[10px] bg-background border-border hover:bg-indigo-500 hover:text-white shrink-0"
                                                        onClick={() => handleUseSuggestedFact(fact)}
                                                    >
                                                        Użyj
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg text-emerald-400">Wyekstrahowane Byty</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {doc.entities ? (
                                    <>
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Osoby / Podmioty</p>
                                            <div className="flex flex-wrap gap-2">
                                                {doc.entities.osoby?.map((o, i) => <Badge key={i} variant="outline" className="bg-indigo-500/5">{o}</Badge>) || <span className="text-xs italic text-muted-foreground">Nie wykryto</span>}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Kluczowe Daty</p>
                                            <div className="flex flex-wrap gap-2">
                                                {doc.entities.daty?.map((d, i) => <Badge key={i} variant="outline" className="bg-emerald-500/5">{d}</Badge>) || <span className="text-xs italic text-muted-foreground">Nie wykryto</span>}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Kary i Kwoty</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[...(doc.entities.kary || []), ...(doc.entities.kwoty || [])].map((k, i) => (
                                                    <Badge key={i} variant="outline" className="bg-orange-500/5 border-orange-500/20 text-orange-600 dark:text-orange-400">
                                                        {k}
                                                    </Badge>
                                                ))}
                                                {(!doc.entities.kary?.length && !doc.entities.kwoty?.length) && <span className="text-xs italic text-muted-foreground">Nie wykryto</span>}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm italic text-muted-foreground">Brak danych.</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-card border-border shadow-lg" id="new-fact-form">
                            <CardHeader>
                                <CardTitle className="text-lg">Zapisz nowy Fakt</CardTitle>
                                <CardDescription>Wprowadź ręcznie lub edytuj sugestię AI, aby zapisać fakt w bazie sprawy.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea 
                                    placeholder="Np. Sąd odroczył posiedzenie do dnia..."
                                    value={factContent}
                                    onChange={(e) => setFactContent(e.target.value)}
                                    className="min-h-[150px] bg-background border-border focus:ring-indigo-500"
                                />
                                <Button 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                    disabled={savingFact || !factContent.trim()}
                                    onClick={handleSaveFact}
                                >
                                    {savingFact && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Dodaj do Bazy Faktów Sprawy
                                </Button>
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-card border-border shadow-md">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold opacity-50 uppercase tracking-widest">Informacje techniczne</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-[10px] text-muted-foreground">
                                <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span>ID systemowe:</span>
                                    <span className="font-mono">{doc.id}</span>
                                </div>
                                <div className="flex justify-between border-b border-border/50 pb-1">
                                    <span>Importowano:</span>
                                    <span>{new Date(doc.created_date).toLocaleString(getAppLocale())}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Oryginalna nazwa:</span>
                                    <span className="truncate max-w-[150px]">{doc.filename}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
