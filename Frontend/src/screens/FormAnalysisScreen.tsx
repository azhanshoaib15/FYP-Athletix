import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import {
    ActivityIndicator, Dimensions, ScrollView,
    StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText, G } from 'react-native-svg';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const FORM_ANALYSIS_URL = 'https://desirable-playfulness-production-a1dd.up.railway.app';
const BACKEND_URL       = 'https://fyp-athletix-production.up.railway.app';
const { width: SW, height: SH } = Dimensions.get('window');

interface FormAnalysisProps {
    onNavigate: (screen: any) => void;
}

// ── Exercise config ────────────────────────────────────────────────────────────

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
    'Squats':               {distance:'6-8 feet', angle:'Side view 90 deg',  tip:'Full body head to feet',         camera:'Back camera' },
    'PushUp':               {distance:'4-6 feet', angle:'Side view 90 deg',  tip:'Phone on floor side angle',      camera:'Back camera' },
    'Bench Press':          {distance:'5-7 feet', angle:'Side view 90 deg',  tip:'Tripod beside bench',            camera:'Back camera' },
    'Bicep curl':           {distance:'3-4 feet', angle:'Front view',        tip:'Arms visible shoulder to wrist', camera:'Front camera'},
    'Lunges':               {distance:'6-8 feet', angle:'Side view 90 deg',  tip:'Full body head to feet',         camera:'Back camera' },
    'Plank':                {distance:'5-7 feet', angle:'Side view 90 deg',  tip:'Phone low on floor',             camera:'Back camera' },
    'Pull Ups':             {distance:'6-10 feet',angle:'Front view',        tip:'Full body + bar visible',        camera:'Back camera' },
    'Shoulder press':       {distance:'3-5 feet', angle:'Front view',        tip:'Upper body fully visible',       camera:'Front camera'},
    'Lat Pulldown':         {distance:'5-7 feet', angle:'Side view 90 deg',  tip:'Torso and arms visible',         camera:'Back camera' },
    'Tricep Dips':          {distance:'4-6 feet', angle:'Side view 90 deg',  tip:'Arms and torso visible',         camera:'Back camera' },
    'Leg Press':            {distance:'5-7 feet', angle:'Side view 90 deg',  tip:'Full legs + seat visible',       camera:'Back camera' },
    'Leg Extension':        {distance:'4-6 feet', angle:'Side view 90 deg',  tip:'Full legs while seated',         camera:'Back camera' },
    'Leg Raises':           {distance:'5-7 feet', angle:'Side view 90 deg',  tip:'Full body while lying',          camera:'Back camera' },
    'Chest Fly':            {distance:'5-7 feet', angle:'Side view 90 deg',  tip:'Upper body + arms visible',      camera:'Back camera' },
    'BackRows':             {distance:'5-7 feet', angle:'Side view 90 deg',  tip:'Torso and arms visible',         camera:'Back camera' },
    'Lateral Raises':       {distance:'3-5 feet', angle:'Front view',        tip:'Upper body + arms visible',      camera:'Front camera'},
    'Incline beanch Press': {distance:'5-7 feet', angle:'Side view 90 deg',  tip:'Upper body on incline',          camera:'Back camera' },
    'Tricep pushdown':      {distance:'3-5 feet', angle:'Front/side view',   tip:'Arms shoulder to wrist',         camera:'Front camera'},
};

const getGuidance = (ex: string) => EXERCISE_GUIDANCE[ex] || {
    distance:'5-7 feet', angle:'Side or front', tip:'Full body visible', camera:'Back camera'
};

// Exercise ID map (matches database)
const EXERCISE_ID_MAP: Record<string, number> = {
    'Push-up': 1, 'Squat': 2, 'Bench Press': 3,
    'Bicep Curl': 4, 'Lat Pulldown': 5, 'Tricep pushdown': 6,
    'Shoulder press': 7, 'Plank': 8,
    'PushUp': 1, 'Squats': 2, 'Bicep curl': 4,
};

// ── MediaPipe skeleton ─────────────────────────────────────────────────────────

const BODY_CONNECTIONS: {a:number; b:number; region:string}[] = [
    {a:11, b:12, region:'torso'}, {a:11, b:23, region:'torso'},
    {a:12, b:24, region:'torso'}, {a:23, b:24, region:'torso'},
    {a:11, b:13, region:'left_arm'}, {a:13, b:15, region:'left_arm'},
    {a:15, b:17, region:'left_arm'}, {a:15, b:19, region:'left_arm'},
    {a:12, b:14, region:'right_arm'}, {a:14, b:16, region:'right_arm'},
    {a:16, b:18, region:'right_arm'}, {a:16, b:20, region:'right_arm'},
    {a:23, b:25, region:'left_leg'}, {a:25, b:27, region:'left_leg'},
    {a:27, b:29, region:'left_leg'}, {a:27, b:31, region:'left_leg'},
    {a:24, b:26, region:'right_leg'}, {a:26, b:28, region:'right_leg'},
    {a:28, b:30, region:'right_leg'}, {a:28, b:32, region:'right_leg'},
    {a:0,  b:11, region:'torso'}, {a:0,  b:12, region:'torso'},
];

