import { Image } from "expo-image";
import { useEffect, useState, useCallback } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

const API_URL = "https://fyp-athletix-production.up.railway.app";

// Map fitness goal to plan name
const GOAL_PLAN_NAME: Record<string, string> = {
    muscle_gain:          "Muscle Gain — PPL Split",
    weight_loss:          "Weight Loss — Fat Loss Plan",
    general_fitness:      "General Fitness — Stay Fit",
    endurance:            "Endurance Training",
    athletic_performance: "Athletic Performance",
    stay_fit:             "General Fitness — Stay Fit",
};

// Day focus per goal (Day 1-7)
const GOAL_DAY_FOCUS: Record<string, string[]> = {
    muscle_gain:     ["Push","Pull","Legs","Rest","Push","Pull","Legs"],
    weight_loss:     ["Full Body Circuit","HIIT Cardio","Strength","LISS Cardio","Metabolic Circuit","Light Activity","Rest"],
    general_fitness: ["Full Body","Cardio","Mobility","Strength + Core","Light Activity","Optional","Rest"],
    endurance:       ["Long Run","Intervals","Cross Training","Tempo Run","Strength","Recovery","Rest"],
    athletic_performance: ["Power","Speed","Strength Upper","Rest","Lower Body Power","Conditioning","Rest"],
    stay_fit:        ["Full Body","Cardio","Mobility","Strength + Core","Light Activity","Optional","Rest"],
};

