import apiClient from "./apiClient";
export const progressApi = {
    getRecords: (token: string) => apiClient.get<any>("/api/v1/progress/records", token),
    addRecord: (payload: any, token: string) => apiClient.post<any>("/api/v1/progress/records", payload, token),
    updateRecord: (id: number, payload: any, token: string) => apiClient.patch<any>(`/api/v1/progress/records/${id}`, payload, token),
    deleteRecord: (id: number, token: string) => apiClient.delete<any>(`/api/v1/progress/records/${id}`, token),
};
