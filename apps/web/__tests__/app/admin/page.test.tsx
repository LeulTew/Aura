import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Supabase BEFORE importing AdminPage
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null })
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'url' } })
      }))
    }
  }
}))

// Mock VoidBackground
jest.mock('@/components/VoidBackground', () => ({
  __esModule: true,
  default: () => <div data-testid="void-bg">VoidBackground</div>
}))

import AdminPage from '@/app/admin/page'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {}
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn((key: string) => mockSessionStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => { mockSessionStorage[key] = value }),
    removeItem: jest.fn((key: string) => { delete mockSessionStorage[key] }),
    clear: jest.fn()
  },
  writable: true
})

describe('AdminPage', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k])
  })

  describe('Login Form', () => {
    it('renders login form initially', () => {
      render(<AdminPage />)
      expect(screen.getByText('Cloud Terminal')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('••••')).toBeInTheDocument()
      expect(screen.getByText('Authenticate')).toBeInTheDocument()
    })

    it('handles successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, token: 'test-token' })
      })

      render(<AdminPage />)
      
      fireEvent.change(screen.getByPlaceholderText('••••'), { target: { value: '1234' } })
      fireEvent.click(screen.getByText('Authenticate'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
        const call = mockFetch.mock.calls[0]
        expect(call[0]).toContain('/api/admin/login')
      })
    })

    it('shows error on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false })
      })

      render(<AdminPage />)
      
      fireEvent.change(screen.getByPlaceholderText('••••'), { target: { value: 'wrong' } })
      fireEvent.click(screen.getByText('Authenticate'))
      
      await waitFor(() => {
        expect(screen.getByText('Access Denied: Invalid PIN')).toBeInTheDocument()
      })
    })
  })
})
