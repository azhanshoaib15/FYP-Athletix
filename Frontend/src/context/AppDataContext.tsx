// ── src/context/AppDataContext.tsx ───────────────────────────────────────────
// Global data store — single source of truth for all screens
// When data updates here, EVERY screen using it updates simultaneously

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

const API_URL = "https://fyp-athletix-production.up.railway.app";

interface AppData {
    // Profile
    weight_kg:              number | null;
    height_cm:              number | null;
    body_fat_percentage:    number | null;
    fitness_goal:           string;
    fitness_level:          string;
    daily_calorie_target:   number | null;
    protein_target_g:       number | null;
    carbs_target_g:         number | null;
    fat_target_g:           number | null;
    weekly_workout_days:    number | null;
    workout_duration_minutes: number | null;
    diet_type:              string;
    gender:                 string;
    date_of_birth:          string | null;
    created_at:             string | null;
    // Progress stats
    streak_days:            number;
    xp_points:              number;
    total_workouts:         number;
    // Progress records
    progress:               any[];
    sessions:               any[];
    // Loading
    loading:                boolean;
    lastUpdated:            number;
}

interface AppDataContextType {
    data: AppData;
    refresh: () => Promise<void>;
    refreshSilent: () => Promise<void>;
}

const defaultData: AppData = {
    weight_kg: null, height_cm: null, body_fat_percentage: null,
    fitness_goal: "general_fitness", fitness_level: "beginner",
    daily_calorie_target: null, protein_target_g: null,
    carbs_target_g: null, fat_target_g: null,
    weekly_workout_days: null, workout_duration_minutes: null,
    diet_type: "standard", gender: "male", date_of_birth: null, created_at: null,
    streak_days: 0, xp_points: 0, total_workouts: 0,
    progress: [], sessions: [], loading: true, lastUpdated: 0,
};

const AppDataContext = createContext<AppDataContextType>({
    data: defaultData,
    refresh: async () => {},
    refreshSilent: async () => {},
});

export const AppDataProvider = ({ children }: { children: React.ReactNode }) => {
    const token = useSelector((state: RootState) => state.user.accessToken);
    const [data, setData] = useState<AppData>(defaultData);

    const fetchAll = useCallback(async (showLoading = true) => {
        if (!token) { setData(d => ({ ...d, loading: false })); return; }
        if (showLoading) setData(d => ({ ...d, loading: true }));
        try {
            const h = { Authorization: `Bearer ${token}` };
            const [profRes, progRes, latRes, sessRes] = await Promise.all([
                fetch(`${API_URL}/api/v1/users/me/profile`,    { headers: h }),
                fetch(`${API_URL}/api/v1/progress/?limit=30`,  { headers: h }),
                fetch(`${API_URL}/api/v1/progress/latest`,     { headers: h }),
                fetch(`${API_URL}/api/v1/workouts/sessions`,   { headers: h }),
            ]);

            const [prof, prog, lat, sess] = await Promise.all([
                profRes.ok ? profRes.json() : {},
                progRes.ok ? progRes.json() : [],
                latRes.ok  ? latRes.json()  : null,
                sessRes.ok ? sessRes.json() : [],
            ]);

            const progArr  = Array.isArray(prog) ? prog : [];
            const sessArr  = Array.isArray(sess) ? sess : [];
            const progWkts = progArr.filter((p: any) => (p.workouts_completed || 0) > 0).length;
            const totalWkts = sessArr.length + progWkts;

            // Auto-estimate body fat if missing
            let bf = prof?.body_fat_percentage || lat?.body_fat_percentage || null;
            if (!bf && prof?.weight_kg && prof?.height_cm) {
                const bmi = prof.weight_kg / Math.pow(prof.height_cm / 100, 2);
                const age = prof.date_of_birth
                    ? Math.floor((Date.now() - new Date(prof.date_of_birth).getTime()) / (1000*60*60*24*365.25))
                    : 25;
                const isFemale = prof.gender === "female" ? 1 : 0;
                bf = Math.round(Math.max(5, Math.min(50,
                    (1.20 * bmi) + (0.23 * age) - (10.8 * (1 - isFemale)) - 5.4
                )) * 10) / 10;
            }

            setData({
                weight_kg:               lat?.weight_kg   || prof?.weight_kg   || null,
                height_cm:               prof?.height_cm  || null,
                body_fat_percentage:     bf,
                fitness_goal:            prof?.fitness_goal           || "general_fitness",
                fitness_level:           prof?.fitness_level          || "beginner",
                daily_calorie_target:    prof?.daily_calorie_target   || null,
                protein_target_g:        prof?.protein_target_g       || null,
                carbs_target_g:          prof?.carbs_target_g         || null,
                fat_target_g:            prof?.fat_target_g           || null,
                weekly_workout_days:     prof?.weekly_workout_days    || null,
                workout_duration_minutes:prof?.workout_duration_minutes || null,
                diet_type:               prof?.diet_type              || "standard",
                gender:                  prof?.gender                 || "male",
                date_of_birth:           prof?.date_of_birth          || null,
                created_at:              prof?.created_at             || null,
                streak_days:             lat?.streak_days             || 0,
                xp_points:               lat?.xp_points               || 0,
                total_workouts:          totalWkts,
                progress:                progArr,
                sessions:                sessArr,
                loading:                 false,
                lastUpdated:             Date.now(),
            });
        } catch (_) {
            setData(d => ({ ...d, loading: false }));
        }
    }, [token]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    return (
        <AppDataContext.Provider value={{
            data,
            refresh:       () => fetchAll(true),
            refreshSilent: () => fetchAll(false),
        }}>
            {children}
        </AppDataContext.Provider>
    );
};

// Hook to use app data in any screen
export const useAppData = () => useContext(AppDataContext);