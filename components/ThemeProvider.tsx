'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | null; // null means use system preference

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(null);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage for manual override
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
      setResolvedTheme(savedTheme);
    } else {
      // Use system preference
      const systemTheme = getSystemTheme();
      setResolvedTheme(systemTheme);
    }
  }, []);

  // Watch for system theme changes when using system preference
  useEffect(() => {
    if (!mounted || theme !== null) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial resolved theme
    setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    // Always apply a class based on resolved theme
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [resolvedTheme, mounted]);

  const toggleTheme = () => {
    if (!mounted) return;
    setTheme((prev) => {
      if (prev === null) {
        // Currently using system, switch to opposite of current resolved theme
        const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
        setResolvedTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        return newTheme;
      } else if (prev === 'light') {
        setResolvedTheme('dark');
        localStorage.setItem('theme', 'dark');
        return 'dark';
      } else {
        setResolvedTheme('light');
        localStorage.setItem('theme', 'light');
        return 'light';
      }
    });
  };

  // Always provide context, even before mounting
  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

