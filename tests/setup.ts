import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

// jsdom matchMedia mock
const listeners = new Set<(e: MediaQueryListEvent) => void>();
window.matchMedia = (query: string): MediaQueryList => {
  const mql = {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: (event: string, cb: EventListenerOrEventListenerObject) => {
      if (event === 'change') listeners.add(cb as (e: MediaQueryListEvent) => void);
    },
    removeEventListener: (event: string, cb: EventListenerOrEventListenerObject) => {
      if (event === 'change') listeners.delete(cb as (e: MediaQueryListEvent) => void);
    },
    addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  return mql;
};
