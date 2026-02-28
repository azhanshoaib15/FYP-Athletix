import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserData {
    name: string;
    email: string;
    gender: 'Male' | 'Female' | null;
    age: string;
    height: string;
    weight: string;
    fitnessGoal: 'Lose Weight' | 'Build Muscle' | 'Stay Fit' | 'Improve Endurance' | null;
}

interface UserState {
    userData: UserData;
    isAuthenticated: boolean;
}

const initialState: UserState = {
    userData: {
        name: '',
        email: '',
        gender: null,
        age: '',
        height: '',
        weight: '',
        fitnessGoal: null,
    },
    isAuthenticated: false,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserData: (state, action: PayloadAction<Partial<UserData>>) => {
            state.userData = { ...state.userData, ...action.payload };
        },
        setGender: (state, action: PayloadAction<'Male' | 'Female'>) => {
            state.userData.gender = action.payload;
        },
        setPersonalInfo: (state, action: PayloadAction<{ age: string; height: string; weight: string }>) => {
            state.userData.age = action.payload.age;
            state.userData.height = action.payload.height;
            state.userData.weight = action.payload.weight;
        },
        setFitnessGoal: (state, action: PayloadAction<'Lose Weight' | 'Build Muscle' | 'Stay Fit' | 'Improve Endurance'>) => {
            state.userData.fitnessGoal = action.payload;
        },
        setAuthentication: (state, action: PayloadAction<boolean>) => {
            state.isAuthenticated = action.payload;
        },
        clearUserData: (state) => {
            state.userData = initialState.userData;
            state.isAuthenticated = false;
        },
    },
});

export const {
    setUserData,
    setGender,
    setPersonalInfo,
    setFitnessGoal,
    setAuthentication,
    clearUserData,
} = userSlice.actions;

export default userSlice.reducer;
