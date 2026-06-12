import apiClient from "./apiClient";
export const chatApi = {
    getSessions: (token: string) => apiClient.get<any>("/api/v1/chat/sessions", token),
    createSession: (token: string) => apiClient.post<any>("/api/v1/chat/sessions", {}, token),
    sendMessage: (sessionId: number, content: string, token: string) => apiClient.post<any>(`/api/v1/chat/sessions/${sessionId}/messages`, { content }, token),
};
