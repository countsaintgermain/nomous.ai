'use client'

import { useState, useMemo } from "react"
import { Search, PlusCircle, Check, ChevronsUpDown, Folders } from "lucide-react"
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
import { cn } from "@/lib/utils"
import { type Case } from "@/lib/types"
import { ThemeToggle } from "@/components/ThemeToggle"

interface TopBarProps {
    cases: Case[]
    activeCaseId: number | null
    onSelectCase: (c: Case) => void
    onAddCase: (c: Case) => void
}

export function TopBar({ cases = [], activeCaseId, onSelectCase, onAddCase }: TopBarProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newTitle, setNewTitle] = useState("")
    const [newSignature, setNewSignature] = useState("")
    const [newDescription, setNewDescription] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

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

    const handleCreateCaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTitle.trim()) return

        setIsSubmitting(true)

        const payload: Record<string, string> = { title: newTitle }
        if (newDescription.trim()) payload.description = newDescription
        if (newSignature.trim()) payload.signature = newSignature

        try {
            const res = await fetch("http://localhost:8000/api/cases", {
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
                setNewDescription("")
            } else {
                console.error("Failed to create case")
            }
        } catch (error) {
            console.error("Error creating case:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex h-16 items-center border-b border-border bg-background shrink-0">
            {/* Logo Section - Aligned with Sidebar (w-64) */}
            <div className="flex h-full w-64 items-center gap-2 border-r border-border px-4 font-semibold text-foreground">
                <Folders className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                <span>Nomous.ia</span>
            </div>

            {/* Main Content Area in TopBar */}
            <div className="flex flex-1 items-center justify-between px-6">
                <div className="flex items-center gap-4 flex-1">
                    {/* Searchable Case Selector */}
                    <div className="relative w-72">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    className="w-full justify-between bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                                >
                                    <span className="truncate">
                                        {activeCase ? activeCase.title : "Wybierz sprawę..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-72 bg-popover border-border p-0" align="start">
                                <div className="flex items-center border-b border-border p-2">
                                    <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <Input
                                        className="h-9 w-full bg-transparent border-none focus-visible:ring-0 text-sm"
                                        placeholder="Filtruj sprawy..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="max-h-[300px] overflow-y-auto p-1">
                                    {filteredCases.length === 0 ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                            Nie znaleziono spraw.
                                        </div>
                                    ) : (
                                        filteredCases.map((c) => (
                                            <DropdownMenuItem
                                                key={c.id}
                                                onSelect={() => onSelectCase(c)}
                                                className={cn(
                                                    "flex items-center justify-between px-2 py-2 cursor-pointer rounded-sm hover:bg-accent focus:bg-accent",
                                                    activeCaseId === c.id ? "bg-accent text-indigo-500 dark:text-indigo-400 font-medium" : "text-foreground"
                                                )}
                                            >
                                                <span className="truncate">{c.title}</span>
                                                {activeCaseId === c.id && (
                                                    <Check className="h-4 w-4" />
                                                )}
                                            </DropdownMenuItem>
                                        ))
                                    )}
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* New Case Button */}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                className="gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700 shadow-sm dark:shadow-indigo-500/20"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Nowa Sprawa
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
                            <DialogHeader>
                                <DialogTitle>Dodaj nową sprawę</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Wprowadź dane nowej sprawy. Nazwa jest wymagana.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateCaseSubmit}>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <label htmlFor="title" className="text-sm font-medium text-muted-foreground">
                                            Nazwa sprawy <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="title"
                                            placeholder="np. Jan Kowalski vs ZUS"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="bg-background border-border text-foreground focus-visible:ring-indigo-500"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="signature" className="text-sm font-medium text-muted-foreground">
                                            Sygnatura (opcjonalnie)
                                        </label>
                                        <Input
                                            id="signature"
                                            placeholder="np. I C 123/24"
                                            value={newSignature}
                                            onChange={(e) => setNewSignature(e.target.value)}
                                            className="bg-background border-border text-foreground focus-visible:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="description" className="text-sm font-medium text-muted-foreground">
                                            Krótki opis (opcjonalnie)
                                        </label>
                                        <Textarea
                                            id="description"
                                            placeholder="Dodaj krótką notatkę o przedmiocie sprawy..."
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            className="bg-background border-border text-foreground focus-visible:ring-indigo-500 min-h-[100px] resize-none"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        className="bg-background border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                                    >
                                        Anuluj
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={!newTitle.trim() || isSubmitting}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        {isSubmitting ? "Zapisywanie..." : "Zapisz sprawę"}
                                    </Button>
                                </DialogFooter>
                            </form>
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
