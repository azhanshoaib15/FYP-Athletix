import apiClient from "./apiClient";
export interface RegisterPayload { email: string; username: string; password: string; }
export interface LoginPayload { email: string; password: string; }
export interface TokenResponse { access_token: string; refresh_token: string; token_type: string; expires_in: number; }
export interface UserOut { id: number; email: string; username: string; is_active: boolean; is_verified: boolean; created_at: string; }
export interface UserProfilePayload { first_name?: string; last_name?: string; gender?: string; date_of_birth?: string; height_cm?: number; weight_kg?: number; fitness_goal?: string; fitness_level?: string; diet_type?: string; weekly_workout_days?: number; workout_duration_minutes?: number; country?: string; }
export const authApi = {
    register: (payload: RegisterPayload) => apiClient.post<UserOut>("/api/v1/auth/register", payload),
    login: (payload: LoginPayload) => apiClient.post<TokenResponse>("/api/v1/auth/login", payload),
    getMe: (token: string) => apiClient.get<UserOut>("/api/v1/auth/me", token),
    getProfile: (token: string) => apiClient.get<UserProfilePayload>("/api/v1/users/me/profile", token),
    updateProfile: (payload: UserProfilePayload, token: string) => apiClient.put<UserProfilePayload>("/api/v1/users/me/profile", payload, token),
};
