// FIX: Add global declarations for third-party libraries included via script tags.
declare global {
  const XLSX: any;
  interface Window {
    jspdf: any;
  }
}

export {};
