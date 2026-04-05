const isBrowser = typeof window !== "undefined";

if (isBrowser) {
  throw new Error("This module is server-only and cannot be imported from the browser bundle.");
}

export {};
