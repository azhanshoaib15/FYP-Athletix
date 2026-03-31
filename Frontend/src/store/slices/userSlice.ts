import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
    accessToken: string | null;
    refreshToken: string | null;
    userId: number | null;
    email: string | null;
    username: string | null;
    gender: string | null;
    age: number | null;
    height_cm: number | null;
    weight_kg: number | null;
    fitness_goal: string | null;
    fitness_level: string | null;
    isProfileComplete: boolean;
}

const initialState: UserState = {
    accessToken: null,
    refreshToken: null,
    userId: null,
    email: null,
    username: null,
    gender: null,
    age: null,
    height_cm: null,
    weight_kg: null,
    fitness_goal: null,
    fitness_level: null,
    isProfileComplete: false,
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<{ accessToken: string; refreshToken: string; userId: number; email: string; username: string }>) => {
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.userId = action.payload.userId;
            state.email = action.payload.email;
            state.username = action.payload.username;
        },
        setGender: (state, action: PayloadAction<string>) => {
            state.gender = action.payload;
        },
        setPersonalInfo: (state, action: PayloadAction<{ height_cm: number; weight_kg: number }>) => {
            state.height_cm = action.payload.height_cm;
            state.weight_kg = action.payload.weight_kg;
        },
        setFitnessGoal: (state, action: PayloadAction<{ fitness_goal: string; fitness_level: string }>) => {
            state.fitness_goal = action.payload.fitness_goal;
            state.fitness_level = action.payload.fitness_level;
        },
        setProfileComplete: (state, action: PayloadAction<boolean>) => {
            state.isProfileComplete = action.payload;
        },
        logout: (state) => {
            return initialState;
        },
    },
});

export const { setUser, setGender, setPersonalInfo, setFitnessGoal, setProfileComplete, logout } = userSlice.actions;
export default userSlice.reducer;
