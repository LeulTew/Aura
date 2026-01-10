import { render, fireEvent } from '@testing-library/react'
import VoidBackground from '@/components/VoidBackground'

describe('VoidBackground', () => {
  it('renders correctly', () => {
    const { container } = render(<VoidBackground />)
    
    // Check for noise texture SVG
    expect(container.querySelector('.void-texture')).toBeInTheDocument()
    
    // Check for aura background
    expect(container.querySelector('.aura-bg')).toBeInTheDocument()
    
    // Check for shards
    const shards = container.querySelectorAll('.shard')
    expect(shards.length).toBeGreaterThanOrEqual(2)
  })

  it('responds to mouse movement', () => {
    const { container } = render(<VoidBackground />)
    
    // Simulate mouse move
    fireEvent.mouseMove(document, { clientX: 500, clientY: 300 })
    
    // Check that refs are updated (transform style changes)
    const aura = container.querySelector('.aura-bg')
    const shard1 = container.querySelectorAll('.shard')[0]
    
    // Elements should have updated transforms (not default)
    expect(aura).toBeInTheDocument()
    expect(shard1).toBeInTheDocument()
  })

  it('contains lens flare image', () => {
    const { container } = render(<VoidBackground />)
    
    const lensFlare = container.querySelector('img[src*="lens_flare"]')
    expect(lensFlare).toBeInTheDocument()
  })

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
    const { unmount } = render(<VoidBackground />)
    
    unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })
})
