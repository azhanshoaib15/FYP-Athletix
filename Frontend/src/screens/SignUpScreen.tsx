import { Image } from "expo-image";
import { useState, useRef } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "https://fyp-athletix-production.up.railway.app";

export default function SignUpScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const [email, setEmail]       = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading]   = useState(false);
    const [showPass, setShowPass] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    // Parse any error shape from FastAPI into a readable string
    const parseError = (err: any): string => {
        try {
            // FastAPI validation error: { detail: [{msg, loc, type}] }
            if (err?.detail) {
                if (typeof err.detail === "string") return err.detail;
                if (Array.isArray(err.detail)) {
                    return err.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
                }
                return JSON.stringify(err.detail);
            }
            if (err?.message && typeof err.message === "string") return err.message;
            if (typeof err === "string") return err;
            return "Something went wrong. Please try again.";
        } catch (_) {
            return "Something went wrong. Please try again.";
        }
    };

    const handleSignUp = async () => {
        // Validation
        if (!email || !username || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }
        if (username.length < 3) {
            Alert.alert("Error", "Username must be at least 3 characters");
            return;
        }
        if (password.length < 8) {
            Alert.alert("Error", "Password must be at least 8 characters");
            return;
        }

        setLoading(true);
        try {
            // Step 1: Register account
            const regRes = await fetch(`${API_URL}/api/v1/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, username, password }),
            });

            if (!regRes.ok) {
                const errData = await regRes.json().catch(() => ({}));
                // Check for duplicate email/username
                const errStr = parseError(errData).toLowerCase();
                if (regRes.status === 409 || errStr.includes("already") || errStr.includes("exist") || errStr.includes("duplicate")) {
                    Alert.alert("Account Exists", "An account with this email or username already exists. Please sign in instead.");
                } else {
                    Alert.alert("Sign Up Failed", parseError(errData));
                }
                return;
            }

            // Step 2: Send OTP to email for verification
            const otpRes = await fetch(`${API_URL}/api/v1/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (otpRes.ok) {
                // Navigate to verification screen with email + password
                onNavigate({ screen: "verification", email, password, username });
            } else {
                // OTP send failed - still proceed but warn
                Alert.alert(
                    "Verification Email Failed",
                    "Account created but verification email could not be sent. You can verify later.",
                    [{ text: "Continue", onPress: () => onNavigate({ screen: "verification", email, password, username }) }]
                );
            }
        } catch (err: any) {
            Alert.alert("Error", "Could not connect to server. Check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={s.container}>
            <Image source={{ uri: "https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/background_jojyek.jpg" }}
                style={s.bg} contentFit="cover"/>
            <Image source={{ uri: "https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/logo_y5zeid.png" }}
                style={s.logo} contentFit="contain"/>
            <SafeAreaView style={s.safe}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.kbv}>
                    <ScrollView ref={scrollRef} contentContainerStyle={s.scroll}
                        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                        <TouchableOpacity style={s.backBtn} onPress={() => onNavigate("display")}>
                            <Text style={s.backTxt}>{"<"}</Text>
                        </TouchableOpacity>

                        <View style={s.content}>
                            <Text style={s.title}>Create Account</Text>
                            <Text style={s.sub}>A verification code will be sent to your email</Text>

                            <TextInput style={s.input} placeholder="Email" placeholderTextColor="#ccc"
                                value={email} onChangeText={setEmail}
                                keyboardType="email-address" autoCapitalize="none" editable={!loading}/>

                            <TextInput style={s.input} placeholder="Username (min 3 chars)" placeholderTextColor="#ccc"
                                value={username} onChangeText={setUsername}
                                autoCapitalize="none" editable={!loading}/>

                            <View style={s.passRow}>
                                <TextInput style={s.passInput} placeholder="Password (min 8 chars)" placeholderTextColor="#ccc"
                                    value={password} onChangeText={setPassword}
                                    secureTextEntry={!showPass} editable={!loading}/>
                                <TouchableOpacity style={s.eye} onPress={() => setShowPass(!showPass)}>
                                    <Text style={s.eyeTxt}>{showPass ? "🙈" : "👁"}</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={[s.btn, loading && s.btnDis]} onPress={handleSignUp} disabled={loading}>
                                {loading
                                    ? <ActivityIndicator color="#FFF"/>
                                    : <Text style={s.btnTxt}>Create Account</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => onNavigate("signin")} disabled={loading}>
                                <Text style={s.link}>Already have an account? Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container: {flex:1,backgroundColor:"#000"},
    bg:        {position:"absolute",width:"100%",height:"100%"},
    logo:      {position:"absolute",width:950,height:532,top:-34,left:-269},
    safe:      {flex:1},
    kbv:       {flex:1},
    scroll:    {flexGrow:1,paddingHorizontal:20,paddingBottom:40,paddingTop:350},
    content:   {width:"100%",alignItems:"center"},
    backBtn:   {position:"absolute",top:20,left:20,zIndex:10,width:40,height:40,borderRadius:20,backgroundColor:"#FFF",justifyContent:"center",alignItems:"center"},
    backTxt:   {color:"#000",fontSize:24,fontWeight:"bold"},
    title:     {fontSize:32,color:"#FFF",fontWeight:"bold",marginBottom:8},
    sub:       {fontSize:13,color:"#CCC",marginBottom:30,textAlign:"center"},
    input:     {width:"100%",height:50,backgroundColor:"rgba(255,255,255,0.1)",borderRadius:10,paddingHorizontal:15,color:"#FFF",marginBottom:16,borderWidth:1,borderColor:"rgba(255,255,255,0.2)"},
    passRow:   {width:"100%",flexDirection:"row",alignItems:"center",marginBottom:16},
    passInput: {flex:1,height:50,backgroundColor:"rgba(255,255,255,0.1)",borderRadius:10,paddingHorizontal:15,paddingRight:50,color:"#FFF",borderWidth:1,borderColor:"rgba(255,255,255,0.2)"},
    eye:       {position:"absolute",right:15,height:50,justifyContent:"center"},
    eyeTxt:    {fontSize:20},
    btn:       {width:"100%",height:50,backgroundColor:"#8B2F3F",borderRadius:10,justifyContent:"center",alignItems:"center",marginBottom:16},
    btnDis:    {opacity:0.6},
    btnTxt:    {color:"#FFF",fontSize:18,fontWeight:"bold"},
    link:      {color:"#FFF",marginTop:8},
});