const JOINT_REGIONS: {idx:number; region:string}[] = [
    {idx:0,  region:'torso'},
    {idx:11, region:'torso'}, {idx:12, region:'torso'},
    {idx:13, region:'left_arm'}, {idx:14, region:'right_arm'},
    {idx:15, region:'left_arm'}, {idx:16, region:'right_arm'},
    {idx:23, region:'torso'}, {idx:24, region:'torso'},
    {idx:25, region:'left_leg'}, {idx:26, region:'right_leg'},
    {idx:27, region:'left_leg'}, {idx:28, region:'right_leg'},
];

const EXERCISE_CRITICAL_REGIONS: Record<string, string[]> = {
    'Squats':         ['left_leg', 'right_leg', 'torso'],
    'PushUp':         ['left_arm', 'right_arm', 'torso'],
    'Bicep curl':     ['left_arm', 'right_arm'],
    'Bench Press':    ['left_arm', 'right_arm', 'torso'],
    'Lunges':         ['left_leg', 'right_leg', 'torso'],
    'Shoulder press': ['left_arm', 'right_arm', 'torso'],
    'Lat Pulldown':   ['left_arm', 'right_arm', 'torso'],
    'Tricep Dips':    ['left_arm', 'right_arm'],
    'Plank':          ['torso', 'left_leg', 'right_leg'],
    'Pull Ups':       ['left_arm', 'right_arm', 'torso'],
    'Lateral Raises': ['left_arm', 'right_arm'],
    'Tricep pushdown':['left_arm', 'right_arm'],
    'BackRows':       ['left_arm', 'right_arm', 'torso'],
    'Leg Press':      ['left_leg', 'right_leg'],
    'Leg Extension':  ['left_leg', 'right_leg'],
    'Leg Raises':     ['left_leg', 'right_leg', 'torso'],
    'Chest Fly':      ['left_arm', 'right_arm'],
    'Incline beanch Press': ['left_arm', 'right_arm', 'torso'],
};

// ── Reference postures ─────────────────────────────────────────────────────────

const REFERENCE_POSTURES: Record<string, {[key:number]: [number, number]}> = {
    'Squats': {
        0:[0.5,0.08], 11:[0.38,0.28], 12:[0.62,0.28],
        13:[0.32,0.40], 14:[0.68,0.40], 15:[0.30,0.50], 16:[0.70,0.50],
        23:[0.40,0.52], 24:[0.60,0.52], 25:[0.38,0.68], 26:[0.62,0.68],
        27:[0.38,0.85], 28:[0.62,0.85],
    },
    'PushUp': {
        0:[0.15,0.35], 11:[0.25,0.40], 12:[0.25,0.50],
        13:[0.35,0.38], 14:[0.35,0.52], 15:[0.45,0.37], 16:[0.45,0.53],
        23:[0.55,0.45], 24:[0.55,0.50], 25:[0.70,0.46], 26:[0.70,0.49],
        27:[0.85,0.47], 28:[0.85,0.48],
    },
    'Bicep curl': {
        0:[0.50,0.08], 11:[0.38,0.28], 12:[0.62,0.28],
        13:[0.35,0.45], 14:[0.65,0.45], 15:[0.38,0.32], 16:[0.62,0.32],
        23:[0.42,0.55], 24:[0.58,0.55], 25:[0.42,0.75], 26:[0.58,0.75],
        27:[0.42,0.92], 28:[0.58,0.92],
    },
    'Shoulder press': {
        0:[0.50,0.08], 11:[0.35,0.30], 12:[0.65,0.30],
        13:[0.28,0.30], 14:[0.72,0.30], 15:[0.28,0.15], 16:[0.72,0.15],
        23:[0.42,0.55], 24:[0.58,0.55], 25:[0.42,0.75], 26:[0.58,0.75],
        27:[0.42,0.92], 28:[0.58,0.92],
    },
    'Lunges': {
        0:[0.50,0.08], 11:[0.42,0.28], 12:[0.58,0.28],
        13:[0.38,0.42], 14:[0.62,0.42], 15:[0.36,0.55], 16:[0.64,0.55],
        23:[0.44,0.52], 24:[0.56,0.52], 25:[0.35,0.68], 26:[0.60,0.72],
        27:[0.30,0.85], 28:[0.65,0.90],
    },
    'Plank': {
        0:[0.12,0.38], 11:[0.22,0.42], 12:[0.22,0.50],
        13:[0.32,0.42], 14:[0.32,0.50], 15:[0.42,0.43], 16:[0.42,0.49],
        23:[0.58,0.44], 24:[0.58,0.48], 25:[0.72,0.44], 26:[0.72,0.48],
        27:[0.85,0.44], 28:[0.85,0.48],
    },
};

const DEFAULT_POSTURE: {[key:number]: [number, number]} = {
    0:[0.5,0.08],
    11:[0.38,0.28], 12:[0.62,0.28],
    13:[0.32,0.42], 14:[0.68,0.42],
    15:[0.30,0.56], 16:[0.70,0.56],
    23:[0.42,0.55], 24:[0.58,0.55],
    25:[0.42,0.72], 26:[0.58,0.72],
    27:[0.42,0.88], 28:[0.58,0.88],
};

interface LM { x:number; y:number; v:number; }

