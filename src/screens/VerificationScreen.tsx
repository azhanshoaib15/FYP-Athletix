import { useState, useRef, useEffect } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { setUser } from "../store/slices/userSlice";

const API_URL = "fyp-athletix-production.up.railway.app";

interface VerificationProps {
    onNavigate: (screen: any) => void;
    // These come from SignUpScreen navigation params
    email?: string;
    password?: string;
    username?: string;
}

export default function VerificationScreen({ onNavigate, email="", password="", username="" }: VerificationProps) {
    const dispatch = useDispatch();
    const [otp, setOtp]           = useState(["","","","","",""]);
    const [loading, setLoading]   = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputs = useRef<(TextInput|null)[]>([]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown === 0) { setCanResend(true); return; }
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleOtpChange = (val: string, idx: number) => {
        // Only accept digits
        if (val && !/^[0-9]$/.test(val)) return;
        const newOtp = [...otp];
        newOtp[idx] = val;
        setOtp(newOtp);
        // Auto-advance to next input
        if (val && idx < 5) {
            inputs.current[idx + 1]?.focus();
        }
        // Auto-submit when all 6 filled
        if (val && idx === 5) {
            const full = [...newOtp.slice(0,5), val].join("");
            if (full.length === 6) handleVerify(full);
        }
    };

    const handleKeyPress = (key: string, idx: number) => {
        if (key === "Backspace" && !otp[idx] && idx > 0) {
            inputs.current[idx - 1]?.focus();
        }
    };

    const handleVerify = async (code?: string) => {
        const finalCode = code || otp.join("");
        if (finalCode.length !== 6) {
            Alert.alert("Error", "Please enter the full 6-digit code");
            return;
        }
        setLoading(true);
        try {
            // Verify OTP
            const verifyRes = await fetch(`${API_URL}/api/v1/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp: finalCode }),
            });

            if (!verifyRes.ok) {
                const errData = await verifyRes.json().catch(() => ({}));
                const msg = typeof errData.detail === "string"
                    ? errData.detail
                    : "Invalid or expired code. Please try again.";
                Alert.alert("Invalid Code", msg);
                setLoading(false);
                return;
            }

            // OTP verified - now login to get JWT
            const loginRes = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!loginRes.ok) {
                Alert.alert("Error", "Verification successful but login failed. Please sign in manually.");
                onNavigate("signin");
                return;
            }

            const loginData = await loginRes.json();

            // Get user info
            const meRes = await fetch(`${API_URL}/api/v1/auth/me`, {
                headers: { Authorization: `Bearer ${loginData.access_token}` },
            });
            const meData = await meRes.json();

            dispatch(setUser({
                accessToken:  loginData.access_token,
                refreshToken: loginData.refresh_token || "",
                userId:       meData.id,
                email:        meData.email,
                username:     meData.username,
            }));

            onNavigate("gender"); // Continue to onboarding
        } catch (_) {
            Alert.alert("Error", "Could not connect to server. Check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setResending(true);
        try {
            const res = await fetch(`${API_URL}/api/v1/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                Alert.alert("Sent!", "A new code has been sent to " + email);
                setOtp(["","","","","",""]);
                setCountdown(60);
                setCanResend(false);
                inputs.current[0]?.focus();
            } else {
                Alert.alert("Error", "Could not resend code. Try again.");
            }
        } catch (_) {
            Alert.alert("Error", "Could not connect. Try again.");
        } finally {
            setResending(false);
        }
    };

    const maskedEmail = email
        ? email.split("@")[0].slice(0,2) + "****@" + email.split("@")[1]
        : "your email";

    return (
        <View style={s.container}>
            <SafeAreaView style={s.safe}>
                <TouchableOpacity style={s.backBtn} onPress={() => onNavigate("signup")}>
                    <Text style={s.backTxt}>{"<"}</Text>
                </TouchableOpacity>

                <View style={s.content}>
                    {/* Icon */}
                    <View style={s.iconBox}>
                        <Text style={s.icon}>✉️</Text>
                    </View>

                    <Text style={s.title}>Check Your Email</Text>
                    <Text style={s.sub}>
                        We sent a 6-digit verification code to
                    </Text>
                    <Text style={s.emailTxt}>{maskedEmail}</Text>

                    {/* OTP inputs */}
                    <View style={s.otpRow}>
                        {otp.map((digit, idx) => (
                            <TextInput
                                key={idx}
                                ref={r => { inputs.current[idx] = r; }}
                                style={[s.otpBox, digit && s.otpBoxFilled]}
                                value={digit}
                                onChangeText={val => handleOtpChange(val, idx)}
                                onKeyPress={({nativeEvent}) => handleKeyPress(nativeEvent.key, idx)}
                                keyboardType="number-pad"
                                maxLength={1}
                                selectTextOnFocus
                                editable={!loading}
                            />
                        ))}
                    </View>

                    {/* Verify button */}
                    <TouchableOpacity
                        style={[s.btn, (loading || otp.join("").length < 6) && s.btnDis]}
                        onPress={() => handleVerify()}
                        disabled={loading || otp.join("").length < 6}>
                        {loading
                            ? <ActivityIndicator color="#FFF"/>
                            : <Text style={s.btnTxt}>Verify Email</Text>}
                    </TouchableOpacity>

                    {/* Resend */}
                    <View style={s.resendRow}>
                        <Text style={s.resendTxt}>Didn't receive the code? </Text>
                        {canResend ? (
                            <TouchableOpacity onPress={handleResend} disabled={resending}>
                                <Text style={s.resendLink}>
                                    {resending ? "Sending..." : "Resend"}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={s.resendTimer}>Resend in {countdown}s</Text>
                        )}
                    </View>

                    <Text style={s.note}>
                        Check your spam folder if you don't see the email.
                    </Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container:    {flex:1,backgroundColor:"#000"},
    safe:         {flex:1},
    backBtn:      {position:"absolute",top:60,left:20,zIndex:10,width:40,height:40,borderRadius:20,backgroundColor:"#FFF",justifyContent:"center",alignItems:"center"},
    backTxt:      {color:"#000",fontSize:24,fontWeight:"bold"},
    content:      {flex:1,justifyContent:"center",alignItems:"center",paddingHorizontal:30},
    iconBox:      {width:80,height:80,borderRadius:40,backgroundColor:"rgba(139,47,63,0.2)",justifyContent:"center",alignItems:"center",marginBottom:20,borderWidth:2,borderColor:"#8B2F3F"},
    icon:         {fontSize:36},
    title:        {fontSize:28,color:"#FFF",fontWeight:"bold",marginBottom:10,textAlign:"center"},
    sub:          {fontSize:15,color:"#AAA",textAlign:"center",marginBottom:4},
    emailTxt:     {fontSize:15,color:"#8B2F3F",fontWeight:"700",marginBottom:32},
    otpRow:       {flexDirection:"row",gap:10,marginBottom:32},
    otpBox:       {width:46,height:56,borderRadius:12,borderWidth:2,borderColor:"#333",backgroundColor:"rgba(255,255,255,0.08)",textAlign:"center",fontSize:24,fontWeight:"bold",color:"#FFF"},
    otpBoxFilled: {borderColor:"#8B2F3F",backgroundColor:"rgba(139,47,63,0.2)"},
    btn:          {width:"100%",height:52,backgroundColor:"#8B2F3F",borderRadius:14,justifyContent:"center",alignItems:"center",marginBottom:20},
    btnDis:       {opacity:0.5},
    btnTxt:       {color:"#FFF",fontSize:17,fontWeight:"bold"},
    resendRow:    {flexDirection:"row",alignItems:"center",marginBottom:16},
    resendTxt:    {color:"#AAA",fontSize:14},
    resendLink:   {color:"#8B2F3F",fontSize:14,fontWeight:"700"},
    resendTimer:  {color:"#555",fontSize:14},
    note:         {color:"#555",fontSize:12,textAlign:"center"},
});