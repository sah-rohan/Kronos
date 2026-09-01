export const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
export const useApi = Boolean(API_URL);
export const useClerk = Boolean(CLERK_KEY);

/**
 * Dev-only canned API data. See `src/dev/fixtures.ts`.
 *
 * Double-gated on purpose: the flag alone is not enough, every use site also
 * checks `import.meta.env.DEV`. Vite substitutes that with the literal `false`
 * in a production build, so the branch — and the dynamic import of the fixture
 * module inside it — is dropped by the bundler. Setting VITE_FIXTURES in a
 * production build therefore does nothing rather than silently serving fake data
 * to real users.
 */
export const useFixtures = import.meta.env.VITE_FIXTURES === "1";
