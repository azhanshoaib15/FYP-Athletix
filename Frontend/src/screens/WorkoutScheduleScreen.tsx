import React, { useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
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
    title: string;
    isRest: boolean;
    exercises: Exercise[];
}

const schedule: DaySchedule[] = [
    {
        day: 'Day 1',
        title: 'Chest, Shoulders & Triceps (Push)',
        isRest: false,
        exercises: [
            { name: 'Bench Press', reps: '3 sets x 8-12 reps' },
            { name: 'Overhead Press', reps: '3 sets x 8-12 reps' },
            { name: 'Incline Dumbbell Press', reps: '3 sets x 10-12 reps' },
            { name: 'Lateral Raises', reps: '3 sets x 12-15 reps' },
            { name: 'Tricep Pushdowns', reps: '3 sets x 12-15 reps' },
        ],
    },
    {
        day: 'Day 2',
        title: 'Legs & Glutes',
        isRest: false,
        exercises: [
            { name: 'Squats', reps: '3 sets x 8-10 reps' },
            { name: 'Romanian Deadlifts', reps: '3 sets x 10-12 reps' },
            { name: 'Leg Press', reps: '3 sets x 10-12 reps' },
            { name: 'Leg Curls', reps: '3 sets x 12-15 reps' },
            { name: 'Calf Raises', reps: '4 sets x 15-20 reps' },
        ],
    },
    {
        day: 'Day 3',
        title: 'Back & Biceps (Pull)',
        isRest: false,
        exercises: [
            { name: 'Deadlifts', reps: '3 sets x 5-8 reps' },
            { name: 'Pull-Ups', reps: '3 sets x 8-10 reps' },
            { name: 'Barbell Rows', reps: '3 sets x 8-12 reps' },
            { name: 'Face Pulls', reps: '3 sets x 12-15 reps' },
            { name: 'Bicep Curls', reps: '3 sets x 10-12 reps' },
        ],
    },
    {
        day: 'Day 4',
        title: 'Rest Day',
        isRest: true,
        exercises: [],
    },
    {
        day: 'Day 5',
        title: 'Chest, Shoulders & Triceps (Push)',
        isRest: false,
        exercises: [
            { name: 'Bench Press', reps: '3 sets x 8-12 reps' },
            { name: 'Overhead Press', reps: '3 sets x 8-12 reps' },
            { name: 'Incline Dumbbell Press', reps: '3 sets x 10-12 reps' },
            { name: 'Lateral Raises', reps: '3 sets x 12-15 reps' },
            { name: 'Tricep Pushdowns', reps: '3 sets x 12-15 reps' },
        ],
    },
    {
        day: 'Day 6',
        title: 'Back & Biceps (Pull)',
        isRest: false,
        exercises: [
            { name: 'Deadlifts', reps: '3 sets x 5-8 reps' },
            { name: 'Pull-Ups', reps: '3 sets x 8-10 reps' },
            { name: 'Barbell Rows', reps: '3 sets x 8-12 reps' },
            { name: 'Face Pulls', reps: '3 sets x 12-15 reps' },
            { name: 'Bicep Curls', reps: '3 sets x 10-12 reps' },
        ],
    },
    {
        day: 'Day 7',
        title: 'Legs & Glutes',
        isRest: false,
        exercises: [
            { name: 'Squats', reps: '3 sets x 8-10 reps' },
            { name: 'Romanian Deadlifts', reps: '3 sets x 10-12 reps' },
            { name: 'Leg Press', reps: '3 sets x 10-12 reps' },
            { name: 'Leg Curls', reps: '3 sets x 12-15 reps' },
            { name: 'Calf Raises', reps: '4 sets x 15-20 reps' },
        ],
    },
];

export default function WorkoutScheduleScreen({ onNavigate }: WorkoutScheduleScreenProps) {
    const [expandedDay, setExpandedDay] = useState<string | null>(null);

    const toggleExpand = (day: string, isRest: boolean) => {
        if (isRest) return; // Do not expand rest days
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedDay(expandedDay === day ? null : day);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('dashboard')}>
                <Text style={styles.backButtonText}>{'< Back'}</Text>
            </TouchableOpacity>
            <Text style={styles.header}>Weekly Training Schedule</Text>
            {schedule.map((item) => (
                <View key={item.day} style={styles.dayWrapper}>
                    <TouchableOpacity
                        style={[styles.dayContainer, item.isRest && styles.restDayContainer]}
                        onPress={() => toggleExpand(item.day, item.isRest)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.dayText}>{item.day}</Text>
                        <Text style={styles.titleText}>{item.title}</Text>
                    </TouchableOpacity>
                    {expandedDay === item.day && !item.isRest && (
                        <View style={styles.exercisesContainer}>
                            {item.exercises.map((exercise, index) => (
                                <View key={index} style={styles.exerciseRow}>
                                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                                    <Text style={styles.exerciseReps}>{exercise.reps}</Text>
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
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 50,
    },
    backButton: {
        marginBottom: 20,
        marginTop: 40,
        padding: 10,
        backgroundColor: '#501313',
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    backButtonText: {
        color: '#FFFFFF',
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 16,
    },
    header: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 28,
        color: '#FFFFFF',
        marginBottom: 30,
        textAlign: 'center',
    },
    dayWrapper: {
        marginBottom: 15,
    },
    dayContainer: {
        backgroundColor: '#390404',
        borderRadius: 15,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    restDayContainer: {
        backgroundColor: '#333333',
    },
    dayText: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 18,
        color: '#FFFFFF',
    },
    titleText: {
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: 14,
        color: '#CCCCCC',
        flex: 1,
        textAlign: 'right',
        marginLeft: 10,
    },
    exercisesContainer: {
        backgroundColor: '#2a0303',
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        padding: 15,
        marginTop: -5, // Connect visually with the header
        paddingTop: 20,
    },
    exerciseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#501313',
        paddingBottom: 5,
    },
    exerciseName: {
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: 14,
        color: '#FFFFFF',
    },
    exerciseReps: {
        fontFamily: 'Inter',
        fontWeight: '400',
        fontSize: 14,
        color: '#AAAAAA',
    },
});
