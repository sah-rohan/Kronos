export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
export const useClerk = Boolean(CLERK_KEY);
