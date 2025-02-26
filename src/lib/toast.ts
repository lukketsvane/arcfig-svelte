// src/lib/toast.ts
import { browser } from '$app/environment';

const noop = () => {};

// Default toast object safe for SSR
export const toast = {
  success: browser ? noop : (message: string) => console.log(`Success: ${message}`),
  error: browser ? noop : (message: string) => console.log(`Error: ${message}`),
  info: browser ? noop : (message: string) => console.log(`Info: ${message}`),
  warning: browser ? noop : (message: string) => console.log(`Warning: ${message}`)
};

if (browser) {
  import('sonner').then(module => {
    Object.assign(toast, module.toast);
  });
}
  