const parseLandmarks = (kp: number[]): LM[] => {
    const lms: LM[] = [];
    for (let i = 0; i < 33; i++) {
        lms.push({ x: kp[i*4], y: kp[i*4+1], v: kp[i*4+3] });
    }
    return lms;
};

// ── Reference skeleton (blue ghost) ───────────────────────────────────────────

function ReferenceSkeletonOverlay({
    exercise, w, h, personLandmarks
}: {
    exercise: string; w: number; h: number; personLandmarks: LM[] | null
}) {
    const refPosture = REFERENCE_POSTURES[exercise] || DEFAULT_POSTURE;
    const connections: [number,number][] = [
        [11,12],[11,23],[12,24],[23,24],
        [11,13],[13,15],[12,14],[14,16],
        [23,25],[25,27],[24,26],[26,28],
        [0,11],[0,12],
    ];

    let offsetX = 0, offsetY = 0, scaleX = 1, scaleY = 1;

    if (personLandmarks) {
        const lSh = personLandmarks[11];
        const rSh = personLandmarks[12];
        const lHip = personLandmarks[23];
        const rHip = personLandmarks[24];

        if (lSh.v > 0.3 && rSh.v > 0.3) {
            const personShX = (lSh.x + rSh.x) / 2;
            const personShY = (lSh.y + rSh.y) / 2;
            const refShX = ((refPosture[11]?.[0] || 0.38) + (refPosture[12]?.[0] || 0.62)) / 2;
            const refShY = ((refPosture[11]?.[1] || 0.28) + (refPosture[12]?.[1] || 0.28)) / 2;
            const personShWidth = Math.abs(rSh.x - lSh.x);
            const refShWidth = Math.abs((refPosture[12]?.[0] || 0.62) - (refPosture[11]?.[0] || 0.38));
            if (personShWidth > 0.02 && refShWidth > 0) {
                scaleX = personShWidth / refShWidth;
                scaleY = scaleX;
            }
            if (lHip.v > 0.3 && rHip.v > 0.3) {
                const personTorsoH = ((lHip.y + rHip.y) / 2) - personShY;
                const refTorsoH = ((refPosture[23]?.[1] || 0.55) + (refPosture[24]?.[1] || 0.55)) / 2 - refShY;
                if (personTorsoH > 0.02 && refTorsoH > 0) scaleY = personTorsoH / refTorsoH;
            }
            offsetX = personShX - refShX * scaleX;
            offsetY = personShY - refShY * scaleY;
        }
    }

    const tx = (rx: number) => (rx * scaleX + offsetX) * w;
    const ty = (ry: number) => (ry * scaleY + offsetY) * h;

    return (
        <G opacity={0.4}>
            {connections.map(([a, b], i) => {
                const A = refPosture[a]; const B = refPosture[b];
                if (!A || !B) return null;
                return (
                    <Line key={"ref-l"+i}
                        x1={tx(A[0])} y1={ty(A[1])}
                        x2={tx(B[0])} y2={ty(B[1])}
                        stroke="#00BFFF" strokeWidth={3}
                        strokeDasharray="8,5" strokeLinecap="round"
                    />
                );
            })}
            {Object.entries(refPosture).map(([idx, pos]) => (
                <Circle key={"ref-j"+idx}
                    cx={tx((pos as [number,number])[0])}
                    cy={ty((pos as [number,number])[1])}
                    r={6} fill="#00BFFF" fillOpacity={0.8}
                    stroke="#005080" strokeWidth={1}
                />
            ))}
        </G>
    );
}

// ── Live skeleton overlay ──────────────────────────────────────────────────────

interface SkeletonProps {
    keypoints: number[] | null;
    formStatus: string;
    exercise: string;
    w: number;
    h: number;
    showReference: boolean;
}

