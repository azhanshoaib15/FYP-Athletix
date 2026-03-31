import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { authApi } from "../api/authApi";
import { logout } from "../store/slices/userSlice";
import type { RootState } from "../store/store";

export default function SettingsScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const dispatch = useDispatch();
    const { email, username, accessToken } = useSelector((state: RootState) => state.user);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await authApi.getProfile(accessToken!);
                setProfile(data);
            } catch (e) { console.error("Failed to load profile", e); }
        };
        fetchProfile();
    }, []);

    const formatGoal = (goal: string) => {
        if (!goal) return "N/A";
        return goal.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    };

    const calculateAge = (dob: string) => {
        if (!dob) return "N/A";
        const diff = Date.now() - new Date(dob).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + " years";
    };

    const handleLogout = () => {
        Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: () => { dispatch(logout()); onNavigate("display"); } }
        ]);
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.backButton} onPress={() => onNavigate("dashboard")}>
                        <Text style={styles.backButtonText}>{"<"}</Text>
                    </TouchableOpacity>
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>Settings</Text>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Account Information</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Username</Text>
                                <Text style={styles.value}>{username || "N/A"}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Email</Text>
                                <Text style={styles.value}>{email || "N/A"}</Text>
                            </View>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Personal Details</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Gender</Text>
                                <Text style={styles.value}>{profile?.gender ? formatGoal(profile.gender) : "N/A"}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Age</Text>
                                <Text style={styles.value}>{profile?.date_of_birth ? calculateAge(profile.date_of_birth) : "N/A"}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Height</Text>
                                <Text style={styles.value}>{profile?.height_cm ? `${profile.height_cm} cm` : "N/A"}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Weight</Text>
                                <Text style={styles.value}>{profile?.weight_kg ? `${profile.weight_kg} kg` : "N/A"}</Text>
                            </View>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Fitness</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Fitness Goal</Text>
                                <Text style={styles.value}>{profile?.fitness_goal ? formatGoal(profile.fitness_goal) : "N/A"}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Fitness Level</Text>
                                <Text style={styles.value}>{profile?.fitness_level ? formatGoal(profile.fitness_level) : "N/A"}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Diet Type</Text>
                                <Text style={styles.value}>{profile?.diet_type ? formatGoal(profile.diet_type) : "N/A"}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutButtonText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#511820" },
    safeArea: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 60 },
    contentContainer: { width: "100%" },
    backButton: { position: "absolute", top: 20, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
    backButtonText: { color: "#000000", fontSize: 24, fontWeight: "bold" },
    title: { fontSize: 32, color: "#FFFFFF", fontWeight: "bold", marginBottom: 30 },
    section: { marginBottom: 30 },
    sectionTitle: { fontSize: 20, color: "#FFFFFF", fontWeight: "bold", marginBottom: 15, opacity: 0.9 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 15, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
    label: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
    value: { fontSize: 16, color: "#CCCCCC" },
    logoutButton: { width: "100%", height: 50, backgroundColor: "#D32F2F", borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 20 },
    logoutButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});
