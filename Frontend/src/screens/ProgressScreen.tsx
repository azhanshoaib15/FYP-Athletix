import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine, VictoryPie, VictoryTheme } from 'victory-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const screenWidth = Dimensions.get('window').width;
const API_URL = 'https://fyp-athletix-production.up.railway.app';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ProgressScreenProps {
    onNavigate: (screen: any) => void;
}

export default function ProgressScreen({ onNavigate }: ProgressScreenProps) {
    const token = useSelector((state: RootState) => state.user.accessToken);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [latest, setLatest] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [logWeight, setLogWeight] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };

            const [progressRes, profileRes, sessionsRes] = await Promise.all([
                fetch(`${API_URL}/api/v1/progress/?limit=30`, { headers }),
                fetch(`${API_URL}/api/v1/users/me/profile`, { headers }),
                fetch(`${API_URL}/api/v1/workouts/sessions`, { headers }),
            ]);

            const progressData = await progressRes.json();
            const profileData = await profileRes.json();
            const sessionsData = await sessionsRes.json();

            setProgress(Array.isArray(progressData) ? progressData : []);
            setProfile(profileData);
            setSessions(Array.isArray(sessionsData) ? sessionsData : []);
            if (Array.isArray(progressData) && progressData.length > 0) {
                setLatest(progressData[0]);
            }
        } catch (e) {
            console.error('Progress fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    const logTodayProgress = async () => {
        try {
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            };
            await fetch(`${API_URL}/api/v1/progress/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    weight_kg: profile?.weight_kg || null,
                    body_fat_percentage: profile?.body_fat_percentage || null,
                    notes: 'Logged from app',
                }),
            });
            fetchAllData();
        } catch (e) {
            console.error('Log progress error:', e);
        }
    };

    // Build weekly workout data from sessions
    const buildWeeklyData = () => {
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const counts = [0, 0, 0, 0, 0, 0, 0];
        const now = new Date();
        sessions.forEach((s: any) => {
            const d = new Date(s.started_at);
            const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
            if (diff < 7) {
                const dayIndex = d.getDay();
                const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                counts[mappedIndex]++;
            }
        });
        return days.map((x, i) => ({ x, y: counts[i] }));
    };

    // Build weight trend data
    const buildWeightData = () => {
        if (progress.length === 0) return [{ x: 1, y: 0 }];
        return progress
            .slice(0, 7)
            .reverse()
            .map((p: any, i: number) => ({
                x: i + 1,
                y: p.weight_kg || 0,
            }))
            .filter((d: any) => d.y > 0);
    };

    // Build macro data from profile
    const buildMacroData = () => {
        const protein = profile?.protein_target_g || 150;
        const carbs = profile?.carbs_target_g || 200;
        const fat = profile?.fat_target_g || 65;
        const total = protein + carbs + fat;
        return [
            { x: 'Protein', y: Math.round((protein / total) * 100) },
            { x: 'Carbs', y: Math.round((carbs / total) * 100) },
            { x: 'Fat', y: Math.round((fat / total) * 100) },
        ];
    };

    const weeklyData = buildWeeklyData();
    const weightData = buildWeightData();
    const macroData = buildMacroData();

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#800000" />
                <Text style={{ color: '#FFFFFF', marginTop: 10 }}>Loading progress...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('dashboard')}>
                <Text style={styles.backButtonText}>{'< Back'}</Text>
            </TouchableOpacity>

            <Text style={styles.header}>My Progress</Text>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{sessions.length}</Text>
                    <Text style={styles.statLabel}>Workouts</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{latest?.streak_days || 0}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{latest?.xp_points || 0}</Text>
                    <Text style={styles.statLabel}>XP Points</Text>
                </View>
            </View>

            {/* Current Stats */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Current Stats</Text>
                <View style={styles.currentStatsRow}>
                    <View style={styles.currentStat}>
                        <Text style={styles.currentStatValue}>{profile?.weight_kg || '--'}</Text>
                        <Text style={styles.currentStatLabel}>Weight (kg)</Text>
                    </View>
                    <View style={styles.currentStat}>
                        <Text style={styles.currentStatValue}>{profile?.height_cm || '--'}</Text>
                        <Text style={styles.currentStatLabel}>Height (cm)</Text>
                    </View>
                    <View style={styles.currentStat}>
                        <Text style={styles.currentStatValue}>{profile?.body_fat_percentage || '--'}</Text>
                        <Text style={styles.currentStatLabel}>Body Fat %</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.logButton} onPress={logTodayProgress}>
                    <Text style={styles.logButtonText}>+ Log Today's Progress</Text>
                </TouchableOpacity>
            </View>

            {/* Weekly Activity */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Weekly Workouts</Text>
                {sessions.length === 0 ? (
                    <Text style={styles.emptyText}>No workout sessions yet. Start working out!</Text>
                ) : (
                    <VictoryChart
                        theme={VictoryTheme.material}
                        width={screenWidth - 60}
                        height={220}
                        padding={{ top: 20, bottom: 40, left: 40, right: 40 }}
                        domainPadding={{ x: 20 }}
                    >
                        <VictoryAxis style={{ axis: { stroke: '#FFFFFF' }, tickLabels: { fill: '#FFFFFF', fontSize: 12 }, grid: { stroke: 'none' } }} />
                        <VictoryAxis dependentAxis style={{ axis: { stroke: '#FFFFFF' }, tickLabels: { fill: '#FFFFFF', fontSize: 12 }, grid: { stroke: '#333333', strokeDasharray: '4,4' } }} />
                        <VictoryBar data={weeklyData} style={{ data: { fill: '#6A040F' } }} cornerRadius={{ top: 5 }} />
                    </VictoryChart>
                )}
            </View>

            {/* Weight Trend */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Weight Trend</Text>
                {progress.filter((p: any) => p.weight_kg).length === 0 ? (
                    <Text style={styles.emptyText}>No weight data yet. Log your progress!</Text>
                ) : (
                    <VictoryChart
                        theme={VictoryTheme.material}
                        width={screenWidth - 60}
                        height={220}
                        padding={{ top: 20, bottom: 40, left: 50, right: 40 }}
                    >
                        <VictoryAxis style={{ axis: { stroke: '#FFFFFF' }, tickLabels: { fill: '#FFFFFF', fontSize: 12 }, grid: { stroke: 'none' } }} />
                        <VictoryAxis dependentAxis style={{ axis: { stroke: '#FFFFFF' }, tickLabels: { fill: '#FFFFFF', fontSize: 12 }, grid: { stroke: '#333333', strokeDasharray: '4,4' } }} />
                        <VictoryLine data={weightData} style={{ data: { stroke: '#800000', strokeWidth: 3 } }} />
                    </VictoryChart>
                )}
            </View>

            {/* Macro Targets */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Macro Targets</Text>
                <View style={styles.macrosContainer}>
                    <View style={styles.macrosTextContainer}>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#800000' }]} />
                            <Text style={styles.macroText}>Protein {macroData[0].y}%</Text>
                        </View>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#6A040F' }]} />
                            <Text style={styles.macroText}>Carbs {macroData[1].y}%</Text>
                        </View>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#501313' }]} />
                            <Text style={styles.macroText}>Fat {macroData[2].y}%</Text>
                        </View>
                        <Text style={styles.calorieText}>
                            Target: {profile?.daily_calorie_target || '--'} kcal/day
                        </Text>
                    </View>
                    <View style={styles.pieContainer}>
                        <VictoryPie
                            data={macroData}
                            colorScale={['#800000', '#6A040F', '#501313']}
                            innerRadius={60}
                            width={150}
                            height={150}
                            padding={0}
                            labels={() => null}
                        />
                        <Text style={styles.pieCenterText}>{macroData[0].y}%</Text>
                    </View>
                </View>
            </View>

            {/* Recent Workouts */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent Workouts</Text>
                {sessions.length === 0 ? (
                    <Text style={styles.emptyText}>No workouts logged yet.</Text>
                ) : (
                    sessions.slice(0, 5).map((s: any, i: number) => (
                        <View key={i} style={styles.sessionRow}>
                            <View>
                                <Text style={styles.sessionDate}>
                                    {new Date(s.started_at).toLocaleDateString()}
                                </Text>
                                <Text style={styles.sessionTime}>
                                    {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            <View style={styles.sessionStats}>
                                <Text style={styles.sessionStat}>
                                    {s.duration_minutes ? `${s.duration_minutes} min` : 'In progress'}
                                </Text>
                                {s.overall_form_score && (
                                    <Text style={styles.sessionForm}>
                                        Form: {Math.round(s.overall_form_score * 100)}%
                                    </Text>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Fitness Goal */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Fitness Profile</Text>
                <View style={styles.goalRow}>
                    <Text style={styles.goalLabel}>Goal:</Text>
                    <Text style={styles.goalValue}>{profile?.fitness_goal?.replace('_', ' ') || '--'}</Text>
                </View>
                <View style={styles.goalRow}>
                    <Text style={styles.goalLabel}>Level:</Text>
                    <Text style={styles.goalValue}>{profile?.fitness_level || '--'}</Text>
                </View>
                <View style={styles.goalRow}>
                    <Text style={styles.goalLabel}>Workout Days/Week:</Text>
                    <Text style={styles.goalValue}>{profile?.weekly_workout_days || '--'}</Text>
                </View>
                <View style={styles.goalRow}>
                    <Text style={styles.goalLabel}>Session Duration:</Text>
                    <Text style={styles.goalValue}>{profile?.workout_duration_minutes ? `${profile.workout_duration_minutes} min` : '--'}</Text>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    contentContainer: { padding: 20, paddingBottom: 50 },
    backButton: { marginBottom: 20, marginTop: 40, padding: 10, backgroundColor: '#501313', borderRadius: 20, alignSelf: 'flex-start' },
    backButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
    header: { fontWeight: '700', fontSize: 28, color: '#FFFFFF', marginBottom: 20, marginLeft: 10 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    statCard: { flex: 1, backgroundColor: '#111111', borderRadius: 15, padding: 15, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#8B2F3F' },
    statNumber: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
    statLabel: { color: '#AAAAAA', fontSize: 12, marginTop: 4 },
    card: { backgroundColor: '#111111', borderRadius: 20, padding: 15, marginVertical: 10, elevation: 5 },
    cardTitle: { fontWeight: '700', fontSize: 18, color: '#FFFFFF', marginBottom: 10, marginLeft: 10 },
    currentStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
    currentStat: { alignItems: 'center' },
    currentStatValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
    currentStatLabel: { color: '#AAAAAA', fontSize: 12, marginTop: 4 },
    logButton: { backgroundColor: '#8B2F3F', borderRadius: 20, padding: 10, alignItems: 'center' },
    logButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    emptyText: { color: '#666666', fontSize: 14, textAlign: 'center', padding: 20, fontStyle: 'italic' },
    macrosContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10 },
    macrosTextContainer: { flex: 1 },
    macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    macroDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    macroText: { fontWeight: '600', fontSize: 16, color: '#FFFFFF' },
    calorieText: { color: '#AAAAAA', fontSize: 13, marginTop: 5 },
    pieContainer: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center' },
    pieCenterText: { position: 'absolute', fontWeight: '700', fontSize: 24, color: '#FFFFFF' },
    sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222222' },
    sessionDate: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    sessionTime: { color: '#AAAAAA', fontSize: 12 },
    sessionStats: { alignItems: 'flex-end' },
    sessionStat: { color: '#FFFFFF', fontSize: 14 },
    sessionForm: { color: '#00CC66', fontSize: 12, marginTop: 2 },
    goalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#222222' },
    goalLabel: { color: '#AAAAAA', fontSize: 14 },
    goalValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
});