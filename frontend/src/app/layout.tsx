import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Nomous.ia',
    description: 'AI Legal Assistant for automated case analysis.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="pl" suppressHydrationWarning className="h-full w-full">
            <body className={cn(inter.className, "h-screen w-screen antialiased selection:bg-primary/30 flex overflow-hidden bg-background")}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div className="flex-1 flex flex-col min-w-full min-h-full w-screen h-screen">
                        {children}
                    </div>
                    <Toaster position="bottom-right" richColors closeButton />
                </ThemeProvider>
            </body>
        </html>
    )
}
