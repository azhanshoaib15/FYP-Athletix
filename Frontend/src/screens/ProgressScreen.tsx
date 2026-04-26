import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLine, VictoryPie, VictoryTheme } from 'victory-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const SW = Dimensions.get('window').width;
const API_URL = 'https://fyp-athletix-production.up.railway.app';

// ── Helpers ───────────────────────────────────────────────────────────────────

const calcBF = (profile: any): number | null => {
    if (!profile?.weight_kg || !profile?.height_cm) return null;
    const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
    const age = profile.date_of_birth
        ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (1000*60*60*24*365.25))
        : 25;
    const isFemale = profile.gender === 'female' ? 1 : 0;
    const bf = (1.20 * bmi) + (0.23 * age) - (10.8 * (1 - isFemale)) - 5.4;
    const rounded = Math.round(Math.max(5, Math.min(50, bf)) * 10) / 10;
    return rounded;
};

// Recalculate macros from calories burned (exercise calories offset)
const calcUpdatedMacros = (profile: any, caloriesBurned: number) => {
    if (!profile) return null;
    const base = profile.daily_calorie_target || 2500;
    // Add burned calories to daily target (eat more to compensate)
    const adjusted = base + Math.round(caloriesBurned * 0.5); // 50% offset rule
    const protein = profile.protein_target_g || 150;
    const fat     = profile.fat_target_g     || 60;
    const carbsCal = adjusted - (protein * 4) - (fat * 9);
    const carbs   = Math.max(50, Math.round(carbsCal / 4));
    return { protein, fat, carbs, calories: adjusted };
};

