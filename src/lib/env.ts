export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
export const useApi = Boolean(API_URL);
export const useClerk = Boolean(CLERK_KEY);

export const useFixtures = import.meta.env.VITE_FIXTURES === "1";
