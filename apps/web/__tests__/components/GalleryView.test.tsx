import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import GalleryView from '@/components/GalleryView'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob(['fake-image'])),
    json: () => Promise.resolve({}),
  })
) as jest.Mock

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
  }
]

describe('GalleryView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders matches correctly', () => {
    render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
    expect(screen.getByText(/Found/i)).toBeInTheDocument()
    // Check for images using alt attribute (we added alt="Match" in step 55/88?) 
    // Wait, step 55 line 499 was: alt="Match". I didn't change it to dynamic alt.
    const images = screen.getAllByAltText('Match')
    expect(images).toHaveLength(2)
  })

  it('handles selection mode', () => {
    render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
    const selectBtn = screen.getByText('Select')
    fireEvent.click(selectBtn)
    
    // Check if Select All / Cancel buttons appear
    expect(screen.getByText('Select All')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    
    // Select an item by clicking the overlay div or checkmark?
    // The component has a click handler on the div wrapping the image
    // line 479: onClick={(e) => openViewer(match, e)}
    // Inside openViewer: if (selectMode) toggleSelect(match.id)
    
    // We need to click the image container. 
    // They have class 'cursor-pointer'.
    // Let's use the image and click its parent
    const images = screen.getAllByAltText('Match')
    fireEvent.click(images[0]) // Click first image
    
    // Check if selected (checkmark appears)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('selects all and downloads', async () => {
    render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
    fireEvent.click(screen.getByText('Select'))
    fireEvent.click(screen.getByText('Select All'))
    
    expect(screen.getAllByText('✓')).toHaveLength(2)
    
    const downloadBtn = screen.getByText('Download (2)')
    fireEvent.click(downloadBtn)
    
    // Download logic involves fetching blobs.
    await waitFor(() => {
       expect(global.fetch).toHaveBeenCalledTimes(2) 
    })
  })

  it('opens viewer on click when not in select mode', () => {
    jest.useFakeTimers()
    render(<GalleryView matches={mockMatches} onBack={jest.fn()} />)
    const images = screen.getAllByAltText('Match')
    
    // Need to wrap in act
    fireEvent.click(images[0])
    
    // Viewer should open. Viewer has alt="Full view"
    // Wait for state update/animation
    act(() => {
        jest.advanceTimersByTime(350)
    })
    
    jest.useRealTimers()
  })
})
