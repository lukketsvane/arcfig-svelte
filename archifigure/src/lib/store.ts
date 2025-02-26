// src/lib/store.ts
import { writable, derived } from 'svelte/store';
import type { Project, ProjectModel, SavedModel, Prediction, PendingSubmission } from './utils';
import { isAuthenticated } from './utils';
import { browser } from '$app/environment';

// Authentication
export const authenticated = writable<boolean>(isAuthenticated());

// Theme
export const theme = writable<'light' | 'dark'>(
  browser && (localStorage.getItem('color-theme') === 'dark' || 
  (!localStorage.getItem('color-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) 
  ? 'dark' : 'light'
);

// Initialize theme
export function initTheme() {
  if (!browser) return;
  
  const setTheme = (value: 'light' | 'dark') => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(value);
    localStorage.setItem('color-theme', value);
  };
  
  // Initial setup
  theme.subscribe(value => {
    if (!browser) return;
    setTheme(value);
  });
  
  // Watch for system changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const updateTheme = (e: MediaQueryListEvent) => {
    if (!localStorage.getItem('color-theme')) {
      theme.set(e.matches ? 'dark' : 'light');
    }
  };
  
  mediaQuery.addEventListener('change', updateTheme);
  return () => mediaQuery.removeEventListener('change', updateTheme);
}

// App state
export const currentProjectId = writable<string | null>(null);
export const projects = writable<Project[]>([]);
export const selectedModel = writable<{url: string; inputImage?: string; resolution?: number} | null>(null);
export const pendingSubmissions = writable<PendingSubmission[]>([]);
export const isDarkMode = derived(theme, $theme => $theme === 'dark');
