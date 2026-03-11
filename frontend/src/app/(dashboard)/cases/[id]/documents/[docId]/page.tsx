'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, FileText, Loader2, Tag, Calendar, User, DollarSign, PlusCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface DocumentDetails {
    id: number
    filename: string
    tag: string
    status: string
    date: string
    summary: string | null
    entities: {
        osoby?: string[]
        daty?: string[]
        kwoty?: string[]
    } | null
}

export default function DocumentDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const caseId = params.id as string
    const docId = params.docId as string

    const [doc, setDoc] = useState<DocumentDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fact form state
    const [factContent, setFactContent] = useState('')
    const [savingFact, setSavingFact] = useState(false)
    const [factSaved, setFactSaved] = useState(false)

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/cases/${caseId}/documents/${docId}`)
                if (!res.ok) throw new Error('Nie udało się pobrać szczegółów dokumentu')
                const data = await res.json()
                setDoc(data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchDocument()
    }, [caseId, docId])

    if (loading) {
        return (
            <div className="flex-1 space-y-6 p-8">
                <div className="flex items-center space-x-4 mb-8">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-[600px] rounded-xl" />
                    <Skeleton className="h-[600px] rounded-xl" />
                </div>
            </div>
        )
    }

    if (error || !doc) {
        return (
            <div className="flex-1 p-8 text-center text-red-500">
                <p>Wystąpił błąd: {error || 'Dokument nie znaleziony'}</p>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>Wróć do aktówki</Button>
            </div>
        )
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ready': return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">Przeanalizowano</Badge>
            case 'processing': return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 animate-pulse">Analizowanie...</Badge>
            case 'error': return <Badge variant="destructive">Błąd</Badge>
            default: return <Badge variant="outline">Wgrano</Badge>
        }
    }

    const handleOpenOriginal = () => {
        window.open(`http://localhost:8000/api/cases/${caseId}/documents/${docId}/download`, '_blank')
    }

    const handleSaveFact = async () => {
        if (!factContent.trim()) return
        setSavingFact(true)
        try {
            const res = await fetch(`http://localhost:8000/api/cases/${caseId}/facts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: factContent,
                    source_doc_id: parseInt(docId)
                })
            })
            if (!res.ok) throw new Error('Błąd zapisu faktu')

            setFactContent('')
            setFactSaved(true)
            setTimeout(() => setFactSaved(false), 3000)
        } catch (err) {
            console.error('Błąd dodawania faktu:', err)
        } finally {
            setSavingFact(false)
        }
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
            <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-4">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
                            <FileText className="mr-3 h-6 w-6 text-indigo-400" />
                            {doc.filename}
                        </h1>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-neutral-400">
                            <span className="flex items-center"><Tag className="mr-1 h-4 w-4" /> {doc.tag}</span>
                            <span>{new Date(doc.date).toLocaleString('pl-PL')}</span>
                            {getStatusBadge(doc.status)}
                        </div>
                    </div>
                </div>
                <Button onClick={handleOpenOriginal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Otwórz Podgląd (Oryginał)
                </Button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                    {/* Left Panel: Document Meta & Summary */}
                    <div className="space-y-6">
                        <Card className="bg-neutral-900 border-neutral-800 shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-indigo-400">Streszczenie AI</CardTitle>
                                <CardDescription>Zwięzłe podsumowanie zawartości dokumentu wygenerowane na podstawie treści.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {doc.status === 'processing' ? (
                                    <div className="flex items-center text-neutral-400 py-4">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-400" />
                                        Trwa inteligentna analiza dokumentu...
                                    </div>
                                ) : doc.summary ? (
                                    <p className="text-neutral-200 leading-relaxed text-lg bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                                        {doc.summary}
                                    </p>
                                ) : (
                                    <p className="text-neutral-500 italic">Brak streszczenia. Aby sprawdzić, upewnij się czy dokument został przeanalizowany.</p>
                                )}
                            </CardContent>
                        </Card>

                        {doc.entities && (
                            <Card className="bg-neutral-900 border-neutral-800 shadow-xl">
                                <CardHeader>
                                    <CardTitle className="text-emerald-400">Wyekstrahowane Byty</CardTitle>
                                    <CardDescription>Kluczowe osoby, daty i kwoty wykryte w pliku.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {(doc.entities.osoby && doc.entities.osoby.length > 0) && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-neutral-300 flex items-center mb-3">
                                                <User className="mr-2 h-4 w-4" /> Osoby i Podmioty
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {doc.entities.osoby.map((osoba, idx) => (
                                                    <Badge key={idx} variant="secondary" className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1">
                                                        {osoba}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(doc.entities.daty && doc.entities.daty.length > 0) && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-neutral-300 flex items-center mb-3">
                                                <Calendar className="mr-2 h-4 w-4" /> Terminy i Daty
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {doc.entities.daty.map((data, idx) => (
                                                    <Badge key={idx} variant="secondary" className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-3 py-1">
                                                        {data}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(doc.entities.kwoty && doc.entities.kwoty.length > 0) && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-neutral-300 flex items-center mb-3">
                                                <DollarSign className="mr-2 h-4 w-4" /> Kwoty
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {doc.entities.kwoty.map((kwota, idx) => (
                                                    <Badge key={idx} variant="secondary" className="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3 py-1">
                                                        {kwota}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(!doc.entities.osoby?.length && !doc.entities.daty?.length && !doc.entities.kwoty?.length) && (
                                        <p className="text-neutral-500 italic">Czysto. AI nie znalazło konkretnych osób, dat ani kwot.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right Panel: Chat Interface */}
                    <div className="h-full">
                        <Card className="bg-neutral-900 border-neutral-800 shadow-xl flex flex-col h-full sticky top-0">
                            <CardHeader className="border-b border-neutral-800 pb-4">
                                <CardTitle className="text-white text-xl">Zapisz nowy Fakt</CardTitle>
                                <CardDescription>Wprowadź ręcznie kluczową informację z tego dokumentu do Bazy Faktów sprawy.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col p-6 space-y-4">

                                <div className="space-y-2">
                                    <label htmlFor="fact-content" className="text-sm font-medium text-neutral-300">
                                        Treść faktu
                                    </label>
                                    <textarea
                                        id="fact-content"
                                        placeholder="Np. Powód wezwał do zapłaty w dniu 15.05.2023 r."
                                        className="min-h-[120px] w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
                                        value={factContent}
                                        onChange={(e) => setFactContent(e.target.value)}
                                    />
                                </div>
                                <Button
                                    onClick={handleSaveFact}
                                    disabled={savingFact || !factContent.trim()}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {savingFact ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    Dodaj do Bazy Faktów
                                </Button>

                                {factSaved && (
                                    <div className="flex items-center text-emerald-400 text-sm p-3 bg-emerald-500/10 rounded-md mt-4 animate-in fade-in slide-in-from-bottom-2">
                                        <CheckCircle className="mr-2 h-4 w-4" /> Fakt został zapisany i zinkorporowany do sprawy.
                                    </div>
                                )}

                                <div className="mt-8 border-t border-neutral-800 pt-8 flex flex-col items-center justify-center opacity-50">
                                    <FileText className="h-10 w-10 text-neutral-700 mb-4" />
                                    <h3 className="text-sm font-medium text-neutral-400">Moduł konwersacji (Wkrótce)</h3>
                                    <p className="text-xs text-neutral-500 text-center max-w-sm mt-2">
                                        Później pojawi się tutaj również interaktywny czat do zadawania pytań bezpośrednio do tekstu tego dokumentu.
                                    </p>
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
