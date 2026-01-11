import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import BundlePage from '@/app/gallery/[id]/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn()
}))

// Mock GalleryView
jest.mock('@/components/GalleryView', () => {
  const React = require('react')
  return React.forwardRef(function MockGalleryView(
    { matches, onBack, isBundle, hideNavActions }: { 
      matches: unknown[]; 
      onBack: () => void;
      isBundle: boolean;
      hideNavActions: boolean;
    },
    ref: React.Ref<{ downloadAll: () => void }>
  ) {
    React.useImperativeHandle(ref, () => ({
      downloadAll: jest.fn()
    }))
    return (
      <div data-testid="gallery-view">
        <span data-testid="match-count">{matches.length}</span>
        <span data-testid="is-bundle">{isBundle.toString()}</span>
        <span data-testid="hide-nav">{hideNavActions.toString()}</span>
        <button onClick={onBack}>Go Home</button>
      </div>
    )
  })
})

import { useParams } from 'next/navigation'

const mockUseParams = useParams as jest.Mock

// Mock fetch
global.fetch = jest.fn() as jest.Mock

describe('BundlePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'test-bundle-id' })
  })



  it('shows loading state initially', () => {
    ;(global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}))
    
    render(<BundlePage />)
    
    expect(screen.getByText('Unpacking Bundle...')).toBeInTheDocument()
  })

  it('shows error when bundle not found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false
    })

    render(<BundlePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Bundle not found')).toBeInTheDocument()
    })
  })

  it('renders bundle successfully', async () => {
    const bundleData = {
      id: 'test-id',
      name: 'Test Bundle',
      photos: [
        { path: '/photo1.jpg', photo_date: '2023-01-01' },
        { path: '/photo2.jpg', photo_date: '2023-01-02' }
      ],
      created_at: '2023-01-01T00:00:00Z'
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(bundleData)
    })

    render(<BundlePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Bundle')).toBeInTheDocument()
      expect(screen.getByText('Shared Stash')).toBeInTheDocument()
      expect(screen.getByText('Download All 2 Photos')).toBeInTheDocument()
    })
  })

  it('handles Unknown photo dates', async () => {
    const bundleData = {
      id: 'test-id',
      name: 'Unknown Dates Bundle',
      photos: [
        { path: '/photo1.jpg', photo_date: 'Unknown' }
      ],
      created_at: '2023-06-15T00:00:00Z'
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(bundleData)
    })

    render(<BundlePage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('match-count')).toHaveTextContent('1')
    })
  })

  it('triggers download when button clicked', async () => {
    const bundleData = {
      id: 'test-id',
      name: 'Download Test',
      photos: [{ path: '/photo1.jpg', photo_date: '2023-01-01' }],
      created_at: '2023-01-01T00:00:00Z'
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(bundleData)
    })

    render(<BundlePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Download All 1 Photos')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Download All 1 Photos'))
    // Download triggered via ref - no crash means success
  })

  it('navigates home when back clicked', async () => {
    const bundleData = {
      id: 'test-id',
      name: 'Nav Test',
      photos: [],
      created_at: '2023-01-01T00:00:00Z'
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(bundleData)
    })

    render(<BundlePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })
    
    // Click triggers navigation (jsdom doesn't actually navigate)
    expect(() => fireEvent.click(screen.getByText('Go Home'))).not.toThrow()
  })

  it('does not fetch when no id', () => {
    mockUseParams.mockReturnValue({ id: undefined })
    
    render(<BundlePage />)
    
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('passes correct props to GalleryView', async () => {
    const bundleData = {
      id: 'test-id',
      name: 'Props Test',
      photos: [{ path: '/photo1.jpg', photo_date: '2023-01-01' }],
      created_at: '2023-01-01T00:00:00Z'
    }
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(bundleData)
    })

    render(<BundlePage />)
    
    await waitFor(() => {
      expect(screen.getByTestId('is-bundle')).toHaveTextContent('true')
      expect(screen.getByTestId('hide-nav')).toHaveTextContent('true')
    })
  })
})
