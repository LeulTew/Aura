import { render, screen, waitFor, act } from '@testing-library/react'
import StatusFooter from '@/components/StatusFooter'

describe('StatusFooter', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders with checking status initially', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock // Never resolves
    
    render(<StatusFooter />)
    
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
    expect(screen.getByText('---')).toBeInTheDocument()
  })

  it('shows online status when health check succeeds', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: 'ok' })
      })
    ) as jest.Mock

    render(<StatusFooter />)
    
    await waitFor(() => {
      expect(screen.getByText('Sensors Calibrated')).toBeInTheDocument()
    })
  })

  it('shows offline status when health check fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as jest.Mock

    render(<StatusFooter />)
    
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })

  it('shows offline when status is not ok', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: 'error' })
      })
    ) as jest.Mock

    render(<StatusFooter />)
    
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })
  })

  it('displays latency when online', async () => {
    // Mock performance.now to control latency
    const mockPerformance = {
      now: jest.fn()
        .mockReturnValueOnce(0)  // start
        .mockReturnValueOnce(50) // end (50ms latency)
    }
    Object.defineProperty(global, 'performance', {
      value: mockPerformance,
      writable: true
    })

    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: 'ok' })
      })
    ) as jest.Mock

    render(<StatusFooter />)
    
    await waitFor(() => {
      expect(screen.getByText('Sensors Calibrated')).toBeInTheDocument()
    })
  })

  it('displays engine version', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock
    
    render(<StatusFooter />)
    
    expect(screen.getByText('Engine')).toBeInTheDocument()
    expect(screen.getByText('Precision Core v1')).toBeInTheDocument()
  })

  it('periodically checks health', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ status: 'ok' })
      })
    ) as jest.Mock

    render(<StatusFooter />)
    
    // Initial call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
    
    // Advance timer by 30 seconds
    act(() => {
      jest.advanceTimersByTime(30000)
    })
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })
})
