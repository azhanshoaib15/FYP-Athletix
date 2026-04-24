import React, { useState } from 'react';
import {
    Alert, LayoutAnimation, Platform, ScrollView, StyleSheet,
    Text, TouchableOpacity, UIManager, View
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

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
    calories: number; // estimated kcal from exercises.jsonl
}

interface DaySchedule {
    day: string;
    focus: string;
    isRest: boolean;
    exercises: Exercise[];
}

// ── Calorie map from exercises.jsonl ──────────────────────────────────────────
// Values extracted from Estimated calorie burn field per exercise

const CALORIE_MAP: Record<string, number> = {
    // Squats / Legs
    'squats':               178,
    'squat':                178,
    'bodyweight squat':     188,
    'lunges':               280,
    'lunge':                280,
    'walking lunge':        280,
    'reverse lunge':         90,
    'leg press':            212,
    'single leg press':      51,
    'leg extension':        265,
    'leg raises':            93,
    'hanging leg raise':     93,
    'hamstring curl':       263,
    'lying leg curl':       263,
    'calf raises':          209,
    'standing calf raise':  209,
    'step-ups':             145,
    'step ups':             145,
    // Push
    'push-up':              238,
    'push-ups':             238,
    'push up':              238,
    'pushup':               238,
    'bench press':          152,
    'barbell bench press':  152,
    'dumbbell bench press': 398,
    'db press':             398,
    'db chest press':       398,
    'incline db press':     156,
    'incline dumbbell press':156,
    'incline bench press':  121,
    'incline beanch press': 121,
    'decline bench press':  121,
    'shoulder press':       138,
    'overhead press':       138,
    'dumbbell shoulder press':138,
    'lateral raises':       314,
    'lateral raise':        314,
    'tricep pushdown':      387,
    'tricep dips':          237,
    'tricep push-up':       238,
    'overhead tricep extension': 102,
    'dips':                 301,
    // Pull
    'pull-ups':             241,
    'pull-up':              241,
    'pull ups':             241,
    'wide grip pull-up':    364,
    'chin-up':              326,
    'lat pulldown':         363,
    'wide grip lat pulldown': 71,
    'barbell row':          302,
    'rows':                 302,
    'backrows':             302,
    'back rows':            302,
    'seated row':           394,
    'seated cable row':     394,
    'barbell rows':         302,
    'bicep curl':           267,
    'bicep curls':          267,
    'dumbbell curl':        267,
    'barbell curl':         240,
    'face pulls':           224,
    'face pull':            224,
    'deadlift':             104,
    'romanian deadlift':    148,
    // Core / Cardio
    'plank':                183,
    'side plank':           333,
    'core circuit':         150,
    'mountain climbers':    200,
    'burpees':              300,
    'kb swings':            250,
    'battle ropes':         300,
    'sprint':               400,
    'jogging':              300,
    'cycling':              250,
    'swimming':             300,
    'incline walk':         200,
    'walk':                 150,
    'yoga':                  80,
    'stretching':            50,
    'foam rolling':          40,
    'easy jog':             200,
    'agility ladder':       250,
    'cone drills':          200,
    'box jumps':            350,
    'power cleans':         300,
    'sprint drills':        400,
    'circuit training':     300,
};

