import { Image } from "expo-image";
import { useEffect, useRef } from "react";
import { AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { useAppData } from "../context/AppDataContext";

const GOAL_PLAN_NAME: Record<string, string> = {
    muscle_gain:          "Muscle Gain — PPL Split",
    weight_loss:          "Weight Loss — Fat Loss Plan",
    general_fitness:      "General Fitness — Stay Fit",
    endurance:            "Endurance Training",
    athletic_performance: "Athletic Performance",
    stay_fit:             "General Fitness — Stay Fit",
};

const GOAL_DAY_FOCUS: Record<string, string[]> = {
    muscle_gain:          ["Push","Pull","Legs","Rest","Push","Pull","Legs"],
    weight_loss:          ["Full Body Circuit","HIIT Cardio","Strength","LISS Cardio","Metabolic Circuit","Light Activity","Rest"],
    general_fitness:      ["Full Body","Cardio","Mobility","Strength + Core","Light Activity","Optional","Rest"],
    endurance:            ["Long Run","Intervals","Cross Training","Tempo Run","Strength","Recovery","Rest"],
    athletic_performance: ["Power","Speed","Strength Upper","Rest","Lower Body Power","Conditioning","Rest"],
    stay_fit:             ["Full Body","Cardio","Mobility","Strength + Core","Light Activity","Optional","Rest"],
};

export default function DashboardScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const { username } = useSelector((state: RootState) => state.user);
    const { data, refreshSilent } = useAppData();

    const today    = new Date();
    const hour     = today.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const dateStr  = today.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });

    // Today workout day — calculated from signup date (matches WorkoutSchedule)
    const goal = data.fitness_goal || "general_fitness";
    let dayNum = 1;
    if (data.created_at) {
        const signup   = new Date(data.created_at);
        const daysSince = Math.floor((today.getTime() - signup.getTime()) / (1000*60*60*24));
        dayNum = (daysSince % 7) + 1; // 1-7
    } else {
        // Fallback to calendar weekday
        const weekday = today.getDay();
        dayNum = weekday === 0 ? 7 : weekday;
    }
    const focusArr   = GOAL_DAY_FOCUS[goal] || GOAL_DAY_FOCUS.general_fitness;
    const todayFocus = focusArr[dayNum - 1] || "Rest";
    const planName   = GOAL_PLAN_NAME[goal] || "Workout Plan";
    const isRestDay  = todayFocus === "Rest";

    // Refresh every time user returns to dashboard
    // Refresh when app comes to foreground
    const appState = useRef(AppState.currentState);
    useEffect(() => {
        const sub = AppState.addEventListener('change', next => {
            if (appState.current.match(/inactive|background/) && next === 'active') {
                refreshSilent();
            }
            appState.current = next;
        });
        return () => sub.remove();
    }, []);

    return (
        <ScrollView style={s.container} contentContainerStyle={s.scroll}>
            {/* Header */}
            <View style={s.header}>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/logo_y5zeid.png"
                    style={s.logo} contentFit="contain"/>
                <TouchableOpacity style={s.settingsBtn} onPress={() => onNavigate("settings")}
                    hitSlop={{top:12,bottom:12,left:12,right:12}}>
                    <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764732296/seting_vyelz2.png"
                        style={s.settingsIcon} contentFit="contain"/>
                </TouchableOpacity>
            </View>

            {/* Greeting */}
            <View style={s.greeting}>
                <Text style={s.greetTxt}>Hello {username || "User"},</Text>
                <Text style={s.greetSub}>{greeting} 👋</Text>
                <Text style={s.dateTxt}>{dateStr}</Text>
            </View>

            {/* Live stats — from global context — auto-refresh on focus */}
            <View style={s.statsRow}>
                <View style={s.statBox}>
                    <Text style={s.statNum}>{data.loading ? "—" : data.total_workouts}</Text>
                    <Text style={s.statLbl}>Workouts</Text>
                </View>
                <View style={[s.statBox, s.statBoxMid]}>
                    <Text style={s.statNum}>{data.loading ? "—" : data.streak_days}</Text>
                    <Text style={s.statLbl}>Streak 🔥</Text>
                </View>
                <View style={s.statBox}>
                    <Text style={s.statNum}>{data.loading ? "—" : data.xp_points}</Text>
                    <Text style={s.statLbl}>XP ⭐</Text>
                </View>
            </View>
            {/* Calories burned today badge */}
            {!data.loading && (() => {
                const todayCal = data.progress
                    .filter((p: any) => Math.floor((Date.now() - new Date(p.recorded_at).getTime()) / 86400000) < 1)
                    .reduce((sum: number, p: any) => sum + (p.total_calories_burned || 0), 0);
                return todayCal > 0 ? (
                    <View style={s.calBurnedRow}>
                        <Text style={s.calBurnedTxt}>🔥 {Math.round(todayCal)} kcal burned today</Text>
                    </View>
                ) : null;
            })()}

            {/* Today workout card */}
            <TouchableOpacity style={s.workoutCard} onPress={() => onNavigate("workoutSchedule")} activeOpacity={0.85}>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/main_page_ejn0tf.jpg"
                    style={s.workoutImg} contentFit="cover"/>
                <View style={s.workoutOverlay}>
                    <Text style={s.workoutCardLabel}>Today's Workout Plan</Text>
                    <Text style={s.workoutCardDay}>Day {dayNum} — {todayFocus}</Text>
                    <Text style={s.workoutCardPlan}>{planName}</Text>
                    {isRestDay
                        ? <View style={s.restBadge}><Text style={s.restBadgeTxt}>😴 Rest Day</Text></View>
                        : <View style={s.startBadge}><Text style={s.startBadgeTxt}>Tap to view exercises →</Text></View>}
                </View>
            </TouchableOpacity>

            {/* Module buttons */}
            <TouchableOpacity style={s.moduleBtn} onPress={() => onNavigate("progress")} activeOpacity={0.85}>
                <View style={s.moduleBtnInner}>
                    <View>
                        <Text style={s.moduleBtnTitle}>Progress Tracker</Text>
                        <Text style={s.moduleBtnSub}>Review your stats & stay on track</Text>
                    </View>
                    <Text style={s.moduleBtnArrow}>→</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.moduleBtn} onPress={() => onNavigate("formAnalysis")} activeOpacity={0.85}>
                <View style={s.moduleBtnInner}>
                    <View style={{flex:1}}>
                        <Text style={s.moduleBtnTitle}>Form Analysis</Text>
                        <Text style={s.moduleBtnSub}>Improve your form & reduce injury</Text>
                    </View>
                    <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764693102/camera_kqmnd3.png"
                        style={s.moduleIcon} contentFit="contain"/>
                </View>
            </TouchableOpacity>

            {/* Arixa chat */}
            <View style={s.chatCard}>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/chat_a9uzwz.png"
                    style={s.chatImg} contentFit="contain"/>
                <View style={s.chatContent}>
                    <Text style={s.chatTxt}>{"Hey! I'm Arixa. Your Virtual AI Trainer. Available to answer your fitness questions anytime."}</Text>
                    <TouchableOpacity style={s.chatBtn} onPress={() => onNavigate("chat")}>
                        <Text style={s.chatBtnTxt}>Chat now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container:       { flex:1, backgroundColor:"#000" },
    scroll:          { flexGrow:1, paddingBottom:100 },
    header:          { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:20, paddingTop:52, paddingBottom:8 },
    logo:            { width:160, height:56 },
    settingsBtn:     { width:44, height:44, borderRadius:22, backgroundColor:"rgba(255,255,255,0.1)", justifyContent:"center", alignItems:"center" },
    settingsIcon:    { width:26, height:26 },
    greeting:        { paddingHorizontal:20, paddingTop:8, paddingBottom:16 },
    greetTxt:        { fontSize:28, fontWeight:"700", color:"#FFF" },
    greetSub:        { fontSize:20, fontWeight:"600", color:"#CCC", marginTop:2 },
    dateTxt:         { fontSize:13, color:"#6A040F", fontWeight:"700", marginTop:4 },
    statsRow:        { flexDirection:"row", marginHorizontal:20, marginBottom:16, gap:10 },
    statBox:         { flex:1, backgroundColor:"#1a0505", borderRadius:14, padding:14, alignItems:"center", borderWidth:1, borderColor:"#390404" },
    statBoxMid:      { borderColor:"#8B2F3F" },
    statNum:         { fontSize:22, fontWeight:"800", color:"#FFF" },
    statLbl:         { fontSize:11, color:"#AAA", marginTop:3, textAlign:"center" },
    workoutCard:     { marginHorizontal:20, borderRadius:20, overflow:"hidden", marginBottom:14, height:180 },
    workoutImg:      { position:"absolute", width:"100%", height:"100%", borderRadius:20 },
    workoutOverlay:  { flex:1, backgroundColor:"rgba(0,0,0,0.55)", padding:20, justifyContent:"flex-end" },
    workoutCardLabel:{ fontSize:12, color:"#FFD700", fontWeight:"700", letterSpacing:0.5, marginBottom:4 },
    workoutCardDay:  { fontSize:22, fontWeight:"800", color:"#FFF", marginBottom:2 },
    workoutCardPlan: { fontSize:12, color:"#CCC", marginBottom:10 },
    restBadge:       { backgroundColor:"rgba(60,60,60,0.85)", alignSelf:"flex-start", borderRadius:10, paddingHorizontal:12, paddingVertical:5 },
    restBadgeTxt:    { color:"#FFF", fontSize:13 },
    startBadge:      { backgroundColor:"rgba(139,47,63,0.9)", alignSelf:"flex-start", borderRadius:10, paddingHorizontal:12, paddingVertical:5 },
    startBadgeTxt:   { color:"#FFF", fontSize:13, fontWeight:"600" },
    moduleBtn:       { marginHorizontal:20, marginBottom:10, backgroundColor:"#1a0505", borderRadius:16, borderWidth:1, borderColor:"#390404" },
    moduleBtnInner:  { flexDirection:"row", alignItems:"center", padding:18 },
    moduleBtnTitle:  { fontSize:20, fontWeight:"700", color:"#FFF", marginBottom:3 },
    moduleBtnSub:    { fontSize:12, color:"#AAA" },
    moduleBtnArrow:  { fontSize:22, color:"#8B2F3F", marginLeft:10 },
    moduleIcon:      { width:44, height:44, marginLeft:10 },
    calBurnedRow:    { marginHorizontal:20, marginBottom:10, backgroundColor:"rgba(255,100,0,0.1)", borderRadius:10, padding:8, alignItems:"center", borderWidth:1, borderColor:"rgba(255,100,0,0.3)" },
    calBurnedTxt:    { color:"#FF8844", fontSize:13, fontWeight:"600" },
    chatCard:        { marginHorizontal:20, marginTop:4, backgroundColor:"#0d0000", borderRadius:16, borderWidth:1, borderColor:"#390404", flexDirection:"row", alignItems:"center", padding:16, gap:12 },
    chatImg:         { width:90, height:60 },
    chatContent:     { flex:1 },
    chatTxt:         { fontSize:12, color:"#CCC", lineHeight:18, marginBottom:10 },
    chatBtn:         { backgroundColor:"#501313", borderRadius:20, paddingHorizontal:18, paddingVertical:8, alignSelf:"flex-start" },
    chatBtnTxt:      { color:"#FFF", fontWeight:"700", fontSize:14 },
});