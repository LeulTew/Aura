import { render, screen } from '@testing-library/react';
import Page from '../../src/app/page';
import '@testing-library/jest-dom';

// Mock Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
    h1: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
    p: ({ children, className }: any) => <p className={className}>{children}</p>,
  }
}));

// Mock Shadcn UI
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, className }: any) => <button className={className}>{children}</button>
}));
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>
}));

describe('Landing Page', () => {
  it('renders correctly', () => {
    render(<Page />);
    expect(screen.getByText('Scan my face')).toBeInTheDocument();
    expect(screen.getByText("I'm a Photographer")).toBeInTheDocument();
  });
});
