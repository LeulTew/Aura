import { render, fireEvent } from '@testing-library/react'
import ScannerButton from '@/components/ScannerButton'

describe('ScannerButton', () => {
  it('renders correctly', () => {
    const { container } = render(<ScannerButton />)
    expect(container.querySelector('.scanner-container')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    const { container } = render(<ScannerButton onClick={handleClick} />)
    const buttonDiv = container.querySelector('.scanner-container')
    fireEvent.click(buttonDiv!)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('triggers animation styles on click', () => {
     const { container } = render(<ScannerButton />)
     const buttonDiv = container.querySelector('.scanner-container')
     
     jest.useFakeTimers()
     fireEvent.click(buttonDiv!)
     
     jest.runAllTimers()
     jest.useRealTimers()
  })
})
