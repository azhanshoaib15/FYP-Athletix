import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';

const FORM_ANALYSIS_URL = 'https://desirable-playfulness-production-a1dd.up.railway.app';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface FormAnalysisProps {
    onNavigate: (screen: any) => void;
}

const EXERCISES = [
    'Squats', 'PushUp', 'Bench Press', 'Bicep curl', 'Lunges',
    'Plank', 'Pull Ups', 'Shoulder press', 'Lat Pulldown', 'Tricep Dips',
    'Leg Press', 'Leg Extension', 'Leg Raises', 'Chest Fly', 'BackRows',
    'Lateral Raises', 'Incline beanch Press', 'Tricep pushdown'
];

// Exercise-specific guidance
const EXERCISE_GUIDANCE: Record<string, { distance: string; angle: string; tip: string }> = {
    'Squats': { distance: '6-8 feet away', angle: 'Side view (90°)', tip: 'Full body must be visible — head to feet' },
    'PushUp': { distance: '4-6 feet away', angle: 'Side view (90°)', tip: 'Place phone on floor, side angle' },
    'Bench Press': { distance: '5-7 feet away', angle: 'Side view (90°)', tip: 'Phone on tripod, side of bench' },
    'Bicep curl': { distance: '4-6 feet away', angle: 'Front or side view', tip: 'Arms fully visible from shoulder to wrist' },
    'Lunges': { distance: '6-8 feet away', angle: 'Side view (90°)', tip: 'Full body visible — head to feet' },
    'Plank': { distance: '5-7 feet away', angle: 'Side view (90°)', tip: 'Place phone low, capture full body' },
    'Pull Ups': { distance: '6-10 feet away', angle: 'Front view', tip: 'Full body must be visible including bar' },
    'Shoulder press': { distance: '4-6 feet away', angle: 'Front or side view', tip: 'Upper body fully visible' },
    'Lat Pulldown': { distance: '5-7 feet away', angle: 'Side view (90°)', tip: 'Capture torso and arms fully' },
    'Tricep Dips': { distance: '4-6 feet away', angle: 'Side view (90°)', tip: 'Arms and torso fully visible' },
};

const getGuidance = (exercise: string) => {
    return EXERCISE_GUIDANCE[exercise] || {
        distance: '5-7 feet away',
        angle: 'Side or front view',
        tip: 'Full body must be visible in frame'
    };
};

type Phase = 'setup' | 'countdown' | 'recording' | 'analyzing' | 'results';

