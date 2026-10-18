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

// Sends the request, adding the access token and renewing it once on 401.
async function sendRequest(path: string, options: RequestOptions): Promise<Response> {
    const { method = "GET", body, auth = false, withCredentials = false } = options;
    // FormData (file uploads) goes as is: the browser sets the multipart Content-Type and boundary.
    const isFormData = body instanceof FormData;

    async function send(token: string | null) {
        const headers = new Headers();

        if (!isFormData) {
            headers.set("Content-Type", "application/json");
        }

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        return fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: isFormData ? body : body ? JSON.stringify(body) : undefined,
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

    if (!response.ok) {
        await throwResponseError(response);
    }

    return response;
}

async function throwResponseError(response: Response): Promise<never> {
    if (response.headers.get("Content-Type")?.includes("application/json")) {
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
        // The API also answers 404 for things the user may not see (docs/ai/api.md).
        throw new Error("Não encontramos o que você procura. Pode ter sido removido ou não estar disponível para você.");
    }

    if (response.status === 401) {
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (response.status === 403) {
        throw new Error("Você não tem permissão para acessar este recurso.");
    }

    if (response.status === 413) {
        throw new Error("O arquivo é grande demais para enviar.");
    }

    throw new Error(`Erro ao comunicar com a API. Status ${response.status}.`);
}

export async function apiRequest<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const response = await sendRequest(path, options);

    if (response.status === 204) {
        return undefined as T;
    }

    if (!response.headers.get("Content-Type")?.includes("application/json")) {
        throw new Error("Resposta invalida da API.");
    }

    return response.json() as Promise<T>;
}

// Authenticated file as a Blob, e.g. to show a photo with URL.createObjectURL.
export async function apiBlob(path: string): Promise<Blob> {
    const response = await sendRequest(path, { auth: true });
    return response.blob();
}

// Authenticated file download: protected files cannot be opened by a plain link,
// so the file comes as a blob and is saved through a temporary URL.
export async function apiDownload(path: string, fallbackFileName: string): Promise<void> {
    const response = await sendRequest(path, { auth: true });
    const blob = await response.blob();
    const fileName = getFileName(response.headers.get("Content-Disposition")) ?? fallbackFileName;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Give the browser time to start the download before releasing the URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Reads the name from Content-Disposition, preferring the UTF-8 form (filename*=UTF-8''...).
function getFileName(contentDisposition: string | null) {
    if (!contentDisposition) {
        return null;
    }

    const encoded = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

    if (encoded) {
        try {
            return decodeURIComponent(encoded);
        } catch {
            // Falls back to the plain filename below.
        }
    }

    return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1] ?? null;
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
