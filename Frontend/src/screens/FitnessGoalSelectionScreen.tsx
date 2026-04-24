import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { setFitnessGoal } from '../store/slices/userSlice';
import type { RootState } from '../store/store';

const API_URL = 'https://fyp-athletix-production.up.railway.app';

// Map UI goal to backend fitness_goal values
const GOAL_MAP: Record<string, string> = {
    'lose-weight':        'weight_loss',
    'build-muscle':       'muscle_gain',
    'stay-fit':           'general_fitness',
    'improve-endurance':  'endurance',
};

// Calorie multipliers per goal
const CALORIE_ADJUST: Record<string, number> = {
    'lose-weight':       -400,  // deficit
    'build-muscle':      +300,  // surplus
    'stay-fit':          0,     // maintenance
    'improve-endurance': +100,  // slight surplus
};

interface FitnessGoalSelectionScreenProps {
    onNavigate: (screen: any) => void;
}

type FitnessGoal = 'lose-weight' | 'build-muscle' | 'stay-fit' | 'improve-endurance';

export default function FitnessGoalSelectionScreen({ onNavigate }: FitnessGoalSelectionScreenProps) {
    const dispatch   = useDispatch();
    const token      = useSelector((state: RootState) => state.user.accessToken);
    const weight_kg  = useSelector((state: RootState) => state.user.weight_kg);
    const height_cm  = useSelector((state: RootState) => state.user.height_cm);
    const gender     = useSelector((state: RootState) => state.user.gender);
    const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);
    const [saving, setSaving]             = useState(false);

    const goals: { id: FitnessGoal; title: string; color: string; image: any }[] = [
        { id:'lose-weight',       title:'Lose Weight',        color:'#FF6B6B', image:require('../assets/images/Lose Weight.png') },
        { id:'build-muscle',      title:'Build Muscle',       color:'#3A2EEB', image:require('../assets/images/Build Muscle.png') },
        { id:'stay-fit',          title:'Stay Fit',           color:'#4CAF50', image:require('../assets/images/Stay_Fit.jpeg') },
        { id:'improve-endurance', title:'Improve Endurance',  color:'#FF8C42', image:require('../assets/images/Improve Endurance.png') },
    ];

    const handleContinue = async () => {
        if (!selectedGoal) {
            Alert.alert('Error', 'Please select a fitness goal');
            return;
        }
        setSaving(true);
        try {
            const backendGoal = GOAL_MAP[selectedGoal];
            const level = 'beginner'; // default — can be updated in settings later

            // Save to Redux
            dispatch(setFitnessGoal({ fitness_goal: backendGoal, fitness_level: level }));

            // Recalculate calories with goal adjustment
            if (token && weight_kg && height_cm) {
                // Try to get age from profile, fallback to 25
                let age = 25;
                try {
                    const profRes = await fetch('https://fyp-athletix-production.up.railway.app/api/v1/users/me/profile', {
                        headers: { Authorization: 'Bearer ' + token }
                    });
                    if (profRes.ok) {
                        const prof = await profRes.json();
                        if (prof.date_of_birth) {
                            age = Math.floor((Date.now() - new Date(prof.date_of_birth).getTime()) / (1000*60*60*24*365.25));
                        }
                    }
                } catch(_) {}
                // age is now from profile or fallback 25
                let bmr = gender === 'female'
                    ? 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
                    : 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age);
                const tdee      = Math.round(bmr * 1.55);
                const adjusted  = tdee + (CALORIE_ADJUST[selectedGoal] || 0);
                const proteinG  = Math.round(weight_kg * (selectedGoal === 'build-muscle' ? 2.2 : 1.8));
                const fatG      = Math.round((adjusted * 0.25) / 9);
                const carbsG    = Math.round((adjusted - proteinG * 4 - fatG * 9) / 4);

                await fetch(API_URL + '/api/v1/users/me/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({
                        fitness_goal:         backendGoal,
                        fitness_level:        level,
                        daily_calorie_target: adjusted,
                        protein_target_g:     proteinG,
                        carbs_target_g:       carbsG,
                        fat_target_g:         fatG,
                    }),
                });
            }
            onNavigate('dashboard');
        } catch (e) {
            console.error('Save fitness goal error:', e);
            onNavigate('dashboard');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('personalinfo')}>
                        <Text style={styles.backButtonText}>{'<'}</Text>
                    </TouchableOpacity>
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>Fitness Goal</Text>
                        <Text style={styles.subtitle}>What is your primary fitness goal?</Text>

                        <View style={styles.gridContainer}>
                            {goals.map((goal) => (
                                <TouchableOpacity key={goal.id}
                                    style={[styles.goalCard, {backgroundColor:goal.color}, selectedGoal===goal.id && styles.goalCardSelected]}
                                    onPress={() => setSelectedGoal(goal.id)}>
                                    <Image source={goal.image} style={styles.goalImage} contentFit="cover"/>
                                    <View style={styles.goalOverlay}>
                                        <Text style={styles.goalTitle}>{goal.title}</Text>
                                    </View>
                                    {selectedGoal === goal.id && (
                                        <View style={styles.checkmark}>
                                            <Text style={styles.checkmarkText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {selectedGoal && (
                            <View style={styles.goalInfo}>
                                <Text style={styles.goalInfoTxt}>
                                    {selectedGoal === 'lose-weight'       && 'Calorie deficit plan — burn more than you consume'}
                                    {selectedGoal === 'build-muscle'      && 'Calorie surplus plan — fuel muscle growth'}
                                    {selectedGoal === 'stay-fit'          && 'Maintenance plan — stay healthy and active'}
                                    {selectedGoal === 'improve-endurance' && 'Cardio-focused plan — improve stamina'}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity style={[styles.button, saving && {opacity:0.7}]} onPress={handleContinue} disabled={saving}>
                            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Continue'}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container:        { flex:1, backgroundColor:'#000000' },
    safeArea:         { flex:1 },
    scrollContent:    { flexGrow:1, paddingHorizontal:20, paddingBottom:40, paddingTop:60 },
    contentContainer: { width:'100%', alignItems:'center' },
    backButton:       { position:'absolute', top:20, left:20, zIndex:10, width:40, height:40, borderRadius:20, backgroundColor:'#FFFFFF', justifyContent:'center', alignItems:'center' },
    backButtonText:   { color:'#000000', fontSize:24, fontWeight:'bold' },
    title:            { fontSize:32, color:'#FFFFFF', fontWeight:'bold', marginBottom:10 },
    subtitle:         { fontSize:16, color:'#CCCCCC', marginBottom:30 },
    gridContainer:    { width:'100%', flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', gap:15 },
    goalCard:         { width:'47%', aspectRatio:1, borderRadius:20, overflow:'hidden', position:'relative', borderWidth:3, borderColor:'transparent' },
    goalCardSelected: { borderColor:'#FFFFFF' },
    goalImage:        { width:'100%', height:'100%' },
    goalOverlay:      { position:'absolute', bottom:0, left:0, right:0, backgroundColor:'rgba(0,0,0,0.5)', padding:10, alignItems:'center' },
    goalTitle:        { fontSize:16, fontWeight:'bold', color:'#FFFFFF', textAlign:'center' },
    checkmark:        { position:'absolute', top:10, right:10, width:30, height:30, borderRadius:15, backgroundColor:'#FFFFFF', justifyContent:'center', alignItems:'center' },
    checkmarkText:    { fontSize:18, fontWeight:'bold', color:'#4CAF50' },
    goalInfo:         { backgroundColor:'rgba(139,47,63,0.2)', borderRadius:10, padding:12, width:'100%', marginTop:16, borderWidth:1, borderColor:'rgba(139,47,63,0.4)' },
    goalInfoTxt:      { color:'#CCC', fontSize:13, textAlign:'center' },
    button:           { width:'100%', height:50, backgroundColor:'#8B2F3F', borderRadius:10, justifyContent:'center', alignItems:'center', marginTop:20 },
    buttonText:       { color:'#FFFFFF', fontSize:18, fontWeight:'bold' },
});