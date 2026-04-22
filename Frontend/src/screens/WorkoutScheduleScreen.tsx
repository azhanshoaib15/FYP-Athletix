import React, { useState } from 'react';
import {
    LayoutAnimation, Platform, ScrollView, StyleSheet,
    Text, TouchableOpacity, UIManager, View
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkoutScheduleScreenProps {
    onNavigate: (screen: 'dashboard') => void;
}

interface Exercise {
    name: string;
    reps: string;
}

interface DaySchedule {
    day: string;
    focus: string;
    isRest: boolean;
    exercises: Exercise[];
}

// ── All workout plans ─────────────────────────────────────────────────────────

const PLANS: Record<string, { title: string; subtitle: string; schedule: DaySchedule[] }> = {

    // General Fitness / Stay Fit
    general_fitness: {
        title: "General Fitness",
        subtitle: "Stay Fit Plan",
        schedule: [
            {
                day: "Day 1", focus: "Full Body", isRest: false,
                exercises: [
                    { name: "Squats",    reps: "3 sets x 15 reps" },
                    { name: "Push-ups",  reps: "3 sets x 12 reps" },
                    { name: "Rows",      reps: "3 sets x 12 reps" },
                    { name: "Plank",     reps: "3 sets x 30 seconds" },
                ],
            },
            {
                day: "Day 2", focus: "Cardio", isRest: false,
                exercises: [
                    { name: "Jogging or Cycling", reps: "30 minutes steady pace" },
                ],
            },
            {
                day: "Day 3", focus: "Mobility", isRest: false,
                exercises: [
                    { name: "Yoga / Stretching", reps: "30-45 minutes" },
                    { name: "Foam Rolling",       reps: "10-15 minutes" },
                ],
            },
            {
                day: "Day 4", focus: "Strength + Core", isRest: false,
                exercises: [
                    { name: "Lunges",         reps: "3 sets x 12 reps" },
                    { name: "DB Chest Press", reps: "3 sets x 10 reps" },
                    { name: "Plank Hold",     reps: "3 sets x 30 seconds" },
                    { name: "Russian Twists", reps: "3 sets x 20 reps" },
                    { name: "Mountain Climbers", reps: "3 sets x 20 reps" },
                ],
            },
            {
                day: "Day 5", focus: "Light Activity", isRest: false,
                exercises: [
                    { name: "Walk", reps: "30-45 minutes" },
                    { name: "Recreational Activity", reps: "As preferred" },
                ],
            },
            {
                day: "Day 6", focus: "Optional", isRest: false,
                exercises: [
                    { name: "Light Cardio", reps: "20-30 minutes" },
                    { name: "Stretching",   reps: "10-15 minutes" },
                ],
            },
            {
                day: "Day 7", focus: "Rest", isRest: true,
                exercises: [],
            },
        ],
    },

    // Endurance Training
    endurance: {
        title: "Endurance Training",
        subtitle: "Cardio & Stamina Plan",
        schedule: [
            {
                day: "Day 1", focus: "Long Run", isRest: false,
                exercises: [
                    { name: "Steady Pace Run", reps: "60-90 minutes" },
                ],
            },
            {
                day: "Day 2", focus: "Intervals", isRest: false,
                exercises: [
                    { name: "400m Fast Sprint", reps: "x 8 rounds" },
                    { name: "Rest between runs", reps: "90 seconds each" },
                ],
            },
            {
                day: "Day 3", focus: "Cross Training", isRest: false,
                exercises: [
                    { name: "Cycling or Swimming", reps: "45-60 minutes" },
                ],
            },
            {
                day: "Day 4", focus: "Tempo Run", isRest: false,
                exercises: [
                    { name: "Moderate-Hard Pace Run", reps: "20 minutes" },
                ],
            },
            {
                day: "Day 5", focus: "Strength", isRest: false,
                exercises: [
                    { name: "Squats", reps: "3 sets x 8 reps" },
                    { name: "Lunges", reps: "3 sets x 10 reps" },
                    { name: "Plank",  reps: "3 sets x 30 seconds" },
                    { name: "Core Circuit", reps: "2 rounds" },
                ],
            },
            {
                day: "Day 6", focus: "Recovery", isRest: false,
                exercises: [
                    { name: "Easy Jog or Walk", reps: "20-30 minutes" },
                    { name: "Stretching",       reps: "10-15 minutes" },
                ],
            },
            {
                day: "Day 7", focus: "Rest", isRest: true,
                exercises: [],
            },
        ],
    },

    // Muscle Gain / Hypertrophy PPL
    muscle_gain: {
        title: "Muscle Gain",
        subtitle: "Hypertrophy PPL Split",
        schedule: [
            {
                day: "Day 1", focus: "Push", isRest: false,
                exercises: [
                    { name: "Bench Press",       reps: "4 sets x 6-10 reps" },
                    { name: "Incline DB Press",   reps: "3 sets x 8-12 reps" },
                    { name: "Shoulder Press",     reps: "3 sets x 8-10 reps" },
                    { name: "Tricep Pushdown",    reps: "3 sets x 12 reps" },
                ],
            },
            {
                day: "Day 2", focus: "Pull", isRest: false,
                exercises: [
                    { name: "Deadlift",       reps: "4 sets x 5 reps" },
                    { name: "Pull-ups",       reps: "4 sets x 8 reps" },
                    { name: "Barbell Row",    reps: "3 sets x 8-10 reps" },
                    { name: "Bicep Curl",     reps: "3 sets x 12 reps" },
                ],
            },
            {
                day: "Day 3", focus: "Legs", isRest: false,
                exercises: [
                    { name: "Squat",           reps: "4 sets x 6-10 reps" },
                    { name: "Leg Press",       reps: "3 sets x 10 reps" },
                    { name: "Hamstring Curl",  reps: "3 sets x 12 reps" },
                    { name: "Calf Raises",     reps: "4 sets x 15 reps" },
                ],
            },
            {
                day: "Day 4", focus: "Rest", isRest: true,
                exercises: [],
            },
            {
                day: "Day 5", focus: "Push (Repeat)", isRest: false,
                exercises: [
                    { name: "Bench Press",       reps: "4 sets x 6-10 reps" },
                    { name: "Incline DB Press",   reps: "3 sets x 8-12 reps" },
                    { name: "Shoulder Press",     reps: "3 sets x 8-10 reps" },
                    { name: "Tricep Pushdown",    reps: "3 sets x 12 reps" },
                ],
            },
            {
                day: "Day 6", focus: "Pull (Repeat)", isRest: false,
                exercises: [
                    { name: "Deadlift",       reps: "4 sets x 5 reps" },
                    { name: "Pull-ups",       reps: "4 sets x 8 reps" },
                    { name: "Barbell Row",    reps: "3 sets x 8-10 reps" },
                    { name: "Bicep Curl",     reps: "3 sets x 12 reps" },
                ],
            },
            {
                day: "Day 7", focus: "Legs (Repeat)", isRest: false,
                exercises: [
                    { name: "Squat",           reps: "4 sets x 6-10 reps" },
                    { name: "Leg Press",       reps: "3 sets x 10 reps" },
                    { name: "Hamstring Curl",  reps: "3 sets x 12 reps" },
                    { name: "Calf Raises",     reps: "4 sets x 15 reps" },
                ],
            },
        ],
    },

    // Weight Loss / Fat Loss
    weight_loss: {
        title: "Weight Loss",
        subtitle: "Fat Loss Plan",
        schedule: [
            {
                day: "Day 1", focus: "Full Body Circuit", isRest: false,
                exercises: [
                    { name: "Squats",       reps: "3 sets x 12 reps" },
                    { name: "DB Press",     reps: "3 sets x 12 reps" },
                    { name: "Lat Pulldown", reps: "3 sets x 12 reps" },
                    { name: "Lunges",       reps: "3 sets x 15 reps" },
                    { name: "Plank",        reps: "3 sets x 30 seconds" },
                ],
            },
            {
                day: "Day 2", focus: "HIIT Cardio", isRest: false,
                exercises: [
                    { name: "Sprint",    reps: "30 seconds x 10-12 rounds" },
                    { name: "Walk rest", reps: "60 seconds between sprints" },
                ],
            },
            {
                day: "Day 3", focus: "Strength", isRest: false,
                exercises: [
                    { name: "Deadlift",       reps: "4 sets x 8 reps" },
                    { name: "Shoulder Press", reps: "3 sets x 10 reps" },
                    { name: "Seated Row",     reps: "3 sets x 10 reps" },
                    { name: "Step-ups",       reps: "3 sets x 12 reps" },
                ],
            },
            {
                day: "Day 4", focus: "LISS Cardio", isRest: false,
                exercises: [
                    { name: "Incline Walk", reps: "30-45 minutes" },
                ],
            },
            {
                day: "Day 5", focus: "Metabolic Circuit", isRest: false,
                exercises: [
                    { name: "KB Swings",        reps: "3 sets x 15 reps" },
                    { name: "Burpees",          reps: "3 sets x 10 reps" },
                    { name: "Mountain Climbers",reps: "3 sets x 20 reps" },
                    { name: "Battle Ropes",     reps: "3 sets x 30 seconds" },
                ],
            },
            {
                day: "Day 6", focus: "Light Activity", isRest: false,
                exercises: [
                    { name: "Walk", reps: "8,000-12,000 steps" },
                ],
            },
            {
                day: "Day 7", focus: "Rest", isRest: true,
                exercises: [],
            },
        ],
    },

    // Athletic Performance
    athletic_performance: {
        title: "Athletic Performance",
        subtitle: "Speed & Power Plan",
        schedule: [
            {
                day: "Day 1", focus: "Power", isRest: false,
                exercises: [
                    { name: "Power Cleans",   reps: "4 sets x 5 reps" },
                    { name: "Box Jumps",      reps: "4 sets x 6 reps" },
                    { name: "Squat",          reps: "4 sets x 6 reps" },
                    { name: "Sprint Drills",  reps: "10 minutes" },
                ],
            },
            {
                day: "Day 2", focus: "Speed", isRest: false,
                exercises: [
                    { name: "40m Sprint",     reps: "x 8 rounds" },
                    { name: "Agility Ladder", reps: "4 sets" },
                    { name: "Cone Drills",    reps: "4 sets" },
                ],
            },
            {
                day: "Day 3", focus: "Strength Upper", isRest: false,
                exercises: [
                    { name: "Bench Press",    reps: "4 sets x 5 reps" },
                    { name: "Pull-ups",       reps: "4 sets x 8 reps" },
                    { name: "Shoulder Press", reps: "3 sets x 8 reps" },
                    { name: "Rows",           reps: "3 sets x 10 reps" },
                ],
            },
            {
                day: "Day 4", focus: "Rest / Recovery", isRest: true,
                exercises: [],
            },
            {
                day: "Day 5", focus: "Lower Body Power", isRest: false,
                exercises: [
                    { name: "Deadlift",      reps: "4 sets x 5 reps" },
                    { name: "Leg Press",     reps: "3 sets x 8 reps" },
                    { name: "Box Jumps",     reps: "3 sets x 8 reps" },
                    { name: "Calf Raises",   reps: "4 sets x 15 reps" },
                ],
            },
            {
                day: "Day 6", focus: "Conditioning", isRest: false,
                exercises: [
                    { name: "Circuit Training", reps: "3 rounds" },
                    { name: "Swimming / Bike",  reps: "30 minutes" },
                ],
            },
            {
                day: "Day 7", focus: "Rest", isRest: true,
                exercises: [],
            },
        ],
    },
};

// Map fitness_goal values to plan keys
const GOAL_TO_PLAN: Record<string, string> = {
    general_fitness:      "general_fitness",
    stay_fit:             "general_fitness",
    endurance:            "endurance",
    muscle_gain:          "muscle_gain",
    build_muscle:         "muscle_gain",
    hypertrophy:          "muscle_gain",
    weight_loss:          "weight_loss",
    lose_weight:          "weight_loss",
    fat_loss:             "weight_loss",
    athletic_performance: "athletic_performance",
    performance:          "athletic_performance",
};

// Goal labels for display
const GOAL_LABELS: Record<string, string> = {
    general_fitness:      "General Fitness",
    muscle_gain:          "Muscle Gain",
    weight_loss:          "Weight Loss",
    endurance:            "Endurance",
    athletic_performance: "Athletic Performance",
};

// Goal colors
const GOAL_COLORS: Record<string, string> = {
    general_fitness:      "#1a5c3a",
    muscle_gain:          "#390404",
    weight_loss:          "#4a2c00",
    endurance:            "#0a3a5c",
    athletic_performance: "#3a0a5c",
};

export default function WorkoutScheduleScreen({ onNavigate }: WorkoutScheduleScreenProps) {
    const fitnessGoal = useSelector((state: RootState) => state.user.fitness_goal) || "general_fitness";
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    // Get the correct plan based on user goal
    const planKey = GOAL_TO_PLAN[fitnessGoal] || "general_fitness";
    const plan = PLANS[planKey];
    const accentColor = GOAL_COLORS[planKey] || "#390404";

    const toggleExpand = (day: string, isRest: boolean) => {
        if (isRest) return;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedDay(expandedDay === day ? null : day);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => onNavigate("dashboard")}>
                <Text style={styles.backButtonText}>{"< Back"}</Text>
            </TouchableOpacity>

            {/* Header */}
            <Text style={styles.header}>Weekly Training Schedule</Text>

            {/* Plan badge */}
            <View style={[styles.planBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.planBadgeGoal}>{GOAL_LABELS[planKey] || plan.title}</Text>
                <Text style={styles.planBadgeSub}>{plan.subtitle}</Text>
            </View>

            {/* Tip */}
            <View style={styles.tipBox}>
                <Text style={styles.tipText}>
                    Tap any day to expand exercises. Tap again to collapse.
                </Text>
            </View>

            {/* Schedule */}
            {plan.schedule.map((item) => (
                <View key={item.day} style={styles.dayWrapper}>
                    <TouchableOpacity
                        style={[
                            styles.dayContainer,
                            item.isRest && styles.restDayContainer,
                            expandedDay === item.day && styles.dayContainerExpanded,
                        ]}
                        onPress={() => toggleExpand(item.day, item.isRest)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.dayLeft}>
                            <Text style={styles.dayText}>{item.day}</Text>
                            <View style={[styles.focusBadge, item.isRest && { backgroundColor: "#555" }]}>
                                <Text style={styles.focusBadgeTxt}>{item.focus}</Text>
                            </View>
                        </View>
                        <Text style={styles.expandIcon}>
                            {item.isRest ? "😴" : expandedDay === item.day ? "▲" : "▼"}
                        </Text>
                    </TouchableOpacity>

                    {expandedDay === item.day && !item.isRest && (
                        <View style={styles.exercisesContainer}>
                            <Text style={styles.exercisesHeader}>Exercises for {item.day}</Text>
                            {item.exercises.map((exercise, index) => (
                                <View key={index} style={styles.exerciseRow}>
                                    <View style={styles.exerciseNumBadge}>
                                        <Text style={styles.exerciseNum}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.exerciseInfo}>
                                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                                        <Text style={styles.exerciseReps}>{exercise.reps}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container:           { flex:1, backgroundColor:"#000000" },
    contentContainer:    { padding:20, paddingBottom:60 },
    backButton:          { marginBottom:20, marginTop:40, padding:10, backgroundColor:"#501313", borderRadius:20, alignSelf:"flex-start" },
    backButtonText:      { color:"#FFFFFF", fontWeight:"700", fontSize:16 },
    header:              { fontWeight:"700", fontSize:26, color:"#FFFFFF", marginBottom:14, textAlign:"center" },
    planBadge:           { borderRadius:14, padding:16, marginBottom:12, alignItems:"center" },
    planBadgeGoal:       { color:"#FFFFFF", fontSize:18, fontWeight:"800" },
    planBadgeSub:        { color:"rgba(255,255,255,0.75)", fontSize:13, marginTop:3 },
    tipBox:              { backgroundColor:"#1a1a1a", borderRadius:10, padding:10, marginBottom:18, borderLeftWidth:3, borderLeftColor:"#8B2F3F" },
    tipText:             { color:"#AAA", fontSize:12 },
    dayWrapper:          { marginBottom:12 },
    dayContainer:        { backgroundColor:"#1a0505", borderRadius:14, padding:18, flexDirection:"row", justifyContent:"space-between", alignItems:"center", borderWidth:1, borderColor:"#390404" },
    dayContainerExpanded:{ borderBottomLeftRadius:0, borderBottomRightRadius:0, borderColor:"#8B2F3F" },
    restDayContainer:    { backgroundColor:"#1a1a1a", borderColor:"#333" },
    dayLeft:             { flex:1 },
    dayText:             { fontWeight:"700", fontSize:17, color:"#FFFFFF", marginBottom:6 },
    focusBadge:          { backgroundColor:"#8B2F3F", alignSelf:"flex-start", borderRadius:8, paddingHorizontal:10, paddingVertical:3 },
    focusBadgeTxt:       { color:"#FFF", fontSize:12, fontWeight:"600" },
    expandIcon:          { color:"#AAAAAA", fontSize:16, marginLeft:10 },
    exercisesContainer:  { backgroundColor:"#120202", borderBottomLeftRadius:14, borderBottomRightRadius:14, padding:16, borderWidth:1, borderTopWidth:0, borderColor:"#8B2F3F" },
    exercisesHeader:     { color:"#FF9944", fontSize:13, fontWeight:"700", marginBottom:12 },
    exerciseRow:         { flexDirection:"row", alignItems:"center", marginBottom:12, paddingBottom:10, borderBottomWidth:1, borderBottomColor:"#2a0505" },
    exerciseNumBadge:    { width:28, height:28, borderRadius:14, backgroundColor:"#8B2F3F", justifyContent:"center", alignItems:"center", marginRight:12 },
    exerciseNum:         { color:"#FFF", fontSize:12, fontWeight:"700" },
    exerciseInfo:        { flex:1 },
    exerciseName:        { fontWeight:"600", fontSize:15, color:"#FFFFFF" },
    exerciseReps:        { fontSize:13, color:"#AAAAAA", marginTop:2 },
});