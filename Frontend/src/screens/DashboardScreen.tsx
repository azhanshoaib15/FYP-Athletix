import { useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DashboardProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings' | 'formAnalysis' | 'workoutSchedule' | 'progress' | 'chat') => void;
}

export default function DashboardScreen({ onNavigate }: DashboardProps) {
    const { user } = useUser();
    const today = new Date();
    const dateString = today.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }); // e.g., "02 Dec 2025"

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <Image
                source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/logo_y5zeid.png"
                style={styles.logo}
                contentFit="contain"
            />
            <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>Hello {user?.firstName || 'User'},</Text>
                <Text style={styles.subGreetingText}>Good morning</Text>
            </View>
            <TouchableOpacity style={styles.settingsContainer} onPress={() => onNavigate('settings')}>
                <Image
                    source="https://res.cloudinary.com/dgliirggm/image/upload/v1764732296/seting_vyelz2.png"
                    style={styles.settingsIcon}
                    contentFit="contain"
                />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('workoutSchedule')}>
                <Text style={styles.workoutPlanHeader}>Today’s Workout Plan</Text>
                <Image
                    source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/main_page_ejn0tf.jpg"
                    style={styles.mainPageImage}
                    contentFit="cover"
                />
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>{dateString}</Text>
                </View>
                <Text style={styles.workoutDescription}>Day 3 - Back & Biceps</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('progress')}>
                <View style={styles.rectangleContainer} />
                <Text style={styles.progressTrackerHeader}>Progress Tracker</Text>
                <Text style={styles.progressTrackerSubtext}>Review Your Stats. & Stay On Track.</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('formAnalysis')}>
                <View style={styles.secondRectangleContainer} />
                <Text style={styles.formAnalysisHeader}>Form Analysis</Text>
                <Text style={styles.formAnalysisSubtext}>Improve your Form & Reduce Injury</Text>
                <Image
                    source="https://res.cloudinary.com/dgliirggm/image/upload/v1764693102/camera_kqmnd3.png"
                    style={styles.cameraImage}
                    contentFit="contain"
                />
            </TouchableOpacity>
            <Image
                source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/chat_a9uzwz.png"
                style={styles.chatImage}
                contentFit="contain"
            />
            <Text style={styles.arixaIntroText}>
                Hey! I’m Arixa. Your Virtual AI Trainer. I’m available to answer your fitness related questions anytime. Tap to chat now.
            </Text>
            <TouchableOpacity style={styles.chatButton} onPress={() => onNavigate('chat')}>
                <Text style={styles.chatButtonText}>Chat now</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100,
        minHeight: 900,
    },
    logo: {
        position: 'absolute',
        width: 279,
        height: 156,
        top: 49,
        left: 150,
        opacity: 1,
        transform: [{ rotate: '0deg' }],
    },
    greetingContainer: {
        position: 'absolute',
        width: 274,
        height: 112,
        top: 70,
        left: 23,
        justifyContent: 'center',
    },
    greetingText: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 32,
        color: '#FFFFFF',
        lineHeight: 32,
        letterSpacing: 0,
    },
    subGreetingText: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 24,
        color: '#FFFFFF',
        lineHeight: 24,
        letterSpacing: 0,
    },
    workoutPlanHeader: {
        position: 'absolute',
        width: 192,
        height: 22,
        top: 209,
        left: 28,
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 18,
        color: '#FFFFFF',
        lineHeight: 18,
        letterSpacing: 0,
    },
    mainPageImage: {
        position: 'absolute',
        width: 348,
        height: 231,
        top: 244,
        left: 28,
        borderRadius: 39,
        opacity: 1,
    },
    dateContainer: {
        position: 'absolute',
        width: 123,
        height: 19,
        top: 213,
        left: 263,
        backgroundColor: '#000000',
    },
    dateText: {
        fontFamily: 'Dai Banna SIL',
        fontWeight: '700',
        fontSize: 17,
        lineHeight: 17,
        color: '#6A040F',
        textAlign: 'center',
    },
    workoutDescription: {
        position: 'absolute',
        width: 191,
        height: 32,
        top: 441,
        left: 56,
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 18,
        lineHeight: 18, // 100%
        color: '#FFFFFF',
    },
    rectangleContainer: {
        position: 'absolute',
        width: 340,
        height: 85,
        top: 489,
        left: 26,
        backgroundColor: '#390404',
        borderRadius: 30,
    },
    progressTrackerHeader: {
        position: 'absolute',
        width: 235,
        height: 30,
        top: 504,
        left: 94,
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 26,
        lineHeight: 26, // 100%
        color: '#FFFFFF',
    },
    progressTrackerSubtext: {
        position: 'absolute',
        width: 283,
        height: 18,
        top: 539,
        left: 97,
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 12,
        lineHeight: 12, // 100%
        color: '#FFFFFF',
    },
    secondRectangleContainer: {
        position: 'absolute',
        width: 340,
        height: 85,
        top: 594,
        left: 26,
        backgroundColor: '#390404',
        borderRadius: 30,
    },
    formAnalysisHeader: {
        position: 'absolute',
        width: 189,
        height: 30,
        top: 609,
        left: 46,
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 26,
        lineHeight: 26, // 100%
        color: '#FFFFFF',
    },
    formAnalysisSubtext: {
        position: 'absolute',
        width: 212,
        height: 27,
        top: 644,
        left: 44,
        fontFamily: 'Inter',
        fontWeight: '600',
        fontSize: 12,
        lineHeight: 12, // 100%
        color: '#FFFFFF',
    },
    cameraImage: {
        position: 'absolute',
        width: 66,
        height: 58,
        top: 607,
        left: 297,
        borderRadius: 32,
        opacity: 1,
    },
    chatImage: {
        position: 'absolute',
        width: 281,
        height: 187,
        top: 689,
        left: 16,
        opacity: 1,
    },
    arixaIntroText: {
        position: 'absolute',
        width: 171,
        height: 79,
        top: 716,
        left: 220,
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 14,
        lineHeight: 16, // 100%
        color: '#FFFFFF',
    },
    chatButton: {
        position: 'absolute',
        width: 121,
        height: 37,
        top: 830,
        left: 224,
        backgroundColor: '#501313',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatButtonText: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 24,
        lineHeight: 24, // 100%
        color: '#FFFFFF',
    },
    settingsContainer: {
        position: 'absolute',
        width: 43,
        height: 43,
        top: 14,
        left: 355,
        borderRadius: 21.5,
    },
    settingsIcon: {
        position: 'absolute',
        width: 28,
        height: 28,
        top: 7,
        left: 8,
    },
});
