import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VerificationScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <TouchableOpacity style={styles.backButton} onPress={() => onNavigate("signup")}>
                    <Text style={styles.backButtonText}>{"<"}</Text>
                </TouchableOpacity>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Email Verified!</Text>
                    <Text style={styles.subtitle}>Your account has been created successfully.</Text>
                    <TouchableOpacity style={styles.button} onPress={() => onNavigate("gender")}>
                        <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#511820" },
    safeArea: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
    backButton: { position: "absolute", top: 40, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
    backButtonText: { color: "#000000", fontSize: 24, fontWeight: "bold" },
    contentContainer: { width: "100%", alignItems: "center" },
    title: { fontSize: 32, color: "#FFFFFF", fontWeight: "bold", marginBottom: 10 },
    subtitle: { fontSize: 16, color: "#CCCCCC", marginBottom: 40, textAlign: "center" },
    button: { width: "100%", height: 50, backgroundColor: "#8B2F3F", borderRadius: 10, justifyContent: "center", alignItems: "center", elevation: 8 },
    buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});
