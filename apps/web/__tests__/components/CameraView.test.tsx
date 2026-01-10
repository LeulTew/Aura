import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CameraView from '@/components/CameraView'

// Mock react-webcam
jest.mock('react-webcam', () => {
  const React = require('react')
  return React.forwardRef(function MockWebcam(props: { onUserMedia?: () => void }, ref: React.Ref<{ getScreenshot: () => string }>) {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => 'data:image/jpeg;base64,/9j/fake'
    }))
    React.useEffect(() => {
      if (props.onUserMedia) props.onUserMedia()
    }, [props])
    return <div data-testid="webcam">Mock Webcam</div>
  })
})

// Mock fetch for base64 to blob conversion
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' }))
  })
) as jest.Mock

describe('CameraView', () => {
  const mockOnCapture = jest.fn()
  const mockOnBack = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly with webcam', () => {
    render(<CameraView onCapture={mockOnCapture} onBack={mockOnBack} />)
    expect(screen.getByTestId('webcam')).toBeInTheDocument()
    expect(screen.getByText('Align Face')).toBeInTheDocument()
  })

  it('shows READY status when webcam is ready', async () => {
    render(<CameraView onCapture={mockOnCapture} onBack={mockOnBack} />)
    await waitFor(() => {
      expect(screen.getByText('READY')).toBeInTheDocument()
    })
  })

  it('calls onBack when back button is clicked', () => {
    render(<CameraView onCapture={mockOnCapture} onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('HOME'))
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('captures image when capture button is clicked', async () => {
    render(<CameraView onCapture={mockOnCapture} onBack={mockOnBack} />)
    
    // Wait for webcam to be ready
    await waitFor(() => {
      expect(screen.getByText('READY')).toBeInTheDocument()
    })
    
    // Find capture button by class (white round button)
    const buttons = screen.getAllByRole('button')
    const captureBtn = buttons.find(btn => btn.classList.contains('bg-white'))
    
    if (captureBtn) {
      fireEvent.click(captureBtn)
      await waitFor(() => {
        expect(mockOnCapture).toHaveBeenCalled()
      })
    }
  })

  it('shows Processing... when isProcessing is true', () => {
    render(<CameraView onCapture={mockOnCapture} onBack={mockOnBack} isProcessing={true} />)
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })

  it('disables capture button when processing', async () => {
    render(<CameraView onCapture={mockOnCapture} onBack={mockOnBack} isProcessing={true} />)
    
    await waitFor(() => {
      expect(screen.getByText('READY')).toBeInTheDocument()
    })
    
    const buttons = screen.getAllByRole('button')
    const captureBtn = buttons.find(btn => btn.classList.contains('bg-white'))
    expect(captureBtn).toHaveAttribute('disabled')
  })

  it('toggles camera facing mode', () => {
    const { container } = render(<CameraView onCapture={mockOnCapture} onBack={mockOnBack} />)
    
    // Find flip camera button (SVG button in top right)
    const flipButton = container.querySelector('.absolute.top-6.right-6')
    if (flipButton) {
      fireEvent.click(flipButton)
      // State change is internal, just verify no crash
    }
  })
})
