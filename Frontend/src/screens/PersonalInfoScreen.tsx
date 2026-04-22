import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { setPersonalInfo } from '../store/slices/userSlice';
import type { RootState } from '../store/store';

const API_URL = 'https://fyp-athletix-production.up.railway.app';

interface PersonalInfoScreenProps {
    onNavigate: (screen: any) => void;
}

export default function PersonalInfoScreen({ onNavigate }: PersonalInfoScreenProps) {
    const dispatch   = useDispatch();
    const token      = useSelector((state: RootState) => state.user.accessToken);
    const gender     = useSelector((state: RootState) => state.user.gender);
    const [age, setAge]       = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [saving, setSaving] = useState(false);

    const handleContinue = async () => {
        if (!age || !height || !weight) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        const ageNum    = parseInt(age);
        const heightNum = parseFloat(height);
        const weightNum = parseFloat(weight);

        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
            Alert.alert('Error', 'Please enter a valid age (1-120)');
            return;
        }
        if (isNaN(heightNum) || heightNum < 50 || heightNum > 300) {
            Alert.alert('Error', 'Please enter a valid height in cm (50-300)');
            return;
        }
        if (isNaN(weightNum) || weightNum < 20 || weightNum > 500) {
            Alert.alert('Error', 'Please enter a valid weight in kg (20-500)');
            return;
        }

        setSaving(true);
        try {
            // Calculate DOB from age
            const dob = new Date();
            dob.setFullYear(dob.getFullYear() - ageNum);
            const dobStr = dob.toISOString().split('T')[0];

            // Calculate macros using Harris-Benedict formula
            let bmr = 0;
            if (gender === 'male') {
                bmr = 88.362 + (13.397 * weightNum) + (4.799 * heightNum) - (5.677 * ageNum);
            } else {
                bmr = 447.593 + (9.247 * weightNum) + (3.098 * heightNum) - (4.330 * ageNum);
            }
            const tdee      = Math.round(bmr * 1.55); // moderate activity
            const proteinG  = Math.round(weightNum * 2.0);
            const fatG      = Math.round((tdee * 0.25) / 9);
            const carbsG    = Math.round((tdee - proteinG * 4 - fatG * 9) / 4);

            // Save to Redux
            dispatch(setPersonalInfo({ height_cm: heightNum, weight_kg: weightNum }));

            // Save to backend
            if (token) {
                await fetch(API_URL + '/api/v1/users/me/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({
                        gender:                gender || null,
                        date_of_birth:         dobStr,
                        height_cm:             heightNum,
                        weight_kg:             weightNum,
                        daily_calorie_target:  tdee,
                        protein_target_g:      proteinG,
                        carbs_target_g:        carbsG,
                        fat_target_g:          fatG,
                    }),
                });
            }
            onNavigate('fitnessgoal');
        } catch (e) {
            console.error('Save personal info error:', e);
            onNavigate('fitnessgoal'); // still proceed even if save fails
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('gender')}>
                            <Text style={styles.backButtonText}>{'<'}</Text>
                        </TouchableOpacity>
                        <View style={styles.contentContainer}>
                            <Text style={styles.title}>Personal Information</Text>
                            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Age</Text>
                                <TextInput style={styles.input} placeholder="Enter your age" placeholderTextColor="#999"
                                    value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3}/>
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Height (cm)</Text>
                                <TextInput style={styles.input} placeholder="e.g. 175" placeholderTextColor="#999"
                                    value={height} onChangeText={setHeight} keyboardType="decimal-pad"/>
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Weight (kg)</Text>
                                <TextInput style={styles.input} placeholder="e.g. 70" placeholderTextColor="#999"
                                    value={weight} onChangeText={setWeight} keyboardType="decimal-pad"/>
                            </View>

                            <View style={styles.infoBox}>
                                <Text style={styles.infoTxt}>Your macros will be auto-calculated using the Harris-Benedict formula based on your age, height, weight and gender.</Text>
                            </View>

                            <TouchableOpacity style={[styles.button, saving && {opacity:0.7}]} onPress={handleContinue} disabled={saving}>
                                <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Continue'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container:        { flex:1, backgroundColor:'#000000' },
    safeArea:         { flex:1 },
    keyboardView:     { flex:1 },
    scrollContent:    { flexGrow:1, justifyContent:'center', paddingHorizontal:20, paddingBottom:40 },
    contentContainer: { width:'100%', alignItems:'center' },
    backButton:       { position:'absolute', top:20, left:20, zIndex:10, width:40, height:40, borderRadius:20, backgroundColor:'#FFFFFF', justifyContent:'center', alignItems:'center' },
    backButtonText:   { color:'#000000', fontSize:24, fontWeight:'bold' },
    title:            { fontSize:32, color:'#FFFFFF', fontWeight:'bold', marginBottom:10 },
    subtitle:         { fontSize:16, color:'#CCCCCC', marginBottom:30 },
    inputGroup:       { width:'100%', marginBottom:20 },
    label:            { fontSize:16, color:'#FFFFFF', marginBottom:8, fontWeight:'600' },
    input:            { width:'100%', height:50, backgroundColor:'rgba(255,255,255,0.1)', borderRadius:10, paddingHorizontal:15, color:'#FFFFFF', borderWidth:1, borderColor:'rgba(255,255,255,0.2)', fontSize:16 },
    infoBox:          { backgroundColor:'rgba(139,47,63,0.2)', borderRadius:10, padding:12, width:'100%', marginBottom:20, borderWidth:1, borderColor:'rgba(139,47,63,0.4)' },
    infoTxt:          { color:'#CCC', fontSize:12, lineHeight:18 },
    button:           { width:'100%', height:50, backgroundColor:'#8B2F3F', borderRadius:10, justifyContent:'center', alignItems:'center', marginTop:10 },
    buttonText:       { color:'#FFFFFF', fontSize:18, fontWeight:'bold' },
});