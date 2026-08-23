import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia; some Tailwind color-scheme queries hit
// it inadvertently. A minimal shim keeps tests quiet.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
