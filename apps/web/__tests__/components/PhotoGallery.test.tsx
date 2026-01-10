import { render, screen } from '@testing-library/react';
import PhotoGallery from '../../src/components/PhotoGallery';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  db: {
    photos: {
      orderBy: jest.fn().mockReturnThis(),
      reverse: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockReturnThis(),
    }
  }
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="icon-check" />,
  Clock: () => <div data-testid="icon-clock" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
}));

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

import { useLiveQuery } from 'dexie-react-hooks';

describe('PhotoGallery', () => {
  it('renders loading/empty state initially', () => {
    (useLiveQuery as jest.Mock).mockReturnValue([]);
    render(<PhotoGallery />);
    expect(screen.getByText('No photos captured yet.')).toBeInTheDocument();
  });

  it('renders photos when present', () => {
    const mockPhotos = [
      { id: '1', thumbnailBlob: new Blob(), status: 'synced', createdAt: new Date() },
      { id: '2', thumbnailBlob: new Blob(), status: 'pending', createdAt: new Date() }
    ];
    (useLiveQuery as jest.Mock).mockReturnValue(mockPhotos);

    render(<PhotoGallery />);
    // Check if photos are rendered (images present)
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(screen.getByTestId('icon-check')).toBeInTheDocument(); // Synced
    expect(screen.getByTestId('icon-clock')).toBeInTheDocument(); // Pending
  });
});
