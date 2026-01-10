import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminPage from '@/app/admin/page'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('AdminPage', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Default mock implementation
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, token: 'fake-token' }),
    })
    // clear sessionStorage
    sessionStorage.clear()
  })

  it('renders login form initially', () => {
    render(<AdminPage />)
    expect(screen.getByText('Admin Terminal')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••')).toBeInTheDocument()
  })

  it('handles login success', async () => {
    render(<AdminPage />)
    const pinInput = screen.getByPlaceholderText('••••')
    const submitBtn = screen.getByText('Initialize Session')
    
    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.click(submitBtn)
    
    await waitFor(() => {
       expect(mockFetch).toHaveBeenCalledWith('/api/admin/login', expect.objectContaining({
           method: 'POST',
           body: JSON.stringify({ pin: '1234' })
       }))
    })
    
    // Should verify that it switches to main content or at least tries to fetch folders
    // After login, it calls fetch folders.
    // We need to support the second fetch call in our mock
    mockFetch.mockResolvedValueOnce({ // Login response already consumed?
        // Wait, fetch logic:
        // 1. Login -> returns token
        // 2. State updates token
        // 3. useEffect([currentPath, token]) triggers fetch folders
        
        // So allow multiple calls
    })
  })
})
