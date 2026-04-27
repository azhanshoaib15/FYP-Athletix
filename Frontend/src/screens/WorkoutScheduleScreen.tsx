import React, { useState, useEffect } from 'react';
import {
    Alert, LayoutAnimation, Platform, ScrollView, StyleSheet,
    Text, TouchableOpacity, UIManager, View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { useAppData } from '../context/AppDataContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_URL = 'https://fyp-athletix-production.up.railway.app';

interface WorkoutScheduleScreenProps {
    onNavigate: (screen: 'dashboard') => void;
}

interface Exercise {
    name: string;
    reps: string;
    calories: number;
}

interface DaySchedule {
    day: string;
    focus: string;
    isRest: boolean;
    exercises: Exercise[];
}

// ── Calorie map ───────────────────────────────────────────────────────────────

const CALORIE_MAP: Record<string, number> = {
    'squats':178,'squat':178,'lunges':280,'lunge':280,'leg press':212,'leg extension':265,
    'leg raises':93,'hamstring curl':263,'calf raises':209,'step-ups':145,'step ups':145,
    'push-up':238,'push-ups':238,'push up':238,'pushup':238,'bench press':152,
    'dumbbell bench press':398,'db press':398,'db chest press':398,'incline db press':156,
    'incline dumbbell press':156,'incline bench press':121,'incline beanch press':121,
    'shoulder press':138,'overhead press':138,'lateral raises':314,'lateral raise':314,
    'tricep pushdown':387,'tricep dips':237,'dips':301,'pull-ups':241,'pull-up':241,
    'pull ups':241,'lat pulldown':363,'barbell row':302,'rows':302,'backrows':302,
    'back rows':302,'seated row':394,'barbell rows':302,'bicep curl':267,'bicep curls':267,
    'dumbbell curl':267,'barbell curl':240,'deadlift':104,'romanian deadlift':148,
    'face pulls':224,'plank':183,'core circuit':150,'mountain climbers':200,
    'burpees':300,'kb swings':250,'battle ropes':300,'sprint':400,'jogging':300,
    'cycling':250,'swimming':300,'incline walk':200,'walk':150,'yoga':80,
    'stretching':50,'foam rolling':40,'easy jog':200,'agility ladder':250,
    'box jumps':350,'power cleans':300,'sprint drills':400,'circuit training':300,
    'easy jogging':200,'power clean':300,
};

const getCalories = (name: string): number => {
    const key = name.toLowerCase().trim();
    if (CALORIE_MAP[key]) return CALORIE_MAP[key];
    for (const [k, v] of Object.entries(CALORIE_MAP)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    return 120;
};

const buildEx = (name: string, reps: string): Exercise => ({
    name, reps, calories: getCalories(name)
});

// ── Plans ─────────────────────────────────────────────────────────────────────

const PLANS: Record<string, { title: string; subtitle: string; schedule: DaySchedule[] }> = {
    general_fitness: {
        title: 'General Fitness', subtitle: 'Stay Fit Plan',
        schedule: [
            { day:'Day 1', focus:'Full Body', isRest:false, exercises:[
                buildEx('Squats','3 sets x 15 reps'), buildEx('Push-ups','3 sets x 12 reps'),
                buildEx('Rows','3 sets x 12 reps'), buildEx('Plank','3 sets x 30 seconds')]},
            { day:'Day 2', focus:'Cardio', isRest:false, exercises:[buildEx('Jogging','30 minutes')]},
            { day:'Day 3', focus:'Mobility', isRest:false, exercises:[buildEx('Yoga','30-45 minutes'), buildEx('Stretching','10-15 minutes')]},
            { day:'Day 4', focus:'Strength + Core', isRest:false, exercises:[
                buildEx('Lunges','3 sets x 12 reps'), buildEx('DB Press','3 sets x 10 reps'),
                buildEx('Plank','3 sets x 30 seconds'), buildEx('Mountain Climbers','3 sets x 20 reps')]},
            { day:'Day 5', focus:'Light Activity', isRest:false, exercises:[buildEx('Walk','30-45 minutes')]},
            { day:'Day 6', focus:'Optional', isRest:false, exercises:[buildEx('Jogging','20-30 minutes'), buildEx('Stretching','10-15 minutes')]},
            { day:'Day 7', focus:'Rest', isRest:true, exercises:[]},
        ],
    },
    endurance: {
        title: 'Endurance Training', subtitle: 'Cardio & Stamina Plan',
        schedule: [
            { day:'Day 1', focus:'Long Run', isRest:false, exercises:[buildEx('Jogging','60-90 minutes')]},
            { day:'Day 2', focus:'Intervals', isRest:false, exercises:[buildEx('Sprint','x 8 rounds — 400m')]},
            { day:'Day 3', focus:'Cross Training', isRest:false, exercises:[buildEx('Cycling','45-60 minutes')]},
            { day:'Day 4', focus:'Tempo Run', isRest:false, exercises:[buildEx('Jogging','20 min moderate-hard')]},
            { day:'Day 5', focus:'Strength', isRest:false, exercises:[buildEx('Squats','3 x 8'), buildEx('Lunges','3 x 10'), buildEx('Plank','3 x 30s')]},
            { day:'Day 6', focus:'Recovery', isRest:false, exercises:[buildEx('Easy Jog','20-30 min'), buildEx('Stretching','10 min')]},
            { day:'Day 7', focus:'Rest', isRest:true, exercises:[]},
        ],
    },
    muscle_gain: {
        title: 'Muscle Gain', subtitle: 'Hypertrophy PPL Split',
        schedule: [
            { day:'Day 1', focus:'Push', isRest:false, exercises:[
                buildEx('Bench Press','4 x 6-10'), buildEx('Incline DB Press','3 x 8-12'),
                buildEx('Shoulder Press','3 x 8-10'), buildEx('Tricep Pushdown','3 x 12')]},
            { day:'Day 2', focus:'Pull', isRest:false, exercises:[
                buildEx('Deadlift','4 x 5'), buildEx('Pull-ups','4 x 8'),
                buildEx('Barbell Row','3 x 8-10'), buildEx('Bicep Curl','3 x 12')]},
            { day:'Day 3', focus:'Legs', isRest:false, exercises:[
                buildEx('Squats','4 x 6-10'), buildEx('Leg Press','3 x 10'),
                buildEx('Hamstring Curl','3 x 12'), buildEx('Calf Raises','4 x 15')]},
            { day:'Day 4', focus:'Rest', isRest:true, exercises:[]},
            { day:'Day 5', focus:'Push (Repeat)', isRest:false, exercises:[
                buildEx('Bench Press','4 x 6-10'), buildEx('Incline DB Press','3 x 8-12'),
                buildEx('Shoulder Press','3 x 8-10'), buildEx('Tricep Pushdown','3 x 12')]},
            { day:'Day 6', focus:'Pull (Repeat)', isRest:false, exercises:[
                buildEx('Deadlift','4 x 5'), buildEx('Pull-ups','4 x 8'),
                buildEx('Barbell Row','3 x 8-10'), buildEx('Bicep Curl','3 x 12')]},
            { day:'Day 7', focus:'Legs (Repeat)', isRest:false, exercises:[
                buildEx('Squats','4 x 6-10'), buildEx('Leg Press','3 x 10'),
                buildEx('Hamstring Curl','3 x 12'), buildEx('Calf Raises','4 x 15')]},
        ],
    },
    weight_loss: {
        title: 'Weight Loss', subtitle: 'Fat Loss Plan',
        schedule: [
            { day:'Day 1', focus:'Full Body Circuit', isRest:false, exercises:[
                buildEx('Squats','3 x 12'), buildEx('DB Press','3 x 12'),
                buildEx('Lat Pulldown','3 x 12'), buildEx('Lunges','3 x 15'), buildEx('Plank','3 x 30s')]},
            { day:'Day 2', focus:'HIIT Cardio', isRest:false, exercises:[buildEx('Sprint','x 10-12 rounds'), buildEx('Mountain Climbers','3 x 20')]},
            { day:'Day 3', focus:'Strength', isRest:false, exercises:[
                buildEx('Deadlift','4 x 8'), buildEx('Shoulder Press','3 x 10'),
                buildEx('Seated Row','3 x 10'), buildEx('Step-ups','3 x 12')]},
            { day:'Day 4', focus:'LISS Cardio', isRest:false, exercises:[buildEx('Incline Walk','30-45 min')]},
            { day:'Day 5', focus:'Metabolic Circuit', isRest:false, exercises:[
                buildEx('KB Swings','3 x 15'), buildEx('Burpees','3 x 10'),
                buildEx('Mountain Climbers','3 x 20'), buildEx('Battle Ropes','3 x 30s')]},
            { day:'Day 6', focus:'Light Activity', isRest:false, exercises:[buildEx('Walk','8,000-12,000 steps')]},
            { day:'Day 7', focus:'Rest', isRest:true, exercises:[]},
        ],
    },
    athletic_performance: {
        title: 'Athletic Performance', subtitle: 'Speed & Power Plan',
        schedule: [
            { day:'Day 1', focus:'Power', isRest:false, exercises:[
                buildEx('Power Cleans','4 x 5'), buildEx('Box Jumps','4 x 6'),
                buildEx('Squats','4 x 6'), buildEx('Sprint Drills','10 min')]},
            { day:'Day 2', focus:'Speed', isRest:false, exercises:[
                buildEx('Sprint','x 8 — 40m'), buildEx('Agility Ladder','4 sets'), buildEx('Box Jumps','4 sets')]},
            { day:'Day 3', focus:'Strength Upper', isRest:false, exercises:[
                buildEx('Bench Press','4 x 5'), buildEx('Pull-ups','4 x 8'),
                buildEx('Shoulder Press','3 x 8'), buildEx('Rows','3 x 10')]},
            { day:'Day 4', focus:'Rest', isRest:true, exercises:[]},
            { day:'Day 5', focus:'Lower Body Power', isRest:false, exercises:[
                buildEx('Deadlift','4 x 5'), buildEx('Leg Press','3 x 8'),
                buildEx('Box Jumps','3 x 8'), buildEx('Calf Raises','4 x 15')]},
            { day:'Day 6', focus:'Conditioning', isRest:false, exercises:[buildEx('Circuit Training','3 rounds'), buildEx('Cycling','30 min')]},
            { day:'Day 7', focus:'Rest', isRest:true, exercises:[]},
        ],
    },
};

const GOAL_TO_PLAN: Record<string, string> = {
    general_fitness:'general_fitness', stay_fit:'general_fitness',
    endurance:'endurance',
    muscle_gain:'muscle_gain', build_muscle:'muscle_gain',
    weight_loss:'weight_loss', lose_weight:'weight_loss',
    athletic_performance:'athletic_performance',
};

const GOAL_COLORS: Record<string, string> = {
    general_fitness:'#1a5c3a', muscle_gain:'#390404',
    weight_loss:'#4a2c00', endurance:'#0a3a5c', athletic_performance:'#3a0a5c',
};

// ── Day status helpers ────────────────────────────────────────────────────────

type DayStatus = 'today' | 'completed' | 'missed' | 'upcoming' | 'rest';

function getDayStatus(
    dayIndex: number,         // 0-based (Day 1 = 0)
    currentDayIndex: number,  // today's 0-based index
    isRest: boolean,
    loggedDays: Record<string, boolean>,
    dayKey: string,
): DayStatus {
    if (isRest) return 'rest';
    if (dayIndex === currentDayIndex) return 'today';
    if (dayIndex < currentDayIndex) {
        return loggedDays[dayKey] ? 'completed' : 'missed';
    }
    return 'upcoming';
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function WorkoutScheduleScreen({ onNavigate }: WorkoutScheduleScreenProps) {
    const token       = useSelector((state: RootState) => state.user.accessToken);
    const fitnessGoal = useSelector((state: RootState) => state.user.fitness_goal) || 'general_fitness';
    const { refreshSilent } = useAppData();
    const planKey     = GOAL_TO_PLAN[fitnessGoal] || 'general_fitness';
    const plan        = PLANS[planKey];
    const accent      = GOAL_COLORS[planKey] || '#390404';

    // ── Day calculation from signup date ─────────────────────────────────────
    const [signupDate, setSignupDate]         = useState<Date | null>(null);
    const [currentDayIndex, setCurrentDayIndex] = useState(0); // 0-based, 0=Day1

    // ── Persistent state ─────────────────────────────────────────────────────
    const [ticked, setTicked]         = useState<Record<string, boolean>>({});
    const [loggedDays, setLoggedDays] = useState<Record<string, boolean>>({});
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [savingDay, setSavingDay]   = useState<string | null>(null);

    // Storage keys — per plan, reset on new cycle
    const getCycleKey = (signup: Date) => {
        const days = Math.floor((Date.now() - signup.getTime()) / (1000 * 60 * 60 * 24));
        return Math.floor(days / 7);
    };

    const getStorageKeys = (signup: Date) => {
        const cycle = getCycleKey(signup);
        return {
            ticksKey:  `athletix_ticks_${planKey}_c${cycle}`,
            loggedKey: `athletix_logged_${planKey}_c${cycle}`,
        };
    };

    // Fetch profile for signup date + load persisted state + sync with backend
    useEffect(() => {
        const init = async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch profile + progress records in parallel
                const [profRes, progRes] = await Promise.all([
                    fetch(`${API_URL}/api/v1/users/me/profile`, { headers }),
                    fetch(`${API_URL}/api/v1/progress/?limit=30`, { headers }),
                ]);

                if (profRes.ok) {
                    const prof   = await profRes.json();
                    const signup = new Date(prof.created_at);
                    setSignupDate(signup);

                    // Calculate current day index (0-based)
                    const daysSince = Math.floor((Date.now() - signup.getTime()) / (1000 * 60 * 60 * 24));
                    const idx = daysSince % 7;
                    setCurrentDayIndex(idx);
                    setExpandedDay('Day ' + (idx + 1));

                    // Load persisted ticks for this cycle
                    const { ticksKey, loggedKey } = getStorageKeys(signup);
                    const [savedTicks, savedLogged] = await Promise.all([
                        AsyncStorage.getItem(ticksKey),
                        AsyncStorage.getItem(loggedKey),
                    ]);

                    let loggedFromStorage: Record<string, boolean> = {};
                    if (savedTicks)  setTicked(JSON.parse(savedTicks));
                    if (savedLogged) loggedFromStorage = JSON.parse(savedLogged);

                    // Also check backend progress records to mark logged days
                    // even if AsyncStorage was cleared (e.g. app reinstall)
                    if (progRes.ok) {
                        const progData = await progRes.json();
                        if (Array.isArray(progData)) {
                            const cycle    = Math.floor(daysSince / 7);
                            const cycleStart = new Date(signup.getTime() + cycle * 7 * 86400000);

                            progData.forEach((p: any) => {
                                if ((p.workouts_completed || 0) > 0) {
                                    const logDate    = new Date(p.recorded_at);
                                    const dayOffset  = Math.floor((logDate.getTime() - cycleStart.getTime()) / 86400000);
                                    if (dayOffset >= 0 && dayOffset < 7) {
                                        const dayKey = 'Day ' + (dayOffset + 1);
                                        loggedFromStorage[dayKey] = true;
                                    }
                                }
                            });
                        }
                    }
                    setLoggedDays(loggedFromStorage);
                }
            } catch (_) {}
        };
        init();
    }, [token, planKey]);

    const toggleExpand = (day: string, isRest: boolean) => {
        if (isRest) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedDay(expandedDay === day ? null : day);
    };

    const toggleTick = async (day: string, exName: string) => {
        const key = day + '_' + exName;
        const newTicked = { ...ticked, [key]: !ticked[key] };
        setTicked(newTicked);
        if (signupDate) {
            const { ticksKey } = getStorageKeys(signupDate);
            await AsyncStorage.setItem(ticksKey, JSON.stringify(newTicked)).catch(() => {});
        }
    };

    const isTicked = (day: string, exName: string) => !!ticked[day + '_' + exName];

    const getDayCalories = (item: DaySchedule) =>
        item.exercises.reduce((sum, ex) => isTicked(item.day, ex.name) ? sum + ex.calories : sum, 0);

    const getDayTickedCount = (item: DaySchedule) =>
        item.exercises.filter(ex => isTicked(item.day, ex.name)).length;

    const logCaloriesToProgress = async (item: DaySchedule) => {
        const totalCal   = getDayCalories(item);
        const tickedCount = getDayTickedCount(item);
        if (tickedCount === 0) {
            Alert.alert('No exercises done', 'Tick at least one exercise first.');
            return;
        }
        setSavingDay(item.day);
        try {
            if (token) {
                await fetch(`${API_URL}/api/v1/progress/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        total_calories_burned: totalCal,
                        workouts_completed: 1,
                        total_workout_minutes: tickedCount * 12,
                        notes: item.day + ' — ' + item.focus + ' (' + tickedCount + ' exercises, ' + totalCal + ' kcal)',
                    }),
                });
                // Mark day as logged and persist
                const newLogged = { ...loggedDays, [item.day]: true };
                setLoggedDays(newLogged);
                if (signupDate) {
                    const { loggedKey } = getStorageKeys(signupDate);
                    await AsyncStorage.setItem(loggedKey, JSON.stringify(newLogged)).catch(() => {});
                }
                // Refresh global context so ALL screens update immediately
                refreshSilent();

                Alert.alert('Logged!',
                    tickedCount + ' exercise' + (tickedCount > 1 ? 's' : '') +
                    ' logged. ' + totalCal + ' kcal added to Progress.',
                    [{ text: 'OK' }]
                );
            }
        } catch (_) {
            Alert.alert('Error', 'Could not save. Try again.');
        }
        setSavingDay(null);
    };

    return (
        <ScrollView style={s.container} contentContainerStyle={s.content}>
            <TouchableOpacity style={s.backBtn} onPress={() => onNavigate('dashboard')}>
                <Text style={s.backTxt}>{'< Back'}</Text>
            </TouchableOpacity>

            <Text style={s.header}>Weekly Training Schedule</Text>

            <View style={[s.planBadge, { backgroundColor: accent }]}>
                <Text style={s.planTitle}>{plan.title}</Text>
                <Text style={s.planSub}>{plan.subtitle}</Text>
            </View>

            <View style={s.tipBox}>
                <Text style={s.tipTxt}>
                    Today is highlighted in gold · Tick exercises · Log calories to Progress
                </Text>
            </View>

            {plan.schedule.map((item, idx) => {
                const status     = getDayStatus(idx, currentDayIndex, item.isRest, loggedDays, item.day);
                const isExpanded = expandedDay === item.day;
                const dayTicked  = getDayTickedCount(item);
                const dayCal     = getDayCalories(item);
                const allDone    = !item.isRest && dayTicked === item.exercises.length;

                return (
                    <View key={item.day} style={s.dayWrapper}>
                        <TouchableOpacity
                            style={[
                                s.dayRow,
                                item.isRest          && s.dayRowRest,
                                isExpanded           && s.dayRowExpanded,
                                status === 'today'   && s.dayRowToday,
                                status === 'completed' && s.dayRowCompleted,
                                status === 'missed'  && s.dayRowMissed,
                            ]}
                            onPress={() => toggleExpand(item.day, item.isRest)}
                            activeOpacity={0.8}>

                            <View style={s.dayLeft}>
                                {/* Day label + status badge */}
                                <View style={s.dayTitleRow}>
                                    <Text style={[
                                        s.dayTxt,
                                        status === 'today'     && { color:'#FFD700', fontSize:19 },
                                        status === 'completed' && { color:'#00FF88' },
                                        status === 'missed'    && { color:'#FF6666' },
                                    ]}>
                                        {item.day}
                                    </Text>
                                    {status === 'today'     && <View style={s.badgeToday}><Text style={s.badgeTodayTxt}>TODAY</Text></View>}
                                    {status === 'completed' && <View style={s.badgeDone}><Text style={s.badgeDoneTxt}>✓ DONE</Text></View>}
                                    {status === 'missed'    && <View style={s.badgeMissed}><Text style={s.badgeMissedTxt}>MISSED</Text></View>}
                                </View>
                                {/* Focus badge */}
                                <View style={[s.focusBadge,
                                    item.isRest            && { backgroundColor:'#555' },
                                    status === 'today'     && { backgroundColor:'#8B6800' },
                                    status === 'completed' && { backgroundColor:'#1a5c2a' },
                                    status === 'missed'    && { backgroundColor:'#5c1a1a' },
                                ]}>
                                    <Text style={s.focusTxt}>{item.focus}</Text>
                                </View>
                            </View>

                            {/* Right side */}
                            {item.isRest ? (
                                <Text style={s.restEmoji}>😴</Text>
                            ) : (
                                <View style={s.dayRight}>
                                    {dayTicked > 0 && (
                                        <View style={s.calBadge}>
                                            <Text style={s.calBadgeTxt}>🔥 {dayCal}</Text>
                                        </View>
                                    )}
                                    <Text style={s.progressTxt}>{dayTicked}/{item.exercises.length}</Text>
                                    <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Missed day message */}
                        {status === 'missed' && !isExpanded && (
                            <View style={s.missedBanner}>
                                <Text style={s.missedBannerTxt}>
                                    ⚠ You missed this day — you can still do it!
                                </Text>
                            </View>
                        )}

                        {/* Expanded exercises */}
                        {isExpanded && !item.isRest && (
                            <View style={[s.exContainer,
                                status === 'today'     && { borderColor:'#8B6800' },
                                status === 'completed' && { borderColor:'#1a5c2a' },
                                status === 'missed'    && { borderColor:'#5c1a1a' },
                            ]}>
                                <Text style={s.exHeader}>
                                    {status === 'today'     ? "Today's exercises — let's go!" :
                                     status === 'completed' ? "Completed exercises" :
                                     status === 'missed'    ? "Missed exercises — still do them!" :
                                     "Upcoming exercises"}
                                </Text>

                                {item.exercises.map((ex, exIdx) => {
                                    const done = isTicked(item.day, ex.name);
                                    return (
                                        <View key={exIdx} style={[s.exRow, done && s.exRowDone]}>
                                            <View style={[s.numBadge, done && s.numBadgeDone]}>
                                                <Text style={s.numTxt}>{done ? '✓' : String(exIdx + 1)}</Text>
                                            </View>
                                            <View style={s.exInfo}>
                                                <Text style={[
                                                    s.exName,
                                                    done && s.exNameDone,
                                                    status === 'today' && !done && { fontWeight:'700', color:'#FFD700' },
                                                ]}>
                                                    {ex.name}
                                                </Text>
                                                <Text style={s.exReps}>{ex.reps}</Text>
                                                <Text style={s.exCal}>~{ex.calories} kcal</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[s.tickBtn, done && s.tickBtnDone]}
                                                onPress={() => toggleTick(item.day, ex.name)}>
                                                <Text style={[s.tickTxt, done && s.tickTxtDone]}>
                                                    {done ? '✓ Done' : 'Mark Done'}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}

                                {/* Log button — only show if not already logged */}
                                {dayTicked > 0 && !loggedDays[item.day] && (
                                    <TouchableOpacity
                                        style={[s.logBtn, savingDay === item.day && s.logBtnDis]}
                                        onPress={() => logCaloriesToProgress(item)}
                                        disabled={savingDay === item.day}>
                                        <Text style={s.logBtnTxt}>
                                            {savingDay === item.day ? 'Saving...' : '📊  Log ' + dayCal + ' kcal to Progress'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Already logged */}
                                {loggedDays[item.day] && (
                                    <View style={s.alreadyLogged}>
                                        <Text style={s.alreadyLoggedTxt}>✅ Logged to Progress</Text>
                                    </View>
                                )}

                                {/* All done banner */}
                                {allDone && (
                                    <View style={s.allDoneBadge}>
                                        <Text style={s.allDoneTxt}>🎉 All exercises completed!</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container:        { flex:1, backgroundColor:'#000' },
    content:          { padding:20, paddingBottom:60 },
    backBtn:          { marginTop:40, marginBottom:20, padding:10, backgroundColor:'#501313', borderRadius:20, alignSelf:'flex-start' },
    backTxt:          { color:'#FFF', fontWeight:'700', fontSize:16 },
    header:           { fontWeight:'700', fontSize:26, color:'#FFF', marginBottom:14, textAlign:'center' },
    planBadge:        { borderRadius:14, padding:16, marginBottom:12, alignItems:'center' },
    planTitle:        { color:'#FFF', fontSize:18, fontWeight:'800' },
    planSub:          { color:'rgba(255,255,255,0.75)', fontSize:13, marginTop:3 },
    tipBox:           { backgroundColor:'#111', borderRadius:10, padding:10, marginBottom:18, borderLeftWidth:3, borderLeftColor:'#8B2F3F' },
    tipTxt:           { color:'#AAA', fontSize:12 },
    dayWrapper:       { marginBottom:10 },
    dayRow:           { backgroundColor:'#1a0505', borderRadius:14, padding:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderWidth:1, borderColor:'#390404' },
    dayRowRest:       { backgroundColor:'#1a1a1a', borderColor:'#333' },
    dayRowExpanded:   { borderBottomLeftRadius:0, borderBottomRightRadius:0 },
    dayRowToday:      { borderColor:'#FFD700', borderWidth:2, backgroundColor:'#1f1800' },
    dayRowCompleted:  { borderColor:'#1a5c2a', backgroundColor:'#061209' },
    dayRowMissed:     { borderColor:'#5c1a1a', backgroundColor:'#0d0303' },
    dayLeft:          { flex:1 },
    dayTitleRow:      { flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 },
    dayTxt:           { fontWeight:'700', fontSize:17, color:'#FFF' },
    badgeToday:       { backgroundColor:'#FFD700', borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
    badgeTodayTxt:    { color:'#000', fontSize:10, fontWeight:'800' },
    badgeDone:        { backgroundColor:'#1a5c2a', borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
    badgeDoneTxt:     { color:'#00FF88', fontSize:10, fontWeight:'700' },
    badgeMissed:      { backgroundColor:'#5c1a1a', borderRadius:6, paddingHorizontal:7, paddingVertical:2 },
    badgeMissedTxt:   { color:'#FF6666', fontSize:10, fontWeight:'700' },
    focusBadge:       { backgroundColor:'#8B2F3F', alignSelf:'flex-start', borderRadius:8, paddingHorizontal:10, paddingVertical:3 },
    focusTxt:         { color:'#FFF', fontSize:12, fontWeight:'600' },
    dayRight:         { flexDirection:'row', alignItems:'center', gap:6 },
    calBadge:         { backgroundColor:'rgba(255,100,0,0.2)', borderRadius:10, paddingHorizontal:7, paddingVertical:3, borderWidth:1, borderColor:'rgba(255,100,0,0.4)' },
    calBadgeTxt:      { color:'#FF8844', fontSize:11, fontWeight:'600' },
    progressTxt:      { color:'#AAA', fontSize:13, fontWeight:'600' },
    chevron:          { color:'#AAA', fontSize:14 },
    restEmoji:        { fontSize:20 },
    missedBanner:     { backgroundColor:'#1a0505', borderRadius:8, padding:10, borderWidth:1, borderColor:'#5c1a1a', marginTop:2 },
    missedBannerTxt:  { color:'#FF8888', fontSize:12 },
    exContainer:      { backgroundColor:'#0d0202', borderBottomLeftRadius:14, borderBottomRightRadius:14, padding:14, borderWidth:1, borderTopWidth:0, borderColor:'#8B2F3F' },
    exHeader:         { color:'#FF9944', fontSize:13, fontWeight:'700', marginBottom:12 },
    exRow:            { flexDirection:'row', alignItems:'center', marginBottom:10, padding:10, borderRadius:10, backgroundColor:'rgba(255,255,255,0.04)', gap:10 },
    exRowDone:        { backgroundColor:'rgba(0,180,0,0.08)', borderWidth:1, borderColor:'rgba(0,200,0,0.2)' },
    numBadge:         { width:28, height:28, borderRadius:14, backgroundColor:'#8B2F3F', justifyContent:'center', alignItems:'center' },
    numBadgeDone:     { backgroundColor:'#1a6b1a' },
    numTxt:           { color:'#FFF', fontSize:12, fontWeight:'700' },
    exInfo:           { flex:1 },
    exName:           { fontWeight:'600', fontSize:14, color:'#FFF' },
    exNameDone:       { color:'#00CC66', textDecorationLine:'line-through' },
    exReps:           { fontSize:12, color:'#AAA', marginTop:2 },
    exCal:            { fontSize:11, color:'#FF8844', marginTop:1 },
    tickBtn:          { backgroundColor:'rgba(139,47,63,0.3)', borderRadius:12, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'#8B2F3F' },
    tickBtnDone:      { backgroundColor:'rgba(0,160,0,0.25)', borderColor:'#00CC66' },
    tickTxt:          { color:'#CCC', fontSize:11, fontWeight:'600' },
    tickTxtDone:      { color:'#00CC66' },
    logBtn:           { backgroundColor:'#8B2F3F', borderRadius:12, padding:12, alignItems:'center', marginTop:8 },
    logBtnDis:        { backgroundColor:'#444' },
    logBtnTxt:        { color:'#FFF', fontSize:14, fontWeight:'700' },
    alreadyLogged:    { backgroundColor:'rgba(0,120,0,0.2)', borderRadius:10, padding:10, alignItems:'center', marginTop:8, borderWidth:1, borderColor:'rgba(0,200,0,0.3)' },
    alreadyLoggedTxt: { color:'#00FF88', fontSize:13, fontWeight:'600' },
    allDoneBadge:     { backgroundColor:'rgba(0,120,0,0.2)', borderRadius:10, padding:10, alignItems:'center', marginTop:6, borderWidth:1, borderColor:'rgba(0,200,0,0.3)' },
    allDoneTxt:       { color:'#00FF88', fontSize:13, fontWeight:'600' },
});