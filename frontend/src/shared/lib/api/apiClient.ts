import { getToken } from "../../../features/auth/authStorage";
import { API_BASE_URL } from "./config";

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    auth?: boolean;
};

export async function apiRequest<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const { method = "GET", body, auth = false } = options;

    const headers = new Headers({
        "Content-Type": "application/json",
    });

    if (auth) {
        const token = getToken();

        if (!token) {
            throw new Error("Usuario nao autenticado.");
        }

        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

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
