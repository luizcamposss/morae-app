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
            const message =
                typeof errorBody?.message === "string"
                    ? errorBody.message
                    : "Erro ao comunicar com a API.";

            throw new Error(message);
        }

        throw new Error("Erro ao comunicar com a API.");
    }

    if (!isJsonResponse) {
        throw new Error("Resposta invalida da API.");
    }

    return response.json() as Promise<T>;
}