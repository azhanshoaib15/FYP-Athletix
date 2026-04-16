import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AuthSelectionScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    return (
        <View style={styles.container}>
            <Image source={{ uri: "https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/background_jojyek.jpg" }} style={styles.backgroundImage} contentFit="cover" />
            <Image source={{ uri: "https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/logo_y5zeid.png" }} style={styles.logo} contentFit="contain" />
            <Text style={styles.heading}>Athletix</Text>
            <Text style={styles.subtitle}>A Fitness Intelligence Technology</Text>
            <TouchableOpacity style={styles.signInButton} onPress={() => onNavigate("signin")}>
                <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signUpButton} onPress={() => onNavigate("signup")}>
                <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000000" },
    backgroundImage: { position: "absolute", width: "100%", height: "100%" },
    logo: { position: "absolute", width: 950, height: 532, top: -34, left: -269, elevation: 10 },
    heading: { position: "absolute", width: 135, height: 43, top: 373, left: 139, fontWeight: "700", fontSize: 32, lineHeight: 32, color: "#FFFFFF" },
    subtitle: { position: "absolute", width: 294, height: 21, top: 426, left: 67, fontWeight: "700", fontSize: 16, lineHeight: 16, color: "#FFFFFF" },
    signInButton: { position: "absolute", width: 249, height: 68, top: 650, left: 82, backgroundColor: "#000000", borderRadius: 34, borderWidth: 1, borderColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
    signUpButton: { position: "absolute", width: 249, height: 68, top: 730, left: 82, backgroundColor: "#000000", borderRadius: 34, borderWidth: 1, borderColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
    buttonText: { fontWeight: "700", fontSize: 20, color: "#FFFFFF" },
});
