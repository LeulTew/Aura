import { render, screen, fireEvent } from '@testing-library/react';
import CameraConnect from '../../src/components/CameraConnect';
import '@testing-library/jest-dom';

// Mock hook
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockTrigger = jest.fn();

jest.mock('../../src/hooks/useCamera', () => ({
  useCamera: jest.fn(() => ({
    status: 'disconnected',
    cameraName: null,
    batteryLevel: null,
    error: null,
    logs: [],
    connect: mockConnect,
    disconnect: mockDisconnect,
    triggerCapture: mockTrigger
  }))
}));

import { useCamera } from '../../src/hooks/useCamera';

describe('CameraConnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders connect button when disconnected', () => {
    render(<CameraConnect />);
    expect(screen.getByText('Establish Link')).toBeInTheDocument();
  });

  it('calls connect on button click', () => {
    render(<CameraConnect />);
    fireEvent.click(screen.getByText('Establish Link'));
    expect(mockConnect).toHaveBeenCalled();
  });

  it('renders camera details when connected', () => {
    (useCamera as jest.Mock).mockReturnValue({
      status: 'connected',
      cameraName: 'Sony A7IV',
      batteryLevel: 85,
      error: null,
      logs: [],
      connect: mockConnect,
      disconnect: mockDisconnect,
      triggerCapture: mockTrigger
    });

    render(<CameraConnect />);
    expect(screen.getByText('Sony A7IV')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });
});
