'use client';

import { createContext, useContext, useEffect, useState, useSyncExternalStore, useMemo } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Empty subscribe function for useSyncExternalStore
const emptySubscribe = () => () => {};

// Hook to detect if we're on the client
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // Client snapshot
    () => false   // Server snapshot
  );
}

// Get initial theme from localStorage or system preference
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('aura-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  // Apply theme to DOM and save to localStorage
  useEffect(() => {
    if (!isClient) return;
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('aura-theme', theme);
  }, [theme, isClient]);

  const toggleTheme = useMemo(() => () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // During SSR, render nothing to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
