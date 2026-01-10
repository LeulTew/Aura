/* eslint-disable */ 
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScanPage from '../../../../src/app/guest/scan/page';
import '@testing-library/jest-dom';

// Mocks
jest.mock('react-webcam', () => ({
  __esModule: true,
  default: ({ onUserMedia }: any) => {
    setTimeout(() => onUserMedia && onUserMedia(), 100);
    return <div data-testid="webcam" />;
  }
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

jest.mock('framer-motion', () => ({
  motion: {
     div: ({ children, className }: any) => <div className={className}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ onClick, children }: any) => <button onClick={onClick}>{children}</button>
}));

global.fetch = jest.fn();

describe('Guest Scan Page', () => {
  it('renders webcam interaction', async () => {
    render(<ScanPage />);
    expect(screen.getByText('Use Camera')).toBeInTheDocument();
    
    // Simulate Click
    fireEvent.click(screen.getByText('Use Camera'));
    
    // Wait for "Scanning"
    await waitFor(() => {
       expect(screen.getByText('Analyzing Face...')).toBeInTheDocument();
    });
  });
});
