import {
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { getToken, removeToken } from "../../features/auth/authStorage";
import { getMe } from "../../features/me/meService";
import type { MeResponse } from "../../features/me/types";
import { AuthContext, type AuthContextValue } from "./AuthContext";

type AuthProviderProps = {
    children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<MeResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = !!user;

    function logout() {
        removeToken();
        setUser(null);
    }

    async function refreshUser() {
        const token = getToken();

        if (!token) {
            setUser(null);
            setIsLoading(false);
            return null;
        }

        try {
            const me = await getMe();
            setUser(me);
            return me;
        } catch {
            removeToken();
            setUser(null);
            return null;
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void refreshUser();
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
