import "@testing-library/jest-dom";

// Polyfills for jsdom
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;