import { getToken, removeToken, saveToken } from "../../../features/auth/authStorage";
import { API_BASE_URL } from "./config";

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    auth?: boolean;
    // Sends cookies (needed by /api/auth, where the refresh-token cookie lives).
    withCredentials?: boolean;
};

// Thrown when the session cannot be renewed; the user has been sent to the login page.
export class SessionExpiredError extends Error {
    constructor() {
        super("Sua sessão expirou. Entre novamente.");
        this.name = "SessionExpiredError";
    }
}

let refreshPromise: Promise<string | null> | null = null;

// Gets a new access token with the refresh-token cookie. Parallel callers share one request,
// because the server rotates the refresh token on every use.
export function refreshAccessToken(): Promise<string | null> {
    if (!refreshPromise) {
        refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
        })
            .then(async (response) => {
                if (!response.ok) {
                    return null;
                }

                const body = await response.json();
                return typeof body?.token === "string" ? body.token : null;
            })
            .catch(() => null)
            .then((token) => {
                if (token) {
                    saveToken(token);
                }

                return token;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }

    return refreshPromise;
}

function expireSession(): never {
    removeToken();

    if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login?expired=1");
    }

    throw new SessionExpiredError();
}

export async function apiRequest<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const { method = "GET", body, auth = false, withCredentials = false } = options;

    async function send(token: string | null) {
        const headers = new Headers({
            "Content-Type": "application/json",
        });

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        return fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            credentials: withCredentials ? "include" : "same-origin",
        });
    }

    let token: string | null = null;

    if (auth) {
        token = getToken() ?? (await refreshAccessToken());

        if (!token) {
            expireSession();
        }
    }

    let response = await send(token);

    // The access token is short-lived: renew it once and repeat the request.
    if (response.status === 401 && auth) {
        const renewedToken = await refreshAccessToken();

        if (!renewedToken) {
            expireSession();
        }

        response = await send(renewedToken);

        if (response.status === 401) {
            expireSession();
        }
    }

    const contentType = response.headers.get("Content-Type");

    const isJsonResponse = contentType?.includes("application/json");

    if (!response.ok) {
        if (isJsonResponse) {
            const errorBody = await response.json();
            const validationMessage = getValidationMessage(errorBody);
            const message =
                validationMessage ||
                (typeof errorBody?.message === "string"
                    ? errorBody.message
                    : "Erro ao comunicar com a API.");

            throw new Error(message);
        }

        if (response.status === 404) {
            throw new Error("Endpoint não encontrado na API. Reinicie o backend e tente novamente.");
        }

        if (response.status === 401) {
            throw new Error("Sessão expirada. Faça login novamente.");
        }

        if (response.status === 403) {
            throw new Error("Você não tem permissão para acessar este recurso.");
        }

        throw new Error(`Erro ao comunicar com a API. Status ${response.status}.`);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    if (!isJsonResponse) {
        throw new Error("Resposta invalida da API.");
    }

    return response.json() as Promise<T>;
}

function getValidationMessage(errorBody: unknown) {
    if (!errorBody || typeof errorBody !== "object") {
        return "";
    }

    const errors = (errorBody as { errors?: Record<string, string[]> }).errors;

    if (!errors) {
        return "";
    }

    const firstError = Object.values(errors).flat()[0];

    return typeof firstError === "string" ? firstError : "";
}
