import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { setPersonalInfo, setFitnessGoal } from "../store/slices/userSlice";
import type { RootState } from "../store/store";

const API_URL = "https://fyp-athletix-production.up.railway.app";

const GOALS = [
    { key:"muscle_gain",         label:"Muscle Gain" },
    { key:"weight_loss",         label:"Weight Loss" },
    { key:"general_fitness",     label:"General Fitness" },
    { key:"endurance",           label:"Endurance" },
    { key:"athletic_performance",label:"Athletic Performance" },
];

const LEVELS = [
    { key:"beginner",     label:"Beginner" },
    { key:"intermediate", label:"Intermediate" },
    { key:"advanced",     label:"Advanced" },
];

export default function EditProfileScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const dispatch   = useDispatch();
    const token      = useSelector((state: RootState) => state.user.accessToken);

    const [height,   setHeight]   = useState("");
    const [weight,   setWeight]   = useState("");
    const [age,      setAge]      = useState("");
    const [goal,     setGoal]     = useState("muscle_gain");
    const [level,    setLevel]    = useState("beginner");
    const [saving,   setSaving]   = useState(false);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`${API_URL}/api/v1/users/me/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const prof = await res.json();
                    if (prof.height_cm)     setHeight(String(prof.height_cm));
                    if (prof.weight_kg)     setWeight(String(prof.weight_kg));
                    if (prof.fitness_goal)  setGoal(prof.fitness_goal);
                    if (prof.fitness_level) setLevel(prof.fitness_level);
                    if (prof.date_of_birth) {
                        const a = Math.floor((Date.now() - new Date(prof.date_of_birth).getTime()) / (1000*60*60*24*365.25));
                        setAge(String(a));
                    }
                }
            } catch (_) {}
            setLoading(false);
        };
        load();
    }, []);

    const handleSave = async () => {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        const a = parseInt(age);
        if (!height || !weight || !age || isNaN(h) || isNaN(w) || isNaN(a)) {
            Alert.alert("Error", "Please fill in all fields correctly");
            return;
        }
        setSaving(true);
        try {
            // Recalculate macros
            const isFemale = false; // use stored gender
            const bmr  = 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * a);
            const tdee = Math.round(bmr * 1.55);
            const calAdjust: Record<string,number> = {
                weight_loss:-400, muscle_gain:300, general_fitness:0, endurance:100, athletic_performance:150
            };
            const adjusted  = tdee + (calAdjust[goal] || 0);
            const proteinG  = Math.round(w * (goal === 'muscle_gain' ? 2.2 : 1.8));
            const fatG      = Math.round((adjusted * 0.25) / 9);
            const carbsG    = Math.round((adjusted - proteinG * 4 - fatG * 9) / 4);

            const dob = new Date();
            dob.setFullYear(dob.getFullYear() - a);

            const res = await fetch(`${API_URL}/api/v1/users/me/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    height_cm: h, weight_kg: w,
                    date_of_birth: dob.toISOString().split("T")[0],
                    fitness_goal: goal, fitness_level: level,
                    daily_calorie_target: adjusted,
                    protein_target_g: proteinG,
                    carbs_target_g: carbsG,
                    fat_target_g: fatG,
                }),
            });
            if (res.ok) {
                dispatch(setPersonalInfo({ height_cm: h, weight_kg: w }));
                dispatch(setFitnessGoal({ fitness_goal: goal, fitness_level: level }));
                Alert.alert("Saved!", "Profile updated successfully.", [
                    { text: "OK", onPress: () => onNavigate("settings") }
                ]);
            } else {
                Alert.alert("Error", "Could not save. Try again.");
            }
        } catch (_) {
            Alert.alert("Error", "Connection error.");
        }
        setSaving(false);
    };

    const Row = ({ label, value, onChangeText, keyboardType = "default", placeholder }: any) => (
        <View style={s.inputGroup}>
            <Text style={s.label}>{label}</Text>
            <TextInput style={s.input} value={value} onChangeText={onChangeText}
                keyboardType={keyboardType} placeholder={placeholder} placeholderTextColor="#666"
                editable={!saving}/>
        </View>
    );

    return (
        <View style={s.container}>
            <SafeAreaView style={s.safe}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
                    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                        <TouchableOpacity style={s.backBtn} onPress={() => onNavigate("settings")}>
                            <Text style={s.backTxt}>{"< Back"}</Text>
                        </TouchableOpacity>
                        <Text style={s.title}>Edit Profile</Text>

                        {loading ? (
                            <Text style={{color:"#AAA", textAlign:"center", marginTop:40}}>Loading...</Text>
                        ) : (
                            <>
                                <Row label="Age"        value={age}    onChangeText={setAge}    keyboardType="number-pad" placeholder="e.g. 25"/>
                                <Row label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="e.g. 175"/>
                                <Row label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 75"/>

                                <Text style={s.sectionLabel}>Fitness Goal</Text>
                                <View style={s.optionRow}>
                                    {GOALS.map(g => (
                                        <TouchableOpacity key={g.key}
                                            style={[s.optionBtn, goal === g.key && s.optionBtnActive]}
                                            onPress={() => setGoal(g.key)}>
                                            <Text style={[s.optionTxt, goal === g.key && s.optionTxtActive]}>{g.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={s.sectionLabel}>Fitness Level</Text>
                                <View style={s.optionRow}>
                                    {LEVELS.map(l => (
                                        <TouchableOpacity key={l.key}
                                            style={[s.optionBtn, level === l.key && s.optionBtnActive]}
                                            onPress={() => setLevel(l.key)}>
                                            <Text style={[s.optionTxt, level === l.key && s.optionTxtActive]}>{l.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={s.infoBox}>
                                    <Text style={s.infoTxt}>Macros will be auto-recalculated using Harris-Benedict formula based on your updated values.</Text>
                                </View>

                                <TouchableOpacity style={[s.saveBtn, saving && {opacity:0.6}]} onPress={handleSave} disabled={saving}>
                                    <Text style={s.saveTxt}>{saving ? "Saving..." : "Save Changes"}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const s = StyleSheet.create({
    container:      { flex:1, backgroundColor:"#511820" },
    safe:           { flex:1 },
    scroll:         { flexGrow:1, padding:20, paddingTop:60, paddingBottom:40 },
    backBtn:        { position:"absolute", top:20, left:20, zIndex:10, backgroundColor:"#FFF", width:40, height:40, borderRadius:20, justifyContent:"center", alignItems:"center" },
    backTxt:        { color:"#000", fontWeight:"bold", fontSize:18 },
    title:          { fontSize:28, color:"#FFF", fontWeight:"bold", marginBottom:24, marginTop:10 },
    inputGroup:     { marginBottom:18 },
    label:          { fontSize:14, color:"#FFF", marginBottom:6, fontWeight:"600" },
    input:          { backgroundColor:"rgba(255,255,255,0.1)", borderRadius:10, padding:14, color:"#FFF", fontSize:16, borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
    sectionLabel:   { fontSize:15, color:"#FFF", fontWeight:"700", marginBottom:10, marginTop:6 },
    optionRow:      { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:18 },
    optionBtn:      { backgroundColor:"rgba(255,255,255,0.1)", borderRadius:10, paddingHorizontal:14, paddingVertical:8, borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
    optionBtnActive:{ backgroundColor:"#8B2F3F", borderColor:"#8B2F3F" },
    optionTxt:      { color:"#CCC", fontSize:13 },
    optionTxtActive:{ color:"#FFF", fontWeight:"700" },
    infoBox:        { backgroundColor:"rgba(0,0,0,0.3)", borderRadius:10, padding:12, marginBottom:20, borderLeftWidth:3, borderLeftColor:"#8B2F3F" },
    infoTxt:        { color:"#CCC", fontSize:12, lineHeight:18 },
    saveBtn:        { backgroundColor:"#8B2F3F", borderRadius:14, padding:16, alignItems:"center" },
    saveTxt:        { color:"#FFF", fontSize:17, fontWeight:"bold" },
});