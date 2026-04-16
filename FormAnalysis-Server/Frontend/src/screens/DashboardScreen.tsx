import { Image } from "expo-image";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

export default function DashboardScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const { username } = useSelector((state: RootState) => state.user);
    const today = new Date();
    const dateString = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const hour = today.getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/logo_y5zeid.png" style={styles.logo} contentFit="contain" />
            <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>Hello {username || "User"},</Text>
                <Text style={styles.subGreetingText}>{greeting}</Text>
            </View>
            <TouchableOpacity style={styles.settingsContainer} onPress={() => onNavigate("settings")}>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764732296/seting_vyelz2.png" style={styles.settingsIcon} contentFit="contain" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate("workoutSchedule")}>
                <Text style={styles.workoutPlanHeader}>{"Today's Workout Plan"}</Text>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/main_page_ejn0tf.jpg" style={styles.mainPageImage} contentFit="cover" />
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>{dateString}</Text>
                </View>
                <Text style={styles.workoutDescription}>Day 3 - Back & Biceps</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate("progress")}>
                <View style={styles.rectangleContainer} />
                <Text style={styles.progressTrackerHeader}>Progress Tracker</Text>
                <Text style={styles.progressTrackerSubtext}>Review Your Stats. & Stay On Track.</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate("formAnalysis")}>
                <View style={styles.secondRectangleContainer} />
                <Text style={styles.formAnalysisHeader}>Form Analysis</Text>
                <Text style={styles.formAnalysisSubtext}>Improve your Form & Reduce Injury</Text>
                <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764693102/camera_kqmnd3.png" style={styles.cameraImage} contentFit="contain" />
            </TouchableOpacity>
            <Image source="https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/chat_a9uzwz.png" style={styles.chatImage} contentFit="contain" />
            <Text style={styles.arixaIntroText}>{"Hey! I'm Arixa. Your Virtual AI Trainer. I'm available to answer your fitness related questions anytime. Tap to chat now."}</Text>
            <TouchableOpacity style={styles.chatButton} onPress={() => onNavigate("chat")}>
                <Text style={styles.chatButtonText}>Chat now</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000000" },
    scrollContent: { flexGrow: 1, paddingBottom: 100, minHeight: 900 },
    logo: { position: "absolute", width: 279, height: 156, top: 49, left: 150 },
    greetingContainer: { position: "absolute", width: 274, height: 112, top: 70, left: 23, justifyContent: "center" },
    greetingText: { fontWeight: "700", fontSize: 32, color: "#FFFFFF", lineHeight: 32 },
    subGreetingText: { fontWeight: "700", fontSize: 24, color: "#FFFFFF", lineHeight: 24 },
    workoutPlanHeader: { position: "absolute", width: 192, height: 22, top: 209, left: 28, fontWeight: "700", fontSize: 18, color: "#FFFFFF" },
    mainPageImage: { position: "absolute", width: 348, height: 231, top: 244, left: 28, borderRadius: 39 },
    dateContainer: { position: "absolute", width: 123, height: 19, top: 213, left: 263, backgroundColor: "#000000" },
    dateText: { fontWeight: "700", fontSize: 17, color: "#6A040F", textAlign: "center" },
    workoutDescription: { position: "absolute", width: 191, height: 32, top: 441, left: 56, fontWeight: "700", fontSize: 18, color: "#FFFFFF" },
    rectangleContainer: { position: "absolute", width: 340, height: 85, top: 489, left: 26, backgroundColor: "#390404", borderRadius: 30 },
    progressTrackerHeader: { position: "absolute", width: 235, height: 30, top: 504, left: 94, fontWeight: "700", fontSize: 26, color: "#FFFFFF" },
    progressTrackerSubtext: { position: "absolute", width: 283, height: 18, top: 539, left: 97, fontWeight: "700", fontSize: 12, color: "#FFFFFF" },
    secondRectangleContainer: { position: "absolute", width: 340, height: 85, top: 594, left: 26, backgroundColor: "#390404", borderRadius: 30 },
    formAnalysisHeader: { position: "absolute", width: 189, height: 30, top: 609, left: 46, fontWeight: "700", fontSize: 26, color: "#FFFFFF" },
    formAnalysisSubtext: { position: "absolute", width: 212, height: 27, top: 644, left: 44, fontWeight: "600", fontSize: 12, color: "#FFFFFF" },
    cameraImage: { position: "absolute", width: 66, height: 58, top: 607, left: 297, borderRadius: 32 },
    chatImage: { position: "absolute", width: 281, height: 187, top: 689, left: 16 },
    arixaIntroText: { position: "absolute", width: 171, height: 79, top: 716, left: 220, fontWeight: "700", fontSize: 14, lineHeight: 16, color: "#FFFFFF" },
    chatButton: { position: "absolute", width: 121, height: 37, top: 830, left: 224, backgroundColor: "#501313", borderRadius: 20, justifyContent: "center", alignItems: "center" },
    chatButtonText: { fontWeight: "700", fontSize: 24, color: "#FFFFFF" },
    settingsContainer: { position: "absolute", width: 43, height: 43, top: 14, left: 355, borderRadius: 21.5 },
    settingsIcon: { position: "absolute", width: 28, height: 28, top: 7, left: 8 },
});
