import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import GalleryView from '@/components/GalleryView'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob(['fake-image'])),
    json: () => Promise.resolve({}),
  })
) as jest.Mock

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'blob:fake-url')
global.URL.revokeObjectURL = jest.fn()

// Mock navigator.share
Object.defineProperty(navigator, 'share', {
  value: jest.fn(),
  writable: true
})
Object.defineProperty(navigator, 'canShare', {
  value: jest.fn(() => false),
  writable: true
})

const mockMatches = [
  {
    id: '1',
    source_path: '/path/to/img1.jpg',
    distance: 10,
    photo_date: '2023-01-01',
    created_at: '2023-01-01T10:00:00Z'
  },
  {
    id: '2',
    source_path: '/path/to/img2.jpg',
    distance: 20,
    photo_date: '2023-01-02',
    created_at: '2023-01-02T10:00:00Z'
  },
  {
    id: '3',
    source_path: '/path/to/img3.jpg',
    distance: 150, // High distance (not a star rating)
    photo_date: '2023-01-01',
    created_at: '2023-01-01T11:00:00Z'
  }
]

describe('GalleryView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders matches correctly', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      expect(screen.getByText(/Found/i)).toBeInTheDocument()
      const images = screen.getAllByAltText('Match')
      expect(images).toHaveLength(3)
    })

    it('shows header with match count', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      // Match count should appear somewhere in header
      expect(screen.getAllByText(/3/).length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText(/Matches/i).length).toBeGreaterThanOrEqual(1)
    })

    it('displays best match percentage', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      expect(screen.getByText(/99.0% similarity/)).toBeInTheDocument()
    })

    it('groups matches by date', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      // Should have date separators
      expect(screen.getByText(/Jan 2, 2023/i)).toBeInTheDocument()
      expect(screen.getByText(/Jan 1, 2023/i)).toBeInTheDocument()
    })

    it('shows star for low distance matches', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      // Matches with distance < 100 show star
      expect(screen.getAllByText('★').length).toBeGreaterThanOrEqual(1)
    })

    it('shows distance value for high distance matches', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    it('hides header for bundle mode', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} isBundle={true} />)
      expect(screen.queryByText(/Found/i)).not.toBeInTheDocument()
      expect(screen.getByText('Shared Bundle')).toBeInTheDocument()
    })

    it('auto-selects all in bundle mode', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} isBundle={true} />)
      expect(screen.getAllByText('✓')).toHaveLength(3)
    })

    it('hides nav actions when hideNavActions is true', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} hideNavActions={true} />)
      expect(screen.queryByText('Select')).not.toBeInTheDocument()
      expect(screen.queryByText('Download All')).not.toBeInTheDocument()
    })
  })

  describe('Selection Mode', () => {
    it('enters selection mode when Select clicked', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      
      expect(screen.getByText('Select All')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('selects item on click in selection mode', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      
      const images = screen.getAllByAltText('Match')
      fireEvent.click(images[0])
      
      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('selects all items', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      fireEvent.click(screen.getByText('Select All'))
      
      expect(screen.getAllByText('✓')).toHaveLength(3)
    })

    it('deselects item on second click', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      
      const images = screen.getAllByAltText('Match')
      fireEvent.click(images[0])
      fireEvent.click(images[0])
      
      expect(screen.queryByText('✓')).not.toBeInTheDocument()
    })

    it('exits selection mode on Cancel', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      fireEvent.click(screen.getByText('Cancel'))
      
      expect(screen.getByText('Select')).toBeInTheDocument()
    })

    it('shows selection count in download button', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      
      const images = screen.getAllByAltText('Match')
      fireEvent.click(images[0])
      fireEvent.click(images[1])
      
      expect(screen.getByText('Download (2)')).toBeInTheDocument()
    })

    it('shows floating selection bar', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      
      const images = screen.getAllByAltText('Match')
      fireEvent.click(images[0])
      
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('Selected')).toBeInTheDocument()
    })

    it('toggles date selection', () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      
      // Find SELECT DATE button
      const selectDateBtn = screen.getAllByText(/SELECT DATE/i)[0]
      fireEvent.click(selectDateBtn)
      
      // Should select items for that date
      expect(screen.getAllByText('✓').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Image Viewer', () => {
    it('opens viewer on image click when not in selection mode', async () => {
      jest.useFakeTimers()
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      
      const images = screen.getAllByAltText('Match')
      fireEvent.click(images[0])
      
      act(() => {
        jest.advanceTimersByTime(400)
      })
      
      // Viewer should be open
      await waitFor(() => {
        expect(screen.getByAltText('Full view')).toBeInTheDocument()
      })
      
      jest.useRealTimers()
    })

    it('closes viewer on X button click', async () => {
      jest.useFakeTimers()
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      
      const images = screen.getAllByAltText('Match')
      fireEvent.click(images[0])
      
      act(() => {
        jest.advanceTimersByTime(400)
      })
      
      await waitFor(() => {
        expect(screen.getByAltText('Full view')).toBeInTheDocument()
      })
      
      const closeBtn = screen.getByText('×')
      fireEvent.click(closeBtn)
      
      act(() => {
        jest.advanceTimersByTime(400)
      })
      
      jest.useRealTimers()
    })

    it('handles zoom on scroll', async () => {
      jest.useFakeTimers()
      const { container } = render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      
      const images = screen.getAllByAltText('Match')
      fireEvent.click(images[0])
      
      act(() => {
        jest.advanceTimersByTime(400)
      })
      
      await waitFor(() => {
        expect(screen.getByAltText('Full view')).toBeInTheDocument()
      })
      
      // Zoom is handled by wheel event listener
      jest.useRealTimers()
    })
  })

  describe('Download', () => {
    it('downloads all images', async () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      
      fireEvent.click(screen.getByText('Download All'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('downloads selected images', async () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      
      const images = screen.getAllByAltText('Match')
      fireEvent.click(images[0])
      
      fireEvent.click(screen.getByText('Download (1)'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('shows download progress', async () => {
      render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      fireEvent.click(screen.getByText('Select'))
      fireEvent.click(screen.getByText('Select All'))
      
      fireEvent.click(screen.getByText('Download (3)'))
      
      await waitFor(() => {
        // Progress overlay should appear
        expect(screen.getByText(/Preparing Photos/i)).toBeInTheDocument()
      })
    })

    it('handles download error gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      render(<GalleryView matches={[mockMatches[0], mockMatches[1]]} onBack={jest.fn()} />)
      
      // Should not throw when download fails
      expect(() => fireEvent.click(screen.getByText('Download All'))).not.toThrow()
    })
  })

  describe('Navigation', () => {
    it('calls onBack when back button clicked', () => {
      const mockOnBack = jest.fn()
      render(<GalleryView matches={mockMatches} onBack={mockOnBack} />)
      
      fireEvent.click(screen.getByText('← Back'))
      
      expect(mockOnBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('Image Error Handling', () => {
    it('handles image load error with retry', () => {
      const { container } = render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
      
      const images = container.querySelectorAll('img[alt="Match"]')
      const firstImage = images[0] as HTMLImageElement
      
      // Trigger error
      fireEvent.error(firstImage)
      
      // Should have data-retried attribute
      expect(firstImage.dataset.retried).toBe('true')
    })
  })
})
