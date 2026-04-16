import { Platform } from "react-native";
const getApiUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
    if (Platform.OS === "android") return "http://10.0.2.2:8000";
    return "http://localhost:8000";
};
const API_URL = getApiUrl();
class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) { super(message); this.status = status; }
}
async function request<T>(endpoint: string, options: RequestInit = {}, token?: string): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new ApiError(error.detail || "Request failed", response.status);
    }
    return response.json();
}
export const apiClient = {
    get: <T>(endpoint: string, token?: string) => request<T>(endpoint, { method: "GET" }, token),
    post: <T>(endpoint: string, body: unknown, token?: string) => request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }, token),
    put: <T>(endpoint: string, body: unknown, token?: string) => request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }, token),
    patch: <T>(endpoint: string, body: unknown, token?: string) => request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }, token),
    delete: <T>(endpoint: string, token?: string) => request<T>(endpoint, { method: "DELETE" }, token),
};
export { ApiError };
export default apiClient;
