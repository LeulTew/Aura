import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
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
      expect(screen.getByText('Admin Terminal')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('••••')).toBeInTheDocument()
      expect(screen.getByText('Initialize Session')).toBeInTheDocument()
    })

    it('handles successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, token: 'test-token' })
      })

      render(<AdminPage />)
      
      fireEvent.change(screen.getByPlaceholderText('••••'), { target: { value: '1234' } })
      fireEvent.click(screen.getByText('Initialize Session'))
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/login', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ pin: '1234' })
        }))
      })
    })

    it('shows error on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false })
      })

      render(<AdminPage />)
      
      fireEvent.change(screen.getByPlaceholderText('••••'), { target: { value: 'wrong' } })
      fireEvent.click(screen.getByText('Initialize Session'))
      
      await waitFor(() => {
        expect(screen.getByText('Invalid PIN')).toBeInTheDocument()
      })
    })

    it('restores session from sessionStorage', async () => {
      mockSessionStorage['admin_token'] = 'existing-token'
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ path: '/', parent: null, items: [] })
      })
      
      render(<AdminPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Core Browser')).toBeInTheDocument()
      })
    })
  })

  describe('Admin Dashboard', () => {
    beforeEach(() => {
      mockSessionStorage['admin_token'] = 'test-token'
    })

    it('renders dashboard after login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ path: '/', parent: null, items: [] })
      })

      render(<AdminPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Core Browser')).toBeInTheDocument()
        expect(screen.getByText('Public Access')).toBeInTheDocument()
        expect(screen.getByText('Bundle Creator')).toBeInTheDocument()
      })
    })

    it('displays folder items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          path: '/photos',
          parent: '/',
          items: [
            { name: 'folder1', path: '/photos/folder1', type: 'dir' },
            { name: 'image.jpg', path: '/photos/image.jpg', type: 'file' }
          ]
        })
      })

      render(<AdminPage />)
      
      await waitFor(() => {
        expect(screen.getByText('folder1')).toBeInTheDocument()
        expect(screen.getByText('image.jpg')).toBeInTheDocument()
      })
    })

    it('navigates to parent folder', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            path: '/photos',
            parent: '/',
            items: []
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            path: '/',
            parent: null,
            items: []
          })
        })

      render(<AdminPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Up Level')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Up Level'))
      
      // Should trigger navigation
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('toggles file selection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          path: '/photos',
          parent: null,
          items: [
            { name: 'test.jpg', path: '/photos/test.jpg', type: 'file' }
          ]
        })
      })

      render(<AdminPage />)
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('test.jpg'))
      
      expect(screen.getByText('1 STASHED')).toBeInTheDocument()
    })

    it('handles bundle creation', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            path: '/photos',
            parent: null,
            items: [{ name: 'test.jpg', path: '/photos/test.jpg', type: 'file' }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'bundle-123', url: '/gallery/bundle-123' })
        })

      render(<AdminPage />)
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('test.jpg'))
      })
      
      fireEvent.change(screen.getByPlaceholderText('E.G. SUMMER_GALA_RECAP'), { target: { value: 'My Bundle' } })
      fireEvent.click(screen.getByText('GENERATE_BUNDLE'))
      
      await waitFor(() => {
        expect(screen.getByText('bundle-123')).toBeInTheDocument()
      })
    })

    it('handles logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ path: '/', parent: null, items: [] })
      })

      render(<AdminPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Term Session')).toBeInTheDocument()
      })
      
      fireEvent.click(screen.getByText('Term Session'))
      
      expect(screen.getByText('Admin Terminal')).toBeInTheDocument()
    })

    it('handles path input navigation', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ path: '/', parent: null, items: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ path: '/custom/path', parent: '/', items: [] })
        })

      render(<AdminPage />)
      
      await waitFor(() => {
        const input = screen.getByDisplayValue('/')
        fireEvent.change(input, { target: { value: '/custom/path' } })
        fireEvent.submit(input.closest('form')!)
      })
      
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('handles folder fetch error gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Access denied' })
      })

      // Should not throw during render
      expect(() => render(<AdminPage />)).not.toThrow()
    })

    it('selects all files in folder', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            path: '/',
            parent: null,
            items: [{ name: 'subfolder', path: '/subfolder', type: 'dir' }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            path: '/subfolder',
            parent: '/',
            items: [
              { name: 'a.jpg', path: '/subfolder/a.jpg', type: 'file' },
              { name: 'b.jpg', path: '/subfolder/b.jpg', type: 'file' }
            ]
          })
        })

      render(<AdminPage />)
      
      await waitFor(() => {
        expect(screen.getByText('subfolder')).toBeInTheDocument()
      })
      
      // Hover and click Select All
      const selectAllBtn = screen.getByText('Select All')
      fireEvent.click(selectAllBtn)
      
      await waitFor(() => {
        expect(screen.getByText('2 STASHED')).toBeInTheDocument()
      })
    })
  })
})
