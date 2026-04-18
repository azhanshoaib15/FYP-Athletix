import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FORM_ANALYSIS_URL = 'https://desirable-playfulness-production-a1dd.up.railway.app';

interface FormAnalysisProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings' | 'formAnalysis') => void;
}

const EXERCISES = [
    'Squats', 'PushUp', 'Bench Press', 'Bicep curl', 'Lunges',
    'Plank', 'Pull Ups', 'Shoulder press', 'Lat Pulldown', 'Tricep Dips',
    'Leg Press', 'Leg Extension', 'Leg Raises', 'Chest Fly', 'BackRows',
    'Lateral Raises', 'Incline beanch Press', 'Tricep pushdown'
];

export default function FormAnalysisScreen({ onNavigate }: FormAnalysisProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedExercise, setSelectedExercise] = useState('Squats');
    const [showExercises, setShowExercises] = useState(false);
    const [reps, setReps] = useState(0);
    const [formStatus, setFormStatus] = useState('');
    const [isLive, setIsLive] = useState(false);
    const cameraRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const framesRef = useRef<string[]>([]);
    const repsRef = useRef(0);

    const startLiveSession = async () => {
        if (!cameraRef.current) return;
        setIsLive(true);
        setError(null);
        setResult(null);
        setReps(0);
        repsRef.current = 0;
        framesRef.current = [];

        intervalRef.current = setInterval(async () => {
            try {
                const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.3 });
                const frame = photo.base64;
                framesRef.current.push(frame);
                if (framesRef.current.length > 10) framesRef.current = framesRef.current.slice(-10);

                const response = await fetch(`${FORM_ANALYSIS_URL}/live/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exercise: selectedExercise,
                        latest_frame_b64: frame,
                        recent_frames_b64: framesRef.current,
                        total_reps_so_far: repsRef.current,
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    repsRef.current += data.reps_in_window || 0;
                    setReps(repsRef.current);
                    setFormStatus(data.form_status || '');
                }
            } catch (e) { }
        }, 1000);
    };

    const stopLiveSession = async () => {
        clearInterval(intervalRef.current);
        setIsLive(false);
        setIsAnalyzing(true);
        try {
            const response = await fetch(`${FORM_ANALYSIS_URL}/live/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exercise: selectedExercise,
                    all_keypoints: [],
                }),
            });
            if (response.ok) {
                const data = await response.json();
                setResult(data);
            }
        } catch (e: any) {
            setError('Analysis failed');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.permissionContainer]}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.permissionBackButton} onPress={() => onNavigate('dashboard')}>
                    <Text style={styles.permissionButtonText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing="back" ref={cameraRef}>
                <View style={styles.overlay}>
                    <TouchableOpacity style={styles.backButton} onPress={() => { clearInterval(intervalRef.current); onNavigate('dashboard'); }}>
                        <Text style={styles.text}>← Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.exerciseSelector} onPress={() => setShowExercises(!showExercises)}>
                        <Text style={styles.exerciseSelectorText}>Exercise: {selectedExercise} ▼</Text>
                    </TouchableOpacity>

                    {showExercises && (
                        <ScrollView style={styles.exerciseList}>
                            {EXERCISES.map(ex => (
                                <TouchableOpacity key={ex} style={styles.exerciseItem} onPress={() => { setSelectedExercise(ex); setShowExercises(false); }}>
                                    <Text style={styles.exerciseItemText}>{ex}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {isLive && (
                        <View style={styles.liveStats}>
                            <Text style={styles.repsText}>Reps: {reps}</Text>
                            <Text style={[styles.formText, { color: formStatus === 'correct' ? '#00FF00' : '#FF6600' }]}>
                                Form: {formStatus || 'detecting...'}
                            </Text>
                        </View>
                    )}

                    {result && !isLive && (
                        <ScrollView style={styles.resultContainer}>
                            <Text style={styles.resultTitle}>Session Complete!</Text>
                            <Text style={styles.resultText}>Exercise: {result.exercise}</Text>
                            <Text style={styles.resultText}>Total Reps: {result.total_reps}</Text>
                            <Text style={styles.resultText}>Overall Form: {result.overall_form}</Text>
                            <Text style={styles.resultText}>Summary: {result.summary}</Text>
                            <Text style={styles.resultText}>Feedback: {result.feedback}</Text>
                        </ScrollView>
                    )}

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Error: {error}</Text>
                        </View>
                    )}

                    {isAnalyzing && (
                        <View style={styles.analyzingContainer}>
                            <ActivityIndicator color="#FFFFFF" size="large" />
                            <Text style={styles.analyzingText}>Analyzing your session...</Text>
                        </View>
                    )}

                    {!isAnalyzing && (
                        <TouchableOpacity
                            style={[styles.analyzeButton, isLive ? styles.stopButton : styles.startButton]}
                            onPress={isLive ? stopLiveSession : startLiveSession}
                        >
                            <Text style={styles.analyzeButtonText}>
                                {isLive ? '⏹ Stop & Analyze' : '▶ Start Session'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    permissionContainer: { alignItems: 'center', padding: 20, justifyContent: 'center' },
    message: { textAlign: 'center', paddingBottom: 20, color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
    permissionButton: { backgroundColor: '#8B2F3F', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, marginTop: 10, width: '80%', alignItems: 'center' },
    permissionBackButton: { backgroundColor: '#501313', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, marginTop: 15, width: '80%', alignItems: 'center' },
    permissionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    camera: { flex: 1 },
    overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', padding: 20 },
    backButton: { backgroundColor: '#501313', padding: 10, borderRadius: 20, alignSelf: 'flex-start', marginTop: 40 },
    text: { fontSize: 16, fontWeight: 'bold', color: 'white' },
    exerciseSelector: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 10, alignSelf: 'center' },
    exerciseSelectorText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    exerciseList: { backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: 10, maxHeight: 200, alignSelf: 'center', width: '80%' },
    exerciseItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
    exerciseItemText: { color: '#FFFFFF', fontSize: 14 },
    liveStats: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 15, borderRadius: 10, alignSelf: 'center', alignItems: 'center' },
    repsText: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
    formText: { fontSize: 18, fontWeight: '600', marginTop: 5 },
    resultContainer: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 10, padding: 15, maxHeight: 250 },
    resultTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 10 },
    resultText: { color: '#CCCCCC', fontSize: 14, marginBottom: 5 },
    errorContainer: { backgroundColor: 'rgba(139,47,63,0.8)', borderRadius: 10, padding: 10 },
    errorText: { color: '#FFFFFF', fontSize: 14 },
    analyzingContainer: { alignItems: 'center', padding: 20 },
    analyzingText: { color: '#FFFFFF', fontSize: 16, marginTop: 10 },
    analyzeButton: { paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginBottom: 30 },
    startButton: { backgroundColor: '#8B2F3F' },
    stopButton: { backgroundColor: '#B22222' },
    analyzeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});