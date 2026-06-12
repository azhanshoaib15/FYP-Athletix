import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/slices/userSlice";
import type { RootState } from "../store/store";

const API_URL = "fyp-athletix-production.up.railway.app";

export default function SettingsScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const dispatch = useDispatch();
    const { email, username, accessToken } = useSelector((state: RootState) => state.user);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchProfile(); }, []);


    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/api/v1/users/me/profile`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) setProfile(await res.json());
        } catch (e) {
            // silent fail
        } finally {
            setLoading(false);
        }
    };

    const formatGoal = (goal: string) => {
        if (!goal) return "N/A";
        return goal.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    };

    const calculateAge = (dob: string) => {
        if (!dob) return "N/A";
        const diff = Date.now() - new Date(dob).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + " yrs";
    };

    // Auto-calculate estimated body fat from BMI if not set
    const getBodyFat = () => {
        if (profile?.body_fat_percentage) return profile.body_fat_percentage.toFixed(1) + "%";
        if (profile?.weight_kg && profile?.height_cm) {
            const bmi = profile.weight_kg / Math.pow(profile.height_cm / 100, 2);
            const isFemale = profile.gender === "female" ? 1 : 0;
            const age = profile.date_of_birth
                ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (1000*60*60*24*365.25))
                : 25;
            const bf = (1.20 * bmi) + (0.23 * age) - (10.8 * (1 - isFemale)) - 5.4;
            return Math.round(Math.max(5, Math.min(50, bf)) * 10) / 10 + "% (est.)";
        }
        return "N/A";
    };

    const handleLogout = () => {
        Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: () => { dispatch(logout()); onNavigate("display"); } }
        ]);
    };

    const Row = ({ label, value }: { label: string; value: string }) => (
        <View style={styles.infoRow}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value || "N/A"}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.backButton} onPress={() => onNavigate("dashboard")}>
                        <Text style={styles.backButtonText}>{"<"}</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>Settings</Text>

                    {/* Account */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account Information</Text>
                        <Row label="Username" value={username || "N/A"} />
                        <Row label="Email"    value={email    || "N/A"} />
                    </View>

                    {/* Personal */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Details</Text>
                        <Row label="Gender" value={profile?.gender ? formatGoal(profile.gender) : "N/A"} />
                        <Row label="Age"    value={profile?.date_of_birth ? calculateAge(profile.date_of_birth) : "N/A"} />
                        <Row label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : "N/A"} />
                        <Row label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : "N/A"} />
                        <Row label="Body Fat" value={getBodyFat()} />
                    </View>

                    {/* Fitness */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Fitness</Text>
                        <Row label="Goal"            value={profile?.fitness_goal     ? formatGoal(profile.fitness_goal)    : "N/A"} />
                        <Row label="Level"           value={profile?.fitness_level    ? formatGoal(profile.fitness_level)   : "N/A"} />
                        <Row label="Days/Week"       value={profile?.weekly_workout_days ? `${profile.weekly_workout_days} days` : "N/A"} />
                        <Row label="Session Length"  value={profile?.workout_duration_minutes ? `${profile.workout_duration_minutes} min` : "N/A"} />
                        <Row label="Diet Type"       value={profile?.diet_type        ? formatGoal(profile.diet_type)       : "N/A"} />
                    </View>

                    {/* Macros */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Daily Targets</Text>
                        <Row label="Calories"  value={profile?.daily_calorie_target ? `${profile.daily_calorie_target} kcal` : "N/A"} />
                        <Row label="Protein"   value={profile?.protein_target_g     ? `${profile.protein_target_g} g`        : "N/A"} />
                        <Row label="Carbs"     value={profile?.carbs_target_g       ? `${profile.carbs_target_g} g`          : "N/A"} />
                        <Row label="Fat"       value={profile?.fat_target_g         ? `${profile.fat_target_g} g`            : "N/A"} />
                    </View>

                    <TouchableOpacity style={styles.editButton} onPress={() => onNavigate("editProfile")}>
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>Log Out</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container:          { flex:1, backgroundColor:"#511820" },
    safeArea:           { flex:1 },
    scrollContent:      { flexGrow:1, paddingHorizontal:20, paddingBottom:40, paddingTop:60 },
    backButton:         { position:"absolute", top:20, left:20, zIndex:10, width:40, height:40, borderRadius:20, backgroundColor:"#FFFFFF", justifyContent:"center", alignItems:"center" },
    backButtonText:     { color:"#000000", fontSize:24, fontWeight:"bold" },
    title:              { fontSize:32, color:"#FFFFFF", fontWeight:"bold", marginBottom:30, marginTop:10 },
    section:            { marginBottom:24 },
    sectionTitle:       { fontSize:18, color:"#FFFFFF", fontWeight:"bold", marginBottom:12, opacity:0.9 },
    infoRow:            { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingVertical:12, paddingHorizontal:15, backgroundColor:"rgba(255,255,255,0.1)", borderRadius:10, marginBottom:8, borderWidth:1, borderColor:"rgba(255,255,255,0.15)" },
    label:              { fontSize:15, color:"#FFFFFF", fontWeight:"600" },
    value:              { fontSize:15, color:"#CCCCCC" },
    editButton:         { width:"100%", height:50, backgroundColor:"#1a1a3a", borderRadius:10, justifyContent:"center", alignItems:"center", marginTop:10, borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
    editButtonText:     { color:"#FFFFFF", fontSize:18, fontWeight:"bold" },
    logoutButton:       { width:"100%", height:50, backgroundColor:"#D32F2F", borderRadius:10, justifyContent:"center", alignItems:"center", marginTop:10 },
    logoutButtonText:   { color:"#FFFFFF", fontSize:18, fontWeight:"bold" },
});