export default function DashboardScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const { username, accessToken, fitness_goal } = useSelector((state: RootState) => state.user);

    const [streak, setStreak]           = useState(0);
    const [totalWorkouts, setTotalWorkouts] = useState(0);
    const [xpPoints, setXpPoints]       = useState(0);
    const [loading, setLoading]         = useState(true);

    const today     = new Date();
    const hour      = today.getHours();
    const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const dateStr   = today.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });

    // Today is weekday 0=Sun..6=Sat → workout day 1=Mon..7=Sun
    const weekday     = today.getDay(); // 0=Sun
    const dayNum      = weekday === 0 ? 7 : weekday; // 1=Mon..7=Sun
    const dayLabel    = "Day " + dayNum;
    const goal        = fitness_goal || "general_fitness";
    const focusArr    = GOAL_DAY_FOCUS[goal] || GOAL_DAY_FOCUS.general_fitness;
    const todayFocus  = focusArr[dayNum - 1] || "Rest";
    const planName    = GOAL_PLAN_NAME[goal] || "Workout Plan";
    const isRestDay   = todayFocus === "Rest";

    useEffect(() => { fetchStats(); }, []);

    // Refresh stats every time user returns to dashboard
    useFocusEffect(
        useCallback(() => {
            fetchStats();
        }, [])
    );

    const fetchStats = async () => {
        if (!accessToken) { setLoading(false); return; }
        try {
            const h = { Authorization: "Bearer " + accessToken };
            const [latestRes, sessionsRes] = await Promise.all([
                fetch(API_URL + "/api/v1/progress/latest", { headers: h }),
                fetch(API_URL + "/api/v1/workouts/sessions",  { headers: h }),
            ]);
            if (latestRes.ok) {
                const lat = await latestRes.json();
                setStreak(lat.streak_days || 0);
                setXpPoints(lat.xp_points || 0);
            }
            if (sessionsRes.ok) {
                const ses = await sessionsRes.json();
                setTotalWorkouts(Array.isArray(ses) ? ses.length : 0);
            }
        } catch (_) {}
        setLoading(false);
    };

    return (
        <ScrollView style={s.container} contentContainerStyle={s.scroll}>

            {/* Header */}
            <View style={s.header}>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/logo_y5zeid.png"
                    style={s.logo} contentFit="contain"/>
                <TouchableOpacity style={s.settingsBtn} onPress={() => onNavigate("settings")} hitSlop={{top:12,bottom:12,left:12,right:12}}>
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

            {/* Live stats row */}
            <View style={s.statsRow}>
                <View style={s.statBox}>
                    <Text style={s.statNum}>{loading ? "—" : totalWorkouts}</Text>
                    <Text style={s.statLbl}>Workouts</Text>
                </View>
                <View style={[s.statBox, s.statBoxMid]}>
                    <Text style={s.statNum}>{loading ? "—" : streak}</Text>
                    <Text style={s.statLbl}>Day Streak 🔥</Text>
                </View>
                <View style={s.statBox}>
                    <Text style={s.statNum}>{loading ? "—" : xpPoints}</Text>
                    <Text style={s.statLbl}>XP Points ⭐</Text>
                </View>
            </View>

            {/* Today's workout card */}
            <TouchableOpacity style={s.workoutCard} onPress={() => onNavigate("workoutSchedule")} activeOpacity={0.85}>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/main_page_ejn0tf.jpg"
                    style={s.workoutImg} contentFit="cover"/>
                <View style={s.workoutOverlay}>
                    <Text style={s.workoutCardLabel}>Today's Workout Plan</Text>
                    <Text style={s.workoutCardDay}>{dayLabel} — {todayFocus}</Text>
                    <Text style={s.workoutCardPlan}>{planName}</Text>
                    {isRestDay
                        ? <View style={s.restBadge}><Text style={s.restBadgeTxt}>😴 Rest Day</Text></View>
                        : <View style={s.startBadge}><Text style={s.startBadgeTxt}>Tap to view exercises →</Text></View>
                    }
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

            {/* Arixa chatbot card */}
            <View style={s.chatCard}>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/chat_a9uzwz.png"
                    style={s.chatImg} contentFit="contain"/>
                <View style={s.chatContent}>
                    <Text style={s.chatTxt}>
                        {"Hey! I'm Arixa. Your Virtual AI Trainer. I'm available to answer your fitness questions anytime."}
                    </Text>
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

    // Header
    header:          { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:20, paddingTop:52, paddingBottom:8 },
    logo:            { width:160, height:56 },
    settingsBtn:     { width:44, height:44, borderRadius:22, backgroundColor:"rgba(255,255,255,0.1)", justifyContent:"center", alignItems:"center" },
    settingsIcon:    { width:26, height:26 },

    // Greeting
    greeting:        { paddingHorizontal:20, paddingTop:8, paddingBottom:16 },
    greetTxt:        { fontSize:28, fontWeight:"700", color:"#FFF" },
    greetSub:        { fontSize:20, fontWeight:"600", color:"#CCC", marginTop:2 },
    dateTxt:         { fontSize:13, color:"#6A040F", fontWeight:"700", marginTop:4 },

    // Stats row
    statsRow:        { flexDirection:"row", marginHorizontal:20, marginBottom:16, gap:10 },
    statBox:         { flex:1, backgroundColor:"#1a0505", borderRadius:14, padding:14, alignItems:"center", borderWidth:1, borderColor:"#390404" },
    statBoxMid:      { borderColor:"#8B2F3F" },
    statNum:         { fontSize:22, fontWeight:"800", color:"#FFF" },
    statLbl:         { fontSize:11, color:"#AAA", marginTop:3, textAlign:"center" },

    // Today workout card
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

    // Module buttons
    moduleBtn:       { marginHorizontal:20, marginBottom:10, backgroundColor:"#1a0505", borderRadius:16, borderWidth:1, borderColor:"#390404" },
    moduleBtnInner:  { flexDirection:"row", alignItems:"center", padding:18 },
    moduleBtnTitle:  { fontSize:20, fontWeight:"700", color:"#FFF", marginBottom:3 },
    moduleBtnSub:    { fontSize:12, color:"#AAA" },
    moduleBtnArrow:  { fontSize:22, color:"#8B2F3F", marginLeft:10 },
    moduleIcon:      { width:44, height:44, marginLeft:10 },

    // Chat card
    chatCard:        { marginHorizontal:20, marginTop:4, backgroundColor:"#0d0000", borderRadius:16, borderWidth:1, borderColor:"#390404", flexDirection:"row", alignItems:"center", padding:16, gap:12 },
    chatImg:         { width:90, height:60 },
    chatContent:     { flex:1 },
    chatTxt:         { fontSize:12, color:"#CCC", lineHeight:18, marginBottom:10 },
    chatBtn:         { backgroundColor:"#501313", borderRadius:20, paddingHorizontal:18, paddingVertical:8, alignSelf:"flex-start" },
    chatBtnTxt:      { color:"#FFF", fontWeight:"700", fontSize:14 },
});