function SkeletonOverlay({ keypoints, formStatus, exercise, w, h, showReference }: SkeletonProps) {
    if (w === 0 || h === 0) return null;

    const criticalRegions = EXERCISE_CRITICAL_REGIONS[exercise] || ['torso'];

    const getRegionColor = (region: string): string => {
        if (formStatus === 'correct')   return '#00FF88';
        if (formStatus === 'incorrect') return criticalRegions.includes(region) ? '#FF3333' : '#FFD700';
        return '#FFD700';
    };

    const personLandmarks = keypoints && keypoints.length === 132 ? parseLandmarks(keypoints) : null;

    return (
        <Svg style={StyleSheet.absoluteFill} width={w} height={h}>

            {/* Blue reference skeleton */}
            {showReference && (
                <ReferenceSkeletonOverlay
                    exercise={exercise} w={w} h={h}
                    personLandmarks={personLandmarks}
                />
            )}

            {/* Live person skeleton */}
            {personLandmarks && (
                <G>
                    {BODY_CONNECTIONS.map(({a, b, region}, i) => {
                        const A = personLandmarks[a]; const B = personLandmarks[b];
                        if (!A || !B || A.v < 0.3 || B.v < 0.3) return null;
                        return (
                            <Line key={"l"+i}
                                x1={A.x*w} y1={A.y*h}
                                x2={B.x*w} y2={B.y*h}
                                stroke={getRegionColor(region)} strokeWidth={4}
                                strokeOpacity={0.92} strokeLinecap="round"
                            />
                        );
                    })}

                    {JOINT_REGIONS.map(({idx, region}) => {
                        const lm = personLandmarks[idx];
                        if (!lm || lm.v < 0.3) return null;
                        return (
                            <Circle key={"j"+idx}
                                cx={lm.x*w} cy={lm.y*h}
                                r={8} fill={getRegionColor(region)} fillOpacity={0.95}
                                stroke="#000" strokeWidth={2}
                            />
                        );
                    })}

                    {personLandmarks.map((lm, idx) => {
                        const isKey = JOINT_REGIONS.some(j => j.idx === idx);
                        if (!isKey && lm.v >= 0.5) {
                            return <Circle key={"d"+idx} cx={lm.x*w} cy={lm.y*h} r={4} fill="#FFD700" fillOpacity={0.7} />;
                        }
                        return null;
                    })}

                    {formStatus !== '' && formStatus !== 'unknown' && (() => {
                        const nose = personLandmarks[0];
                        const bx = nose && nose.v > 0.3 ? nose.x * w : w/2;
                        const by = nose && nose.v > 0.3 ? Math.max(nose.y * h - 50, 20) : 60;
                        const bgColor = formStatus === 'correct' ? 'rgba(0,180,0,0.9)' : 'rgba(200,0,0,0.9)';
                        const label  = formStatus === 'correct' ? 'GOOD FORM' : 'FIX FORM';
                        return (
                            <>
                                <Rect x={bx-55} y={by-18} width={110} height={30} rx={15} fill={bgColor} />
                                <SvgText x={bx} y={by+7} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">
                                    {label}
                                </SvgText>
                            </>
                        );
                    })()}
                </G>
            )}

            {/* Legend */}
            {personLandmarks && (
                <>
                    <Rect x={10} y={h-90} width={145} height={82} rx={10} fill="rgba(0,0,0,0.75)" />
                    <Circle cx={26} cy={h-72} r={6} fill="#00FF88" />
                    <SvgText x={38} y={h-67} fill="white" fontSize={12}>Correct form</SvgText>
                    <Circle cx={26} cy={h-52} r={6} fill="#FF3333" />
                    <SvgText x={38} y={h-47} fill="white" fontSize={12}>Needs fixing</SvgText>
                    <Circle cx={26} cy={h-32} r={6} fill="#00BFFF" fillOpacity={0.8} />
                    <SvgText x={38} y={h-27} fill="white" fontSize={12}>Target posture</SvgText>
                </>
            )}
        </Svg>
    );
}

// ── Main screen ────────────────────────────────────────────────────────────────

type Phase = 'setup' | 'countdown' | 'recording' | 'analyzing' | 'results';

