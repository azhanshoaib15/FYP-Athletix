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
    const [cameraMessage, setCameraMessage] = useState('');
    const [cameraColor, setCameraColor] = useState('white');
    const [isLive, setIsLive] = useState(false);
    const cameraRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const framesRef = useRef<string[]>([]);
    const keypointsRef = useRef<number[][]>([]);
    const repsRef = useRef(0);

    const startLiveSession = async () => {
        if (!cameraRef.current) return;
        setIsLive(true);
        setError(null);
        setResult(null);
        setReps(0);
        setFormStatus('');
        setCameraMessage('Starting...');
        repsRef.current = 0;
        framesRef.current = [];
        keypointsRef.current = [];

        intervalRef.current = setInterval(async () => {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.3,
                    skipProcessing: true,
                });
                const frame = photo.base64;
                framesRef.current.push(frame);
                if (framesRef.current.length > 15) {
                    framesRef.current = framesRef.current.slice(-15);
                }

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
                    setFormStatus(data.form_status || 'detecting...');
                    setCameraMessage(data.camera_message || '');
                    setCameraColor(data.camera_color || 'white');

                    // Collect keypoints for finish analysis
                    if (data.keypoints && Array.isArray(data.keypoints)) {
                        keypointsRef.current.push(...data.keypoints);
                    }
                }
            } catch (e) {
                // Silent fail during live session
            }
        }, 800);
    };

    const stopLiveSession = async () => {
        clearInterval(intervalRef.current);
        setIsLive(false);
        setIsAnalyzing(true);
        setCameraMessage('');

        try {
            // Build keypoints from recent frames if not collected from API
            let allKeypoints = keypointsRef.current;
            if (allKeypoints.length < 5) {
                // Send frames for server-side keypoint extraction
                const recentFrames = framesRef.current.slice(-20);
                allKeypoints = recentFrames.map(() => Array(132).fill(0));
            }

            const response = await fetch(`${FORM_ANALYSIS_URL}/live/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exercise: selectedExercise,
                    all_keypoints: allKeypoints,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setResult(data);
            } else {
                const errData = await response.json().catch(() => ({}));
                setError(errData.detail || `Server error: ${response.status}`);
            }
        } catch (e: any) {
            setError('Analysis failed. Please try again.');
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

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => {
                                clearInterval(intervalRef.current);
                                onNavigate('dashboard');
                            }}
                        >
                            <Text style={styles.backText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Form Analysis</Text>
                    </View>

                    {/* Exercise Selector */}
                    <TouchableOpacity
                        style={styles.exerciseSelector}
                        onPress={() => setShowExercises(!showExercises)}
                    >
                        <Text style={styles.exerciseSelectorText}>
                            {selectedExercise} ▼
                        </Text>
                    </TouchableOpacity>

                    {/* Exercise Dropdown */}
                    {showExercises && (
                        <ScrollView style={styles.exerciseList}>
                            {EXERCISES.map(ex => (
                                <TouchableOpacity
                                    key={ex}
                                    style={[
                                        styles.exerciseItem,
                                        ex === selectedExercise && styles.exerciseItemSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedExercise(ex);
                                        setShowExercises(false);
                                    }}
                                >
                                    <Text style={styles.exerciseItemText}>{ex}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {/* Camera Guidance */}
                    {cameraMessage !== '' && isLive && (
                        <View style={[
                            styles.cameraGuidance,
                            { borderColor: cameraColor === 'red' ? '#FF4444' : cameraColor === 'green' ? '#00FF00' : '#FFAA00' }
                        ]}>
                            <Text style={styles.cameraGuidanceText}>{cameraMessage}</Text>
                        </View>
                    )}

                    {/* Live Stats */}
                    {isLive && (
                        <View style={styles.liveStats}>
                            <View style={styles.repBox}>
                                <Text style={styles.repNumber}>{reps}</Text>
                                <Text style={styles.repLabel}>REPS</Text>
                            </View>
                            <View style={styles.formBox}>
                                <Text style={[
                                    styles.formStatusText,
                                    {
                                        color: formStatus === 'correct' ? '#00FF00' :
                                               formStatus === 'incorrect' ? '#FF4444' : '#FFAA00'
                                    }
                                ]}>
                                    {formStatus === 'correct' ? '✓ GOOD FORM' :
                                     formStatus === 'incorrect' ? '✗ FIX FORM' :
                                     formStatus === 'unknown' ? '⟳ DETECTING' : formStatus.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Results */}
                    {result && !isLive && !isAnalyzing && (
                        <ScrollView style={styles.resultContainer}>
                            <Text style={styles.resultTitle}>✅ Session Complete!</Text>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Exercise:</Text>
                                <Text style={styles.resultValue}>{result.exercise}</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Total Reps:</Text>
                                <Text style={styles.resultValue}>{result.total_reps}</Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Overall Form:</Text>
                                <Text style={[
                                    styles.resultValue,
                                    { color: result.overall_form === 'correct' ? '#00FF00' : '#FF4444' }
                                ]}>
                                    {result.overall_form?.toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Confidence:</Text>
                                <Text style={styles.resultValue}>
                                    {Math.round((result.confidence || 0) * 100)}%
                                </Text>
                            </View>
                            {result.summary ? (
                                <Text style={styles.resultSummary}>{result.summary}</Text>
                            ) : null}
                            {result.feedback ? (
                                <Text style={styles.resultFeedback}>{result.feedback}</Text>
                            ) : null}
                            {result.body_part_issues && result.body_part_issues.length > 0 && (
                                <>
                                    <Text style={styles.issuesTitle}>Areas to Improve:</Text>
                                    {result.body_part_issues.map((issue: any, i: number) => (
                                        <View key={i} style={styles.issueItem}>
                                            <Text style={styles.issueBodyPart}>
                                                {issue.body_part} ({issue.severity})
                                            </Text>
                                            <Text style={styles.issueFeedback}>{issue.feedback}</Text>
                                        </View>
                                    ))}
                                </>
                            )}
                            {result.good_parts && result.good_parts.length > 0 && (
                                <>
                                    <Text style={styles.goodTitle}>Good Form On:</Text>
                                    {result.good_parts.map((part: string, i: number) => (
                                        <Text key={i} style={styles.goodPart}>✓ {part}</Text>
                                    ))}
                                </>
                            )}
                        </ScrollView>
                    )}

                    {/* Error */}
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>⚠ {error}</Text>
                        </View>
                    )}

                    {/* Analyzing spinner */}
                    {isAnalyzing && (
                        <View style={styles.analyzingContainer}>
                            <ActivityIndicator color="#FFFFFF" size="large" />
                            <Text style={styles.analyzingText}>Analyzing your session...</Text>
                        </View>
                    )}

                    {/* Action Button */}
                    {!isAnalyzing && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                isLive ? styles.stopButton : styles.startButton
                            ]}
                            onPress={isLive ? stopLiveSession : startLiveSession}
                        >
                            <Text style={styles.actionButtonText}>
                                {isLive ? '⏹  Stop & Analyze' : '▶  Start Session'}
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
    overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', paddingBottom: 30 },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
    backButton: { backgroundColor: '#501313', padding: 8, borderRadius: 20, marginRight: 15 },
    backText: { fontSize: 14, fontWeight: 'bold', color: 'white' },
    headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    exerciseSelector: { backgroundColor: 'rgba(0,0,0,0.75)', padding: 12, borderRadius: 25, alignSelf: 'center', marginTop: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#8B2F3F' },
    exerciseSelectorText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
    exerciseList: { backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 12, maxHeight: 220, alignSelf: 'center', width: '80%', marginTop: 5 },
    exerciseItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
    exerciseItemSelected: { backgroundColor: 'rgba(139,47,63,0.5)' },
    exerciseItemText: { color: '#FFFFFF', fontSize: 14 },
    cameraGuidance: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 10, padding: 10, marginHorizontal: 20, borderWidth: 1.5, alignItems: 'center' },
    cameraGuidanceText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
    liveStats: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingHorizontal: 20 },
    repBox: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 15, padding: 15, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: '#8B2F3F' },
    repNumber: { color: '#FFFFFF', fontSize: 40, fontWeight: 'bold' },
    repLabel: { color: '#AAAAAA', fontSize: 12, fontWeight: '600' },
    formBox: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 15, padding: 15, alignItems: 'center', justifyContent: 'center', flex: 1, borderWidth: 1, borderColor: '#333' },
    formStatusText: { fontSize: 16, fontWeight: 'bold' },
    resultContainer: { backgroundColor: 'rgba(0,0,0,0.88)', borderRadius: 15, padding: 15, marginHorizontal: 15, maxHeight: 320 },
    resultTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    resultLabel: { color: '#AAAAAA', fontSize: 14 },
    resultValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    resultSummary: { color: '#CCCCCC', fontSize: 13, marginTop: 8, fontStyle: 'italic' },
    resultFeedback: { color: '#FFFFFF', fontSize: 13, marginTop: 8, backgroundColor: 'rgba(139,47,63,0.4)', padding: 8, borderRadius: 8 },
    issuesTitle: { color: '#FF9944', fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 5 },
    issueItem: { backgroundColor: 'rgba(255,68,68,0.15)', borderRadius: 8, padding: 8, marginBottom: 5 },
    issueBodyPart: { color: '#FF6666', fontSize: 13, fontWeight: '600' },
    issueFeedback: { color: '#CCCCCC', fontSize: 12, marginTop: 2 },
    goodTitle: { color: '#00CC66', fontSize: 14, fontWeight: '700', marginTop: 10, marginBottom: 5 },
    goodPart: { color: '#00FF88', fontSize: 13, marginBottom: 3 },
    errorContainer: { backgroundColor: 'rgba(139,47,63,0.85)', borderRadius: 10, padding: 12, marginHorizontal: 20 },
    errorText: { color: '#FFFFFF', fontSize: 14, textAlign: 'center' },
    analyzingContainer: { alignItems: 'center', padding: 20 },
    analyzingText: { color: '#FFFFFF', fontSize: 16, marginTop: 10 },
    actionButton: { paddingVertical: 16, borderRadius: 35, alignItems: 'center', marginHorizontal: 30 },
    startButton: { backgroundColor: '#8B2F3F' },
    stopButton: { backgroundColor: '#B22222' },
    actionButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});