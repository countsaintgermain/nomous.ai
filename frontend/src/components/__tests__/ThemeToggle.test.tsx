import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'
import { vi, describe, it, expect } from 'vitest'

// Mock next-themes
vi.mock('next-themes', () => ({
    useTheme: () => ({
        setTheme: vi.fn(),
    }),
}))

// Mock Radix UI components (simplified for testing)
vi.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode, onClick: () => void }) => (
        <div onClick={onClick} role="menuitem">{children}</div>
    ),
}))

describe('ThemeToggle', () => {
    it('renders correctly', () => {
        render(<ThemeToggle />)
        expect(screen.getByText('Przełącz motyw')).toBeDefined()
    })

    it('contains light, dark, and system options', () => {
        render(<ThemeToggle />)
        expect(screen.getByText('Jasny')).toBeDefined()
        expect(screen.getByText('Ciemny')).toBeDefined()
        expect(screen.getByText('Systemowy')).toBeDefined()
    })
})