export default function FormAnalysisScreen({ onNavigate }: FormAnalysisProps) {
    const token = useSelector((state: RootState) => state.user.accessToken);

    const [permission, requestPermission] = useCameraPermissions();
    const [phase, setPhase]               = useState<Phase>('setup');
    const [result, setResult]             = useState<any>(null);
    const [error, setError]               = useState<string|null>(null);
    const [exercise, setExercise]         = useState('Squats');
    const [showList, setShowList]         = useState(false);
    const [reps, setReps]                 = useState(0);
    const [formStatus, setFormStatus]     = useState('');
    const [countdown, setCountdown]       = useState(3);
    const [frameCount, setFrameCount]     = useState(0);
    const [goodFrames, setGoodFrames]     = useState(0);
    const [poseOk, setPoseOk]             = useState(false);
    const [warning, setWarning]           = useState('');
    const [facing, setFacing]             = useState<'front'|'back'>('back');
    const [keypoints, setKeypoints]       = useState<number[]|null>(null);
    const [showRef, setShowRef]           = useState(true);
    const [camSize, setCamSize]           = useState({w: SW, h: SH});

    const camRef     = useRef<any>(null);
    const interval   = useRef<any>(null);
    const cdInterval = useRef<any>(null);
    const framesR    = useRef<string[]>([]);
    const kpR        = useRef<number[][]>([]);
    const repsR      = useRef(0);
    const frameR     = useRef(0);
    const goodR      = useRef(0);

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
            c--; setCountdown(c);
            if (c === 0) { clearInterval(cdInterval.current); startRecording(); }
        }, 1000);
    };

    const startRecording = () => {
        setPhase('recording');
        setError(null); setResult(null); setReps(0);
        setFormStatus(''); setFrameCount(0);
        setGoodFrames(0); setPoseOk(false); setWarning(''); setKeypoints(null);
        repsR.current = 0; framesR.current = []; kpR.current = [];
        frameR.current = 0; goodR.current = 0;

        interval.current = setInterval(async () => {
            if (!camRef.current) return;
            try {
                const photo = await camRef.current.takePictureAsync({
                    base64: true, quality: 0.4, skipProcessing: true, mute: true,
                });
                if (!photo || !photo.base64) return;

                framesR.current.push(photo.base64);
                if (framesR.current.length > 60) framesR.current = framesR.current.slice(-60);
                frameR.current = framesR.current.length;
                setFrameCount(frameR.current);

                const res = await fetch(FORM_ANALYSIS_URL + '/live/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        exercise,
                        latest_frame_b64: photo.base64,
                        recent_frames_b64: framesR.current.slice(-10),
                        total_reps_so_far: repsR.current,
                        // Send ALL accumulated keypoints for accurate rep counting
                        accumulated_keypoints: kpR.current.length > 0 ? kpR.current : null,
                    }),
                });

                if (!res.ok) return;
                const d = await res.json();

                // Server counts reps on full accumulated sequence
                // Use server count directly (it's the total, not a delta)
                if (d.reps_in_window > 0) {
                    repsR.current = d.reps_in_window;
                    setReps(repsR.current);
                }
                if (d.form_status && d.form_status !== 'unknown') setFormStatus(d.form_status);

                if (d.keypoints && d.keypoints.length === 132) {
                    setKeypoints(d.keypoints);
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
                    if      (st === 'low_light')    setWarning('Poor lighting - move to brighter area');
                    else if (st === 'too_close')    setWarning('Too close - move ' + g.distance + ' away');
                    else if (st === 'too_far')      setWarning('Too far - ' + g.distance + ' is ideal');
                    else if (st === 'partial_body') setWarning('Full body not visible - ' + g.tip);
                    else                            setWarning(d.camera_message || 'Pose not detected - check position');
                    setPoseOk(goodR.current > 0);
                }
            } catch (_) {}
        }, 800);
    };

    const stopAndAnalyze = async () => {
        clearInterval(interval.current);
        setPhase('analyzing'); setKeypoints(null);

        try {
            if (framesR.current.length < 5) {
                setError('Do the exercise for at least 5 seconds.');
                setPhase('setup'); return;
            }

            const kp = kpR.current.length >= 3 ? kpR.current : framesR.current.map(() => Array(132).fill(0.15));

            const res = await fetch(FORM_ANALYSIS_URL + '/live/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exercise, all_keypoints: kp }),
            });

            if (res.ok) {
                const d = await res.json();
                const finalReps = repsR.current > 0 ? repsR.current : d.total_reps;
                setResult({ ...d, total_reps: finalReps });
                setPhase('results');

                // Save form analysis result to backend database
                try {
                    if (token) {
                        const exerciseId = EXERCISE_ID_MAP[exercise] || 1;
                        await fetch(BACKEND_URL + '/api/v1/workouts/form-analysis', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token,
                            },
                            body: JSON.stringify({
                                session_exercise_id: 1,
                                exercise_id: exerciseId,
                                rep_number: finalReps,
                                form_status: d.overall_form || 'unknown',
                                confidence_score: d.confidence || 0,
                                errors_detected: d.body_part_issues?.map((i: any) => i.body_part) || [],
                                joint_angles: {},
                                feedback_given: d.feedback || '',
                                keypoints_snapshot: null,
                            }),
                        });
                    }
                } catch (_) {}
            } else {
                const e = await res.json().catch(() => ({}));
                setError(e.detail || 'Analysis failed. Try again.');
                setPhase('setup');
            }
        } catch (_) {
            setError('Connection error. Please try again.');
            setPhase('setup');
        }
    };

    const reset = () => {
        setPhase('setup'); setResult(null); setError(null);
        setReps(0); setFrameCount(0); setFormStatus('');
        setPoseOk(false); setGoodFrames(0); setWarning(''); setKeypoints(null);
        framesR.current = []; kpR.current = [];
        repsR.current = 0; goodR.current = 0;
        setFacing(EXERCISE_CAMERA[exercise] || 'back');
    };

    if (!permission) return <View style={s.root} />;

    if (!permission.granted) {
        return (
            <View style={[s.root, {justifyContent:'center', alignItems:'center', padding:20}]}>
                <Text style={s.permTitle}>Camera Required</Text>
                <Text style={s.permText}>Form analysis needs camera to track your movements</Text>
                <TouchableOpacity style={s.btnPrimary} onPress={requestPermission}>
                    <Text style={s.btnTxt}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSecondary} onPress={() => onNavigate('dashboard')}>
                    <Text style={[s.btnTxt, {color:'#AAA'}]}>Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const g = getGuidance(exercise);
    const isFront = facing === 'front';

    return (
        <View style={s.root}>
            <CameraView
                style={s.camera} facing={facing} ref={camRef}
                onLayout={e => {
                    const {width, height} = e.nativeEvent.layout;
                    setCamSize({w: width, h: height});
                }}
            >
                {/* Skeleton overlay */}
                <SkeletonOverlay
                    keypoints={keypoints}
                    formStatus={formStatus}
                    exercise={exercise}
                    w={camSize.w} h={camSize.h}
                    showReference={phase === 'recording' && showRef}
                />

                <View style={s.overlay}>

                    {/* Top bar */}
                    <View style={s.topBar}>
                        <TouchableOpacity style={s.backBtn} onPress={() => {
                            clearInterval(interval.current); clearInterval(cdInterval.current);
                            onNavigate('dashboard');
                        }}>
                            <Text style={s.backBtnTxt}>Back</Text>
                        </TouchableOpacity>
                        <Text style={s.topTitle}>Form Analysis</Text>
                        {phase === 'recording' && (
                            <TouchableOpacity
                                style={[s.refBtn, showRef && s.refBtnActive]}
                                onPress={() => setShowRef(r => !r)}>
                                <Text style={s.refBtnTxt}>Guide</Text>
                            </TouchableOpacity>
                        )}
                        {phase === 'recording' && (
                            <View style={s.recChip}><Text style={s.recChipTxt}>REC</Text></View>
                        )}
                        {(phase === 'setup' || phase === 'recording') && (
                            <TouchableOpacity style={s.flipBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                                <Text style={s.flipBtnTxt}>Flip</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Camera badge */}
                    <View style={[s.camBadge, {backgroundColor: isFront ? 'rgba(0,100,200,0.85)' : 'rgba(0,130,0,0.85)'}]}>
                        <Text style={s.camBadgeTxt}>{isFront ? 'Front Camera' : 'Back Camera'}</Text>
                    </View>

                    {/* ── SETUP ── */}
                    {phase === 'setup' && (
                        <ScrollView style={s.panel} contentContainerStyle={{paddingBottom:20}}>
                            <TouchableOpacity style={s.exPicker} onPress={() => setShowList(!showList)}>
                                <Text style={s.exPickerLabel}>Exercise</Text>
                                <Text style={s.exPickerVal}>{exercise}</Text>
                            </TouchableOpacity>

                            {showList && (
                                <ScrollView style={s.exList} nestedScrollEnabled>
                                    {EXERCISES.map(ex => (
                                        <TouchableOpacity key={ex}
                                            style={[s.exItem, ex === exercise && s.exItemActive]}
                                            onPress={() => { setExercise(ex); setShowList(false); }}>
                                            <Text style={s.exItemTxt}>{ex}</Text>
                                            <Text style={{fontSize:13, color:'#AAA'}}>
                                                {EXERCISE_CAMERA[ex] === 'front' ? 'Front' : 'Back'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {!showList && (
                                <>
                                    <View style={s.guideCard}>
                                        <Text style={s.guideTitle}>Camera Setup: {exercise}</Text>
                                        <View style={[s.camTypeRow, {backgroundColor: isFront ? 'rgba(0,100,200,0.25)' : 'rgba(0,130,0,0.25)'}]}>
                                            <Text style={s.camTypeTxt}>{g.camera} (auto)</Text>
                                            <TouchableOpacity style={s.switchBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                                                <Text style={s.switchBtnTxt}>Switch</Text>
                                            </TouchableOpacity>
                                        </View>
                                        <View style={s.guideRow}>
                                            <View>
                                                <Text style={s.guideLbl}>Distance</Text>
                                                <Text style={s.guideVal}>{g.distance}</Text>
                                            </View>
                                        </View>
                                        <View style={s.guideRow}>
                                            <View>
                                                <Text style={s.guideLbl}>Camera Angle</Text>
                                                <Text style={s.guideVal}>{g.angle}</Text>
                                            </View>
                                        </View>
                                        <View style={s.guideRow}>
                                            <View style={{flex:1}}>
                                                <Text style={s.guideLbl}>Tip</Text>
                                                <Text style={s.guideVal}>{g.tip}</Text>
                                            </View>
                                        </View>
                                        <View style={s.divider} />
                                        <Text style={s.guideExtra}>Blue dashed = target posture</Text>
                                        <Text style={s.guideExtra}>Green lines = correct form</Text>
                                        <Text style={s.guideExtra}>Red lines = needs correction</Text>
                                        <Text style={s.guideExtra}>Good lighting + fitted clothing needed</Text>
                                    </View>

                                    {error !== null && (
                                        <View style={s.errorBox}>
                                            <Text style={s.errorTxt}>{error}</Text>
                                        </View>
                                    )}

                                    <TouchableOpacity style={s.startBtn} onPress={startCountdown}>
                                        <Text style={s.startBtnTxt}>Start Session</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    )}

                    {/* ── COUNTDOWN ── */}
                    {phase === 'countdown' && (
                        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                            <Text style={s.cdLabel}>Get Ready!</Text>
                            <Text style={s.cdNum}>{countdown}</Text>
                            <Text style={s.cdSub}>Stand in position now</Text>
                            <Text style={s.cdSub}>Blue guide shows correct posture</Text>
                        </View>
                    )}

                    {/* ── RECORDING ── */}
                    {phase === 'recording' && (
                        <>
                            <View style={[s.poseBanner, {
                                backgroundColor: poseOk ? 'rgba(0,150,0,0.85)' : goodR.current > 0 ? 'rgba(180,100,0,0.85)' : 'rgba(180,0,0,0.85)'
                            }]}>
                                <Text style={s.poseBannerTxt}>
                                    {poseOk
                                        ? 'Skeleton detected - ' + goodFrames + ' frames'
                                        : warning || 'Detecting pose - position yourself'}
                                </Text>
                            </View>

                            {!poseOk && frameCount > 5 && (
                                <View style={s.tipBox}>
                                    <Text style={s.tipTitle}>Fix for {exercise}:</Text>
                                    <Text style={s.tipTxt}>{g.camera} - {g.distance}</Text>
                                    <Text style={s.tipTxt}>Angle: {g.angle}</Text>
                                    <Text style={s.tipTxt}>{g.tip}</Text>
                                </View>
                            )}

                            <View style={s.statsBar}>
                                <View style={s.statChip}>
                                    <Text style={s.statNum}>{reps}</Text>
                                    <Text style={s.statLbl}>REPS</Text>
                                </View>
                                <View style={s.statChip}>
                                    <Text style={[s.statNum, {
                                        fontSize:13,
                                        color: formStatus === 'correct' ? '#00FF88' : formStatus === 'incorrect' ? '#FF4444' : '#FFAA00'
                                    }]}>
                                        {formStatus === 'correct' ? 'GOOD' : formStatus === 'incorrect' ? 'FIX' : !poseOk ? 'FIX CAM' : 'SCANNING'}
                                    </Text>
                                    <Text style={s.statLbl}>FORM</Text>
                                </View>
                                <View style={s.statChip}>
                                    <Text style={[s.statNum, {color: goodFrames >= 3 ? '#00FF88' : '#FFAA00'}]}>{goodFrames}</Text>
                                    <Text style={s.statLbl}>FRAMES</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[s.stopBtn, goodFrames < 3 && s.stopBtnDisabled]}
                                onPress={stopAndAnalyze}>
                                <Text style={s.stopBtnTxt}>
                                    {goodFrames < 3 ? 'Need ' + (3 - goodFrames) + ' more frames' : 'Stop and Analyze'}
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── ANALYZING ── */}
                    {phase === 'analyzing' && (
                        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                            <ActivityIndicator color="#FFF" size="large" />
                            <Text style={s.analyzingTitle}>Analyzing Your Form</Text>
                            <Text style={s.analyzingSubtitle}>
                                {kpR.current.length > 0 ? 'Using ' + kpR.current.length + ' real keyframes' : 'Processing frames...'}
                            </Text>
                        </View>
                    )}

                    {/* ── RESULTS ── */}
                    {phase === 'results' && result !== null && (
                        <ScrollView style={s.panel} contentContainerStyle={{paddingBottom:20}}>
                            <View style={[s.resultBanner, {
                                backgroundColor: result.overall_form === 'correct' ? 'rgba(0,140,0,0.9)' : 'rgba(160,0,0,0.9)'
                            }]}>
                                <Text style={s.resultBannerTxt}>
                                    {result.overall_form === 'correct' ? 'Great Form!' : 'Room to Improve'}
                                </Text>
                            </View>

                            <View style={s.scoreRow}>
                                <View style={s.scoreCard}>
                                    <Text style={s.scoreNum}>{result.total_reps}</Text>
                                    <Text style={s.scoreLbl}>Reps</Text>
                                </View>
                                <View style={[s.scoreCard, {borderColor: result.overall_form === 'correct' ? '#00FF88' : '#FF4444'}]}>
                                    <Text style={[s.scoreNum, {color: result.overall_form === 'correct' ? '#00FF88' : '#FF4444'}]}>
                                        {Math.round((result.confidence || 0) * 100)}%
                                    </Text>
                                    <Text style={s.scoreLbl}>Confidence</Text>
                                </View>
                                <View style={s.scoreCard}>
                                    <Text style={[s.scoreNum, {fontSize:14}]}>
                                        {result.overall_form === 'correct' ? 'Good' : 'Fix'}
                                    </Text>
                                    <Text style={s.scoreLbl}>Form</Text>
                                </View>
                            </View>

                            {result.feedback && (
                                <View style={s.feedbackBox}>
                                    <Text style={s.feedbackTxt}>{result.feedback}</Text>
                                </View>
                            )}

                            {result.body_part_issues && result.body_part_issues.length > 0 && (
                                <View style={s.section}>
                                    <Text style={s.sectionTitle}>Areas to Improve</Text>
                                    {result.body_part_issues.map((issue: any, i: number) => (
                                        <View key={i} style={s.issueCard}>
                                            <Text style={s.issuePart}>{issue.body_part} ({issue.severity})</Text>
                                            <Text style={s.issueTxt}>{issue.feedback}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {result.good_parts && result.good_parts.length > 0 && (
                                <View style={s.section}>
                                    <Text style={[s.sectionTitle, {color:'#00FF88'}]}>Good Form On</Text>
                                    {result.good_parts.map((part: string, i: number) => (
                                        <Text key={i} style={s.goodPart}>+ {part}</Text>
                                    ))}
                                </View>
                            )}

                            <View style={s.savedNote}>
                                <Text style={s.savedNoteTxt}>Result saved to your history</Text>
                            </View>

                            <TouchableOpacity style={s.retryBtn} onPress={reset}>
                                <Text style={s.retryBtnTxt}>Try Again</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                </View>
            </CameraView>
        </View>
    );
}

const s = StyleSheet.create({
    root:            { flex:1, backgroundColor:'#000' },
    camera:          { flex:1 },
    overlay:         { flex:1, backgroundColor:'transparent' },
    topBar:          { flexDirection:'row', alignItems:'center', paddingTop:52, paddingHorizontal:16, paddingBottom:10, backgroundColor:'rgba(0,0,0,0.6)' },
    backBtn:         { backgroundColor:'#501313', paddingHorizontal:12, paddingVertical:7, borderRadius:20, marginRight:8 },
    backBtnTxt:      { color:'#FFF', fontWeight:'bold', fontSize:13 },
    topTitle:        { color:'#FFF', fontSize:16, fontWeight:'bold', flex:1 },
    recChip:         { backgroundColor:'#CC0000', borderRadius:10, paddingHorizontal:8, paddingVertical:3, marginRight:6 },
    recChipTxt:      { color:'#FFF', fontSize:11, fontWeight:'bold' },
    refBtn:          { backgroundColor:'rgba(0,150,255,0.3)', borderRadius:12, paddingHorizontal:10, paddingVertical:5, marginRight:6, borderWidth:1, borderColor:'rgba(0,150,255,0.5)' },
    refBtnActive:    { backgroundColor:'rgba(0,150,255,0.75)', borderColor:'#00BFFF' },
    refBtnTxt:       { color:'#FFF', fontSize:12, fontWeight:'600' },
    flipBtn:         { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:20, paddingHorizontal:12, paddingVertical:7 },
    flipBtnTxt:      { color:'#FFF', fontSize:13, fontWeight:'bold' },
    camBadge:        { alignSelf:'center', borderRadius:20, paddingHorizontal:14, paddingVertical:5, marginTop:6 },
    camBadgeTxt:     { color:'#FFF', fontSize:12, fontWeight:'600' },
    permTitle:       { color:'#FFF', fontSize:24, fontWeight:'bold', marginBottom:12 },
    permText:        { color:'#AAA', fontSize:15, textAlign:'center', marginBottom:30 },
    btnPrimary:      { backgroundColor:'#8B2F3F', width:'80%', padding:14, borderRadius:25, alignItems:'center', marginBottom:12 },
    btnSecondary:    { backgroundColor:'#222', width:'80%', padding:14, borderRadius:25, alignItems:'center' },
    btnTxt:          { color:'#FFF', fontWeight:'700', fontSize:16 },
    panel:           { flex:1, paddingHorizontal:16, paddingTop:10 },
    exPicker:        { backgroundColor:'rgba(0,0,0,0.85)', borderRadius:14, padding:14, borderWidth:1, borderColor:'#8B2F3F', marginBottom:10 },
    exPickerLabel:   { color:'#AAA', fontSize:11, marginBottom:2 },
    exPickerVal:     { color:'#FFF', fontSize:16, fontWeight:'600' },
    exList:          { backgroundColor:'rgba(5,5,5,0.97)', borderRadius:12, maxHeight:260, marginBottom:10 },
    exItem:          { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:13, borderBottomWidth:1, borderBottomColor:'#222' },
    exItemActive:    { backgroundColor:'rgba(139,47,63,0.4)' },
    exItemTxt:       { color:'#FFF', fontSize:14 },
    guideCard:       { backgroundColor:'rgba(0,0,0,0.85)', borderRadius:14, padding:16, marginBottom:12, borderWidth:1, borderColor:'#333' },
    guideTitle:      { color:'#FFF', fontSize:15, fontWeight:'700', marginBottom:12 },
    camTypeRow:      { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderRadius:10, padding:10, marginBottom:12 },
    camTypeTxt:      { color:'#FFF', fontSize:13, fontWeight:'600' },
    switchBtn:       { backgroundColor:'rgba(255,255,255,0.15)', borderRadius:12, paddingHorizontal:10, paddingVertical:5 },
    switchBtnTxt:    { color:'#FFF', fontSize:12 },
    guideRow:        { flexDirection:'row', alignItems:'flex-start', marginBottom:10 },
    guideLbl:        { color:'#888', fontSize:11 },
    guideVal:        { color:'#FFF', fontSize:13, fontWeight:'600', flexShrink:1 },
    divider:         { height:1, backgroundColor:'#333', marginVertical:10 },
    guideExtra:      { color:'#00CC66', fontSize:13, marginBottom:4 },
    errorBox:        { backgroundColor:'rgba(180,0,0,0.75)', borderRadius:10, padding:10, marginBottom:10 },
    errorTxt:        { color:'#FFF', fontSize:13, textAlign:'center' },
    startBtn:        { backgroundColor:'#8B2F3F', borderRadius:30, padding:16, alignItems:'center' },
    startBtnTxt:     { color:'#FFF', fontSize:18, fontWeight:'700' },
    cdLabel:         { color:'#FFF', fontSize:24, fontWeight:'700', marginBottom:10 },
    cdNum:           { color:'#FF4444', fontSize:120, fontWeight:'900', lineHeight:130 },
    cdSub:           { color:'#AAA', fontSize:16, marginTop:8 },
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
    analyzingTitle:    { color:'#FFF', fontSize:20, fontWeight:'700', marginTop:16 },
    analyzingSubtitle: { color:'#AAA', fontSize:14, marginTop:6 },
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
    issueTxt:        { color:'#CCC', fontSize:12, marginTop:2 },
    goodPart:        { color:'#00FF88', fontSize:13, marginBottom:3 },
    savedNote:       { backgroundColor:'rgba(0,100,0,0.4)', borderRadius:10, padding:10, alignItems:'center', marginBottom:10 },
    savedNoteTxt:    { color:'#00FF88', fontSize:13 },
    retryBtn:        { backgroundColor:'#8B2F3F', borderRadius:30, padding:16, alignItems:'center', marginTop:6 },
    retryBtnTxt:     { color:'#FFF', fontSize:16, fontWeight:'700' },
});