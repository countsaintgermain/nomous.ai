'use client'

import { useState, useMemo, useEffect } from "react"
import { Search, PlusCircle, Check, ChevronsUpDown, Folders, Lock, LayoutGrid, Loader2, Download, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { type Case } from "@/lib/types"
import { ThemeToggle } from "@/components/ThemeToggle"

interface TopBarProps {
    cases: Case[]
    activeCaseId: number | null
    onSelectCase: (c: Case) => void
    onAddCase: (c: Case) => void
}

export const APPELLATIONS = [
    { id: "bialystok", label: "białostocka" },
    { id: "gdansk", label: "gdańska" },
    { id: "katowice", label: "katowicka" },
    { id: "krakow", label: "krakowska" },
    { id: "lublin", label: "lubelska" },
    { id: "lodz", label: "łódzka" },
    { id: "poznan", label: "poznańska" },
    { id: "rzeszow", label: "rzeszowska" },
    { id: "szczecin", label: "szczecińska" },
    { id: "warszawa", label: "warszawska" },
    { id: "wroclaw", label: "wrocławska" }
];

interface PispCase {
    signature: string;
    court: string;
    status: string;
    pisp_id: number;
    department?: string;
    subject?: string;
}

export function TopBar({ cases = [], activeCaseId, onSelectCase, onAddCase }: TopBarProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const [searchTerm, setSearchTerm] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    
    // ... rest of state ...
    const [newTitle, setNewTitle] = useState("")
    const [newSignature, setNewSignature] = useState("")
    const [newAppellation, setNewAppellation] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // PISP state
    const [pispAppellation, setPispAppellation] = useState("lublin")
    const [pispCases, setPispCases] = useState<PispCase[]>([])
    const [isPispLoading, setIsPispLoading] = useState(false)
    const [isPispLoggedIn, setIsPispLoggedIn] = useState(false)
    const [pispLoginData, setPispLoginData] = useState({ username: "", password: "" })
    const [pispError, setPispError] = useState<string | null>(null)
    const [importingId, setImportingId] = useState<number | null>(null)

    const activeCase = useMemo(() => 
        cases?.find(c => c.id === activeCaseId), 
    [cases, activeCaseId])

    const filteredCases = useMemo(() => {
        if (!searchTerm.trim()) return cases || []
        return cases?.filter(c => 
            c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.signature?.toLowerCase().includes(searchTerm.toLowerCase())
        ) || []
    }, [cases, searchTerm])

    // PISP Logic
    const checkPispStatus = async () => {
        try {
            const res = await fetch("/api/pisp/status")
            const data = await res.json()
            setIsPispLoggedIn(data.connected)
            if (data.connected) fetchPispCases()
        } catch (e) { console.error(e) }
    }

    const handlePispLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsPispLoading(true)
        setPispError(null)
        try {
            const res = await fetch("/api/pisp/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    username: pispLoginData.username, 
                    password: pispLoginData.password 
                })
            })
            if (res.ok) {
                setIsPispLoggedIn(true)
                fetchPispCases()
            } else {
                setPispError("Błąd logowania. Sprawdź dane.")
            }
        } catch (e) { setPispError("Błąd połączenia.") }
        finally { setIsPispLoading(false) }
    }

    const fetchPispCases = async () => {
        setIsPispLoading(true)
        try {
            const res = await fetch(`/api/pisp/cases?appellation=${pispAppellation}`)
            if (res.ok) {
                const data = await res.json()
                setPispCases(data)
            }
        } catch (e) { console.error(e) }
        finally { setIsPispLoading(false) }
    }

    const handleImportPispCase = async (pispCase: PispCase) => {
        setImportingId(pispCase.pisp_id)
        try {
            // 1. Utwórz sprawę lokalnie
            const createRes = await fetch("/api/cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `${pispCase.signature} - ${pispCase.court}`,
                    signature: pispCase.signature,
                    appellation: pispAppellation,
                    pisp_id: pispCase.pisp_id,
                    court: pispCase.court,
                    description: `Zaimportowano z PISP. Przedmiot: ${pispCase.subject || pispCase.status}`
                })
            })

            if (createRes.ok) {
                const newCase = await createRes.json()
                
                // 2. Wywołaj synchronizację
                await fetch(`/api/pisp/sync/${newCase.id}`, { method: "POST" })
                
                // 3. Odśwież i zamknij
                onAddCase(newCase)
                setIsDialogOpen(false)
                onSelectCase(newCase)
            }
        } catch (e) {
            console.error("Import error:", e)
        } finally {
            setImportingId(null)
        }
    }

    useEffect(() => {
        if (isDialogOpen) checkPispStatus()
    }, [isDialogOpen])

    const handleCreateCaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTitle.trim()) return

        setIsSubmitting(true)

        const payload: Record<string, string> = { 
            title: newTitle,
            appellation: newAppellation
        }
        if (newDescription.trim()) payload.description = newDescription
        if (newSignature.trim()) payload.signature = newSignature

        try {
            const res = await fetch("/api/cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const newCase = await res.json()
                onAddCase(newCase)
                setIsDialogOpen(false)
                setNewTitle("")
                setNewSignature("")
                setNewAppellation("")
                setNewDescription("")
            }
        } catch (error) {
            console.error("Error creating case:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!mounted) {
        return (
            <div className="flex h-16 w-full items-center border-b border-border bg-background shrink-0">
                <div className="flex h-full w-64 items-center gap-2 border-r border-border px-4 font-semibold text-foreground">
                    <Folders className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                    <span>Nomous.ia</span>
                </div>
                <div className="flex flex-1 items-center justify-between px-6">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-72 h-10 bg-muted animate-pulse rounded-md" />
                        <div className="w-32 h-10 bg-muted animate-pulse rounded-md" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-16 w-full items-center border-b border-border bg-background shrink-0">
            {/* Logo Section */}
            <div className="flex h-full w-64 items-center gap-2 border-r border-border px-4 font-semibold text-foreground">
                <Folders className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                <span>Nomous.ia</span>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 items-center justify-between px-6">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-72">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground">
                                    <span className="truncate">{activeCase ? activeCase.title : "Wybierz sprawę..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-72 bg-popover border-border p-0" align="start">
                                <div className="flex items-center border-b border-border p-2">
                                    <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <Input className="h-9 w-full bg-transparent border-none focus-visible:ring-0 text-sm" placeholder="Filtruj sprawy..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="max-h-[300px] overflow-y-auto p-1">
                                    {filteredCases.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">Nie znaleziono spraw.</div>
                                    ) : (
                                        filteredCases.map((c) => (
                                            <DropdownMenuItem key={c.id} onSelect={() => onSelectCase(c)} className={cn("flex items-center justify-between px-2 py-2 cursor-pointer rounded-sm hover:bg-accent focus:bg-accent", activeCaseId === c.id ? "bg-accent text-indigo-500 dark:text-indigo-400 font-medium" : "text-foreground")}>
                                                <span className="truncate">{c.title}</span>
                                                {activeCaseId === c.id && <Check className="h-4 w-4" />}
                                            </DropdownMenuItem>
                                        ))
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700 shadow-sm dark:shadow-indigo-500/20">
                                <PlusCircle className="h-4 w-4" />
                                Nowa Sprawa
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] bg-background border-border text-foreground overflow-hidden flex flex-col max-h-[90vh]">
                            <DialogHeader>
                                <DialogTitle>Dodaj sprawę</DialogTitle>
                                <DialogDescription className="text-muted-foreground">Wybierz sposób dodania sprawy do systemu.</DialogDescription>
                            </DialogHeader>
                            
                            <Tabs defaultValue="manual" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="manual">Ręcznie</TabsTrigger>
                                    <TabsTrigger value="pisp" className="gap-2">
                                        <Download className="h-3 w-3" />
                                        Import z PISP
                                    </TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="manual">
                                    <form onSubmit={handleCreateCaseSubmit}>
                                        <div className="grid gap-4 py-2">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-muted-foreground">Nazwa sprawy <span className="text-red-500">*</span></label>
                                                <Input placeholder="np. Jan Kowalski vs ZUS" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Sygnatura</label>
                                                    <Input placeholder="I C 123/24" value={newSignature} onChange={(e) => setNewSignature(e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-muted-foreground">Apelacja</label>
                                                    <select value={newAppellation} onChange={(e) => setNewAppellation(e.target.value)} className="w-full h-10 p-2 text-sm border rounded-md bg-background border-border outline-none">
                                                        <option value="">Wybierz...</option>
                                                        {APPELLATIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-muted-foreground">Opis</label>
                                                <Textarea placeholder="Notatka..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="min-h-[80px] resize-none" />
                                            </div>
                                        </div>
                                        <DialogFooter className="mt-6">
                                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Anuluj</Button>
                                            <Button type="submit" disabled={!newTitle.trim() || isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                                {isSubmitting ? "Zapisywanie..." : "Zapisz sprawę"}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </TabsContent>

                                <TabsContent value="pisp" className="flex flex-col">
                                    {!isPispLoggedIn ? (
                                        <form onSubmit={handlePispLogin} className="space-y-4 py-4">
                                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-md flex gap-3 items-start">
                                                <Lock className="h-4 w-4 text-indigo-500 mt-0.5" />
                                                <p className="text-[11px] text-indigo-700 dark:text-indigo-400">Zaloguj się do Portalu Informacyjnego Sądu, aby pobrać listę swoich spraw.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Login (E-mail)</label>
                                                <Input type="text" name="pisp_username" autoComplete="username" placeholder="E-mail" value={pispLoginData.username} onChange={e => setPispLoginData({...pispLoginData, username: e.target.value})} required />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Hasło</label>
                                                <Input type="password" name="pisp_password" autoComplete="current-password" placeholder="Hasło" value={pispLoginData.password} onChange={e => setPispLoginData({...pispLoginData, password: e.target.value})} required />
                                            </div>                                            {pispError && <p className="text-xs text-red-500 font-medium">{pispError}</p>}
                                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPispLoading}>
                                                {isPispLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Połącz z PISP"}
                                            </Button>
                                        </form>
                                    ) : (
                                        <div className="flex flex-col gap-4 py-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <select 
                                                    value={pispAppellation} 
                                                    onChange={(e) => setPispAppellation(e.target.value)}
                                                    className="flex-1 h-9 p-2 text-xs border rounded-md bg-background border-border outline-none"
                                                >
                                                    {APPELLATIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                                </select>
                                                <Button variant="outline" size="sm" onClick={fetchPispCases} disabled={isPispLoading}>
                                                    {isPispLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Odśwież"}
                                                </Button>
                                            </div>
                                            
                                            <div className="border rounded-md max-h-[300px] overflow-y-auto">
                                                {pispCases.length === 0 ? (
                                                    <div className="py-12 text-center text-xs text-muted-foreground italic">
                                                        {isPispLoading ? "Pobieranie spraw..." : "Brak spraw w tej apelacji."}
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-border">
                                                        {pispCases.map((c) => (
                                                            <div key={c.pisp_id} className="p-3 hover:bg-accent/50 flex justify-between items-center group transition-colors">
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="font-bold text-xs truncate">{c.signature}</div>
                                                                    <div className="text-[10px] text-muted-foreground truncate">{c.court}</div>
                                                                </div>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost" 
                                                                    className="h-8 text-[10px] gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                                    onClick={() => handleImportPispCase(c)}
                                                                    disabled={importingId !== null}
                                                                >
                                                                    {importingId === c.pisp_id ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <Briefcase className="h-3 w-3" />
                                                                            Importuj
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground text-center italic">Sprawy są pobierane bezpośrednio z Portalu PISP.</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-xs text-muted-foreground mr-2">
                        {activeCase ? `Pracujesz nad: ${activeCase.title}` : "Wybierz sprawę z listy"}
                    </div>
                    <ThemeToggle />
                </div>
            </div>
        </div>
    )
}
