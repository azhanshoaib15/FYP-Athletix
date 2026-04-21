import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import {
    ActivityIndicator, Dimensions, ScrollView,
    StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

const FORM_ANALYSIS_URL = 'https://desirable-playfulness-production-a1dd.up.railway.app';
const { width: SW, height: SH } = Dimensions.get('window');

interface FormAnalysisProps {
    onNavigate: (screen: any) => void;
}

// ─── Exercise config ────────────────────────────────────────────────────────

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

const EXERCISE_GUIDANCE: Record<string, {distance:string; angle:string; tip:string; camera:string}> = {
    'Squats':               {distance:'6-8 feet', angle:'Side view 90°',    tip:'Full body head to feet',          camera:'Back camera' },
    'PushUp':               {distance:'4-6 feet', angle:'Side view 90°',    tip:'Phone on floor, side angle',      camera:'Back camera' },
    'Bench Press':          {distance:'5-7 feet', angle:'Side view 90°',    tip:'Tripod beside bench',             camera:'Back camera' },
    'Bicep curl':           {distance:'3-4 feet', angle:'Front view',       tip:'Arms visible shoulder to wrist',  camera:'Front camera'},
    'Lunges':               {distance:'6-8 feet', angle:'Side view 90°',    tip:'Full body head to feet',          camera:'Back camera' },
    'Plank':                {distance:'5-7 feet', angle:'Side view 90°',    tip:'Phone low on floor',              camera:'Back camera' },
    'Pull Ups':             {distance:'6-10 feet',angle:'Front view',       tip:'Full body + bar visible',         camera:'Back camera' },
    'Shoulder press':       {distance:'3-5 feet', angle:'Front view',       tip:'Upper body fully visible',        camera:'Front camera'},
    'Lat Pulldown':         {distance:'5-7 feet', angle:'Side view 90°',    tip:'Torso and arms visible',          camera:'Back camera' },
    'Tricep Dips':          {distance:'4-6 feet', angle:'Side view 90°',    tip:'Arms and torso visible',          camera:'Back camera' },
    'Leg Press':            {distance:'5-7 feet', angle:'Side view 90°',    tip:'Full legs + seat visible',        camera:'Back camera' },
    'Leg Extension':        {distance:'4-6 feet', angle:'Side view 90°',    tip:'Full legs while seated',          camera:'Back camera' },
    'Leg Raises':           {distance:'5-7 feet', angle:'Side view 90°',    tip:'Full body while lying',           camera:'Back camera' },
    'Chest Fly':            {distance:'5-7 feet', angle:'Side view 90°',    tip:'Upper body + arms visible',       camera:'Back camera' },
    'BackRows':             {distance:'5-7 feet', angle:'Side view 90°',    tip:'Torso and arms visible',          camera:'Back camera' },
    'Lateral Raises':       {distance:'3-5 feet', angle:'Front view',       tip:'Upper body + arms visible',       camera:'Front camera'},
    'Incline beanch Press': {distance:'5-7 feet', angle:'Side view 90°',    tip:'Upper body on incline',           camera:'Back camera' },
    'Tricep pushdown':      {distance:'3-5 feet', angle:'Front/side view',  tip:'Arms shoulder to wrist',          camera:'Front camera'},
};

const getGuidance = (ex: string) => EXERCISE_GUIDANCE[ex] || {
    distance:'5-7 feet', angle:'Side or front', tip:'Full body visible', camera:'Back camera'
};

// ─── MediaPipe skeleton ──────────────────────────────────────────────────────

// 33 landmark connections (MediaPipe Pose)
const CONNECTIONS: [number,number][] = [
    // Torso
    [11,12],[11,23],[12,24],[23,24],
    // Left arm
    [11,13],[13,15],[15,17],[15,19],[17,19],
    // Right arm
    [12,14],[14,16],[16,18],[16,20],[18,20],
    // Left leg
    [23,25],[25,27],[27,29],[27,31],[29,31],
    // Right leg
    [24,26],[26,28],[28,30],[28,32],[30,32],
    // Shoulders to ears
    [11,12],
];

// Joints to highlight with circles
const JOINTS = [11,12,13,14,15,16,23,24,25,26,27,28];

interface Landmark { x:number; y:number; v:number; }

const parseLandmarks = (kp: number[]): Landmark[] => {
    const lms: Landmark[] = [];
    for (let i = 0; i < 33; i++) {
        lms.push({ x: kp[i*4], y: kp[i*4+1], v: kp[i*4+3] });
    }
    return lms;
};

// ─── Skeleton SVG overlay ────────────────────────────────────────────────────

interface SkeletonProps {
    keypoints: number[] | null;
    formStatus: string;
    w: number;
    h: number;
}

function SkeletonOverlay({ keypoints, formStatus, w, h }: SkeletonProps) {
    if (!keypoints || keypoints.length !== 132) return null;

    const lms = parseLandmarks(keypoints);

    const color = formStatus === 'correct'   ? '#00FF88'
                : formStatus === 'incorrect' ? '#FF4444'
                : '#FFD700';

    const bgColor = formStatus === 'correct'   ? 'rgba(0,180,0,0.85)'
                  : formStatus === 'incorrect' ? 'rgba(200,0,0,0.85)'
                  : 'rgba(180,130,0,0.85)';

    const label = formStatus === 'correct'   ? '✓  GOOD FORM'
                : formStatus === 'incorrect' ? '✗  FIX YOUR FORM'
                : '';

    return (
        <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
            {/* Skeleton lines */}
            {CONNECTIONS.map(([a, b], i) => {
                const A = lms[a]; const B = lms[b];
                if (!A || !B || A.v < 0.4 || B.v < 0.4) return null;
                return (
                    <Line key={`l${i}`}
                        x1={A.x * w} y1={A.y * h}
                        x2={B.x * w} y2={B.y * h}
                        stroke={color} strokeWidth={3} strokeOpacity={0.9}
                        strokeLinecap="round"
                    />
                );
            })}

            {/* Joint circles */}
            {JOINTS.map(idx => {
                const lm = lms[idx];
                if (!lm || lm.v < 0.4) return null;
                return (
                    <Circle key={`j${idx}`}
                        cx={lm.x * w} cy={lm.y * h}
                        r={7} fill={color} fillOpacity={0.95}
                        stroke="#000" strokeWidth={1.5}
                    />
                );
            })}

            {/* All landmark dots (smaller) */}
            {lms.map((lm, idx) => {
                if (!JOINTS.includes(idx) && lm.v >= 0.5) {
                    return (
                        <Circle key={`d${idx}`}
                            cx={lm.x * w} cy={lm.y * h}
                            r={3} fill={color} fillOpacity={0.6}
                        />
                    );
                }
                return null;
            })}

            {/* Form status badge */}
            {label !== '' && (
                <>
                    <Rect
                        x={w/2 - 90} y={h - 110}
                        width={180} height={36}
                        rx={18} fill={bgColor}
                    />
                    <SvgText
                        x={w/2} y={h - 86}
                        textAnchor="middle"
                        fill="white" fontSize={15} fontWeight="bold"
                    >
                        {label}
                    </SvgText>
                </>
            )}
        </Svg>
    );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type Phase = 'setup' | 'countdown' | 'recording' | 'analyzing' | 'results';

export default function FormAnalysisScreen({ onNavigate }: FormAnalysisProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [phase, setPhase]               = useState<Phase>('setup');
    const [result, setResult]             = useState<any>(null);
    const [error, setError]               = useState<string|null>(null);
    const [exercise, setExercise]         = useState('Squats');
    const [showList, setShowList]         = useState(false);
    const [reps, setReps]                 = useState(0);
    const [formStatus, setFormStatus]     = useState('');
    const [camMsg, setCamMsg]             = useState('');
    const [countdown, setCountdown]       = useState(3);
    const [frameCount, setFrameCount]     = useState(0);
    const [goodFrames, setGoodFrames]     = useState(0);
    const [poseOk, setPoseOk]             = useState(false);
    const [warning, setWarning]           = useState('');
    const [facing, setFacing]             = useState<'front'|'back'>('back');
    const [keypoints, setKeypoints]       = useState<number[]|null>(null);
    const [camSize, setCamSize]           = useState({w: SW, h: SH});

    const camRef       = useRef<any>(null);
    const interval     = useRef<any>(null);
    const cdInterval   = useRef<any>(null);
    const framesR      = useRef<string[]>([]);
    const kpR          = useRef<number[][]>([]);
    const repsR        = useRef(0);
    const frameR       = useRef(0);
    const goodR        = useRef(0);

    useEffect(() => {
        setFacing(EXERCISE_CAMERA[exercise] || 'back');
        setKeypoints(null);
    }, [exercise]);

    useEffect(() => () => {
        clearInterval(interval.current);
        clearInterval(cdInterval.current);
    }, []);

    const startCountdown = () => {
        setPhase('countdown'); setCountdown(3);
        let c = 3;
        cdInterval.current = setInterval(() => {
            c--;
            setCountdown(c);
            if (c === 0) { clearInterval(cdInterval.current); startRecording(); }
        }, 1000);
    };

    const startRecording = () => {
        setPhase('recording');
        setError(null); setResult(null); setReps(0);
        setFormStatus(''); setCamMsg(''); setFrameCount(0);
        setGoodFrames(0); setPoseOk(false); setWarning(''); setKeypoints(null);
        repsR.current = 0; framesR.current = []; kpR.current = [];
        frameR.current = 0; goodR.current = 0;

        interval.current = setInterval(async () => {
            if (!camRef.current) return;
            try {
                const photo = await camRef.current.takePictureAsync({
                    base64: true, quality: 0.4, skipProcessing: true, mute: true,
                });
                if (!photo?.base64) return;

                framesR.current.push(photo.base64);
                if (framesR.current.length > 60) framesR.current = framesR.current.slice(-60);
                frameR.current = framesR.current.length;
                setFrameCount(frameR.current);

                const res = await fetch(`${FORM_ANALYSIS_URL}/live/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exercise,
                        latest_frame_b64: photo.base64,
                        recent_frames_b64: framesR.current.slice(-10),
                        total_reps_so_far: repsR.current,
                    }),
                });

                if (!res.ok) return;
                const d = await res.json();

                // Reps
                if (d.reps_in_window > 0) { repsR.current += d.reps_in_window; setReps(repsR.current); }

                // Form
                if (d.form_status && d.form_status !== 'unknown') setFormStatus(d.form_status);

                setCamMsg(d.camera_message || '');

                // ── SKELETON: use real keypoints from server ──────────────────
                if (d.keypoints && d.keypoints.length === 132) {
                    setKeypoints(d.keypoints);          // live skeleton draw
                    kpR.current.push(d.keypoints);
                    if (kpR.current.length > 60) kpR.current = kpR.current.slice(-60);
                    goodR.current = kpR.current.length;
                    setGoodFrames(goodR.current);
                    setPoseOk(true);
                    setWarning('');
                } else {
                    setKeypoints(null);
                    const g = getGuidance(exercise);
                    const st = d.camera_status || '';
                    if      (st === 'low_light')    setWarning('⚠ Poor lighting — brighter area needed');
                    else if (st === 'too_close')    setWarning(`⚠ Too close — move ${g.distance} away`);
                    else if (st === 'too_far')      setWarning(`⚠ Too far — ${g.distance} is ideal`);
                    else if (st === 'partial_body') setWarning(`⚠ Full body not visible — ${g.tip}`);
                    else                            setWarning(d.camera_message || '⚠ Pose not detected');
                    setPoseOk(goodR.current > 0);
                }
            } catch (_) {}
        }, 800);
    };

    const stopAndAnalyze = async () => {
        clearInterval(interval.current);
        setPhase('analyzing'); setCamMsg(''); setKeypoints(null);

        try {
            if (framesR.current.length < 5) {
                setError(`Only ${framesR.current.length} frames — do the exercise for at least 5 seconds.`);
                setPhase('setup'); return;
            }

            // Use real keypoints if available, else dummy
            const kp = kpR.current.length >= 3
                ? kpR.current
                : framesR.current.map(() => Array(132).fill(0.15));

            const res = await fetch(`${FORM_ANALYSIS_URL}/live/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exercise, all_keypoints: kp }),
            });

            if (res.ok) {
                const d = await res.json();
                setResult({ ...d, total_reps: repsR.current > 0 ? repsR.current : d.total_reps });
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

    const reset = () => {
        setPhase('setup'); setResult(null); setError(null);
        setReps(0); setFrameCount(0); setFormStatus('');
        setPoseOk(false); setGoodFrames(0); setWarning('');
        setKeypoints(null);
        framesR.current = []; kpR.current = [];
        repsR.current = 0; goodR.current = 0;
        setFacing(EXERCISE_CAMERA[exercise] || 'back');
    };

    if (!permission) return <View style={s.root} />;

    if (!permission.granted) {
        return (
            <View style={[s.root, s.center]}>
                <Text style={s.permTitle}>📷 Camera Required</Text>
                <Text style={s.permText}>Form analysis needs camera to track your movements</Text>
                <TouchableOpacity style={s.btnPrimary} onPress={requestPermission}>
                    <Text style={s.btnPrimaryTxt}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSecondary} onPress={() => onNavigate('dashboard')}>
                    <Text style={s.btnSecondaryTxt}>Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const g = getGuidance(exercise);
    const isFront = facing === 'front';

    return (
        <View style={s.root}>
            <CameraView
                style={s.camera}
                facing={facing}
                ref={camRef}
                onLayout={e => {
                    const { width, height } = e.nativeEvent.layout;
                    setCamSize({ w: width, h: height });
                }}
            >
                {/* ── Real-time skeleton overlay ── */}
                {phase === 'recording' && (
                    <SkeletonOverlay
                        keypoints={keypoints}
                        formStatus={formStatus}
                        w={camSize.w}
                        h={camSize.h}
                    />
                )}

                <View style={s.overlay}>

                    {/* Top bar */}
                    <View style={s.topBar}>
                        <TouchableOpacity style={s.backBtn} onPress={() => {
                            clearInterval(interval.current);
                            clearInterval(cdInterval.current);
                            onNavigate('dashboard');
                        }}>
                            <Text style={s.backBtnTxt}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={s.topTitle}>Form Analysis</Text>
                        {phase === 'recording' && (
                            <View style={s.recChip}><Text style={s.recChipTxt}>● REC</Text></View>
                        )}
                        {(phase === 'setup' || phase === 'recording') && (
                            <TouchableOpacity style={s.flipBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                                <Text style={s.flipBtnTxt}>🔄</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Camera badge */}
                    <View style={[s.camBadge, { backgroundColor: isFront ? 'rgba(0,100,200,0.85)' : 'rgba(0,130,0,0.85)' }]}>
                        <Text style={s.camBadgeTxt}>{isFront ? '🤳 Front Camera' : '📷 Back Camera'}</Text>
                    </View>

                    {/* ── SETUP ── */}
                    {phase === 'setup' && (
                        <ScrollView style={s.panel} contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Exercise picker */}
                            <TouchableOpacity style={s.exPicker} onPress={() => setShowList(!showList)}>
                                <Text style={s.exPickerLabel}>Exercise</Text>
                                <Text style={s.exPickerVal}>{exercise} ▼</Text>
                            </TouchableOpacity>

                            {showList && (
                                <ScrollView style={s.exList} nestedScrollEnabled>
                                    {EXERCISES.map(ex => (
                                        <TouchableOpacity key={ex}
                                            style={[s.exItem, ex === exercise && s.exItemActive]}
                                            onPress={() => { setExercise(ex); setShowList(false); }}>
                                            <Text style={s.exItemTxt}>{ex}</Text>
                                            <Text style={{ fontSize: 16 }}>
                                                {EXERCISE_CAMERA[ex] === 'front' ? '🤳' : '📷'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {!showList && (
                                <>
                                    {/* Camera setup card */}
                                    <View style={s.guideCard}>
                                        <Text style={s.guideTitle}>📐 Camera Setup — {exercise}</Text>

                                        <View style={[s.camTypeRow, {
                                            backgroundColor: isFront ? 'rgba(0,100,200,0.25)' : 'rgba(0,130,0,0.25)'
                                        }]}>
                                            <Text style={s.camTypeTxt}>
                                                {isFront ? '🤳' : '📷'} {g.camera} (auto-selected)
                                            </Text>
                                            <TouchableOpacity style={s.switchBtn}
                                                onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                                                <Text style={s.switchBtnTxt}>Switch 🔄</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={s.guideRow}>
                                            <Text style={s.guideIcon}>📏</Text>
                                            <View>
                                                <Text style={s.guideLbl}>Distance</Text>
                                                <Text style={s.guideVal}>{g.distance}</Text>
                                            </View>
                                        </View>
                                        <View style={s.guideRow}>
                                            <Text style={s.guideIcon}>📐</Text>
                                            <View>
                                                <Text style={s.guideLbl}>Camera Angle</Text>
                                                <Text style={s.guideVal}>{g.angle}</Text>
                                            </View>
                                        </View>
                                        <View style={s.guideRow}>
                                            <Text style={s.guideIcon}>💡</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.guideLbl}>Tip</Text>
                                                <Text style={s.guideVal}>{g.tip}</Text>
                                            </View>
                                        </View>
                                        <View style={s.divider} />
                                        <Text style={s.guideExtra}>✓ Good lighting on your body</Text>
                                        <Text style={s.guideExtra}>✓ Wear fitted clothing (no baggy)</Text>
                                        <Text style={s.guideExtra}>✓ Keep phone stable — lean on wall</Text>
                                        <Text style={s.guideExtra}>✓ Skeleton lines will appear when pose detected</Text>
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
                        <View style={s.center}>
                            <Text style={s.cdLabel}>Get Ready!</Text>
                            <Text style={s.cdNum}>{countdown}</Text>
                            <Text style={s.cdSub}>Stand in position now</Text>
                            <Text style={s.cdSub}>{isFront ? '🤳 Front camera' : '📷 Back camera'}</Text>
                        </View>
                    )}

                    {/* ── RECORDING ── */}
                    {phase === 'recording' && (
                        <>
                            {/* Pose quality / camera feedback banner */}
                            <View style={[s.poseBanner, {
                                backgroundColor:
                                    poseOk    ? 'rgba(0,150,0,0.85)' :
                                    goodR.current > 0 ? 'rgba(180,100,0,0.85)' :
                                    'rgba(180,0,0,0.85)'
                            }]}>
                                <Text style={s.poseBannerTxt}>
                                    {poseOk
                                        ? `✅ Skeleton detected — ${goodFrames} frame${goodFrames !== 1 ? 's' : ''}`
                                        : warning || '⟳ Detecting pose — position yourself'}
                                </Text>
                            </View>

                            {/* Tips shown when pose not detected */}
                            {!poseOk && frameCount > 5 && (
                                <View style={s.tipBox}>
                                    <Text style={s.tipTitle}>📐 Fix for {exercise}:</Text>
                                    <Text style={s.tipTxt}>• {g.camera}</Text>
                                    <Text style={s.tipTxt}>• Distance: {g.distance}</Text>
                                    <Text style={s.tipTxt}>• Angle: {g.angle}</Text>
                                    <Text style={s.tipTxt}>• {g.tip}</Text>
                                </View>
                            )}

                            {/* Live stats bar */}
                            <View style={s.statsBar}>
                                <View style={s.statChip}>
                                    <Text style={s.statNum}>{reps}</Text>
                                    <Text style={s.statLbl}>REPS</Text>
                                </View>
                                <View style={s.statChip}>
                                    <Text style={[s.statNum, {
                                        fontSize: 13,
                                        color: formStatus === 'correct'   ? '#00FF88' :
                                               formStatus === 'incorrect' ? '#FF4444' : '#FFAA00'
                                    }]}>
                                        {formStatus === 'correct'   ? '✓ GOOD' :
                                         formStatus === 'incorrect' ? '✗ FIX'  :
                                         !poseOk ? '📷 FIX CAM' : '⟳ DETECTING'}
                                    </Text>
                                    <Text style={s.statLbl}>FORM</Text>
                                </View>
                                <View style={s.statChip}>
                                    <Text style={[s.statNum, { color: goodFrames >= 3 ? '#00FF88' : '#FFAA00' }]}>
                                        {goodFrames}
                                    </Text>
                                    <Text style={s.statLbl}>KEYFRAMES</Text>
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
                        <View style={s.center}>
                            <ActivityIndicator color="#FFF" size="large" />
                            <Text style={s.analyzingTitle}>Analyzing Your Form</Text>
                            <Text style={s.analyzingSubtitle}>
                                {kpR.current.length > 0
                                    ? `Using ${kpR.current.length} real keyframes...`
                                    : `Processing ${frameR.current} frames...`}
                            </Text>
                        </View>
                    )}

                    {/* ── RESULTS ── */}
                    {phase === 'results' && result && (
                        <ScrollView style={s.panel} contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Banner */}
                            <View style={[s.resultBanner, {
                                backgroundColor: result.overall_form === 'correct'
                                    ? 'rgba(0,140,0,0.9)' : 'rgba(160,0,0,0.9)'
                            }]}>
                                <Text style={s.resultBannerTxt}>
                                    {result.overall_form === 'correct' ? '🏆  Great Form!' : '💪  Room to Improve'}
                                </Text>
                            </View>

                            {/* Score cards */}
                            <View style={s.scoreRow}>
                                <View style={s.scoreCard}>
                                    <Text style={s.scoreNum}>{result.total_reps}</Text>
                                    <Text style={s.scoreLbl}>Reps</Text>
                                </View>
                                <View style={[s.scoreCard, {
                                    borderColor: result.overall_form === 'correct' ? '#00FF88' : '#FF4444'
                                }]}>
                                    <Text style={[s.scoreNum, {
                                        color: result.overall_form === 'correct' ? '#00FF88' : '#FF4444'
                                    }]}>
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

                            {/* Feedback */}
                            {result.feedback && (
                                <View style={s.feedbackBox}>
                                    <Text style={s.feedbackTxt}>{result.feedback}</Text>
                                </View>
                            )}

                            {/* Issues */}
                            {result.body_part_issues?.length > 0 && (
                                <View style={s.section}>
                                    <Text style={s.sectionTitle}>⚠ Areas to Improve</Text>
                                    {result.body_part_issues.map((issue: any, i: number) => (
                                        <View key={i} style={s.issueCard}>
                                            <Text style={s.issuePart}>
                                                {issue.body_part}{' '}
                                                <Text style={s.issueSev}>({issue.severity})</Text>
                                            </Text>
                                            <Text style={s.issueTxt}>{issue.feedback}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Good parts */}
                            {result.good_parts?.length > 0 && (
                                <View style={s.section}>
                                    <Text style={[s.sectionTitle, { color: '#00FF88' }]}>✓ Good Form On</Text>
                                    {result.good_parts.map((part: string, i: number) => (
                                        <Text key={i} style={s.goodPart}>✓ {part}</Text>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity style={s.retryBtn} onPress={reset}>
                                <Text style={s.retryBtnTxt}>🔄  Try Again</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                </View>
            </CameraView>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root:            { flex: 1, backgroundColor: '#000' },
    camera:          { flex: 1 },
    overlay:         { flex: 1, backgroundColor: 'transparent' },
    center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Top bar
    topBar:          { flexDirection:'row', alignItems:'center', paddingTop:52, paddingHorizontal:16, paddingBottom:10, backgroundColor:'rgba(0,0,0,0.6)' },
    backBtn:         { backgroundColor:'#501313', paddingHorizontal:12, paddingVertical:7, borderRadius:20, marginRight:10 },
    backBtnTxt:      { color:'#FFF', fontWeight:'bold', fontSize:13 },
    topTitle:        { color:'#FFF', fontSize:17, fontWeight:'bold', flex:1 },
    recChip:         { backgroundColor:'#CC0000', borderRadius:10, paddingHorizontal:8, paddingVertical:3, marginRight:8 },
    recChipTxt:      { color:'#FFF', fontSize:11, fontWeight:'bold' },
    flipBtn:         { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:20, padding:8 },
    flipBtnTxt:      { fontSize:16 },

    // Camera badge
    camBadge:        { alignSelf:'center', borderRadius:20, paddingHorizontal:14, paddingVertical:5, marginTop:6 },
    camBadgeTxt:     { color:'#FFF', fontSize:12, fontWeight:'600' },

    // Permission
    permTitle:       { color:'#FFF', fontSize:24, fontWeight:'bold', marginBottom:12 },
    permText:        { color:'#AAA', fontSize:15, textAlign:'center', marginBottom:30 },
    btnPrimary:      { backgroundColor:'#8B2F3F', width:'80%', padding:14, borderRadius:25, alignItems:'center', marginBottom:12 },
    btnPrimaryTxt:   { color:'#FFF', fontWeight:'700', fontSize:16 },
    btnSecondary:    { backgroundColor:'#222', width:'80%', padding:14, borderRadius:25, alignItems:'center' },
    btnSecondaryTxt: { color:'#AAA', fontSize:16 },

    // Panel
    panel:           { flex:1, paddingHorizontal:16, paddingTop:10 },

    // Exercise picker
    exPicker:        { backgroundColor:'rgba(0,0,0,0.85)', borderRadius:14, padding:14, borderWidth:1, borderColor:'#8B2F3F', marginBottom:10 },
    exPickerLabel:   { color:'#AAA', fontSize:11, marginBottom:2 },
    exPickerVal:     { color:'#FFF', fontSize:16, fontWeight:'600' },
    exList:          { backgroundColor:'rgba(5,5,5,0.97)', borderRadius:12, maxHeight:260, marginBottom:10 },
    exItem:          { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:13, borderBottomWidth:1, borderBottomColor:'#222' },
    exItemActive:    { backgroundColor:'rgba(139,47,63,0.4)' },
    exItemTxt:       { color:'#FFF', fontSize:14 },

    // Guide card
    guideCard:       { backgroundColor:'rgba(0,0,0,0.85)', borderRadius:14, padding:16, marginBottom:12, borderWidth:1, borderColor:'#333' },
    guideTitle:      { color:'#FFF', fontSize:15, fontWeight:'700', marginBottom:12 },
    camTypeRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderRadius:10, padding:10, marginBottom:12 },
    camTypeTxt:      { color:'#FFF', fontSize:13, fontWeight:'600' },
    switchBtn:       { backgroundColor:'rgba(255,255,255,0.15)', borderRadius:12, paddingHorizontal:10, paddingVertical:5 },
    switchBtnTxt:    { color:'#FFF', fontSize:12 },
    guideRow:        { flexDirection:'row', alignItems:'flex-start', marginBottom:10, gap:10 },
    guideIcon:       { fontSize:20, width:28 },
    guideLbl:        { color:'#888', fontSize:11 },
    guideVal:        { color:'#FFF', fontSize:13, fontWeight:'600', flexShrink:1 },
    divider:         { height:1, backgroundColor:'#333', marginVertical:10 },
    guideExtra:      { color:'#00CC66', fontSize:13, marginBottom:4 },
    errorBox:        { backgroundColor:'rgba(180,0,0,0.75)', borderRadius:10, padding:10, marginBottom:10 },
    errorTxt:        { color:'#FFF', fontSize:13, textAlign:'center' },
    startBtn:        { backgroundColor:'#8B2F3F', borderRadius:30, padding:16, alignItems:'center' },
    startBtnTxt:     { color:'#FFF', fontSize:18, fontWeight:'700' },

    // Countdown
    cdLabel:         { color:'#FFF', fontSize:24, fontWeight:'700', marginBottom:10 },
    cdNum:           { color:'#FF4444', fontSize:120, fontWeight:'900', lineHeight:130 },
    cdSub:           { color:'#AAA', fontSize:16, marginTop:8 },

    // Recording
    poseBanner:      { marginHorizontal:16, borderRadius:10, padding:10, alignItems:'center', marginTop:8 },
    poseBannerTxt:   { color:'#FFF', fontSize:13, fontWeight:'600', textAlign:'center' },
    tipBox:          { backgroundColor:'rgba(0,0,0,0.88)', borderRadius:12, padding:12, marginHorizontal:16, marginTop:8, borderWidth:1, borderColor:'#FFAA00' },
    tipTitle:        { color:'#FFAA00', fontSize:13, fontWeight:'700', marginBottom:5 },
    tipTxt:          { color:'#FFF', fontSize:12, marginBottom:3 },
    statsBar:        { flexDirection:'row', justifyContent:'space-around', paddingHorizontal:16, marginTop:'auto', marginBottom:12 },
    statChip:        { backgroundColor:'rgba(0,0,0,0.85)', borderRadius:14, padding:14, alignItems:'center', minWidth:90, borderWidth:1, borderColor:'#333' },
    statNum:         { color:'#FFF', fontSize:28, fontWeight:'800' },
    statLbl:         { color:'#666', fontSize:11, marginTop:2 },
    stopBtn:         { backgroundColor:'#B22222', marginHorizontal:30, borderRadius:30, padding:16, alignItems:'center', marginBottom:30 },
    stopBtnDisabled: { backgroundColor:'#444' },
    stopBtnTxt:      { color:'#FFF', fontSize:16, fontWeight:'700' },

    // Analyzing
    analyzingTitle:    { color:'#FFF', fontSize:20, fontWeight:'700', marginTop:16 },
    analyzingSubtitle: { color:'#AAA', fontSize:14, marginTop:6 },

    // Results
    resultBanner:    { borderRadius:14, padding:14, alignItems:'center', marginBottom:12 },
    resultBannerTxt: { color:'#FFF', fontSize:22, fontWeight:'800' },
    scoreRow:        { flexDirection:'row', justifyContent:'space-between', marginBottom:12, gap:8 },
    scoreCard:       { flex:1, backgroundColor:'rgba(0,0,0,0.85)', borderRadius:14, padding:14, alignItems:'center', borderWidth:1, borderColor:'#444' },
    scoreNum:        { color:'#FFF', fontSize:26, fontWeight:'800' },
    scoreLbl:        { color:'#888', fontSize:11, marginTop:4 },
    feedbackBox:     { backgroundColor:'rgba(139,47,63,0.5)', borderRadius:12, padding:12, marginBottom:12 },
    feedbackTxt:     { color:'#FFF', fontSize:13, lineHeight:20 },
    section:         { backgroundColor:'rgba(0,0,0,0.75)', borderRadius:12, padding:12, marginBottom:10 },
    sectionTitle:    { color:'#FF9944', fontSize:14, fontWeight:'700', marginBottom:8 },
    issueCard:       { backgroundColor:'rgba(255,0,0,0.1)', borderRadius:8, padding:8, marginBottom:6 },
    issuePart:       { color:'#FF6666', fontSize:13, fontWeight:'700' },
    issueSev:        { color:'#FF9988', fontWeight:'400' },
    issueTxt:        { color:'#CCC', fontSize:12, marginTop:2 },
    goodPart:        { color:'#00FF88', fontSize:13, marginBottom:3 },
    retryBtn:        { backgroundColor:'#8B2F3F', borderRadius:30, padding:16, alignItems:'center', marginTop:6 },
    retryBtnTxt:     { color:'#FFF', fontSize:16, fontWeight:'700' },
});ameraFacing(EXERCISE_CAMERA[selectedExercise] || 'back');
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

                {/* Real-time skeleton overlay */}
                {phase === 'recording' && (
                    <PoseOverlay
                        keypoints={liveKeypoints}
                        formStatus={formStatus}
                        width={SW}
                        height={SH}
                    />
                )}

                <View style={s.overlay}>
                    <View style={s.topBar}>
                        <TouchableOpacity style={s.backBtn} onPress={() => {
                            clearInterval(intervalRef.current);
                            clearInterval(countdownRef.current);
                            onNavigate('dashboard');
                        }}>
                            <Text style={s.backBtnTxt}>← Back</Text>
                        </TouchableOpacity>
                        <Text style={s.topTitle}>Form Analysis</Text>
                        {phase === 'recording' && <View style={s.liveChip}><Text style={s.liveChipTxt}>● LIVE</Text></View>}
                        {(phase === 'setup' || phase === 'recording') && (
                            <TouchableOpacity style={s.flipBtn} onPress={toggleCamera}>
                                <Text style={s.flipBtnTxt}>🔄</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={[s.camBadge, { backgroundColor: isFront ? 'rgba(0,100,200,0.8)' : 'rgba(0,120,0,0.8)' }]}>
                        <Text style={s.camBadgeTxt}>{isFront ? '🤳 Front Camera' : '📷 Back Camera'}</Text>
                    </View>

                    {/* SETUP */}
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
                                        <View style={s.guideRow}><Text style={s.guideIcon}>📏</Text><View><Text style={s.guideLabel}>Distance</Text><Text style={s.guideValue}>{guidance.distance}</Text></View></View>
                                        <View style={s.guideRow}><Text style={s.guideIcon}>📐</Text><View><Text style={s.guideLabel}>Angle</Text><Text style={s.guideValue}>{guidance.angle}</Text></View></View>
                                        <View style={s.guideRow}><Text style={s.guideIcon}>💡</Text><View style={{ flex: 1 }}><Text style={s.guideLabel}>Tip</Text><Text style={s.guideValue}>{guidance.tip}</Text></View></View>
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

                    {/* COUNTDOWN */}
                    {phase === 'countdown' && (
                        <View style={s.centerContainer}>
                            <Text style={s.cdLabel}>Get Ready!</Text>
                            <Text style={s.cdNumber}>{countdown}</Text>
                            <Text style={s.cdSub}>{isFront ? '🤳 Front camera' : '📷 Back camera'}</Text>
                        </View>
                    )}

                    {/* RECORDING */}
                    {phase === 'recording' && (
                        <>
                            {/* Status banner */}
                            <View style={[s.camBanner, {
                                backgroundColor:
                                    poseQuality === 'good' ? 'rgba(0,150,0,0.85)' :
                                    poseQuality === 'poor' ? 'rgba(180,80,0,0.85)' :
                                    'rgba(180,0,0,0.85)'
                            }]}>
                                <Text style={s.camBannerTxt}>
                                    {poseQuality === 'good'
                                        ? `✅ Skeleton detected! ${goodFrames} keyframes`
                                        : poseWarning || '⟳ Detecting pose — position yourself in frame'}
                                </Text>
                            </View>

                            {/* Tips when pose not detected */}
                            {poseQuality !== 'good' && frameCount > 5 && (
                                <View style={s.poseTipBox}>
                                    <Text style={s.poseTipTitle}>📐 Fix camera for {selectedExercise}:</Text>
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
                                         formStatus === 'incorrect' ? '✗ FIX FORM' : '⟳ DETECTING'}
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
                                    {goodFrames < 3 ? `⟳ Need ${3 - goodFrames} more keyframes` : '⏹  Stop & Analyze'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ANALYZING */}
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

                    {/* RESULTS */}
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
                                    <Text style={[s.scoreNum, { fontSize: 14 }]}>{result.overall_form === 'correct' ? '✓ Good' : '✗ Fix'}</Text>
                                    <Text style={s.scoreLbl}>Form</Text>
                                </View>
                            </View>
                            {result.feedback && <View style={s.feedbackBox}><Text style={s.feedbackTxt}>{result.feedback}</Text></View>}
                            {result.body_part_issues?.length > 0 && (
                                <View style={s.section}>
                                    <Text style={s.sectionTitle}>⚠ Areas to Improve</Text>
                                    {result.body_part_issues.map((issue: any, i: number) => (
                                        <View key={i} style={s.issueCard}>
                                            <Text style={s.issuePart}>{issue.body_part} <Text style={s.issueSeverity}>({issue.severity})</Text></Text>
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