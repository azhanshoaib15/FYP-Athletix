import apiClient from "./apiClient";
export const dietApi = {
    getFoodItems: (token: string) => apiClient.get<any>("/api/v1/diet/food-items", token),
    getPlans: (token: string) => apiClient.get<any>("/api/v1/diet/plans", token),
    getTodayNutrition: (token: string) => apiClient.get<any>("/api/v1/diet/today-nutrition", token),
};
