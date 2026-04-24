import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine, VictoryPie, VictoryTheme } from 'victory-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const screenWidth = Dimensions.get('window').width;
const API_URL = 'https://fyp-athletix-production.up.railway.app';

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
    const [showLogForm, setShowLogForm] = useState(false);
    const [inputWeight, setInputWeight] = useState('');
    const [inputBodyFat, setInputBodyFat] = useState('');
    const [logging, setLogging] = useState(false);

    useEffect(() => { fetchAllData(); }, []);

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

            const prog = Array.isArray(progressData) ? progressData : [];
            setProgress(prog);
            setSessions(Array.isArray(sessionsData) ? sessionsData : []);
            if (prog.length > 0) setLatest(prog[0]);

            // Auto-estimate body fat if missing (Deurenberg formula)
            let finalProfile = profileData;
            if (profileData && !profileData.body_fat_percentage &&
                profileData.weight_kg && profileData.height_cm) {
                const w = profileData.weight_kg;
                const h = profileData.height_cm / 100;
                const age = profileData.date_of_birth
                    ? Math.floor((Date.now() - new Date(profileData.date_of_birth).getTime()) / (1000*60*60*24*365.25))
                    : 25;
                const bmi = w / (h * h);
                const sex = profileData.gender === 'female' ? 0 : 1;
                const bf = Math.round((1.20 * bmi + 0.23 * age - 10.8 * sex - 5.4) * 10) / 10;
                if (bf > 0 && bf < 60) {
                    // Save estimated body fat to backend
                    try {
                        await fetch(`${API_URL}/api/v1/progress/`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ weight_kg: w, body_fat_percentage: bf }),
                        });
                        finalProfile = { ...profileData, body_fat_percentage: bf };
                        // Re-fetch progress to include new record
                        const newProg = await fetch(`${API_URL}/api/v1/progress/?limit=30`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const newProgData = await newProg.json();
                        const newProgArr = Array.isArray(newProgData) ? newProgData : [];
                        setProgress(newProgArr);
                        if (newProgArr.length > 0) setLatest(newProgArr[0]);
                    } catch (_) {}
                }
            }
            setProfile(finalProfile);

            // Pre-fill log form with latest progress or profile values
            const latestRec = Array.isArray(progressData) && progressData.length > 0 ? progressData[0] : null;
            if (latestRec?.weight_kg) setInputWeight(String(latestRec.weight_kg));
            else if (finalProfile?.weight_kg) setInputWeight(String(finalProfile.weight_kg));

            // Auto-calculate body fat from BMI (Deurenberg formula) if never recorded
            const existingBF = latestRec?.body_fat_percentage || finalProfile?.body_fat_percentage;
            if (existingBF) {
                setInputBodyFat(String(existingBF));
            } else if (finalProfile?.weight_kg && finalProfile?.height_cm) {
                const bmi = finalProfile.weight_kg / Math.pow(finalProfile.height_cm / 100, 2);
                const isFemale = finalProfile.gender === 'female' ? 1 : 0;
                const ageYears = finalProfile.date_of_birth
                    ? Math.floor((Date.now() - new Date(finalProfile.date_of_birth).getTime()) / (1000*60*60*24*365.25))
                    : 25;
                const bf = (1.20 * bmi) + (0.23 * ageYears) - (10.8 * (1 - isFemale)) - 5.4;
                const bfRounded = Math.round(Math.max(5, Math.min(50, bf)) * 10) / 10;
                setInputBodyFat(String(bfRounded));
            }
        } catch (e) {
            console.error('Progress fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    const logTodayProgress = async () => {
        if (!inputWeight && !inputBodyFat) {
            Alert.alert('Error', 'Please enter at least your weight');
            return;
        }
        setLogging(true);
        try {
            const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
            const res = await fetch(`${API_URL}/api/v1/progress/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    weight_kg: inputWeight ? parseFloat(inputWeight) : null,
                    body_fat_percentage: inputBodyFat ? parseFloat(inputBodyFat) : null,
                    notes: 'Logged from app',
                }),
            });
            if (res.ok) {
                setShowLogForm(false);
                setInputWeight('');
                setInputBodyFat('');
                await fetchAllData();
                Alert.alert('Success', 'Progress logged! Charts updated.');
            } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Error', err.detail || 'Failed to log progress');
            }
        } catch (e) {
            Alert.alert('Error', 'Connection error');
        } finally {
            setLogging(false);
        }
    };

    // Build weekly workout chart data
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

    // Build weight trend with proper date labels
    const buildWeightData = () => {
        const filtered = progress.filter((p: any) => p.weight_kg && p.weight_kg > 0);
        if (filtered.length === 0) return null;
        return filtered.slice(0, 7).reverse().map((p: any) => {
            const d = new Date(p.recorded_at);
            const label = d.getDate() + "/" + (d.getMonth()+1);
            return { x: label, y: Math.round(parseFloat(p.weight_kg) * 10) / 10 };
        });
    };

    const getWeightDomain = (data: any[]) => {
        const weights = data.map((d: any) => d.y);
        const mn = Math.min(...weights);
        const mx = Math.max(...weights);
        const pad = Math.max(3, (mx - mn) * 0.3 + 1);
        return [Math.floor(mn - pad), Math.ceil(mx + pad)] as [number, number];
    };

    // Build macro data
    const buildMacroData = () => {
        const protein = profile?.protein_target_g || 120;
        const carbs = profile?.carbs_target_g || 180;
        const fat = profile?.fat_target_g || 60;
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

    // Get display values
    const currentWeight = latest?.weight_kg || profile?.weight_kg || null;
    const currentHeight = profile?.height_cm || null;
    const currentBodyFat = latest?.body_fat_percentage || profile?.body_fat_percentage || null;
    const streak = latest?.streak_days || 0;
    const xp = latest?.xp_points || 0;
    const totalWorkouts = sessions.length;

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#800000" />
                <Text style={{ color: '#FFF', marginTop: 10 }}>Loading progress...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('dashboard')}>
                <Text style={styles.backButtonText}>{'< Back'}</Text>
            </TouchableOpacity>

            <Text style={styles.header}>My Progress</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{totalWorkouts}</Text>
                    <Text style={styles.statLabel}>Workouts</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{streak}</Text>
                    <Text style={styles.statLabel}>Day Streak 🔥</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{xp}</Text>
                    <Text style={styles.statLabel}>XP Points ⭐</Text>
                </View>
            </View>

            {/* Current Stats */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Current Stats</Text>
                <View style={styles.currentStatsRow}>
                    <View style={styles.currentStat}>
                        <Text style={styles.currentStatValue}>
                            {currentWeight ? `${currentWeight}` : '--'}
                        </Text>
                        <Text style={styles.currentStatLabel}>Weight (kg)</Text>
                    </View>
                    <View style={styles.currentStat}>
                        <Text style={styles.currentStatValue}>
                            {currentHeight ? `${currentHeight}` : '--'}
                        </Text>
                        <Text style={styles.currentStatLabel}>Height (cm)</Text>
                    </View>
                    <View style={styles.currentStat}>
                        <Text style={styles.currentStatValue}>
                            {currentBodyFat ? `${currentBodyFat}%` : '--'}
                        </Text>
                        <Text style={styles.currentStatLabel}>Body Fat</Text>
                    </View>
                </View>

                {/* Log Progress Form */}
                {showLogForm ? (
                    <View style={styles.logForm}>
                        <Text style={styles.logFormTitle}>Log Today's Measurements</Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.inputLabel}>Weight (kg):</Text>
                            <TextInput
                                style={styles.input}
                                value={inputWeight}
                                onChangeText={setInputWeight}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 75.5"
                                placeholderTextColor="#666"
                            />
                        </View>
                        <View style={styles.inputRow}>
                            <Text style={styles.inputLabel}>Body Fat (%):</Text>
                            <TextInput
                                style={styles.input}
                                value={inputBodyFat}
                                onChangeText={setInputBodyFat}
                                keyboardType="decimal-pad"
                                placeholder="e.g. 18.0"
                                placeholderTextColor="#666"
                            />
                        </View>
                        <View style={styles.logFormBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLogForm(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={logTodayProgress} disabled={logging}>
                                {logging ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.logButton} onPress={() => setShowLogForm(true)}>
                        <Text style={styles.logButtonText}>+ Log Today's Progress</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Weekly Workouts Bar Chart */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Weekly Workouts</Text>
                {sessions.length === 0 ? (
                    <Text style={styles.emptyText}>No workout sessions yet. Start working out!</Text>
                ) : (
                    <VictoryChart
                        theme={VictoryTheme.material}
                        width={screenWidth - 60}
                        height={200}
                        padding={{ top: 20, bottom: 40, left: 40, right: 20 }}
                        domainPadding={{ x: 20 }}
                    >
                        <VictoryAxis style={{ axis: { stroke: '#FFF' }, tickLabels: { fill: '#FFF', fontSize: 12 }, grid: { stroke: 'none' } }} />
                        <VictoryAxis dependentAxis tickFormat={(t) => Math.round(t)} style={{ axis: { stroke: '#FFF' }, tickLabels: { fill: '#FFF', fontSize: 12 }, grid: { stroke: '#333', strokeDasharray: '4,4' } }} />
                        <VictoryBar data={weeklyData} style={{ data: { fill: '#6A040F' } }} cornerRadius={{ top: 5 }} />
                    </VictoryChart>
                )}
            </View>

            {/* Weight Trend Line Chart */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Weight Trend (kg)</Text>
                {!weightData ? (
                    <View>
                        <Text style={styles.emptyText}>No weight data yet.</Text>
                        <Text style={styles.emptySubText}>Tap "Log Today's Progress" above to start tracking!</Text>
                    </View>
                ) : (
                    <VictoryChart
                        theme={VictoryTheme.material}
                        width={screenWidth - 60}
                        height={200}
                        padding={{ top: 20, bottom: 40, left: 60, right: 20 }}
                        domain={{ y: getWeightDomain(weightData) }}
                    >
                        <VictoryAxis
                            style={{ axis: { stroke: '#FFF' }, tickLabels: { fill: '#FFF', fontSize: 10 }, grid: { stroke: 'none' } }}
                        />
                        <VictoryAxis
                            dependentAxis
                            tickCount={5}
                            tickFormat={(t) => `${Math.round(t)}kg`}
                            style={{ axis: { stroke: '#FFF' }, tickLabels: { fill: '#FFF', fontSize: 10 }, grid: { stroke: '#333', strokeDasharray: '4,4' } }}
                        />
                        <VictoryLine
                            data={weightData}
                            style={{ data: { stroke: '#800000', strokeWidth: 3 } }}
                            interpolation="monotoneX"
                        />
                    </VictoryChart>
                )}
            </View>

            {/* Macro Targets Pie Chart */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Macro Targets</Text>
                <View style={styles.macrosContainer}>
                    <View style={styles.macrosTextContainer}>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#800000' }]} />
                            <Text style={styles.macroText}>Protein {macroData[0].y}%</Text>
                            <Text style={styles.macroGrams}>{profile?.protein_target_g || '--'}g</Text>
                        </View>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#6A040F' }]} />
                            <Text style={styles.macroText}>Carbs {macroData[1].y}%</Text>
                            <Text style={styles.macroGrams}>{profile?.carbs_target_g || '--'}g</Text>
                        </View>
                        <View style={styles.macroRow}>
                            <View style={[styles.macroDot, { backgroundColor: '#501313' }]} />
                            <Text style={styles.macroText}>Fat {macroData[2].y}%</Text>
                            <Text style={styles.macroGrams}>{profile?.fat_target_g || '--'}g</Text>
                        </View>
                        <Text style={styles.calorieText}>
                            🎯 Target: {profile?.daily_calorie_target || '--'} kcal/day
                        </Text>
                    </View>
                    <View style={styles.pieContainer}>
                        <VictoryPie
                            data={macroData}
                            colorScale={['#800000', '#6A040F', '#501313']}
                            innerRadius={55}
                            width={140}
                            height={140}
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
                                <Text style={styles.sessionDate}>{new Date(s.started_at).toLocaleDateString()}</Text>
                                <Text style={styles.sessionTime}>{new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                            <View style={styles.sessionStats}>
                                <Text style={styles.sessionStat}>{s.duration_minutes ? `${s.duration_minutes} min` : 'In progress'}</Text>
                                {s.overall_form_score && <Text style={styles.sessionForm}>Form: {Math.round(s.overall_form_score * 100)}%</Text>}
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Fitness Profile */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Fitness Profile</Text>
                {[
                    ['Goal', profile?.fitness_goal?.replace('_', ' ') || '--'],
                    ['Level', profile?.fitness_level || '--'],
                    ['Workout Days/Week', profile?.weekly_workout_days || '--'],
                    ['Session Duration', profile?.workout_duration_minutes ? `${profile.workout_duration_minutes} min` : '--'],
                    ['Diet Type', profile?.diet_type || '--'],
                ].map(([label, value], i) => (
                    <View key={i} style={styles.goalRow}>
                        <Text style={styles.goalLabel}>{label}:</Text>
                        <Text style={styles.goalValue}>{value}</Text>
                    </View>
                ))}
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
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
    statCard: { flex: 1, backgroundColor: '#111111', borderRadius: 15, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#8B2F3F' },
    statNumber: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
    statLabel: { color: '#AAAAAA', fontSize: 11, marginTop: 4, textAlign: 'center' },
    card: { backgroundColor: '#111111', borderRadius: 20, padding: 15, marginVertical: 10, elevation: 5 },
    cardTitle: { fontWeight: '700', fontSize: 18, color: '#FFFFFF', marginBottom: 12 },
    currentStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
    currentStat: { alignItems: 'center' },
    currentStatValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
    currentStatLabel: { color: '#AAAAAA', fontSize: 12, marginTop: 4 },
    logButton: { backgroundColor: '#8B2F3F', borderRadius: 20, padding: 12, alignItems: 'center' },
    logButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    logForm: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 15, marginTop: 5 },
    logFormTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginBottom: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    inputLabel: { color: '#AAAAAA', fontSize: 13, width: 110 },
    input: { flex: 1, backgroundColor: '#333', color: '#FFF', borderRadius: 8, padding: 8, fontSize: 14 },
    logFormBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
    cancelBtn: { flex: 1, backgroundColor: '#333', borderRadius: 20, padding: 10, alignItems: 'center' },
    cancelBtnText: { color: '#AAA', fontWeight: '600' },
    saveBtn: { flex: 1, backgroundColor: '#8B2F3F', borderRadius: 20, padding: 10, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '600' },
    emptyText: { color: '#666666', fontSize: 14, textAlign: 'center', padding: 15, fontStyle: 'italic' },
    emptySubText: { color: '#555555', fontSize: 12, textAlign: 'center', paddingBottom: 15, fontStyle: 'italic' },
    macrosContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    macrosTextContainer: { flex: 1 },
    macroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    macroDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    macroText: { fontWeight: '600', fontSize: 14, color: '#FFFFFF', flex: 1 },
    macroGrams: { color: '#AAAAAA', fontSize: 12 },
    calorieText: { color: '#AAAAAA', fontSize: 12, marginTop: 5 },
    pieContainer: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center' },
    pieCenterText: { position: 'absolute', fontWeight: '700', fontSize: 20, color: '#FFFFFF' },
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