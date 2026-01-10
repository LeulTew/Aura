import React from 'react';
import '@testing-library/jest-dom';

// Mocks for ESM modules that fail to transform
jest.mock('yet-another-react-lightbox', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'lightbox' })
}));

jest.mock('react-photo-album', () => ({
  __esModule: true,
  RowsPhotoAlbum: () => React.createElement('div', { 'data-testid': 'photo-album' }),
  PhotoAlbum: () => React.createElement('div', { 'data-testid': 'photo-album' })
}));

jest.mock('react-webcam', () => ({
  __esModule: true,
  default: React.forwardRef((props, ref) => React.createElement('div', { 'data-testid': 'webcam' }))
}));
global.URL.createObjectURL = jest.fn(); global.URL.revokeObjectURL = jest.fn();