export default function FormAnalysisScreen({ onNavigate }: FormAnalysisProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [phase, setPhase] = useState<Phase>('setup');
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedExercise, setSelectedExercise] = useState('Squats');
    const [showExercises, setShowExercises] = useState(false);
    const [reps, setReps] = useState(0);
    const [formStatus, setFormStatus] = useState('');
    const [cameraMessage, setCameraMessage] = useState('');
    const [cameraReady, setCameraReady] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [frameCount, setFrameCount] = useState(0);

    const cameraRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const countdownRef = useRef<any>(null);
    const framesRef = useRef<string[]>([]);
    const repsRef = useRef(0);
    const frameCountRef = useRef(0);

    useEffect(() => {
        return () => {
            clearInterval(intervalRef.current);
            clearInterval(countdownRef.current);
        };
    }, []);

    const startCountdown = () => {
        setPhase('countdown');
        setCountdown(3);
        let count = 3;
        countdownRef.current = setInterval(() => {
            count--;
            setCountdown(count);
            if (count === 0) {
                clearInterval(countdownRef.current);
                startRecording();
            }
        }, 1000);
    };

    const startRecording = () => {
        setPhase('recording');
        setError(null);
        setResult(null);
        setReps(0);
        setFormStatus('');
        setCameraMessage('');
        setFrameCount(0);
        repsRef.current = 0;
        framesRef.current = [];
        frameCountRef.current = 0;

        intervalRef.current = setInterval(async () => {
            if (!cameraRef.current) return;
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: 0.4,
                    skipProcessing: true,
                    mute: true,
                });
                if (!photo?.base64) return;

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
                    if (data.reps_in_window > 0) {
                        repsRef.current += data.reps_in_window;
                        setReps(repsRef.current);
                    }
                    if (data.form_status && data.form_status !== 'unknown') {
                        setFormStatus(data.form_status);
                    }
                    setCameraMessage(data.camera_message || '');
                    setCameraReady(data.camera_ready || false);
                }
            } catch (e) {}
        }, 800);
    };

    const stopAndAnalyze = async () => {
        clearInterval(intervalRef.current);
        setPhase('analyzing');
        setCameraMessage('');

        try {
            const frames = framesRef.current;
            if (frames.length < 5) {
                setError(`Only ${frames.length} frames captured. Do the exercise for at least 5 seconds.`);
                setPhase('setup');
                return;
            }

            // Send dummy keypoints — server uses frames from live/check for analysis
            // The real analysis uses the frames already processed during live/check
            const keypointRows: number[][] = frames.map(() => Array(132).fill(0.15));

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
                setResult({ ...data, total_reps: repsRef.current > 0 ? repsRef.current : data.total_reps });
                setPhase('results');
            } else {
                const errData = await response.json().catch(() => ({}));
                setError(errData.detail || `Analysis failed. Try again.`);
                setPhase('setup');
            }
        } catch (e: any) {
            setError('Connection error. Please try again.');
            setPhase('setup');
        }
    };

    const resetSession = () => {
        setPhase('setup');
        setResult(null);
        setError(null);
        setReps(0);
        setFrameCount(0);
        setFormStatus('');
        framesRef.current = [];
        repsRef.current = 0;
    };

    if (!permission) return <View style={styles.container} />;

    if (!permission.granted) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Text style={styles.permissionTitle}>📷 Camera Required</Text>
                <Text style={styles.permissionText}>Form analysis needs camera access to track your movements</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                    <Text style={styles.primaryBtnText}>Grant Camera Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => onNavigate('dashboard')}>
                    <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const guidance = getGuidance(selectedExercise);

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing="back" ref={cameraRef}>

                {/* Always visible overlay */}
                <View style={styles.overlay}>

                    {/* Top Bar */}
                    <View style={styles.topBar}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => {
                            clearInterval(intervalRef.current);
                            clearInterval(countdownRef.current);
                            onNavigate('dashboard');
                        }}>
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.topTitle}>Form Analysis</Text>
                        {phase === 'recording' && (
                            <View style={styles.liveChip}>
                                <Text style={styles.liveChipText}>● REC</Text>
                            </View>
                        )}
                    </View>

                    {/* ── SETUP PHASE ── */}
                    {phase === 'setup' && (
                        <ScrollView style={styles.setupPanel} contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Exercise picker */}
                            <TouchableOpacity style={styles.exercisePicker} onPress={() => setShowExercises(!showExercises)}>
                                <Text style={styles.exercisePickerLabel}>Exercise</Text>
                                <Text style={styles.exercisePickerValue}>{selectedExercise} ▼</Text>
                            </TouchableOpacity>

                            {showExercises && (
                                <ScrollView style={styles.exerciseDropdown} nestedScrollEnabled>
                                    {EXERCISES.map(ex => (
                                        <TouchableOpacity key={ex}
                                            style={[styles.exerciseOption, ex === selectedExercise && styles.exerciseOptionActive]}
                                            onPress={() => { setSelectedExercise(ex); setShowExercises(false); }}>
                                            <Text style={styles.exerciseOptionText}>{ex}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {/* Guidance card */}
                            {!showExercises && (
                                <>
                                    <View style={styles.guidanceCard}>
                                        <Text style={styles.guidanceTitle}>📐 Camera Setup</Text>
                                        <View style={styles.guidanceRow}>
                                            <Text style={styles.guidanceIcon}>📏</Text>
                                            <View>
                                                <Text style={styles.guidanceLabel}>Distance</Text>
                                                <Text style={styles.guidanceValue}>{guidance.distance}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.guidanceRow}>
                                            <Text style={styles.guidanceIcon}>📷</Text>
                                            <View>
                                                <Text style={styles.guidanceLabel}>Camera Angle</Text>
                                                <Text style={styles.guidanceValue}>{guidance.angle}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.guidanceRow}>
                                            <Text style={styles.guidanceIcon}>💡</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.guidanceLabel}>Tip</Text>
                                                <Text style={styles.guidanceValue}>{guidance.tip}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.guidanceDivider} />
                                        <Text style={styles.guidanceExtra}>✓ Good lighting on your body</Text>
                                        <Text style={styles.guidanceExtra}>✓ Wear fitted clothing</Text>
                                        <Text style={styles.guidanceExtra}>✓ Keep phone stable (lean against wall)</Text>
                                    </View>

                                    {error && (
                                        <View style={styles.errorBox}>
                                            <Text style={styles.errorText}>⚠ {error}</Text>
                                        </View>
                                    )}

                                    <TouchableOpacity style={styles.startBtn} onPress={startCountdown}>
                                        <Text style={styles.startBtnText}>▶  Start Session</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    )}

                    {/* ── COUNTDOWN PHASE ── */}
                    {phase === 'countdown' && (
                        <View style={styles.countdownContainer}>
                            <Text style={styles.countdownLabel}>Get Ready!</Text>
                            <Text style={styles.countdownNumber}>{countdown}</Text>
                            <Text style={styles.countdownSub}>Recording starts in {countdown} second{countdown !== 1 ? 's' : ''}</Text>
                        </View>
                    )}

                    {/* ── RECORDING PHASE ── */}
                    {phase === 'recording' && (
                        <>
                            {/* Body outline guide */}
                            <View style={styles.bodyGuideContainer} pointerEvents="none">
                                <View style={styles.bodyGuideOuter}>
                                    {/* Head */}
                                    <View style={styles.bodyHead} />
                                    {/* Body */}
                                    <View style={styles.bodyTorso} />
                                    {/* Legs */}
                                    <View style={styles.bodyLegs} />
                                </View>
                                <Text style={styles.bodyGuideText}>Keep full body in frame</Text>
                            </View>

                            {/* Camera status */}
                            {cameraMessage !== '' && (
                                <View style={[styles.cameraBanner, {
                                    backgroundColor: cameraReady ? 'rgba(0,150,0,0.7)' : 'rgba(180,0,0,0.7)'
                                }]}>
                                    <Text style={styles.cameraBannerText}>{cameraMessage}</Text>
                                </View>
                            )}

                            {/* Live stats */}
                            <View style={styles.liveStatsBar}>
                                <View style={styles.statChip}>
                                    <Text style={styles.statChipBig}>{reps}</Text>
                                    <Text style={styles.statChipLabel}>REPS</Text>
                                </View>
                                <View style={styles.statChip}>
                                    <Text style={[styles.statChipBig, {
                                        color: formStatus === 'correct' ? '#00FF88' :
                                               formStatus === 'incorrect' ? '#FF4444' : '#FFAA00',
                                        fontSize: 14,
                                    }]}>
                                        {formStatus === 'correct' ? '✓ GOOD' :
                                         formStatus === 'incorrect' ? '✗ FIX' :
                                         frameCount < 10 ? '⟳ LOADING' : '⟳ DETECTING'}
                                    </Text>
                                    <Text style={styles.statChipLabel}>FORM</Text>
                                </View>
                                <View style={styles.statChip}>
                                    <Text style={styles.statChipBig}>{frameCount}</Text>
                                    <Text style={styles.statChipLabel}>FRAMES</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.stopBtn} onPress={stopAndAnalyze}>
                                <Text style={styles.stopBtnText}>⏹  Stop & Analyze</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── ANALYZING PHASE ── */}
                    {phase === 'analyzing' && (
                        <View style={styles.analyzingContainer}>
                            <ActivityIndicator color="#FFFFFF" size="large" />
                            <Text style={styles.analyzingTitle}>Analyzing Your Form</Text>
                            <Text style={styles.analyzingSubtitle}>Processing {frameCountRef.current} frames...</Text>
                        </View>
                    )}

                    {/* ── RESULTS PHASE ── */}
                    {phase === 'results' && result && (
                        <ScrollView style={styles.resultsPanel} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={styles.resultsBanner}>
                                {result.overall_form === 'correct' ? '🏆 Great Form!' : '💪 Room to Improve'}
                            </Text>

                            {/* Score cards */}
                            <View style={styles.scoreRow}>
                                <View style={styles.scoreCard}>
                                    <Text style={styles.scoreNum}>{result.total_reps}</Text>
                                    <Text style={styles.scoreLabel}>Reps</Text>
                                </View>
                                <View style={[styles.scoreCard, {
                                    borderColor: result.overall_form === 'correct' ? '#00FF88' : '#FF4444'
                                }]}>
                                    <Text style={[styles.scoreNum, {
                                        color: result.overall_form === 'correct' ? '#00FF88' : '#FF4444'
                                    }]}>
                                        {Math.round((result.confidence || 0) * 100)}%
                                    </Text>
                                    <Text style={styles.scoreLabel}>Confidence</Text>
                                </View>
                                <View style={styles.scoreCard}>
                                    <Text style={[styles.scoreNum, { fontSize: 14 }]}>
                                        {result.overall_form === 'correct' ? '✓ Good' : '✗ Fix'}
                                    </Text>
                                    <Text style={styles.scoreLabel}>Form</Text>
                                </View>
                            </View>

                            {/* Feedback */}
                            {result.feedback && (
                                <View style={styles.feedbackBox}>
                                    <Text style={styles.feedbackText}>{result.feedback}</Text>
                                </View>
                            )}

                            {/* Issues */}
                            {result.body_part_issues?.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>⚠ Areas to Improve</Text>
                                    {result.body_part_issues.map((issue: any, i: number) => (
                                        <View key={i} style={styles.issueCard}>
                                            <Text style={styles.issuePart}>{issue.body_part}
                                                <Text style={styles.issueSeverity}> ({issue.severity})</Text>
                                            </Text>
                                            <Text style={styles.issueText}>{issue.feedback}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Good parts */}
                            {result.good_parts?.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: '#00FF88' }]}>✓ Good Form On</Text>
                                    {result.good_parts.map((part: string, i: number) => (
                                        <Text key={i} style={styles.goodPart}>✓ {part}</Text>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity style={styles.retryBtn} onPress={resetSession}>
                                <Text style={styles.retryBtnText}>🔄  Try Again</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    overlay: { flex: 1, backgroundColor: 'transparent' },

    // Top bar
    topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
    backBtn: { backgroundColor: '#501313', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 12 },
    backBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    topTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', flex: 1 },
    liveChip: { backgroundColor: '#CC0000', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    liveChipText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

    // Permission
    permissionTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    permissionText: { color: '#AAA', fontSize: 15, textAlign: 'center', marginBottom: 30 },
    primaryBtn: { backgroundColor: '#8B2F3F', width: '80%', padding: 14, borderRadius: 25, alignItems: 'center', marginBottom: 12 },
    primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    secondaryBtn: { backgroundColor: '#222', width: '80%', padding: 14, borderRadius: 25, alignItems: 'center' },
    secondaryBtnText: { color: '#AAA', fontSize: 16 },

    // Setup
    setupPanel: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    exercisePicker: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#8B2F3F', marginBottom: 10 },
    exercisePickerLabel: { color: '#AAA', fontSize: 11, marginBottom: 2 },
    exercisePickerValue: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    exerciseDropdown: { backgroundColor: 'rgba(10,10,10,0.95)', borderRadius: 12, maxHeight: 240, marginBottom: 10 },
    exerciseOption: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#222' },
    exerciseOptionActive: { backgroundColor: 'rgba(139,47,63,0.4)' },
    exerciseOptionText: { color: '#FFF', fontSize: 14 },
    guidanceCard: { backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
    guidanceTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 12 },
    guidanceRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
    guidanceIcon: { fontSize: 20, width: 28 },
    guidanceLabel: { color: '#888', fontSize: 11 },
    guidanceValue: { color: '#FFF', fontSize: 13, fontWeight: '600', flexShrink: 1 },
    guidanceDivider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
    guidanceExtra: { color: '#00CC66', fontSize: 13, marginBottom: 4 },
    errorBox: { backgroundColor: 'rgba(180,0,0,0.7)', borderRadius: 10, padding: 10, marginBottom: 10 },
    errorText: { color: '#FFF', fontSize: 13, textAlign: 'center' },
    startBtn: { backgroundColor: '#8B2F3F', borderRadius: 30, padding: 16, alignItems: 'center' },
    startBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

    // Countdown
    countdownContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    countdownLabel: { color: '#FFF', fontSize: 24, fontWeight: '700', marginBottom: 10 },
    countdownNumber: { color: '#FF4444', fontSize: 120, fontWeight: '900', lineHeight: 130 },
    countdownSub: { color: '#AAA', fontSize: 16, marginTop: 10 },

    // Recording — body guide
    bodyGuideContainer: { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', opacity: 0.35 },
    bodyGuideOuter: { alignItems: 'center' },
    bodyHead: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#00FF88', marginBottom: 4 },
    bodyTorso: { width: 80, height: 120, borderWidth: 2, borderColor: '#00FF88', borderRadius: 8, marginBottom: 4 },
    bodyLegs: { width: 80, height: 100, borderWidth: 2, borderColor: '#00FF88', borderRadius: 8 },
    bodyGuideText: { color: '#00FF88', fontSize: 12, marginTop: 8, fontWeight: '600' },

    // Camera banner
    cameraBanner: { marginHorizontal: 20, borderRadius: 10, padding: 8, alignItems: 'center', marginTop: 8 },
    cameraBannerText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

    // Live stats bar
    liveStatsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginTop: 'auto', marginBottom: 12 },
    statChip: { backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 14, padding: 14, alignItems: 'center', minWidth: 90, borderWidth: 1, borderColor: '#333' },
    statChipBig: { color: '#FFF', fontSize: 28, fontWeight: '800' },
    statChipLabel: { color: '#666', fontSize: 11, marginTop: 2 },

    stopBtn: { backgroundColor: '#B22222', marginHorizontal: 30, borderRadius: 30, padding: 16, alignItems: 'center', marginBottom: 30 },
    stopBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

    // Analyzing
    analyzingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    analyzingTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 16 },
    analyzingSubtitle: { color: '#AAA', fontSize: 14, marginTop: 6 },

    // Results
    resultsPanel: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    resultsBanner: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 14, backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 14 },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
    scoreCard: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
    scoreNum: { color: '#FFF', fontSize: 26, fontWeight: '800' },
    scoreLabel: { color: '#888', fontSize: 11, marginTop: 4 },
    feedbackBox: { backgroundColor: 'rgba(139,47,63,0.5)', borderRadius: 12, padding: 12, marginBottom: 12 },
    feedbackText: { color: '#FFF', fontSize: 13, lineHeight: 20 },
    section: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, padding: 12, marginBottom: 10 },
    sectionTitle: { color: '#FF9944', fontSize: 14, fontWeight: '700', marginBottom: 8 },
    issueCard: { backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: 8, padding: 8, marginBottom: 6 },
    issuePart: { color: '#FF6666', fontSize: 13, fontWeight: '700' },
    issueSeverity: { color: '#FF9988', fontWeight: '400' },
    issueText: { color: '#CCC', fontSize: 12, marginTop: 2 },
    goodPart: { color: '#00FF88', fontSize: 13, marginBottom: 3 },
    retryBtn: { backgroundColor: '#8B2F3F', borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 6 },
    retryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});