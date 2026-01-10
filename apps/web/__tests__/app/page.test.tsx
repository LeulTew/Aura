import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import Home from '@/app/page'

// Mock child components
jest.mock('@/components/VoidBackground', () => {
  return function MockVoidBackground() {
    return <div data-testid="void-background">VoidBackground</div>
  }
})

jest.mock('@/components/ScannerButton', () => {
  return function MockScannerButton({ onClick }: { onClick: () => void }) {
    return <button data-testid="scanner-button" onClick={onClick}>Scan</button>
  }
})

jest.mock('@/components/StatusFooter', () => {
  return function MockStatusFooter() {
    return <div data-testid="status-footer">StatusFooter</div>
  }
})

jest.mock('@/components/CameraView', () => {
  return function MockCameraView({ onCapture, onBack }: { onCapture: (blob: Blob) => void; onBack: () => void }) {
    return (
      <div data-testid="camera-view">
        <button onClick={() => onCapture(new Blob(['test']))}>Capture</button>
        <button onClick={onBack}>Back</button>
      </div>
    )
  }
})

jest.mock('@/components/GalleryView', () => {
  return function MockGalleryView({ onBack }: { onBack: () => void }) {
    return (
      <div data-testid="gallery-view">
        <button onClick={onBack}>Back to Home</button>
      </div>
    )
  }
})

// Mock fetch
global.fetch = jest.fn() as jest.Mock

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {}
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn((key: string) => mockSessionStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => { mockSessionStorage[key] = value }),
    removeItem: jest.fn((key: string) => { delete mockSessionStorage[key] }),
    clear: jest.fn(() => { Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k]) })
  },
  writable: true
})

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k])
  })

  it('shows loading state initially then landing', async () => {
    render(<Home />)
    
    // After hydration, should show landing
    await waitFor(() => {
      expect(screen.getByText('Aura')).toBeInTheDocument()
    })
  })

  it('renders landing page with all components', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('void-background')).toBeInTheDocument()
      expect(screen.getByTestId('scanner-button')).toBeInTheDocument()
      expect(screen.getByTestId('status-footer')).toBeInTheDocument()
    })
  })

  it('transitions to scanning state when scanner clicked', async () => {
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('scanner-button')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByTestId('scanner-button'))
    
    expect(screen.getByTestId('camera-view')).toBeInTheDocument()
  })

  it('handles successful capture and shows results', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        matches: [{ id: '1', source_path: '/test.jpg', distance: 10, photo_date: '2023-01-01', created_at: '2023-01-01T00:00:00Z' }]
      })
    })

    render(<Home />)
    
    // Go to scanning
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('scanner-button'))
    })
    
    // Capture
    fireEvent.click(screen.getByText('Capture'))
    
    await waitFor(() => {
      expect(screen.getByTestId('gallery-view')).toBeInTheDocument()
    })
  })

  it('handles capture error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: 'No faces found'
      })
    })

    render(<Home />)
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('scanner-button'))
    })
    
    fireEvent.click(screen.getByText('Capture'))
    
    // Component should handle error and stay on camera view
    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeInTheDocument()
    })
  })

  it('handles network error gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<Home />)
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('scanner-button'))
    })
    
    fireEvent.click(screen.getByText('Capture'))
    
    // Should still be on camera view (processing finished)
    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeInTheDocument()
    })
    
    // Error is set internally, component handles it gracefully (doesn't crash)
  })

  it('returns to landing from camera view', async () => {
    render(<Home />)
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('scanner-button'))
    })
    
    fireEvent.click(screen.getByText('Back'))
    
    await waitFor(() => {
      expect(screen.getByTestId('scanner-button')).toBeInTheDocument()
    })
  })

  it('returns to landing from gallery view', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        matches: [{ id: '1', source_path: '/test.jpg', distance: 10, photo_date: '2023-01-01', created_at: '2023-01-01T00:00:00Z' }]
      })
    })

    render(<Home />)
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('scanner-button'))
    })
    
    fireEvent.click(screen.getByText('Capture'))
    
    await waitFor(() => {
      expect(screen.getByTestId('gallery-view')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Back to Home'))
    
    await waitFor(() => {
      expect(screen.getByTestId('scanner-button')).toBeInTheDocument()
    })
  })

  it('restores state from sessionStorage', async () => {
    const savedState = {
      state: 'results',
      results: [{ id: '1', source_path: '/test.jpg', distance: 10, photo_date: '2023-01-01', created_at: '2023-01-01T00:00:00Z' }]
    }
    mockSessionStorage['aura_search_state'] = JSON.stringify(savedState)
    
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByTestId('gallery-view')).toBeInTheDocument()
    })
  })
})
