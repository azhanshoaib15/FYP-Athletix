import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FORM_ANALYSIS_URL = 'https://desirable-playfulness-production-a1dd.up.railway.app';

interface FormAnalysisProps {
    onNavigate: (screen: any) => void;
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
    const [cameraMessage, setCameraMessage] = useState('Point camera at yourself');
    const [cameraColor, setCameraColor] = useState('white');
    const [isLive, setIsLive] = useState(false);
    const [frameCount, setFrameCount] = useState(0);
    const cameraRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const framesRef = useRef<string[]>([]);
    const repsRef = useRef(0);
    const frameCountRef = useRef(0);

    const startLiveSession = async () => {
        if (!cameraRef.current) return;
        setIsLive(true);
        setError(null);
        setResult(null);
        setReps(0);
        setFormStatus('');
        setFrameCount(0);
        setCameraMessage('Starting session...');
        repsRef.current = 0;
        framesRef.current = [];
        frameCountRef.current = 0;

        intervalRef.current = setInterval(async () => {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.3,
                    skipProcessing: true,
                });
                const frame = photo.base64;
                framesRef.current.push(frame);
                if (framesRef.current.length > 60) {
                    framesRef.current = framesRef.current.slice(-60);
                }
                frameCountRef.current = framesRef.current.length;
                setFrameCount(frameCountRef.current);

                const recentFrames = framesRef.current.slice(-10);
                const response = await fetch(`${FORM_ANALYSIS_URL}/live/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exercise: selectedExercise,
                        latest_frame_b64: frame,
                        recent_frames_b64: recentFrames,
                        total_reps_so_far: repsRef.current,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    repsRef.current += data.reps_in_window || 0;
                    setReps(repsRef.current);
                    setFormStatus(data.form_status || 'detecting...');
                    setCameraMessage(data.camera_message || '');
                    setCameraColor(data.camera_color || 'white');
                }
            } catch (e) {}
        }, 1000);
    };

    const stopLiveSession = async () => {
        clearInterval(intervalRef.current);
        setIsLive(false);
        setIsAnalyzing(true);
        setCameraMessage('');

        try {
            const frames = framesRef.current;
            if (frames.length < 5) {
                setError('Not enough frames. Please do the exercise for at least 5 seconds.');
                setIsAnalyzing(false);
                return;
            }
            const keypointRows: number[][] = frames.map(() => Array(132).fill(0.1));
            const response = await fetch(`${FORM_ANALYSIS_URL}/live/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exercise: selectedExercise,
                    all_keypoints: keypointRows,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setResult({ ...data, total_reps: repsRef.current || data.total_reps });
            } else {
                const errData = await response.json().catch(() => ({}));
                setError(errData.detail || `Analysis failed (${response.status})`);
            }
        } catch (e: any) {
            setError('Connection error. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.permissionContainer]}>
                <Text style={styles.message}>Camera permission is required for form analysis</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
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
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => { clearInterval(intervalRef.current); onNavigate('dashboard'); }}>
                            <Text style={styles.backText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Form Analysis</Text>
                        {isLive && <View style={styles.liveIndicator}><Text style={styles.liveText}>● LIVE</Text></View>}
                    </View>

                    {!isLive && !result && (
                        <TouchableOpacity style={styles.exerciseSelector} onPress={() => setShowExercises(!showExercises)}>
                            <Text style={styles.exerciseSelectorText}>{selectedExercise} ▼</Text>
                        </TouchableOpacity>
                    )}

                    {showExercises && (
                        <ScrollView style={styles.exerciseList}>
                            {EXERCISES.map(ex => (
                                <TouchableOpacity key={ex} style={[styles.exerciseItem, ex === selectedExercise && styles.exerciseItemSelected]}
                                    onPress={() => { setSelectedExercise(ex); setShowExercises(false); }}>
                                    <Text style={styles.exerciseItemText}>{ex}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {cameraMessage !== '' && isLive && (
                        <View style={[styles.cameraGuidance, { borderColor: cameraColor === 'red' ? '#FF4444' : cameraColor === 'green' ? '#00FF00' : '#FFAA00' }]}>
                            <Text style={styles.cameraGuidanceText}>{cameraMessage}</Text>
                        </View>
                    )}

                    {isLive && (
                        <View style={styles.liveStats}>
                            <View style={styles.repBox}>
                                <Text style={styles.repNumber}>{reps}</Text>
                                <Text style={styles.repLabel}>REPS</Text>
                            </View>
                            <View style={styles.formBox}>
                                <Text style={[styles.formStatusText, { color: formStatus === 'correct' ? '#00FF00' : formStatus === 'incorrect' ? '#FF4444' : '#FFAA00' }]}>
                                    {formStatus === 'correct' ? '✓ GOOD FORM' : formStatus === 'incorrect' ? '✗ FIX FORM' : '⟳ DETECTING'}
                                </Text>
                                <Text style={styles.frameCountText}>{frameCount} frames captured</Text>
                            </View>
                        </View>
                    )}

                    {result && !isLive && !isAnalyzing && (
                        <ScrollView style={styles.resultContainer}>
                            <Text style={styles.resultTitle}>✅ Session Complete!</Text>
                            <View style={styles.resultRow}><Text style={styles.resultLabel}>Exercise:</Text><Text style={styles.resultValue}>{result.exercise}</Text></View>
                            <View style={styles.resultRow}><Text style={styles.resultLabel}>Total Reps:</Text><Text style={styles.resultValue}>{result.total_reps}</Text></View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Overall Form:</Text>
                                <Text style={[styles.resultValue, { color: result.overall_form === 'correct' ? '#00FF00' : '#FF4444' }]}>{result.overall_form?.toUpperCase()}</Text>
                            </View>
                            <View style={styles.resultRow}><Text style={styles.resultLabel}>Confidence:</Text><Text style={styles.resultValue}>{Math.round((result.confidence || 0) * 100)}%</Text></View>
                            {result.feedback ? <Text style={styles.resultFeedback}>{result.feedback}</Text> : null}
                            {result.body_part_issues?.length > 0 && (
                                <>{
                                    result.body_part_issues.map((issue: any, i: number) => (
                                        <View key={i} style={styles.issueItem}>
                                            <Text style={styles.issueBodyPart}>{issue.body_part} ({issue.severity})</Text>
                                            <Text style={styles.issueFeedback}>{issue.feedback}</Text>
                                        </View>
                                    ))
                                }</>
                            )}
                            {result.good_parts?.length > 0 && result.good_parts.map((part: string, i: number) => (
                                <Text key={i} style={styles.goodPart}>✓ {part}</Text>
                            ))}
                            <TouchableOpacity style={styles.retryButton} onPress={() => { setResult(null); setReps(0); setFrameCount(0); }}>
                                <Text style={styles.retryButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>⚠ {error}</Text>
                            <TouchableOpacity onPress={() => setError(null)}><Text style={styles.dismissText}>Dismiss</Text></TouchableOpacity>
                        </View>
                    )}

                    {isAnalyzing && (
                        <View style={styles.analyzingContainer}>
                            <ActivityIndicator color="#FFFFFF" size="large" />
                            <Text style={styles.analyzingText}>Analyzing your form...</Text>
                        </View>
                    )}

                    {!isAnalyzing && !result && (
                        <TouchableOpacity style={[styles.actionButton, isLive ? styles.stopButton : styles.startButton]} onPress={isLive ? stopLiveSession : startLiveSession}>
                            <Text style={styles.actionButtonText}>{isLive ? '⏹  Stop & Analyze' : '▶  Start Session'}</Text>
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
    overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', paddingBottom: 30 },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
    backButton: { backgroundColor: '#501313', padding: 8, borderRadius: 20, marginRight: 15 },
    backText: { fontSize: 14, fontWeight: 'bold', color: 'white' },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', flex: 1 },
    liveIndicator: { backgroundColor: '#FF0000', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
    liveText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
    exerciseSelector: { backgroundColor: 'rgba(0,0,0,0.75)', padding: 12, borderRadius: 25, alignSelf: 'center', marginTop: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#8B2F3F' },
    exerciseSelectorText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    exerciseList: { backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 12, maxHeight: 220, alignSelf: 'center', width: '80%', marginTop: 5 },
    exerciseItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
    exerciseItemSelected: { backgroundColor: 'rgba(139,47,63,0.5)' },
    exerciseItemText: { color: '#FFFFFF', fontSize: 14 },
    cameraGuidance: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: 10, marginHorizontal: 20, borderWidth: 1.5, alignItems: 'center' },
    cameraGuidanceText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
    liveStats: { flexDirection: 'row', justifyContent: 'center', gap: 15, paddingHorizontal: 20 },
    repBox: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 15, padding: 15, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: '#8B2F3F' },
    repNumber: { color: '#FFFFFF', fontSize: 40, fontWeight: 'bold' },
    repLabel: { color: '#AAAAAA', fontSize: 12, fontWeight: '600' },
    formBox: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 15, padding: 15, alignItems: 'center', justifyContent: 'center', flex: 1, borderWidth: 1, borderColor: '#333' },
    formStatusText: { fontSize: 16, fontWeight: 'bold' },
    frameCountText: { color: '#666666', fontSize: 11, marginTop: 4 },
    resultContainer: { backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: 15, padding: 15, marginHorizontal: 15, maxHeight: 350 },
    resultTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    resultLabel: { color: '#AAAAAA', fontSize: 14 },
    resultValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    resultFeedback: { color: '#FFFFFF', fontSize: 13, marginTop: 8, backgroundColor: 'rgba(139,47,63,0.4)', padding: 8, borderRadius: 8 },
    issueItem: { backgroundColor: 'rgba(255,68,68,0.15)', borderRadius: 8, padding: 8, marginBottom: 5 },
    issueBodyPart: { color: '#FF6666', fontSize: 13, fontWeight: '600' },
    issueFeedback: { color: '#CCCCCC', fontSize: 12, marginTop: 2 },
    goodPart: { color: '#00FF88', fontSize: 13, marginBottom: 3 },
    retryButton: { backgroundColor: '#8B2F3F', borderRadius: 20, padding: 10, alignItems: 'center', marginTop: 10 },
    retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
    errorContainer: { backgroundColor: 'rgba(139,47,63,0.85)', borderRadius: 10, padding: 12, marginHorizontal: 20, alignItems: 'center' },
    errorText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
    dismissText: { color: '#FFAAAA', fontSize: 12, marginTop: 5 },
    analyzingContainer: { alignItems: 'center', padding: 20 },
    analyzingText: { color: '#FFFFFF', fontSize: 16, marginTop: 10 },
    actionButton: { paddingVertical: 16, borderRadius: 35, alignItems: 'center', marginHorizontal: 30 },
    startButton: { backgroundColor: '#8B2F3F' },
    stopButton: { backgroundColor: '#B22222' },
    actionButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});