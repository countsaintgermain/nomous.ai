'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Link as LinkIcon, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Document {
    id: number
    filename: string
    file_type: string
    tag: string
    status: 'uploaded' | 'processing' | 'ready' | 'error'
}

export function Briefcase({
    caseId,
    onAnalyze
}: {
    caseId: number,
    onAnalyze: (docId: number, filename: string) => void
}) {
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [isLinkOpen, setIsLinkOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [url, setUrl] = useState('')
    const [tag, setTag] = useState('Dokument')
    const [file, setFile] = useState<File | null>(null)
    const [docToDelete, setDocToDelete] = useState<number | null>(null)
    const router = useRouter()

    useEffect(() => {
        fetchDocuments()
        const interval = setInterval(fetchDocuments, 5000)
        return () => clearInterval(interval)
    }, [caseId])

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/cases/${caseId}/documents`)
            if (!res.ok) throw new Error('Fetch failed')
            const data = await res.json()
            setDocuments(data)
        } catch (err) {
            console.error('Error fetching documents:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAnalyze = async (e: React.MouseEvent, docId: number) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            setUploading(true)
            const res = await fetch(`http://localhost:8000/api/cases/${caseId}/documents/${docId}/analyze`, { method: 'POST' })
            if (!res.ok) throw new Error('Analysis failed to start')
            fetchDocuments()
        } catch (err) {
            console.error('Error starting analysis:', err)
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent, docId: number) => {
        e.preventDefault()
        e.stopPropagation()
        setDocToDelete(docId)
    }

    const confirmDelete = async () => {
        if (!docToDelete) return
        try {
            await fetch(`http://localhost:8000/api/cases/${caseId}/documents/${docToDelete}`, { method: 'DELETE' })
            fetchDocuments()
        } catch (err) {
            console.error('Delete failed:', err)
        } finally {
            setDocToDelete(null)
        }
    }

    const handleFileUpload = async () => {
        if (!file) return
        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tag', tag)

        try {
            await fetch(`http://localhost:8000/api/cases/${caseId}/documents`, {
                method: 'POST',
                body: formData,
            })
            setIsUploadOpen(false)
            setFile(null)
            fetchDocuments()
        } catch (err) {
            console.error('Upload failed:', err)
        } finally {
            setUploading(false)
        }
    }

    const handleLinkSubmit = async () => {
        if (!url) return
        setUploading(true)
        try {
            setIsLinkOpen(false)
            setUrl('')
            fetchDocuments()
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Header Section */}
            <div className="flex justify-between items-center p-6 border-b border-border bg-card/40">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <FileText className="h-6 w-6 text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground tracking-wider uppercase">
                        Aktówka
                    </h2>
                </div>

                <div className="flex gap-3">
                    <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex gap-2 border-border hover:bg-muted">
                                <LinkIcon className="h-4 w-4" />
                                Dodaj Link
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
                            <DialogHeader>
                                <DialogTitle>Dodaj link do analizy</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="url">URL strony</Label>
                                    <Input
                                        id="url"
                                        placeholder="https://example.com/artykul"
                                        value={url}
                                        className="bg-background border-border"
                                        onChange={(e) => setUrl(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleLinkSubmit} disabled={uploading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Dodaj i Sczytaj
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="flex gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Plus className="h-4 w-4" />
                                Wgraj Dokument
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
                            <DialogHeader>
                                <DialogTitle>Wgraj nowy dokument</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="file">Plik (PDF, DOCX, ODT, JPG, PNG)</Label>
                                    <Input
                                        id="file"
                                        type="file"
                                        className="bg-background border-border"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                                <div className="grid gap-2 mt-2">
                                    <Label>Kategoria (Tag)</Label>
                                    <div className="flex gap-2">
                                        {['Dokument', 'Dowód', 'Inne'].map(t => (
                                            <Button
                                                key={t}
                                                size="sm"
                                                variant={tag === t ? 'default' : 'outline'}
                                                onClick={() => setTag(t)}
                                                className={tag === t ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-background border-border"}
                                            >
                                                {t}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleFileUpload} disabled={uploading || !file} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Wgraj plik
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Dialog open={docToDelete !== null} onOpenChange={(open) => !open && setDocToDelete(null)}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground">
                    <DialogHeader>
                        <DialogTitle>Potwierdzenie usunięcia</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        Czy na pewno chcesz usunąć ten dokument? Ta operacja jest nieodwracalna.
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDocToDelete(null)} className="border-border hover:bg-muted">Anuluj</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Usuń</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-muted">
                <div className="max-w-4xl mx-auto space-y-4">
                    {documents.map((doc) => (
                        <Card
                            key={doc.id}
                            className="bg-card border-border hover:border-indigo-500/50 hover:bg-accent/50 transition-all cursor-pointer group"
                            onClick={() => {
                                if (doc.status === 'ready' || doc.status === 'error') {
                                    router.push(`/cases/${caseId}/documents/${doc.id}`)
                                }
                            }}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="p-3 bg-muted group-hover:bg-indigo-500/10 rounded-lg transition-colors">
                                        <FileText className="h-5 w-5 text-muted-foreground group-hover:text-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-card-foreground truncate pr-4">{doc.filename}</div>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-background text-muted-foreground border-border font-normal uppercase">{doc.tag}</Badge>
                                            <StatusBadge status={doc.status} />
                                            {doc.status === 'uploaded' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-[10px] h-5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 px-2 font-semibold"
                                                    onClick={(e) => handleAnalyze(e, doc.id)}
                                                >
                                                    Analizuj Teraz
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => handleDeleteClick(e, doc.id)}
                                        className="text-muted-foreground hover:text-destructive h-8 w-8 hover:bg-destructive/10 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {documents.length === 0 && !loading && (
                        <div className="text-center py-24 text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-muted/30">
                            <div className="relative inline-block mb-4">
                                <FileText className="h-12 w-12 opacity-20" />
                                <Plus className="h-5 w-5 absolute -bottom-1 -right-1 text-indigo-500 opacity-50" />
                            </div>
                            <p className="text-foreground font-medium">Aktówka jest pusta</p>
                            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mt-1">Wgraj dokumenty procesowe, aby AI mogło je przeanalizować.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'processing':
            return <Badge variant="outline" className="text-[10px] py-0 gap-1.5 opacity-80 bg-accent text-accent-foreground border-border"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Analiza...</Badge>
        case 'indexed':
            return <Badge variant="outline" className="text-[10px] py-0 gap-1.5 text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20"><CheckCircle2 className="h-2.5 w-2.5" /> Gotowe</Badge>
        case 'error':
            return <Badge variant="outline" className="text-[10px] py-0 gap-1.5 text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20"><AlertCircle className="h-2.5 w-2.5" /> Błąd</Badge>
        default:
            return <Badge variant="outline" className="text-[10px] py-0 bg-muted text-muted-foreground border-border">Wgrany</Badge>
    }
}
