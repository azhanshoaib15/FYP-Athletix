import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
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

const EXERCISE_CAMERA: Record<string, 'front' | 'back'> = {
    'Squats': 'back', 'PushUp': 'back', 'Bench Press': 'back',
    'Bicep curl': 'front', 'Lunges': 'back', 'Plank': 'back',
    'Pull Ups': 'back', 'Shoulder press': 'front', 'Lat Pulldown': 'back',
    'Tricep Dips': 'back', 'Leg Press': 'back', 'Leg Extension': 'back',
    'Leg Raises': 'back', 'Chest Fly': 'back', 'BackRows': 'back',
    'Lateral Raises': 'front', 'Incline beanch Press': 'back', 'Tricep pushdown': 'front',
};

const EXERCISE_GUIDANCE: Record<string, { distance: string; angle: string; tip: string; camera: string }> = {
    'Squats':               { distance: '6-8 feet away',  angle: 'Side view (90°)',    tip: 'Full body visible head to feet',          camera: 'Back camera'  },
    'PushUp':               { distance: '4-6 feet away',  angle: 'Side view (90°)',    tip: 'Place phone on floor at side angle',       camera: 'Back camera'  },
    'Bench Press':          { distance: '5-7 feet away',  angle: 'Side view (90°)',    tip: 'Phone on tripod beside bench',             camera: 'Back camera'  },
    'Bicep curl':           { distance: '3-4 feet away',  angle: 'Front view',         tip: 'Arms visible from shoulder to wrist',      camera: 'Front camera' },
    'Lunges':               { distance: '6-8 feet away',  angle: 'Side view (90°)',    tip: 'Full body visible head to feet',          camera: 'Back camera'  },
    'Plank':                { distance: '5-7 feet away',  angle: 'Side view (90°)',    tip: 'Phone low on floor, side angle',           camera: 'Back camera'  },
    'Pull Ups':             { distance: '6-10 feet away', angle: 'Front view',         tip: 'Full body including bar must be visible',  camera: 'Back camera'  },
    'Shoulder press':       { distance: '3-5 feet away',  angle: 'Front view',         tip: 'Upper body fully visible in frame',        camera: 'Front camera' },
    'Lat Pulldown':         { distance: '5-7 feet away',  angle: 'Side view (90°)',    tip: 'Torso and arms fully visible',            camera: 'Back camera'  },
    'Tricep Dips':          { distance: '4-6 feet away',  angle: 'Side view (90°)',    tip: 'Arms and torso visible',                  camera: 'Back camera'  },
    'Leg Press':            { distance: '5-7 feet away',  angle: 'Side view (90°)',    tip: 'Full legs and seat visible',              camera: 'Back camera'  },
    'Leg Extension':        { distance: '4-6 feet away',  angle: 'Side view (90°)',    tip: 'Full legs visible while seated',          camera: 'Back camera'  },
    'Leg Raises':           { distance: '5-7 feet away',  angle: 'Side view (90°)',    tip: 'Full body visible while lying down',      camera: 'Back camera'  },
    'Chest Fly':            { distance: '5-7 feet away',  angle: 'Side view (90°)',    tip: 'Upper body and arms fully visible',       camera: 'Back camera'  },
    'BackRows':             { distance: '5-7 feet away',  angle: 'Side view (90°)',    tip: 'Torso and arms visible',                  camera: 'Back camera'  },
    'Lateral Raises':       { distance: '3-5 feet away',  angle: 'Front view',         tip: 'Upper body and arms visible',             camera: 'Front camera' },
    'Incline beanch Press': { distance: '5-7 feet away',  angle: 'Side view (90°)',    tip: 'Full upper body on incline visible',      camera: 'Back camera'  },
    'Tricep pushdown':      { distance: '3-5 feet away',  angle: 'Front or side view', tip: 'Arms visible from shoulder to wrist',     camera: 'Front camera' },
};

