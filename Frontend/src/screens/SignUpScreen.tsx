import { Image } from "expo-image";
import { useState, useRef } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { authApi } from "../api/authApi";
import { setUser } from "../store/slices/userSlice";

export default function SignUpScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const dispatch = useDispatch();
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleSignUp = async () => {
        if (!email || !username || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        if (password.length < 8) {
            Alert.alert("Error", "Password must be at least 8 characters");
            return;
        }
        setLoading(true);
        try {
            await authApi.register({ email, username, password });
            const response = await authApi.login({ email, password });
            const me = await authApi.getMe(response.access_token);
            dispatch(setUser({
                accessToken: response.access_token,
                refreshToken: response.refresh_token,
                userId: me.id,
                email: me.email,
                username: me.username,
            }));
            onNavigate("gender");
        } catch (err: any) {
            let errorMessage = "Sign up failed. Please try again.";
            if (err.message) {
                if (typeof err.message === 'string') {
                    errorMessage = err.message;
                } else if (typeof err.message === 'object') {
                    errorMessage = JSON.stringify(err.message);
                }
            }
            if (err.status === 400 || err.status === 409) {
                errorMessage = "An account with this email or username already exists.";
            }
            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: "https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/background_jojyek.jpg" }}
                style={styles.backgroundImage}
                contentFit="cover"
            />
            <Image
                source={{ uri: "https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/logo_y5zeid.png" }}
                style={styles.logo}
                contentFit="contain"
            />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => onNavigate("display")}
                        >
                            <Text style={styles.backButtonText}>{"<"}</Text>
                        </TouchableOpacity>

                        <View style={styles.contentContainer}>
                            <Text style={styles.title}>Sign Up</Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#ccc"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!loading}
                            />

                            <TextInput
                                style={styles.input}
                                placeholder="Username"
                                placeholderTextColor="#ccc"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                editable={!loading}
                            />

                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Password (min 8 characters)"
                                    placeholderTextColor="#ccc"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Text style={styles.eyeIconText}>{showPassword ? "🙈" : "👁"}</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Create Account</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => onNavigate("signin")}
                                disabled={loading}
                            >
                                <Text style={styles.linkText}>Already have an account? Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000000" },
    backgroundImage: { position: "absolute", width: "100%", height: "100%" },
    logo: { position: "absolute", width: 950, height: 532, top: -34, left: -269 },
    safeArea: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 350 },
    contentContainer: { width: "100%", alignItems: "center" },
    backButton: {
        position: "absolute", top: 20, left: 20, zIndex: 10,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "#FFFFFF", justifyContent: "center",
        alignItems: "center", elevation: 5,
    },
    backButtonText: { color: "#000000", fontSize: 24, fontWeight: "bold" },
    title: { fontSize: 32, color: "#FFFFFF", fontWeight: "bold", marginBottom: 40 },
    input: {
        width: "100%", height: 50,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 10, paddingHorizontal: 15,
        color: "#FFFFFF", marginBottom: 20,
        borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    },
    passwordContainer: { width: "100%", flexDirection: "row", alignItems: "center", marginBottom: 20 },
    passwordInput: {
        flex: 1, height: 50,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 10, paddingHorizontal: 15,
        paddingRight: 50, color: "#FFFFFF",
        borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    },
    eyeIcon: { position: "absolute", right: 15, height: 50, justifyContent: "center" },
    eyeIconText: { fontSize: 20 },
    button: {
        width: "100%", height: 50,
        backgroundColor: "#8B2F3F", borderRadius: 10,
        justifyContent: "center", alignItems: "center",
        marginBottom: 20, elevation: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
    linkText: { color: "#FFFFFF", marginTop: 10 },
});