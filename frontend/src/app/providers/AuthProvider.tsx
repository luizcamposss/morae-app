import {
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { getToken, removeToken } from "../../features/auth/authStorage";
import { logout as logoutSession } from "../../features/auth/authService";
import { refreshAccessToken, SessionExpiredError } from "../../shared/lib/api/apiClient";
import { getMe } from "../../features/me/meService";
import type { MeResponse } from "../../features/me/types";
import { AuthContext, type AuthContextValue } from "./AuthContext";

type AuthProviderProps = {
    children: ReactNode;
};

// The logged-in user, or null. Never touches React state, so the effect only applies the result.
async function loadSessionUser(): Promise<MeResponse | null> {
    // No access token stored: the refresh-token cookie may still hold a valid session.
    const token = getToken() ?? (await refreshAccessToken());

    if (!token) {
        return null;
    }

    try {
        return await getMe();
    } catch (error) {
        // Only an expired session logs the user out; a network error or an API restart must not.
        if (error instanceof SessionExpiredError) {
            removeToken();
        }

        return null;
    }
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<MeResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user;

    function logout() {
        // Revoke the session on the server; the local logout happens even if that request fails.
        void logoutSession().catch(() => undefined);
        removeToken();
        setUser(null);
    }

    async function refreshUser() {
        const me = await loadSessionUser();
        setUser(me);
        setIsLoading(false);
        return me;
    }

    useEffect(() => {
        void loadSessionUser().then((me) => {
            setUser(me);
            setIsLoading(false);
        });
    }, []);

    const value: AuthContextValue = {
        user,
        isAuthenticated,
        isLoading,
        logout,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
