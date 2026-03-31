import apiClient from "./apiClient";
export const workoutApi = {
    getExercises: (token: string) => apiClient.get<any>("/api/v1/workouts/exercises", token),
    getPlans: (token: string) => apiClient.get<any>("/api/v1/workouts/plans", token),
    getPlan: (planId: number, token: string) => apiClient.get<any>(`/api/v1/workouts/plans/${planId}`, token),
    startSession: (token: string) => apiClient.post<any>("/api/v1/workouts/sessions", {}, token),
    getHistory: (token: string) => apiClient.get<any>("/api/v1/workouts/sessions/history", token),
};
