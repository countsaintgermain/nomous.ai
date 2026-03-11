import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/ThemeProvider'

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
        <html lang="pl" suppressHydrationWarning>
            <body className={cn(inter.className, "min-h-screen antialiased selection:bg-primary/30")}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div className="flex h-screen overflow-hidden">
                        {children}
                    </div>
                </ThemeProvider>
            </body>
        </html>
    )
}
