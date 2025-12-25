import {create} from 'zustand'
import {User} from "@/lib/auth/session";

export interface Token {
    token: string;
    expiresAt: number;
}

export interface SessionState {
    user: User | null

    isLoading: boolean
    loadingPromise: Promise<User | null> | null
    updateSession: () => Promise<void>

    /**
     * Current access token information, or null if not logged in or not yet loaded.
     * The access token is fetched on demand and cached here.
     *
     * Use getValidAccessToken() to ensure the token is loaded and valid.
     */
    token: Token | null
    tokenPromise: Promise<Token | null> | null

    /**
     * Returns a valid access token, or null if the user is not logged in.
     */
    getValidAccessToken: () => Promise<string | null>
    clearSession: () => void;
}

const DEFAULT_TOKEN_EXPIRY_BUFFER = 10_000; // 10 seconds

export const useSessionStore = create<SessionState>((set, get) => ({
    user: null,
    isLoading: false,
    loadingPromise: null,

    token: null,
    tokenPromise: null,

    updateSession: async () => {
        // If there's an ongoing fetch, wait for it
        if (get().isLoading) {
            try {
                await get().loadingPromise;
            } catch {}
            return;
        }

        set({ isLoading: true });
        const callPromise = fetch("/api/auth/me")
            .then(res => res.json() as Promise<{ user: User }>)
            .then(data => data.user)
            .catch(() => null);


        set({ loadingPromise: callPromise });
        const user = await callPromise;

        if(user == null) {
            get().clearSession();
            return
        }

        set({
            user: user,
            isLoading: false,
            loadingPromise: null
        });
    },

    getValidAccessToken: async () => {
        const { token, tokenPromise, clearSession } = get();

        const now = Date.now();
        if (token && (token.expiresAt - DEFAULT_TOKEN_EXPIRY_BUFFER > now)) {
            return token.token;
        }

        // If there's an ongoing fetch, wait for it
        if (tokenPromise) {
            try {
                const t = await tokenPromise;
                return t?.token ?? null;
            } catch {
                clearSession();
                return null;
            }
        }

        const fetchToken = async (): Promise<Token | null> => {
            const res = await fetch("/api/auth/token", {
                method: "POST"
            });

            if (!res.ok) {
                if(res.status == 401) return null
                console.error("Token fetch failed:", res.status);
                return null
            }

            const { token, expires } = (await res.json()) as { token: string; expires: number };

            if (!token) {
                throw new Error("Token response missing token");
            }

            return { token, expiresAt: expires * 1000 };
        };

        try {
            const p = fetchToken();
            set({ tokenPromise: p });

            const result = await p;
            set({
                token: result,
                tokenPromise: null
            });

            return result?.token ?? null;
        } catch (err) {
            console.error("Token fetch failed:", err);
            clearSession();
            return null;
        }
    },

    clearSession: () => set({
        user: null,
        token: null,
        tokenPromise: null,
        isLoading: false,
        loadingPromise: null
    }),
}));