const getGuidance = (ex: string) => EXERCISE_GUIDANCE[ex] || {
    distance: '5-7 feet away', angle: 'Side or front view',
    tip: 'Full body must be visible in frame', camera: 'Back camera'
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
    const [goodFrames, setGoodFrames] = useState(0);
    const [poseQuality, setPoseQuality] = useState<'none' | 'poor' | 'good'>('none');
    const [poseWarning, setPoseWarning] = useState('');
    const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');

    const cameraRef = useRef<any>(null);
    const intervalRef = useRef<any>(null);
    const countdownRef = useRef<any>(null);
    const framesRef = useRef<string[]>([]);
    const keypointsRef = useRef<number[][]>([]);   // ← real keypoints from server
    const repsRef = useRef(0);
    const frameCountRef = useRef(0);
    const goodFramesRef = useRef(0);

    useEffect(() => {
        setCameraFacing(EXERCISE_CAMERA[selectedExercise] || 'back');
    }, [selectedExercise]);

    useEffect(() => {
        return () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current); };
    }, []);

    const toggleCamera = () => setCameraFacing(p => p === 'back' ? 'front' : 'back');

    const startCountdown = () => {
        setPhase('countdown');
        setCountdown(3);
        let c = 3;
        countdownRef.current = setInterval(() => {
            c--;
            setCountdown(c);
            if (c === 0) { clearInterval(countdownRef.current); startRecording(); }
        }, 1000);
    };

    const startRecording = () => {
        setPhase('recording');
        setError(null); setResult(null); setReps(0);
        setFormStatus(''); setCameraMessage(''); setFrameCount(0);
        setGoodFrames(0); setPoseQuality('none'); setPoseWarning('');
        repsRef.current = 0;
        framesRef.current = [];
        keypointsRef.current = [];
        frameCountRef.current = 0;
        goodFramesRef.current = 0;

        intervalRef.current = setInterval(async () => {
            if (!cameraRef.current) return;
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    base64: true, quality: 0.4, skipProcessing: true, mute: true,
                });
                if (!photo?.base64) return;

                framesRef.current.push(photo.base64);
                if (framesRef.current.length > 60) framesRef.current = framesRef.current.slice(-60);
                frameCountRef.current = framesRef.current.length;
                setFrameCount(frameCountRef.current);

                const res = await fetch(`${FORM_ANALYSIS_URL}/live/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exercise: selectedExercise,
                        latest_frame_b64: photo.base64,
                        recent_frames_b64: framesRef.current.slice(-10),
                        total_reps_so_far: repsRef.current,
                    }),
                });

                if (res.ok) {
                    const d = await res.json();

                    // Count reps
                    if (d.reps_in_window > 0) {
                        repsRef.current += d.reps_in_window;
                        setReps(repsRef.current);
                    }

                    // Form status
                    if (d.form_status && d.form_status !== 'unknown') {
                        setFormStatus(d.form_status);
                    }

                    setCameraMessage(d.camera_message || '');
                    setCameraReady(d.camera_ready || false);

                    // *** Collect REAL keypoints from server ***
                    if (d.keypoints && Array.isArray(d.keypoints) && d.keypoints.length === 132) {
                        keypointsRef.current.push(d.keypoints);
                        if (keypointsRef.current.length > 60) {
                            keypointsRef.current = keypointsRef.current.slice(-60);
                        }
                        goodFramesRef.current = keypointsRef.current.length;
                        setGoodFrames(goodFramesRef.current);
                        setPoseQuality('good');
                        setPoseWarning('');
                    } else {
                        // Show guidance based on camera status
                        const status = d.camera_status || '';
                        const g = getGuidance(selectedExercise);
                        if (status === 'low_light') {
                            setPoseWarning('⚠ Poor lighting — move to a brighter area');
                        } else if (status === 'too_close') {
                            setPoseWarning(`⚠ Too close — move ${g.distance} from camera`);
                        } else if (status === 'too_far') {
                            setPoseWarning(`⚠ Too far — move closer, ${g.distance} is ideal`);
                        } else if (status === 'partial_body') {
                            setPoseWarning(`⚠ Full body not visible — ${g.tip}`);
                        } else {
                            setPoseWarning(d.camera_message ? `⚠ ${d.camera_message}` : '⚠ Pose not detected — check position');
                        }
                        setPoseQuality(goodFramesRef.current > 0 ? 'poor' : 'none');
                    }
                }
            } catch (e) {}
        }, 800);
    };

    const stopAndAnalyze = async () => {
        clearInterval(intervalRef.current);
        setPhase('analyzing');
        setCameraMessage('');

        try {
            if (framesRef.current.length < 5) {
                setError(`Only ${framesRef.current.length} frames captured. Do the exercise for at least 5 seconds.`);
                setPhase('setup'); return;
            }

            // Use real keypoints if collected, otherwise fall back to dummy
            const kp: number[][] = keypointsRef.current.length >= 3
                ? keypointsRef.current
                : framesRef.current.map(() => Array(132).fill(0.15));

            const res = await fetch(`${FORM_ANALYSIS_URL}/live/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    exercise: selectedExercise,
                    all_keypoints: kp,
                }),
            });

            if (res.ok) {
                const d = await res.json();
                setResult({ ...d, total_reps: repsRef.current > 0 ? repsRef.current : d.total_reps });
                setPhase('results');
            } else {
                const e = await res.json().catch(() => ({}));
                setError(e.detail || 'Analysis failed. Try again.');
                setPhase('setup');
            }
        } catch {
            setError('Connection error. Please try again.');
            setPhase('setup');
        }
    };

    const resetSession = () => {
        setPhase('setup'); setResult(null); setError(null);
        setReps(0); setFrameCount(0); setFormStatus('');
        setPoseQuality('none'); setGoodFrames(0); setPoseWarning('');
        framesRef.current = [];
        keypointsRef.current = [];
        repsRef.current = 0;
        goodFramesRef.current = 0;
        setCameraFacing(EXERCISE_CAMERA[selectedExercise] || 'back');
    };

    if (!permission) return <View style={s.container} />;
    if (!permission.granted) {
        return (
            <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Text style={s.permTitle}>Camera Required</Text>
                <Text style={s.permText}>Form analysis needs camera access to track your movements</Text>
                <TouchableOpacity style={s.primaryBtn} onPress={requestPermission}>
                    <Text style={s.primaryBtnTxt}>Grant Camera Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryBtn} onPress={() => onNavigate('dashboard')}>
                    <Text style={s.secondaryBtnTxt}>Back to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const guidance = getGuidance(selectedExercise);
    const isFront = cameraFacing === 'front';

    return (
        <View style={s.container}>
            <CameraView style={s.camera} facing={cameraFacing} ref={cameraRef}>
                <View style={s.overlay}>

                    {/* Top bar */}
                    <View style={s.topBar}>
                        <TouchableOpacity style={s.backBtn} onPress={() => {
                            clearInterval(intervalRef.current);
                            clearInterval(countdownRef.current);
                            onNavigate('dashboard');
                        }}>
                            <Text style={s.backBtnTxt}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={s.topTitle}>Form Analysis</Text>
                        {phase === 'recording' && <View style={s.liveChip}><Text style={s.liveChipTxt}>● REC</Text></View>}
                        {(phase === 'setup' || phase === 'recording') && (
                            <TouchableOpacity style={s.flipBtn} onPress={toggleCamera}>
                                <Text style={s.flipBtnTxt}>🔄</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Camera badge */}
                    <View style={[s.camBadge, { backgroundColor: isFront ? 'rgba(0,100,200,0.8)' : 'rgba(0,120,0,0.8)' }]}>
                        <Text style={s.camBadgeTxt}>{isFront ? '🤳 Front Camera' : '📷 Back Camera'}</Text>
                    </View>

                    {/* ── SETUP ── */}
                    {phase === 'setup' && (
                        <ScrollView style={s.panel} contentContainerStyle={{ paddingBottom: 20 }}>
                            <TouchableOpacity style={s.exPicker} onPress={() => setShowExercises(!showExercises)}>
                                <Text style={s.exPickerLabel}>Exercise</Text>
                                <Text style={s.exPickerValue}>{selectedExercise} ▼</Text>
                            </TouchableOpacity>

                            {showExercises && (
                                <ScrollView style={s.exDropdown} nestedScrollEnabled>
                                    {EXERCISES.map(ex => (
                                        <TouchableOpacity key={ex}
                                            style={[s.exOption, ex === selectedExercise && s.exOptionActive]}
                                            onPress={() => { setSelectedExercise(ex); setShowExercises(false); }}>
                                            <View style={s.exOptionRow}>
                                                <Text style={s.exOptionTxt}>{ex}</Text>
                                                <Text style={{ fontSize: 16 }}>{EXERCISE_CAMERA[ex] === 'front' ? '🤳' : '📷'}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {!showExercises && (
                                <>
                                    <View style={s.guideCard}>
                                        <Text style={s.guideTitle}>📐 Camera Setup — {selectedExercise}</Text>
                                        <View style={[s.cameraTypeRow, { backgroundColor: isFront ? 'rgba(0,100,200,0.3)' : 'rgba(0,120,0,0.3)' }]}>
                                            <Text style={s.cameraTypeTxt}>{isFront ? '🤳' : '📷'} {guidance.camera} (auto)</Text>
                                            <TouchableOpacity onPress={toggleCamera} style={s.switchBtn}>
                                                <Text style={s.switchBtnTxt}>Switch 🔄</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={s.guideRow}>
                                            <Text style={s.guideIcon}>📏</Text>
                                            <View><Text style={s.guideLabel}>Distance</Text><Text style={s.guideValue}>{guidance.distance}</Text></View>
                                        </View>
                                        <View style={s.guideRow}>
                                            <Text style={s.guideIcon}>📐</Text>
                                            <View><Text style={s.guideLabel}>Camera Angle</Text><Text style={s.guideValue}>{guidance.angle}</Text></View>
                                        </View>
                                        <View style={s.guideRow}>
                                            <Text style={s.guideIcon}>💡</Text>
                                            <View style={{ flex: 1 }}><Text style={s.guideLabel}>Tip</Text><Text style={s.guideValue}>{guidance.tip}</Text></View>
                                        </View>
                                        <View style={s.divider} />
                                        <Text style={s.guideExtra}>✓ Good lighting on your body</Text>
                                        <Text style={s.guideExtra}>✓ Wear fitted clothing</Text>
                                        <Text style={s.guideExtra}>✓ Keep phone stable (lean against wall)</Text>
                                    </View>

                                    {error && <View style={s.errorBox}><Text style={s.errorTxt}>⚠ {error}</Text></View>}

                                    <TouchableOpacity style={s.startBtn} onPress={startCountdown}>
                                        <Text style={s.startBtnTxt}>▶  Start Session</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    )}

                    {/* ── COUNTDOWN ── */}
                    {phase === 'countdown' && (
                        <View style={s.centerContainer}>
                            <Text style={s.cdLabel}>Get Ready!</Text>
                            <Text style={s.cdNumber}>{countdown}</Text>
                            <Text style={s.cdSub}>{isFront ? '🤳 Front camera' : '📷 Back camera'}</Text>
                        </View>
                    )}

                    {/* ── RECORDING ── */}
                    {phase === 'recording' && (
                        <>
                            {/* Body outline guide */}
                            <View style={s.bodyGuide} pointerEvents="none">
                                <View style={s.bodyHead} />
                                <View style={s.bodyTorso} />
                                <View style={s.bodyLegs} />
                                <Text style={s.bodyGuideTxt}>Keep full body in frame</Text>
                            </View>

                            {/* Pose quality banner */}
                            <View style={[s.camBanner, {
                                backgroundColor:
                                    poseQuality === 'good' ? 'rgba(0,150,0,0.85)' :
                                    poseQuality === 'poor' ? 'rgba(180,80,0,0.85)' :
                                    'rgba(180,0,0,0.85)'
                            }]}>
                                <Text style={s.camBannerTxt}>
                                    {poseQuality === 'good'
                                        ? `✅ Pose detected! ${goodFrames} keyframe${goodFrames !== 1 ? 's' : ''} captured`
                                        : poseWarning || '⟳ Detecting pose — position yourself in frame'}
                                </Text>
                            </View>

                            {/* Show tips when pose not detected after 5 frames */}
                            {poseQuality !== 'good' && frameCount > 5 && (
                                <View style={s.poseTipBox}>
                                    <Text style={s.poseTipTitle}>📐 Fix for {selectedExercise}:</Text>
                                    <Text style={s.poseTipText}>• Use {guidance.camera}</Text>
                                    <Text style={s.poseTipText}>• Stand {guidance.distance}</Text>
                                    <Text style={s.poseTipText}>• Angle: {guidance.angle}</Text>
                                    <Text style={s.poseTipText}>• {guidance.tip}</Text>
                                </View>
                            )}

                            {/* Live stats */}
                            <View style={s.statsBar}>
                                <View style={s.statChip}>
                                    <Text style={s.statBig}>{reps}</Text>
                                    <Text style={s.statLabel}>REPS</Text>
                                </View>
                                <View style={s.statChip}>
                                    <Text style={[s.statBig, {
                                        fontSize: 13,
                                        color: formStatus === 'correct' ? '#00FF88' :
                                               formStatus === 'incorrect' ? '#FF4444' : '#FFAA00'
                                    }]}>
                                        {poseQuality === 'none' ? '📷 FIX CAM' :
                                         formStatus === 'correct' ? '✓ GOOD' :
                                         formStatus === 'incorrect' ? '✗ FIX FORM' :
                                         frameCount < 10 ? '⟳ LOADING' : '⟳ DETECTING'}
                                    </Text>
                                    <Text style={s.statLabel}>FORM</Text>
                                </View>
                                <View style={s.statChip}>
                                    <Text style={[s.statBig, { color: goodFrames >= 3 ? '#00FF88' : '#FFAA00' }]}>
                                        {goodFrames}
                                    </Text>
                                    <Text style={s.statLabel}>KEYFRAMES</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[s.stopBtn, goodFrames < 3 && s.stopBtnDisabled]}
                                onPress={stopAndAnalyze}
                            >
                                <Text style={s.stopBtnTxt}>
                                    {goodFrames < 3
                                        ? `⟳ Need ${3 - goodFrames} more keyframes`
                                        : '⏹  Stop & Analyze'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── ANALYZING ── */}
                    {phase === 'analyzing' && (
                        <View style={s.centerContainer}>
                            <ActivityIndicator color="#FFF" size="large" />
                            <Text style={s.analyzingTitle}>Analyzing Your Form</Text>
                            <Text style={s.analyzingSubtitle}>
                                {keypointsRef.current.length > 0
                                    ? `Using ${keypointsRef.current.length} real keyframes...`
                                    : `Processing ${frameCountRef.current} frames...`}
                            </Text>
                        </View>
                    )}

                    {/* ── RESULTS ── */}
                    {phase === 'results' && result && (
                        <ScrollView style={s.panel} contentContainerStyle={{ paddingBottom: 20 }}>
                            <Text style={s.resultBanner}>
                                {result.overall_form === 'correct' ? '🏆 Great Form!' : '💪 Room to Improve'}
                            </Text>

                            <View style={s.scoreRow}>
                                <View style={s.scoreCard}>
                                    <Text style={s.scoreNum}>{result.total_reps}</Text>
                                    <Text style={s.scoreLbl}>Reps</Text>
                                </View>
                                <View style={[s.scoreCard, { borderColor: result.overall_form === 'correct' ? '#00FF88' : '#FF4444' }]}>
                                    <Text style={[s.scoreNum, { color: result.overall_form === 'correct' ? '#00FF88' : '#FF4444' }]}>
                                        {Math.round((result.confidence || 0) * 100)}%
                                    </Text>
                                    <Text style={s.scoreLbl}>Confidence</Text>
                                </View>
                                <View style={s.scoreCard}>
                                    <Text style={[s.scoreNum, { fontSize: 14 }]}>
                                        {result.overall_form === 'correct' ? '✓ Good' : '✗ Fix'}
                                    </Text>
                                    <Text style={s.scoreLbl}>Form</Text>
                                </View>
                            </View>

                            {result.feedback && (
                                <View style={s.feedbackBox}>
                                    <Text style={s.feedbackTxt}>{result.feedback}</Text>
                                </View>
                            )}

                            {result.body_part_issues?.length > 0 && (
                                <View style={s.section}>
                                    <Text style={s.sectionTitle}>⚠ Areas to Improve</Text>
                                    {result.body_part_issues.map((issue: any, i: number) => (
                                        <View key={i} style={s.issueCard}>
                                            <Text style={s.issuePart}>
                                                {issue.body_part} <Text style={s.issueSeverity}>({issue.severity})</Text>
                                            </Text>
                                            <Text style={s.issueTxt}>{issue.feedback}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {result.good_parts?.length > 0 && (
                                <View style={s.section}>
                                    <Text style={[s.sectionTitle, { color: '#00FF88' }]}>✓ Good Form On</Text>
                                    {result.good_parts.map((part: string, i: number) => (
                                        <Text key={i} style={s.goodPart}>✓ {part}</Text>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity style={s.retryBtn} onPress={resetSession}>
                                <Text style={s.retryBtnTxt}>🔄  Try Again</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>
            </CameraView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    overlay: { flex: 1, backgroundColor: 'transparent' },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.55)' },
    backBtn: { backgroundColor: '#501313', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 10 },
    backBtnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    topTitle: { color: '#FFF', fontSize: 17, fontWeight: 'bold', flex: 1 },
    liveChip: { backgroundColor: '#CC0000', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 },
    liveChipTxt: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
    flipBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 8 },
    flipBtnTxt: { fontSize: 16 },
    camBadge: { alignSelf: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 6 },
    camBadgeTxt: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    permTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    permText: { color: '#AAA', fontSize: 15, textAlign: 'center', marginBottom: 30 },
    primaryBtn: { backgroundColor: '#8B2F3F', width: '80%', padding: 14, borderRadius: 25, alignItems: 'center', marginBottom: 12 },
    primaryBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    secondaryBtn: { backgroundColor: '#222', width: '80%', padding: 14, borderRadius: 25, alignItems: 'center' },
    secondaryBtnTxt: { color: '#AAA', fontSize: 16 },
    panel: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    exPicker: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#8B2F3F', marginBottom: 10 },
    exPickerLabel: { color: '#AAA', fontSize: 11, marginBottom: 2 },
    exPickerValue: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    exDropdown: { backgroundColor: 'rgba(10,10,10,0.95)', borderRadius: 12, maxHeight: 260, marginBottom: 10 },
    exOption: { padding: 13, borderBottomWidth: 1, borderBottomColor: '#222' },
    exOptionActive: { backgroundColor: 'rgba(139,47,63,0.4)' },
    exOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    exOptionTxt: { color: '#FFF', fontSize: 14 },
    guideCard: { backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
    guideTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', marginBottom: 12 },
    cameraTypeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, padding: 10, marginBottom: 12 },
    cameraTypeTxt: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    switchBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
    switchBtnTxt: { color: '#FFF', fontSize: 12 },
    guideRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
    guideIcon: { fontSize: 20, width: 28 },
    guideLabel: { color: '#888', fontSize: 11 },
    guideValue: { color: '#FFF', fontSize: 13, fontWeight: '600', flexShrink: 1 },
    divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
    guideExtra: { color: '#00CC66', fontSize: 13, marginBottom: 4 },
    errorBox: { backgroundColor: 'rgba(180,0,0,0.7)', borderRadius: 10, padding: 10, marginBottom: 10 },
    errorTxt: { color: '#FFF', fontSize: 13, textAlign: 'center' },
    startBtn: { backgroundColor: '#8B2F3F', borderRadius: 30, padding: 16, alignItems: 'center' },
    startBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cdLabel: { color: '#FFF', fontSize: 24, fontWeight: '700', marginBottom: 10 },
    cdNumber: { color: '#FF4444', fontSize: 120, fontWeight: '900', lineHeight: 130 },
    cdSub: { color: '#AAA', fontSize: 16, marginTop: 10 },
    bodyGuide: { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', opacity: 0.35 },
    bodyHead: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#00FF88', marginBottom: 4 },
    bodyTorso: { width: 80, height: 120, borderWidth: 2, borderColor: '#00FF88', borderRadius: 8, marginBottom: 4 },
    bodyLegs: { width: 80, height: 100, borderWidth: 2, borderColor: '#00FF88', borderRadius: 8 },
    bodyGuideTxt: { color: '#00FF88', fontSize: 12, marginTop: 8, fontWeight: '600' },
    camBanner: { marginHorizontal: 20, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 8 },
    camBannerTxt: { color: '#FFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
    poseTipBox: { backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 12, padding: 12, marginHorizontal: 20, marginTop: 8, borderWidth: 1, borderColor: '#FFAA00' },
    poseTipTitle: { color: '#FFAA00', fontSize: 13, fontWeight: '700', marginBottom: 5 },
    poseTipText: { color: '#FFF', fontSize: 12, marginBottom: 3 },
    statsBar: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginTop: 'auto', marginBottom: 12 },
    statChip: { backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 14, padding: 14, alignItems: 'center', minWidth: 90, borderWidth: 1, borderColor: '#333' },
    statBig: { color: '#FFF', fontSize: 28, fontWeight: '800' },
    statLabel: { color: '#666', fontSize: 11, marginTop: 2 },
    stopBtn: { backgroundColor: '#B22222', marginHorizontal: 30, borderRadius: 30, padding: 16, alignItems: 'center', marginBottom: 30 },
    stopBtnDisabled: { backgroundColor: '#555555' },
    stopBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    analyzingTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 16 },
    analyzingSubtitle: { color: '#AAA', fontSize: 14, marginTop: 6 },
    resultBanner: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 14, backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 14 },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
    scoreCard: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#444' },
    scoreNum: { color: '#FFF', fontSize: 26, fontWeight: '800' },
    scoreLbl: { color: '#888', fontSize: 11, marginTop: 4 },
    feedbackBox: { backgroundColor: 'rgba(139,47,63,0.5)', borderRadius: 12, padding: 12, marginBottom: 12 },
    feedbackTxt: { color: '#FFF', fontSize: 13, lineHeight: 20 },
    section: { backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: 12, padding: 12, marginBottom: 10 },
    sectionTitle: { color: '#FF9944', fontSize: 14, fontWeight: '700', marginBottom: 8 },
    issueCard: { backgroundColor: 'rgba(255,0,0,0.1)', borderRadius: 8, padding: 8, marginBottom: 6 },
    issuePart: { color: '#FF6666', fontSize: 13, fontWeight: '700' },
    issueSeverity: { color: '#FF9988', fontWeight: '400' },
    issueTxt: { color: '#CCC', fontSize: 12, marginTop: 2 },
    goodPart: { color: '#00FF88', fontSize: 13, marginBottom: 3 },
    retryBtn: { backgroundColor: '#8B2F3F', borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 6 },
    retryBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});