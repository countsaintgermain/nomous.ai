'use client'

import React, { useState, useEffect } from 'react'
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SettingsView() {
    const [settings, setSettings] = useState({
        main_model: 'gemini-2.5-pro',
        analytical_model: 'gemini-3.1-flash-lite-preview',
        api_key: '',
        use_vertex: true
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings')
            if (res.ok) {
                const data = await res.json()
                setSettings({
                    ...data,
                    api_key: data.api_key || ''
                })
            }
        } catch (err) {
            console.error('Error fetching settings:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })
            if (res.ok) {
                setMessage({ type: 'success', text: 'Ustawienia zostały zapisane pomyślnie.' })
            } else {
                throw new Error('Save failed')
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Wystąpił błąd podczas zapisywania ustawień.' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-border bg-card/40">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Settings className="h-6 w-6 text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground tracking-wider uppercase">
                        Ustawienia Systemowe
                    </h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-muted">
                <div className="max-w-2xl mx-auto space-y-6">
                    <Card className="bg-card border-border shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Settings className="h-5 w-5 text-indigo-500" />
                                Konfiguracja Systemowa AI
                            </CardTitle>
                            <CardDescription>
                                Zarządzaj kluczami API i modelami używanymi przez Nomous.ia.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-foreground">Dostawca API (Google)</Label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-muted/30 rounded-lg border border-border/50">
                                    <button
                                        type="button"
                                        onClick={() => setSettings({ ...settings, use_vertex: false })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-md transition-all ${
                                            !settings.use_vertex 
                                            ? "bg-background text-indigo-500 shadow-sm border border-border" 
                                            : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                                        }`}
                                    >
                                        <span className="text-sm font-bold">Google AI Studio</span>
                                        <span className="text-[10px] opacity-70 italic">Klucze AIza... (darmowe)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSettings({ ...settings, use_vertex: true })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-md transition-all ${
                                            settings.use_vertex 
                                            ? "bg-background text-indigo-500 shadow-sm border border-border" 
                                            : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                                        }`}
                                    >
                                        <span className="text-sm font-bold">Vertex AI</span>
                                        <span className="text-[10px] opacity-70 italic">Google Cloud Platform</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="api_key" className="text-sm font-semibold text-foreground">
                                    Google API Key
                                </Label>
                                <Input
                                    id="api_key"
                                    name="api_key"
                                    type="password"
                                    autoComplete="new-password"
                                    value={settings.api_key}
                                    onChange={(e) => setSettings({ ...settings, api_key: e.target.value })}
                                    placeholder="Wklej swój klucz API (zaczynający się od AIza...)"
                                    className="bg-background border-border focus:ring-indigo-500 font-mono"
                                />
                                <p className="text-[11px] text-muted-foreground italic">
                                    Klucz ten nadpisuje domyślny klucz serwerowy. Pozostaw puste, by używać systemowego.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="main_model" className="text-sm font-semibold text-foreground">
                                        Model Główny (Czat RAG)
                                    </Label>
                                    <Input
                                        id="main_model"
                                        name="main_model"
                                        autoComplete="off"
                                        value={settings.main_model}
                                        onChange={(e) => setSettings({ ...settings, main_model: e.target.value })}
                                        placeholder="np. gemini-2.5-pro"
                                        className="bg-background border-border focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="analytical_model" className="text-sm font-semibold text-foreground">
                                        Model Analityczny (Dokumenty)
                                    </Label>
                                    <Input
                                        id="analytical_model"
                                        name="analytical_model"
                                        autoComplete="off"
                                        value={settings.analytical_model}
                                        onChange={(e) => setSettings({ ...settings, analytical_model: e.target.value })}
                                        placeholder="np. gemini-2.5-flash-lite"
                                        className="bg-background border-border focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {message && (
                                <div className={`p-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 ${
                                    message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
                                }`}>
                                    {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                    {message.text}
                                </div>
                            )}

                            <div className="pt-4 border-t border-border flex justify-end">
                                <Button 
                                    onClick={handleSave} 
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Zapisywanie...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Zapisz Zmiany
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-4 bg-muted/30 border border-dashed border-border rounded-xl">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Informacja Techniczna</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Aplikacja korzysta z klucza API skonfigurowanego w zmiennej środowiskowej GOOGLE_API_KEY. Upewnij się, że wybrane modele są aktywne w Twoim projekcie Google AI Studio lub Vertex AI.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