export default function ProgressScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const token = useSelector((state: RootState) => state.user.accessToken);

    const [loading,      setLoading]      = useState(true);
    const [progress,     setProgress]     = useState<any[]>([]);
    const [profile,      setProfile]      = useState<any>(null);
    const [latest,       setLatest]       = useState<any>(null);
    const [sessions,     setSessions]     = useState<any[]>([]);
    const [showLogForm,  setShowLogForm]  = useState(false);
    const [inputWeight,  setInputWeight]  = useState('');
    const [inputBodyFat, setInputBodyFat] = useState('');
    const [logging,      setLogging]      = useState(false);

    const fetchAllData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const h = { Authorization: `Bearer ${token}` };
            // Fetch all in parallel - fast
            const [progRes, profRes, sessRes] = await Promise.all([
                fetch(`${API_URL}/api/v1/progress/?limit=30`, { headers: h }),
                fetch(`${API_URL}/api/v1/users/me/profile`,   { headers: h }),
                fetch(`${API_URL}/api/v1/workouts/sessions`,   { headers: h }),
            ]);

            const [progData, profData, sessData] = await Promise.all([
                progRes.json(), profRes.json(), sessRes.json()
            ]);

            const prog = Array.isArray(progData) ? progData : [];
            const sess = Array.isArray(sessData) ? sessData : [];
            const lat  = prog.length > 0 ? prog[0] : null;

            setProgress(prog);
            setSessions(sess);
            setLatest(lat);
            setProfile(profData);

            // Pre-fill inputs with most recent values
            const latestWeight = lat?.weight_kg || profData?.weight_kg;
            const latestBF     = lat?.body_fat_percentage
                || profData?.body_fat_percentage
                || calcBF(profData);

            if (latestWeight) setInputWeight(String(latestWeight));
            if (latestBF)     setInputBodyFat(String(latestBF));

        } catch (e) {
            // silent fail — user sees loading state
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchAllData(); }, []);

    const logTodayProgress = async () => {
        if (!inputWeight && !inputBodyFat) {
            Alert.alert('Error', 'Please enter at least your weight');
            return;
        }
        setLogging(true);
        try {
            const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
            const res = await fetch(`${API_URL}/api/v1/progress/`, {
                method: 'POST', headers: h,
                body: JSON.stringify({
                    weight_kg:          inputWeight  ? parseFloat(inputWeight)  : null,
                    body_fat_percentage: inputBodyFat ? parseFloat(inputBodyFat) : null,
                    notes: 'Logged from app',
                }),
            });
            if (res.ok) {
                setShowLogForm(false);
                // Also update profile weight so it stays in sync
                if (inputWeight && profile) {
                    await fetch(`${API_URL}/api/v1/users/me/profile`, {
                        method: 'PUT', headers: h,
                        body: JSON.stringify({
                            weight_kg:          parseFloat(inputWeight),
                            body_fat_percentage: inputBodyFat ? parseFloat(inputBodyFat) : profile.body_fat_percentage,
                        }),
                    }).catch(() => {});
                }
                await fetchAllData(true);
                Alert.alert('Saved!', 'Progress logged successfully.');
            } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Error', err.detail || 'Failed to log');
            }
        } catch (_) {
            Alert.alert('Error', 'Connection error');
        } finally {
            setLogging(false);
        }
    };

    // ── Chart builders ────────────────────────────────────────────────────────

    // Weekly workout chart — counts sessions + ticked progress logs
    const buildWeeklyData = () => {
        const labels  = ['M','T','W','T','F','S','S'];
        const counts  = [0,0,0,0,0,0,0];
        const now     = new Date();
        // Count from workout sessions
        sessions.forEach((s: any) => {
            const d    = new Date(s.started_at);
            const diff = (now.getTime() - d.getTime()) / 86400000;
            if (diff < 7) {
                const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
                counts[idx]++;
            }
        });
        // Count from progress records with workouts_completed > 0
        progress.forEach((p: any) => {
            if ((p.workouts_completed || 0) > 0) {
                const d    = new Date(p.recorded_at);
                const diff = (now.getTime() - d.getTime()) / 86400000;
                if (diff < 7) {
                    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
                    counts[idx]++;
                }
            }
        });
        return labels.map((x, i) => ({ x, y: counts[i] }));
    };

    // Weight trend — only use records with valid weight, filter outliers
    const buildWeightData = () => {
        const valid = progress
            .filter((p: any) => p.weight_kg && p.weight_kg > 30 && p.weight_kg < 300)
            .slice(0, 10)
            .reverse();
        if (valid.length === 0) return null;
        // Need at least 1 point — add duplicate if only 1 so line renders
        const points = valid.map((p: any) => {
            const d = new Date(p.recorded_at);
            return {
                x: d.getDate() + "/" + (d.getMonth() + 1),
                y: Math.round(parseFloat(p.weight_kg) * 10) / 10,
            };
        });
        if (points.length === 1) {
            // Add a second identical point so line chart renders
            points.push({ ...points[0] });
        }
        return points;
    };

    // Weight domain with outlier protection
    const getWeightDomain = (data: any[]): [number, number] => {
        const weights = data.map((d: any) => d.y);
        // Remove outliers — use median ± 20% range
        const sorted = [...weights].sort((a,b) => a-b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const filtered = weights.filter(w => Math.abs(w - median) < median * 0.3);
        const mn  = filtered.length > 0 ? Math.min(...filtered) : Math.min(...weights);
        const mx  = filtered.length > 0 ? Math.max(...filtered) : Math.max(...weights);
        const pad = Math.max(3, (mx - mn) * 0.3 + 1);
        return [Math.floor(mn - pad), Math.ceil(mx + pad)];
    };

    // Macro pie — from profile, updated when calories burned logged
    const buildMacroData = () => {
        const totalCalBurned = progress
            .filter((p: any) => {
                const d    = new Date(p.recorded_at);
                const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
                return diff < 1; // today only
            })
            .reduce((sum: number, p: any) => sum + (p.total_calories_burned || 0), 0);

        // If calories burned today, show adjusted macros
        const macros = totalCalBurned > 100
            ? calcUpdatedMacros(profile, totalCalBurned)
            : null;

        const protein = macros?.protein || profile?.protein_target_g || 150;
        const carbs   = macros?.carbs   || profile?.carbs_target_g   || 200;
        const fat     = macros?.fat     || profile?.fat_target_g     || 60;
        const total   = protein * 4 + carbs * 4 + fat * 9;

        return {
            slices: [
                { x:'Protein', y: Math.round((protein * 4 / total) * 100) },
                { x:'Carbs',   y: Math.round((carbs   * 4 / total) * 100) },
                { x:'Fat',     y: Math.round((fat     * 9 / total) * 100) },
            ],
            protein, carbs, fat,
            calories: macros?.calories || profile?.daily_calorie_target || 2500,
            adjusted: totalCalBurned > 100,
            burned:   totalCalBurned,
        };
    };

    // ── Derived values (memoized for performance) ─────────────────────────
    const weeklyData  = useMemo(() => buildWeeklyData(),  [sessions, progress]);
    const weightData  = useMemo(() => buildWeightData(),  [progress]);
    const macroResult = useMemo(() => buildMacroData(),   [profile, progress]);
    const hasWorkouts = useMemo(() => {
        const hasSession = sessions.length > 0;
        const hasProgress = progress.some((p: any) => (p.workouts_completed || 0) > 0);
        return weeklyData.some((d: any) => d.y > 0) || hasSession || hasProgress;
    }, [weeklyData, sessions, progress]);

    const currentWeight  = latest?.weight_kg   || profile?.weight_kg   || null;
    const currentHeight  = profile?.height_cm  || null;
    const currentBodyFat = latest?.body_fat_percentage
        || profile?.body_fat_percentage
        || calcBF(profile);
    const streak         = latest?.streak_days || 0;
    const xp             = latest?.xp_points   || 0;
    // Count workouts from BOTH sessions AND progress records with workouts logged
    const progressWkts   = progress.filter((p: any) => (p.workouts_completed || 0) > 0).length;
    const totalWorkouts  = sessions.length + progressWkts;
    const totalCalBurned = progress
        .filter((p: any) => {
            const diff = Math.floor((Date.now() - new Date(p.recorded_at).getTime()) / 86400000);
            return diff < 7;
        })
        .reduce((sum: number, p: any) => sum + (p.total_calories_burned || 0), 0);

    if (loading) {
        return (
            <View style={[st.container, st.center]}>
                <ActivityIndicator size="large" color="#800000"/>
                <Text style={{color:'#FFF',marginTop:10}}>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={st.container} contentContainerStyle={st.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <TouchableOpacity style={st.backBtn} onPress={() => onNavigate('dashboard')}>
                <Text style={st.backTxt}>{'< Back'}</Text>
            </TouchableOpacity>

            <Text style={st.header}>My Progress</Text>

            {/* Stats row */}
            <View style={st.statsRow}>
                <View style={st.statCard}>
                    <Text style={st.statNum}>{totalWorkouts}</Text>
                    <Text style={st.statLbl}>Workouts</Text>
                </View>
                <View style={st.statCard}>
                    <Text style={st.statNum}>{streak}</Text>
                    <Text style={st.statLbl}>Streak</Text>
                </View>
                <View style={st.statCard}>
                    <Text style={st.statNum}>{xp}</Text>
                    <Text style={st.statLbl}>XP</Text>
                </View>
            </View>

            {/* Current stats */}
            <View style={st.card}>
                <Text style={st.cardTitle}>Current Stats</Text>
                <View style={st.statsRow3}>
                    <View style={st.stat3}>
                        <Text style={st.stat3Val}>{currentWeight ?? '--'}</Text>
                        <Text style={st.stat3Lbl}>Weight (kg)</Text>
                    </View>
                    <View style={st.stat3}>
                        <Text style={st.stat3Val}>{currentHeight ?? '--'}</Text>
                        <Text style={st.stat3Lbl}>Height (cm)</Text>
                    </View>
                    <View style={st.stat3}>
                        <Text style={st.stat3Val}>{currentBodyFat ? currentBodyFat + '%' : '--'}</Text>
                        <Text style={st.stat3Lbl}>Body Fat</Text>
                    </View>
                </View>
                {totalCalBurned > 0 && (
                    <View style={st.burnedBadge}>
                        <Text style={st.burnedTxt}>🔥 {Math.round(totalCalBurned)} kcal burned this week</Text>
                    </View>
                )}
                {showLogForm ? (
                    <View style={st.logForm}>
                        <Text style={st.logFormTitle}>Log Today</Text>
                        <View style={st.inputRow}>
                            <Text style={st.inputLbl}>Weight (kg)</Text>
                            <TextInput style={st.input} value={inputWeight} onChangeText={setInputWeight}
                                keyboardType="decimal-pad" placeholder="e.g. 75.5" placeholderTextColor="#666"/>
                        </View>
                        <View style={st.inputRow}>
                            <Text style={st.inputLbl}>Body Fat (%)</Text>
                            <TextInput style={st.input} value={inputBodyFat} onChangeText={setInputBodyFat}
                                keyboardType="decimal-pad" placeholder="e.g. 18.0" placeholderTextColor="#666"/>
                        </View>
                        <View style={st.logBtns}>
                            <TouchableOpacity style={st.cancelBtn} onPress={() => setShowLogForm(false)}>
                                <Text style={st.cancelTxt}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={st.saveBtn} onPress={logTodayProgress} disabled={logging}>
                                {logging
                                    ? <ActivityIndicator color="#FFF" size="small"/>
                                    : <Text style={st.saveTxt}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity style={st.logBtn} onPress={() => setShowLogForm(true)}>
                        <Text style={st.logBtnTxt}>+ Log Today's Progress</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Weekly workouts */}
            <View style={st.card}>
                <Text style={st.cardTitle}>Weekly Workouts</Text>
                {!hasWorkouts ? (
                    <View>
                        <Text style={st.emptyTxt}>No workouts this week yet.</Text>
                        <Text style={st.emptySubTxt}>Complete exercises in the Workout Schedule to see your chart!</Text>
                    </View>
                ) : (
                    <VictoryChart
                        theme={VictoryTheme.material}
                        width={SW - 60} height={200}
                        padding={{ top:20, bottom:40, left:40, right:20 }}
                        domainPadding={{ x:20 }}>
                        <VictoryAxis
                            style={{ axis:{stroke:'#FFF'}, tickLabels:{fill:'#FFF',fontSize:12}, grid:{stroke:'none'} }}/>
                        <VictoryAxis dependentAxis
                            tickCount={4}
                            tickFormat={(t) => Number.isInteger(t) ? t : ''}
                            style={{ axis:{stroke:'#FFF'}, tickLabels:{fill:'#FFF',fontSize:12}, grid:{stroke:'#333',strokeDasharray:'4,4'} }}/>
                        <VictoryBar data={weeklyData}
                            style={{ data:{fill:'#6A040F'} }}
                            cornerRadius={{ top:5 }}/>
                    </VictoryChart>
                )}
            </View>

            {/* Weight trend */}
            <View style={st.card}>
                <Text style={st.cardTitle}>Weight Trend (kg)</Text>
                {!weightData ? (
                    <View>
                        <Text style={st.emptyTxt}>No weight data yet.</Text>
                        <Text style={st.emptySubTxt}>Log your weight above to start tracking.</Text>
                    </View>
                ) : (
                    <VictoryChart
                        theme={VictoryTheme.material}
                        width={SW - 60} height={200}
                        padding={{ top:20, bottom:40, left:60, right:20 }}
                        domain={{ y: getWeightDomain(weightData) }}>
                        <VictoryAxis
                            style={{ axis:{stroke:'#FFF'}, tickLabels:{fill:'#FFF',fontSize:10}, grid:{stroke:'none'} }}/>
                        <VictoryAxis dependentAxis
                            tickCount={5}
                            tickFormat={(t) => Math.round(t) + 'kg'}
                            style={{ axis:{stroke:'#FFF'}, tickLabels:{fill:'#FFF',fontSize:10}, grid:{stroke:'#333',strokeDasharray:'4,4'} }}/>
                        <VictoryLine data={weightData}
                            style={{ data:{stroke:'#800000',strokeWidth:3} }}
                            interpolation="monotoneX"/>
                    </VictoryChart>
                )}
            </View>

            {/* Macro targets */}
            <View style={st.card}>
                <Text style={st.cardTitle}>Macro Targets</Text>
                {macroResult.adjusted && (
                    <View style={st.adjustedBadge}>
                        <Text style={st.adjustedTxt}>
                            Adjusted for {Math.round(macroResult.burned)} kcal burned today
                        </Text>
                    </View>
                )}
                <View style={st.macrosRow}>
                    <View style={st.macrosList}>
                        <View style={st.macroItem}>
                            <View style={[st.dot,{backgroundColor:'#800000'}]}/>
                            <Text style={st.macroTxt}>Protein {macroResult.slices[0].y}%</Text>
                            <Text style={st.macroG}>{macroResult.protein}g</Text>
                        </View>
                        <View style={st.macroItem}>
                            <View style={[st.dot,{backgroundColor:'#6A040F'}]}/>
                            <Text style={st.macroTxt}>Carbs {macroResult.slices[1].y}%</Text>
                            <Text style={st.macroG}>{macroResult.carbs}g</Text>
                        </View>
                        <View style={st.macroItem}>
                            <View style={[st.dot,{backgroundColor:'#501313'}]}/>
                            <Text style={st.macroTxt}>Fat {macroResult.slices[2].y}%</Text>
                            <Text style={st.macroG}>{macroResult.fat}g</Text>
                        </View>
                        <View style={st.calRow}>
                            <Text style={st.calTxt}>Target: {macroResult.calories} kcal/day</Text>
                        </View>
                    </View>
                    <VictoryPie
                        data={macroResult.slices}
                        width={160} height={160}
                        innerRadius={45}
                        colorScale={['#800000','#6A040F','#501313']}
                        labels={[]}
                        style={{ parent:{overflow:'visible'} }}
                        animate={{ duration:500 }}
                    />
                </View>
                {profile?.body_fat_percentage && (
                    <View style={st.bfRow}>
                        <Text style={st.bfTxt}>Body Fat: {profile.body_fat_percentage}%</Text>
                        {profile.weight_kg && profile.height_cm && (
                            <Text style={st.bmiTxt}>
                                BMI: {(profile.weight_kg / Math.pow(profile.height_cm/100,2)).toFixed(1)}
                            </Text>
                        )}
                    </View>
                )}
            </View>

            {/* Fitness profile */}
            <View style={st.card}>
                <Text style={st.cardTitle}>Fitness Profile</Text>
                {[
                    ['Goal',             (profile?.fitness_goal || '--').replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase())],
                    ['Level',            (profile?.fitness_level || '--').replace(/\b\w/g,(c:string)=>c.toUpperCase())],
                    ['Workout Days/Week', profile?.weekly_workout_days ? profile.weekly_workout_days + ' days' : '--'],
                    ['Session Duration',  profile?.workout_duration_minutes ? profile.workout_duration_minutes + ' min' : '--'],
                    ['Diet Type',         (profile?.diet_type || '--').replace(/\b\w/g,(c:string)=>c.toUpperCase())],
                ].map(([label,value]:any) => (
                    <View key={label} style={st.profileRow}>
                        <Text style={st.profileLbl}>{label}</Text>
                        <Text style={st.profileVal}>{value}</Text>
                    </View>
                ))}
            </View>

            {/* Recent workouts */}
            <View style={st.card}>
                <Text style={st.cardTitle}>Recent Workouts</Text>
                {sessions.length === 0 ? (
                    <Text style={st.emptyTxt}>No sessions yet. Start your first workout!</Text>
                ) : (
                    sessions.slice(0,5).map((s: any, i: number) => (
                        <View key={i} style={st.sessionRow}>
                            <View>
                                <Text style={st.sessionDate}>
                                    {new Date(s.started_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                                </Text>
                                <Text style={st.sessionTime}>
                                    {new Date(s.started_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                                </Text>
                            </View>
                            <View style={st.sessionRight}>
                                <Text style={st.sessionStat}>
                                    {s.duration_minutes ? s.duration_minutes + ' min' : 'In progress'}
                                </Text>
                                {s.total_calories_burned > 0 && (
                                    <Text style={st.sessionCal}>{Math.round(s.total_calories_burned)} kcal</Text>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </View>

        </ScrollView>
    );
}

const st = StyleSheet.create({
    container:     { flex:1, backgroundColor:'#000' },
    center:        { justifyContent:'center', alignItems:'center' },
    content:       { padding:16, paddingBottom:60 },
    backBtn:       { marginTop:50, marginBottom:16, padding:10, backgroundColor:'#501313', borderRadius:20, alignSelf:'flex-start' },
    backTxt:       { color:'#FFF', fontWeight:'700', fontSize:15 },
    header:        { fontSize:28, fontWeight:'800', color:'#FFF', marginBottom:16 },
    statsRow:      { flexDirection:'row', gap:10, marginBottom:14 },
    statCard:      { flex:1, backgroundColor:'#1a0505', borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:'#390404' },
    statNum:       { fontSize:24, fontWeight:'800', color:'#FFF' },
    statLbl:       { fontSize:11, color:'#AAA', marginTop:3 },
    card:          { backgroundColor:'#111', borderRadius:16, padding:16, marginBottom:14, borderWidth:1, borderColor:'#222' },
    cardTitle:     { fontSize:17, fontWeight:'700', color:'#FFF', marginBottom:14 },
    statsRow3:     { flexDirection:'row', justifyContent:'space-between', marginBottom:12 },
    stat3:         { alignItems:'center', flex:1 },
    stat3Val:      { fontSize:22, fontWeight:'800', color:'#FFF' },
    stat3Lbl:      { fontSize:11, color:'#888', marginTop:3 },
    burnedBadge:   { backgroundColor:'rgba(255,100,0,0.15)', borderRadius:8, padding:8, alignItems:'center', marginBottom:10, borderWidth:1, borderColor:'rgba(255,100,0,0.3)' },
    burnedTxt:     { color:'#FF8844', fontSize:13, fontWeight:'600' },
    logForm:       { marginTop:8 },
    logFormTitle:  { color:'#FFF', fontWeight:'700', marginBottom:10, fontSize:14 },
    inputRow:      { flexDirection:'row', alignItems:'center', marginBottom:10 },
    inputLbl:      { color:'#AAA', width:110, fontSize:13 },
    input:         { flex:1, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:8, padding:10, color:'#FFF', fontSize:14, borderWidth:1, borderColor:'#333' },
    logBtns:       { flexDirection:'row', gap:10, marginTop:8 },
    cancelBtn:     { flex:1, backgroundColor:'#222', borderRadius:10, padding:12, alignItems:'center' },
    cancelTxt:     { color:'#AAA', fontWeight:'600' },
    saveBtn:       { flex:1, backgroundColor:'#8B2F3F', borderRadius:10, padding:12, alignItems:'center' },
    saveTxt:       { color:'#FFF', fontWeight:'700' },
    logBtn:        { backgroundColor:'#8B2F3F', borderRadius:14, padding:14, alignItems:'center', marginTop:8 },
    logBtnTxt:     { color:'#FFF', fontWeight:'700', fontSize:15 },
    emptyTxt:      { color:'#555', fontSize:13, textAlign:'center', marginVertical:10 },
    emptySubTxt:   { color:'#444', fontSize:11, textAlign:'center', marginBottom:10 },
    macrosRow:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
    macrosList:    { flex:1 },
    macroItem:     { flexDirection:'row', alignItems:'center', marginBottom:10, gap:8 },
    dot:           { width:10, height:10, borderRadius:5 },
    macroTxt:      { color:'#FFF', fontSize:13, flex:1 },
    macroG:        { color:'#AAA', fontSize:12 },
    calRow:        { marginTop:4 },
    calTxt:        { color:'#888', fontSize:12 },
    adjustedBadge: { backgroundColor:'rgba(0,150,0,0.15)', borderRadius:8, padding:8, marginBottom:10, borderWidth:1, borderColor:'rgba(0,200,0,0.25)' },
    adjustedTxt:   { color:'#00CC66', fontSize:12, textAlign:'center' },
    bfRow:         { flexDirection:'row', justifyContent:'space-between', marginTop:10, paddingTop:10, borderTopWidth:1, borderTopColor:'#222' },
    bfTxt:         { color:'#AAA', fontSize:13 },
    bmiTxt:        { color:'#AAA', fontSize:13 },
    profileRow:    { flexDirection:'row', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#1a1a1a' },
    profileLbl:    { color:'#888', fontSize:13 },
    profileVal:    { color:'#FFF', fontSize:13, fontWeight:'600' },
    sessionRow:    { flexDirection:'row', justifyContent:'space-between', paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#1a1a1a' },
    sessionDate:   { color:'#FFF', fontSize:13, fontWeight:'600' },
    sessionTime:   { color:'#888', fontSize:11, marginTop:2 },
    sessionRight:  { alignItems:'flex-end' },
    sessionStat:   { color:'#FFF', fontSize:13 },
    sessionCal:    { color:'#FF8844', fontSize:11, marginTop:2 },
});