const getCalories = (name: string): number => {
    const key = name.toLowerCase().trim();
    if (CALORIE_MAP[key]) return CALORIE_MAP[key];
    // Partial match
    for (const [k, v] of Object.entries(CALORIE_MAP)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    return 120; // default fallback
};

// ── Workout plans ─────────────────────────────────────────────────────────────

const buildExercise = (name: string, reps: string): Exercise => ({
    name, reps, calories: getCalories(name)
});

const PLANS: Record<string, { title: string; subtitle: string; schedule: DaySchedule[] }> = {

    general_fitness: {
        title: "General Fitness", subtitle: "Stay Fit Plan",
        schedule: [
            { day:"Day 1", focus:"Full Body", isRest:false, exercises:[
                buildExercise("Squats","3 sets x 15 reps"),
                buildExercise("Push-ups","3 sets x 12 reps"),
                buildExercise("Rows","3 sets x 12 reps"),
                buildExercise("Plank","3 sets x 30 seconds"),
            ]},
            { day:"Day 2", focus:"Cardio", isRest:false, exercises:[
                buildExercise("Jogging","30 minutes steady pace"),
            ]},
            { day:"Day 3", focus:"Mobility", isRest:false, exercises:[
                buildExercise("Yoga","30-45 minutes"),
                buildExercise("Stretching","10-15 minutes"),
            ]},
            { day:"Day 4", focus:"Strength + Core", isRest:false, exercises:[
                buildExercise("Lunges","3 sets x 12 reps"),
                buildExercise("DB Press","3 sets x 10 reps"),
                buildExercise("Plank","3 sets x 30 seconds"),
                buildExercise("Mountain Climbers","3 sets x 20 reps"),
            ]},
            { day:"Day 5", focus:"Light Activity", isRest:false, exercises:[
                buildExercise("Walk","30-45 minutes"),
            ]},
            { day:"Day 6", focus:"Optional", isRest:false, exercises:[
                buildExercise("Jogging","20-30 minutes"),
                buildExercise("Stretching","10-15 minutes"),
            ]},
            { day:"Day 7", focus:"Rest", isRest:true, exercises:[] },
        ],
    },

    endurance: {
        title: "Endurance Training", subtitle: "Cardio & Stamina Plan",
        schedule: [
            { day:"Day 1", focus:"Long Run", isRest:false, exercises:[
                buildExercise("Jogging","60-90 minutes steady pace"),
            ]},
            { day:"Day 2", focus:"Intervals", isRest:false, exercises:[
                buildExercise("Sprint","x 8 rounds — 400m fast"),
            ]},
            { day:"Day 3", focus:"Cross Training", isRest:false, exercises:[
                buildExercise("Cycling","45-60 minutes"),
            ]},
            { day:"Day 4", focus:"Tempo Run", isRest:false, exercises:[
                buildExercise("Jogging","20 minutes moderate-hard pace"),
            ]},
            { day:"Day 5", focus:"Strength", isRest:false, exercises:[
                buildExercise("Squats","3 sets x 8 reps"),
                buildExercise("Lunges","3 sets x 10 reps"),
                buildExercise("Plank","3 sets x 30 seconds"),
            ]},
            { day:"Day 6", focus:"Recovery", isRest:false, exercises:[
                buildExercise("Easy Jog","20-30 minutes"),
                buildExercise("Stretching","10-15 minutes"),
            ]},
            { day:"Day 7", focus:"Rest", isRest:true, exercises:[] },
        ],
    },

    muscle_gain: {
        title: "Muscle Gain", subtitle: "Hypertrophy PPL Split",
        schedule: [
            { day:"Day 1", focus:"Push", isRest:false, exercises:[
                buildExercise("Bench Press","4 sets x 6-10 reps"),
                buildExercise("Incline DB Press","3 sets x 8-12 reps"),
                buildExercise("Shoulder Press","3 sets x 8-10 reps"),
                buildExercise("Tricep Pushdown","3 sets x 12 reps"),
            ]},
            { day:"Day 2", focus:"Pull", isRest:false, exercises:[
                buildExercise("Deadlift","4 sets x 5 reps"),
                buildExercise("Pull-ups","4 sets x 8 reps"),
                buildExercise("Barbell Row","3 sets x 8-10 reps"),
                buildExercise("Bicep Curl","3 sets x 12 reps"),
            ]},
            { day:"Day 3", focus:"Legs", isRest:false, exercises:[
                buildExercise("Squats","4 sets x 6-10 reps"),
                buildExercise("Leg Press","3 sets x 10 reps"),
                buildExercise("Hamstring Curl","3 sets x 12 reps"),
                buildExercise("Calf Raises","4 sets x 15 reps"),
            ]},
            { day:"Day 4", focus:"Rest", isRest:true, exercises:[] },
            { day:"Day 5", focus:"Push (Repeat)", isRest:false, exercises:[
                buildExercise("Bench Press","4 sets x 6-10 reps"),
                buildExercise("Incline DB Press","3 sets x 8-12 reps"),
                buildExercise("Shoulder Press","3 sets x 8-10 reps"),
                buildExercise("Tricep Pushdown","3 sets x 12 reps"),
            ]},
            { day:"Day 6", focus:"Pull (Repeat)", isRest:false, exercises:[
                buildExercise("Deadlift","4 sets x 5 reps"),
                buildExercise("Pull-ups","4 sets x 8 reps"),
                buildExercise("Barbell Row","3 sets x 8-10 reps"),
                buildExercise("Bicep Curl","3 sets x 12 reps"),
            ]},
            { day:"Day 7", focus:"Legs (Repeat)", isRest:false, exercises:[
                buildExercise("Squats","4 sets x 6-10 reps"),
                buildExercise("Leg Press","3 sets x 10 reps"),
                buildExercise("Hamstring Curl","3 sets x 12 reps"),
                buildExercise("Calf Raises","4 sets x 15 reps"),
            ]},
        ],
    },

    weight_loss: {
        title: "Weight Loss", subtitle: "Fat Loss Plan",
        schedule: [
            { day:"Day 1", focus:"Full Body Circuit", isRest:false, exercises:[
                buildExercise("Squats","3 sets x 12 reps"),
                buildExercise("DB Press","3 sets x 12 reps"),
                buildExercise("Lat Pulldown","3 sets x 12 reps"),
                buildExercise("Lunges","3 sets x 15 reps"),
                buildExercise("Plank","3 sets x 30 seconds"),
            ]},
            { day:"Day 2", focus:"HIIT Cardio", isRest:false, exercises:[
                buildExercise("Sprint","x 10-12 rounds — 30 sec on / 60 sec off"),
                buildExercise("Mountain Climbers","3 sets x 20 reps"),
            ]},
            { day:"Day 3", focus:"Strength", isRest:false, exercises:[
                buildExercise("Deadlift","4 sets x 8 reps"),
                buildExercise("Shoulder Press","3 sets x 10 reps"),
                buildExercise("Seated Row","3 sets x 10 reps"),
                buildExercise("Step-ups","3 sets x 12 reps"),
            ]},
            { day:"Day 4", focus:"LISS Cardio", isRest:false, exercises:[
                buildExercise("Incline Walk","30-45 minutes"),
            ]},
            { day:"Day 5", focus:"Metabolic Circuit", isRest:false, exercises:[
                buildExercise("KB Swings","3 sets x 15 reps"),
                buildExercise("Burpees","3 sets x 10 reps"),
                buildExercise("Mountain Climbers","3 sets x 20 reps"),
                buildExercise("Battle Ropes","3 sets x 30 seconds"),
            ]},
            { day:"Day 6", focus:"Light Activity", isRest:false, exercises:[
                buildExercise("Walk","8,000-12,000 steps"),
            ]},
            { day:"Day 7", focus:"Rest", isRest:true, exercises:[] },
        ],
    },

    athletic_performance: {
        title: "Athletic Performance", subtitle: "Speed & Power Plan",
        schedule: [
            { day:"Day 1", focus:"Power", isRest:false, exercises:[
                buildExercise("Power Cleans","4 sets x 5 reps"),
                buildExercise("Box Jumps","4 sets x 6 reps"),
                buildExercise("Squats","4 sets x 6 reps"),
                buildExercise("Sprint Drills","10 minutes"),
            ]},
            { day:"Day 2", focus:"Speed", isRest:false, exercises:[
                buildExercise("Sprint","x 8 rounds — 40m"),
                buildExercise("Agility Ladder","4 sets"),
                buildExercise("Cone Drills","4 sets"),
            ]},
            { day:"Day 3", focus:"Strength Upper", isRest:false, exercises:[
                buildExercise("Bench Press","4 sets x 5 reps"),
                buildExercise("Pull-ups","4 sets x 8 reps"),
                buildExercise("Shoulder Press","3 sets x 8 reps"),
                buildExercise("Rows","3 sets x 10 reps"),
            ]},
            { day:"Day 4", focus:"Rest", isRest:true, exercises:[] },
            { day:"Day 5", focus:"Lower Body Power", isRest:false, exercises:[
                buildExercise("Deadlift","4 sets x 5 reps"),
                buildExercise("Leg Press","3 sets x 8 reps"),
                buildExercise("Box Jumps","3 sets x 8 reps"),
                buildExercise("Calf Raises","4 sets x 15 reps"),
            ]},
            { day:"Day 6", focus:"Conditioning", isRest:false, exercises:[
                buildExercise("Circuit Training","3 rounds"),
                buildExercise("Cycling","30 minutes"),
            ]},
            { day:"Day 7", focus:"Rest", isRest:true, exercises:[] },
        ],
    },
};

const GOAL_TO_PLAN: Record<string, string> = {
    general_fitness:"general_fitness", stay_fit:"general_fitness",
    endurance:"endurance",
    muscle_gain:"muscle_gain", build_muscle:"muscle_gain", hypertrophy:"muscle_gain",
    weight_loss:"weight_loss", lose_weight:"weight_loss", fat_loss:"weight_loss",
    athletic_performance:"athletic_performance", performance:"athletic_performance",
};

const GOAL_COLORS: Record<string, string> = {
    general_fitness:"#1a5c3a", muscle_gain:"#390404",
    weight_loss:"#4a2c00", endurance:"#0a3a5c", athletic_performance:"#3a0a5c",
};

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function WorkoutScheduleScreen({ onNavigate }: WorkoutScheduleScreenProps) {
    const token       = useSelector((state: RootState) => state.user.accessToken);
    const fitnessGoal = useSelector((state: RootState) => state.user.fitness_goal) || 'general_fitness';
    const planKey     = GOAL_TO_PLAN[fitnessGoal] || 'general_fitness';
    const plan        = PLANS[planKey];
    const accent      = GOAL_COLORS[planKey] || '#390404';

    const [expandedDay, setExpandedDay]           = useState<string|null>(null);
    // ticked: key = "Day1_ExerciseName"
    const [ticked, setTicked]                     = useState<Record<string,boolean>>({});
    const [savingDay, setSavingDay]               = useState<string|null>(null);

    const toggleExpand = (day: string, isRest: boolean) => {
        if (isRest) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedDay(expandedDay === day ? null : day);
    };

    const toggleTick = (day: string, exName: string) => {
        const key = day + '_' + exName;
        setTicked(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isTicked = (day: string, exName: string) =>
        !!ticked[day + '_' + exName];

    // Get total calories ticked for a day
    const getDayCalories = (item: DaySchedule): number =>
        item.exercises.reduce((sum, ex) =>
            isTicked(item.day, ex.name) ? sum + ex.calories : sum, 0);

    // Get count of ticked exercises for a day
    const getDayTicked = (item: DaySchedule): number =>
        item.exercises.filter(ex => isTicked(item.day, ex.name)).length;

    // Log calories to progress tracker
    const logCaloriesToProgress = async (item: DaySchedule) => {
        const totalCal = getDayCalories(item);
        const tickedCount = getDayTicked(item);
        if (tickedCount === 0) {
            Alert.alert('No exercises done', 'Please tick at least one exercise first.');
            return;
        }
        setSavingDay(item.day);
        try {
            if (token) {
                await fetch(API_URL + '/api/v1/progress/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token,
                    },
                    body: JSON.stringify({
                        total_calories_burned: totalCal,
                        workouts_completed: 1,
                        total_workout_minutes: tickedCount * 10,
                        notes: item.day + ' — ' + item.focus + ' (' + tickedCount + ' exercises)',
                    }),
                });
                Alert.alert(
                    '✅ Logged!',
                    tickedCount + ' exercise' + (tickedCount > 1 ? 's' : '') +
                    ' logged.
Estimated ' + totalCal + ' kcal burned added to Progress.',
                    [{ text: 'OK' }]
                );
            }
        } catch (_) {
            Alert.alert('Error', 'Could not save to progress. Try again.');
        }
        setSavingDay(null);
    };

    return (
        <ScrollView style={s.container} contentContainerStyle={s.content}>
            <TouchableOpacity style={s.backBtn} onPress={() => onNavigate('dashboard')}>
                <Text style={s.backTxt}>{'< Back'}</Text>
            </TouchableOpacity>

            <Text style={s.header}>Weekly Training Schedule</Text>

            {/* Plan badge */}
            <View style={[s.planBadge, { backgroundColor: accent }]}>
                <Text style={s.planTitle}>{plan.title}</Text>
                <Text style={s.planSub}>{plan.subtitle}</Text>
            </View>

            <View style={s.tipBox}>
                <Text style={s.tipTxt}>
                    Tap a day to expand · Tick exercises you complete · Log calories to Progress
                </Text>
            </View>

            {plan.schedule.map((item) => {
                const dayTicked  = getDayTicked(item);
                const dayCal     = getDayCalories(item);
                const isExpanded = expandedDay === item.day;
                const allDone    = !item.isRest && dayTicked === item.exercises.length;

                return (
                    <View key={item.day} style={s.dayWrapper}>

                        {/* Day header row */}
                        <TouchableOpacity
                            style={[
                                s.dayRow,
                                item.isRest && s.dayRowRest,
                                isExpanded && s.dayRowExpanded,
                            ]}
                            onPress={() => toggleExpand(item.day, item.isRest)}
                            activeOpacity={0.8}>
                            <View style={s.dayLeft}>
                                <Text style={s.dayTxt}>{item.day}</Text>
                                <View style={[s.focusBadge, item.isRest && { backgroundColor:'#555' }]}>
                                    <Text style={s.focusTxt}>{item.focus}</Text>
                                </View>
                            </View>

                            {/* Right side: progress or rest */}
                            {item.isRest ? (
                                <Text style={s.restEmoji}>😴</Text>
                            ) : (
                                <View style={s.dayRight}>
                                    {dayTicked > 0 && (
                                        <View style={s.calBadge}>
                                            <Text style={s.calBadgeTxt}>🔥 {dayCal} kcal</Text>
                                        </View>
                                    )}
                                    <Text style={s.progressTxt}>
                                        {dayTicked}/{item.exercises.length}
                                    </Text>
                                    <Text style={s.chevron}>{isExpanded?'▲':'▼'}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Expanded exercises list */}
                        {isExpanded && !item.isRest && (
                            <View style={s.exContainer}>
                                <Text style={s.exHeader}>Exercises — {item.focus}</Text>

                                {item.exercises.map((ex, idx) => {
                                    const done = isTicked(item.day, ex.name);
                                    return (
                                        <View key={idx} style={[s.exRow, done && s.exRowDone]}>
                                            {/* Number */}
                                            <View style={[s.numBadge, done && s.numBadgeDone]}>
                                                <Text style={s.numTxt}>{done ? '✓' : String(idx + 1)}</Text>
                                            </View>

                                            {/* Exercise info */}
                                            <View style={s.exInfo}>
                                                <Text style={[s.exName, done && s.exNameDone]}>
                                                    {ex.name}
                                                </Text>
                                                <Text style={s.exReps}>{ex.reps}</Text>
                                                <Text style={s.exCal}>~{ex.calories} kcal</Text>
                                            </View>

                                            {/* Tick button */}
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

                                {/* Log to progress button */}
                                {dayTicked > 0 && (
                                    <TouchableOpacity
                                        style={[s.logBtn, savingDay===item.day && s.logBtnDis]}
                                        onPress={() => logCaloriesToProgress(item)}
                                        disabled={savingDay===item.day}>
                                        <Text style={s.logBtnTxt}>
                                            {savingDay===item.day
                                                ? 'Saving...'
                                                : '📊  Log ' + dayCal + ' kcal to Progress'}
                                        </Text>
                                    </TouchableOpacity>
                                )}

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
    container:      { flex:1, backgroundColor:'#000' },
    content:        { padding:20, paddingBottom:60 },
    backBtn:        { marginTop:40, marginBottom:20, padding:10, backgroundColor:'#501313', borderRadius:20, alignSelf:'flex-start' },
    backTxt:        { color:'#FFF', fontWeight:'700', fontSize:16 },
    header:         { fontWeight:'700', fontSize:26, color:'#FFF', marginBottom:14, textAlign:'center' },
    planBadge:      { borderRadius:14, padding:16, marginBottom:12, alignItems:'center' },
    planTitle:      { color:'#FFF', fontSize:18, fontWeight:'800' },
    planSub:        { color:'rgba(255,255,255,0.75)', fontSize:13, marginTop:3 },
    tipBox:         { backgroundColor:'#1a1a1a', borderRadius:10, padding:10, marginBottom:18, borderLeftWidth:3, borderLeftColor:'#8B2F3F' },
    tipTxt:         { color:'#AAA', fontSize:12 },

    // Day row
    dayWrapper:     { marginBottom:12 },
    dayRow:         { backgroundColor:'#1a0505', borderRadius:14, padding:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderWidth:1, borderColor:'#390404' },
    dayRowRest:     { backgroundColor:'#1a1a1a', borderColor:'#333' },
    dayRowExpanded: { borderBottomLeftRadius:0, borderBottomRightRadius:0, borderColor:'#8B2F3F' },
    dayLeft:        { flex:1 },
    dayTxt:         { fontWeight:'700', fontSize:17, color:'#FFF', marginBottom:6 },
    focusBadge:     { backgroundColor:'#8B2F3F', alignSelf:'flex-start', borderRadius:8, paddingHorizontal:10, paddingVertical:3 },
    focusTxt:       { color:'#FFF', fontSize:12, fontWeight:'600' },
    dayRight:       { flexDirection:'row', alignItems:'center', gap:8 },
    calBadge:       { backgroundColor:'rgba(255,100,0,0.2)', borderRadius:10, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'rgba(255,100,0,0.4)' },
    calBadgeTxt:    { color:'#FF8844', fontSize:11, fontWeight:'600' },
    progressTxt:    { color:'#AAA', fontSize:13, fontWeight:'600' },
    chevron:        { color:'#AAA', fontSize:14, marginLeft:4 },
    restEmoji:      { fontSize:20 },

    // Exercises container
    exContainer:    { backgroundColor:'#0d0202', borderBottomLeftRadius:14, borderBottomRightRadius:14, padding:14, borderWidth:1, borderTopWidth:0, borderColor:'#8B2F3F' },
    exHeader:       { color:'#FF9944', fontSize:13, fontWeight:'700', marginBottom:12 },
    exRow:          { flexDirection:'row', alignItems:'center', marginBottom:10, padding:10, borderRadius:10, backgroundColor:'rgba(255,255,255,0.04)', gap:10 },
    exRowDone:      { backgroundColor:'rgba(0,180,0,0.08)', borderWidth:1, borderColor:'rgba(0,200,0,0.2)' },
    numBadge:       { width:28, height:28, borderRadius:14, backgroundColor:'#8B2F3F', justifyContent:'center', alignItems:'center' },
    numBadgeDone:   { backgroundColor:'#1a6b1a' },
    numTxt:         { color:'#FFF', fontSize:12, fontWeight:'700' },
    exInfo:         { flex:1 },
    exName:         { fontWeight:'600', fontSize:14, color:'#FFF' },
    exNameDone:     { color:'#00CC66', textDecorationLine:'line-through' },
    exReps:         { fontSize:12, color:'#AAA', marginTop:2 },
    exCal:          { fontSize:11, color:'#FF8844', marginTop:1 },

    // Tick button
    tickBtn:        { backgroundColor:'rgba(139,47,63,0.3)', borderRadius:12, paddingHorizontal:10, paddingVertical:6, borderWidth:1, borderColor:'#8B2F3F' },
    tickBtnDone:    { backgroundColor:'rgba(0,160,0,0.25)', borderColor:'#00CC66' },
    tickTxt:        { color:'#CCC', fontSize:11, fontWeight:'600' },
    tickTxtDone:    { color:'#00CC66' },

    // Log button
    logBtn:         { backgroundColor:'#8B2F3F', borderRadius:12, padding:12, alignItems:'center', marginTop:8 },
    logBtnDis:      { backgroundColor:'#444' },
    logBtnTxt:      { color:'#FFF', fontSize:14, fontWeight:'700' },
    allDoneBadge:   { backgroundColor:'rgba(0,120,0,0.2)', borderRadius:10, padding:10, alignItems:'center', marginTop:8, borderWidth:1, borderColor:'rgba(0,200,0,0.3)' },
    allDoneTxt:     { color:'#00FF88', fontSize:13, fontWeight:'600' },
});