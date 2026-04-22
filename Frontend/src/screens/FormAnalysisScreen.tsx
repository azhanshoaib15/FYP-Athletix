import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText, G } from 'react-native-svg';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const ML_URL      = 'https://desirable-playfulness-production-a1dd.up.railway.app';
const BACKEND_URL = 'https://fyp-athletix-production.up.railway.app';
const { width: SW, height: SH } = Dimensions.get('window');

interface Props { onNavigate: (screen: any) => void; }

// ── Exercise data ──────────────────────────────────────────────────────────────

const EXERCISES = [
    'Squats','PushUp','Bench Press','Bicep curl','Lunges','Plank',
    'Pull Ups','Shoulder press','Lat Pulldown','Tricep Dips','Leg Press',
    'Leg Extension','Leg Raises','Chest Fly','BackRows','Lateral Raises',
    'Incline beanch Press','Tricep pushdown'
];

interface ExGuide {
    camera: 'front'|'back';
    distance: string;
    bodyPosition: string;
    cameraAngle: string;
    tip: string;
}

const GUIDE: Record<string, ExGuide> = {
    'Squats':               { camera:'back',  distance:'6-8 feet',  bodyPosition:'Stand sideways to camera — full body visible head to toe', cameraAngle:'Side view 90°', tip:'Camera at hip height for best knee angle detection' },
    'PushUp':               { camera:'back',  distance:'4-6 feet',  bodyPosition:'Lie sideways to camera — full body horizontal visible',     cameraAngle:'Side view 90°', tip:'Place phone on floor propped up at side angle' },
    'Bench Press':          { camera:'back',  distance:'5-7 feet',  bodyPosition:'Lie on bench sideways to camera',                           cameraAngle:'Side view 90°', tip:'Phone on tripod or leaned against wall beside bench' },
    'Bicep curl':           { camera:'front', distance:'3-4 feet',  bodyPosition:'Face the camera — arms fully visible shoulder to wrist',     cameraAngle:'Front view',    tip:'Stand upright arms relaxed at sides before starting' },
    'Lunges':               { camera:'back',  distance:'6-8 feet',  bodyPosition:'Stand sideways to camera — full body visible',               cameraAngle:'Side view 90°', tip:'Step forward so camera captures full knee bend' },
    'Plank':                { camera:'back',  distance:'5-7 feet',  bodyPosition:'Lie sideways — full horizontal body visible',                cameraAngle:'Side view 90°', tip:'Phone low on floor pointing at you from the side' },
    'Pull Ups':             { camera:'back',  distance:'6-10 feet', bodyPosition:'Face camera — full body including bar must be visible',       cameraAngle:'Front view',    tip:'Step back so bar and feet are both in frame' },
    'Shoulder press':       { camera:'front', distance:'3-5 feet',  bodyPosition:'Face camera — upper body and arms fully visible',             cameraAngle:'Front view',    tip:'Arms should be visible from elbow to wrist overhead' },
    'Lat Pulldown':         { camera:'back',  distance:'5-7 feet',  bodyPosition:'Sit sideways to camera — torso and arms visible',             cameraAngle:'Side view 90°', tip:'Seat and cable machine should both be in frame' },
    'Tricep Dips':          { camera:'back',  distance:'4-6 feet',  bodyPosition:'Sit sideways — arms and torso visible',                      cameraAngle:'Side view 90°', tip:'Make sure elbows are visible throughout movement' },
    'Leg Press':            { camera:'back',  distance:'5-7 feet',  bodyPosition:'Sit sideways — full legs and machine visible',                cameraAngle:'Side view 90°', tip:'Entire leg range of motion must be in frame' },
    'Leg Extension':        { camera:'back',  distance:'4-6 feet',  bodyPosition:'Sit sideways — full legs visible while seated',              cameraAngle:'Side view 90°', tip:'Camera at knee height works best' },
    'Leg Raises':           { camera:'back',  distance:'5-7 feet',  bodyPosition:'Lie sideways — full body visible while on back',             cameraAngle:'Side view 90°', tip:'Phone on floor pointing sideways at your body' },
    'Chest Fly':            { camera:'back',  distance:'5-7 feet',  bodyPosition:'Lie sideways — upper body and both arms visible',            cameraAngle:'Side view 90°', tip:'Both arms must be visible in the widest position' },
    'BackRows':             { camera:'back',  distance:'5-7 feet',  bodyPosition:'Stand/sit sideways — back and arms fully visible',            cameraAngle:'Side view 90°', tip:'Camera at torso height to capture back angle' },
    'Lateral Raises':       { camera:'front', distance:'3-5 feet',  bodyPosition:'Face camera — upper body and arms from side to overhead',     cameraAngle:'Front view',    tip:'Arms should be visible from body to shoulder height' },
    'Incline beanch Press': { camera:'back',  distance:'5-7 feet',  bodyPosition:'Lie on incline bench sideways to camera',                    cameraAngle:'Side view 90°', tip:'Incline bench and arms must both be in frame' },
    'Tricep pushdown':      { camera:'front', distance:'3-5 feet',  bodyPosition:'Face camera — arms visible shoulder to wrist',               cameraAngle:'Front view',    tip:'Elbows must stay at sides and be visible throughout' },
};

const getGuide = (ex: string): ExGuide => GUIDE[ex] || {
    camera:'back', distance:'5-7 feet',
    bodyPosition:'Full body visible in frame',
    cameraAngle:'Side or front view',
    tip:'Ensure good lighting and full body in frame'
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

const CONNECTIONS: {a:number;b:number;region:string}[] = [
    {a:11,b:12,region:'torso'},{a:11,b:23,region:'torso'},{a:12,b:24,region:'torso'},{a:23,b:24,region:'torso'},
    {a:11,b:13,region:'left_arm'},{a:13,b:15,region:'left_arm'},
    {a:12,b:14,region:'right_arm'},{a:14,b:16,region:'right_arm'},
    {a:23,b:25,region:'left_leg'},{a:25,b:27,region:'left_leg'},
    {a:24,b:26,region:'right_leg'},{a:26,b:28,region:'right_leg'},
    {a:0,b:11,region:'torso'},{a:0,b:12,region:'torso'},
];

const KEY_JOINTS: {idx:number;region:string}[] = [
    {idx:0,region:'torso'},{idx:11,region:'torso'},{idx:12,region:'torso'},
    {idx:13,region:'left_arm'},{idx:14,region:'right_arm'},
    {idx:15,region:'left_arm'},{idx:16,region:'right_arm'},
    {idx:23,region:'torso'},{idx:24,region:'torso'},
    {idx:25,region:'left_leg'},{idx:26,region:'right_leg'},
    {idx:27,region:'left_leg'},{idx:28,region:'right_leg'},
];

const CRITICAL: Record<string,string[]> = {
    'Squats':['left_leg','right_leg','torso'],'PushUp':['left_arm','right_arm','torso'],
    'Bicep curl':['left_arm','right_arm'],'Bench Press':['left_arm','right_arm','torso'],
    'Lunges':['left_leg','right_leg','torso'],'Shoulder press':['left_arm','right_arm'],
    'Lat Pulldown':['left_arm','right_arm','torso'],'Plank':['torso','left_leg','right_leg'],
};

interface LM { x:number; y:number; v:number; }
const parseLM = (kp:number[]): LM[] => Array.from({length:33},(_,i)=>({x:kp[i*4],y:kp[i*4+1],v:kp[i*4+3]}));

function SkeletonOverlay({keypoints,formStatus,exercise,w,h}:{keypoints:number[]|null;formStatus:string;exercise:string;w:number;h:number}) {
    if (!keypoints || keypoints.length!==132 || w===0) return null;
    const lms = parseLM(keypoints);
    const crit = CRITICAL[exercise]||['torso'];
    const color = (region:string) => {
        if (formStatus==='correct') return '#00FF88';
        if (formStatus==='incorrect') return crit.includes(region)?'#FF4444':'#FFD700';
        return '#FFD700';
    };
    const nose = lms[0];
    const bx = nose&&nose.v>0.3 ? nose.x*w : w/2;
    const by = nose&&nose.v>0.3 ? Math.max(nose.y*h-55,15) : 55;
    return (
        <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
            {CONNECTIONS.map(({a,b,region},i)=>{
                const A=lms[a]; const B=lms[b];
                if(!A||!B||A.v<0.3||B.v<0.3) return null;
                return <Line key={"l"+i} x1={A.x*w} y1={A.y*h} x2={B.x*w} y2={B.y*h} stroke={color(region)} strokeWidth={3.5} strokeOpacity={0.92} strokeLinecap="round"/>;
            })}
            {KEY_JOINTS.map(({idx,region})=>{
                const lm=lms[idx];
                if(!lm||lm.v<0.3) return null;
                return <Circle key={"j"+idx} cx={lm.x*w} cy={lm.y*h} r={7} fill={color(region)} fillOpacity={0.95} stroke="#000" strokeWidth={1.5}/>;
            })}
            {formStatus!==''&&formStatus!=='unknown'&&(
                <G>
                    <Rect x={bx-55} y={by-16} width={110} height={28} rx={14} fill={formStatus==='correct'?'rgba(0,160,0,0.9)':'rgba(200,0,0,0.9)'}/>
                    <SvgText x={bx} y={by+6} textAnchor="middle" fill="white" fontSize={13} fontWeight="bold">
                        {formStatus==='correct'?'GOOD FORM':'FIX FORM'}
                    </SvgText>
                </G>
            )}
        </Svg>
    );
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Phase = 'setup'|'countdown'|'recording'|'analyzing'|'results';

export default function FormAnalysisScreen({onNavigate}:Props) {
    const token = useSelector((state:RootState)=>state.user.accessToken);
    const [permission, requestPermission] = useCameraPermissions();
    const [phase, setPhase]       = useState<Phase>('setup');
    const [result, setResult]     = useState<any>(null);
    const [error, setError]       = useState<string|null>(null);
    const [exercise, setExercise] = useState('Squats');
    const [showList, setShowList] = useState(false);
    const [reps, setReps]         = useState(0);
    const [formStatus, setFormStatus] = useState('');
    const [countdown, setCountdown]   = useState(3);
    const [goodFrames, setGoodFrames] = useState(0);
    const [poseOk, setPoseOk]         = useState(false);
    const [warning, setWarning]       = useState('');
    const [facing, setFacing]         = useState<'front'|'back'>('back');
    const [keypoints, setKeypoints]   = useState<number[]|null>(null);
    const [showRef, setShowRef]       = useState(true);
    const [camSize, setCamSize]       = useState({w:SW,h:SH});

    const camRef   = useRef<any>(null);
    const ivl      = useRef<any>(null);
    const cdIvl    = useRef<any>(null);
    const framesR  = useRef<string[]>([]);
    const kpR      = useRef<number[][]>([]);
    const repsR    = useRef(0);
    const goodR    = useRef(0);

    const g = getGuide(exercise);

    useEffect(()=>{
        setFacing(g.camera);
        setKeypoints(null);
    },[exercise]);

    useEffect(()=>()=>{ clearInterval(ivl.current); clearInterval(cdIvl.current); },[]);

    const startCountdown = () => {
        setPhase('countdown'); setCountdown(3); let c=3;
        cdIvl.current = setInterval(()=>{ c--; setCountdown(c); if(c===0){clearInterval(cdIvl.current);startRecording();} },1000);
    };

    const startRecording = () => {
        setPhase('recording');
        setError(null); setResult(null); setReps(0);
        setFormStatus(''); setGoodFrames(0); setPoseOk(false); setWarning(''); setKeypoints(null);
        repsR.current=0; framesR.current=[]; kpR.current=[]; goodR.current=0;
        ivl.current = setInterval(async()=>{
            if(!camRef.current) return;
            try {
                const photo = await camRef.current.takePictureAsync({base64:true,quality:0.4,skipProcessing:true,mute:true});
                if(!photo?.base64) return;
                framesR.current.push(photo.base64);
                if(framesR.current.length>60) framesR.current=framesR.current.slice(-60);
                const res = await fetch(ML_URL+'/live/check',{
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({
                        exercise, latest_frame_b64:photo.base64,
                        recent_frames_b64:framesR.current.slice(-10),
                        total_reps_so_far:repsR.current,
                        accumulated_keypoints:kpR.current.length>0?kpR.current:null,
                    }),
                });
                if(!res.ok) return;
                const d = await res.json();
                if(d.reps_in_window>0){ repsR.current=d.reps_in_window; setReps(repsR.current); }
                if(d.form_status&&d.form_status!=='unknown') setFormStatus(d.form_status);
                if(d.keypoints&&d.keypoints.length===132){
                    setKeypoints(d.keypoints);
                    kpR.current.push(d.keypoints);
                    if(kpR.current.length>60) kpR.current=kpR.current.slice(-60);
                    goodR.current=kpR.current.length;
                    setGoodFrames(goodR.current); setPoseOk(true); setWarning('');
                } else {
                    setKeypoints(null);
                    const st=d.camera_status||'';
                    if(st==='low_light')       setWarning('Move to a brighter area');
                    else if(st==='too_close')  setWarning('Move '+g.distance+' away from camera');
                    else if(st==='too_far')    setWarning('Move closer — '+g.distance+' is ideal');
                    else                       setWarning(d.camera_message||'Adjust position and try again');
                    setPoseOk(goodR.current>0);
                }
            } catch(_){}
        },800);
    };

    const stopAndAnalyze = async() => {
        clearInterval(ivl.current);
        setPhase('analyzing'); setKeypoints(null);
        try {
            if(framesR.current.length<5){ setError('Record for at least 5 seconds.'); setPhase('setup'); return; }
            const kp = kpR.current.length>=3 ? kpR.current : framesR.current.map(()=>Array(132).fill(0.15));
            const res = await fetch(ML_URL+'/live/finish',{
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({exercise,all_keypoints:kp}),
            });
            if(res.ok){
                const d = await res.json();
                const finalReps = repsR.current>0?repsR.current:d.total_reps;
                setResult({...d,total_reps:finalReps}); setPhase('results');
                try {
                    if(token){
                        await fetch(BACKEND_URL+'/api/v1/workouts/form-analysis',{
                            method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
                            body: JSON.stringify({session_exercise_id:1,exercise_id:1,rep_number:finalReps,
                                form_status:d.overall_form||'unknown',confidence_score:d.confidence||0,
                                errors_detected:d.body_part_issues?.map((i:any)=>i.body_part)||[],
                                joint_angles:{},feedback_given:d.feedback||'',keypoints_snapshot:null}),
                        });
                    }
                } catch(_){}
            } else {
                const e = await res.json().catch(()=>({}));
                setError(e.detail||'Analysis failed.'); setPhase('setup');
            }
        } catch(_){ setError('Connection error.'); setPhase('setup'); }
    };

    const reset = () => {
        setPhase('setup'); setResult(null); setError(null);
        setReps(0); setFormStatus(''); setPoseOk(false); setGoodFrames(0); setWarning(''); setKeypoints(null);
        framesR.current=[]; kpR.current=[]; repsR.current=0; goodR.current=0;
        setFacing(g.camera);
    };

    if(!permission) return <View style={s.root}/>;
    if(!permission.granted) return (
        <View style={[s.root,s.center]}>
            <Text style={s.permTitle}>Camera Access Needed</Text>
            <Text style={s.permSub}>Required for real-time form analysis</Text>
            <TouchableOpacity style={s.btnRed} onPress={requestPermission}><Text style={s.btnTxt}>Grant Access</Text></TouchableOpacity>
            <TouchableOpacity style={s.btnGhost} onPress={()=>onNavigate('dashboard')}><Text style={[s.btnTxt,{color:'#888'}]}>Go Back</Text></TouchableOpacity>
        </View>
    );

    return (
        <View style={s.root}>
            <CameraView style={s.camera} facing={facing} ref={camRef}
                onLayout={e=>{ const{width,height}=e.nativeEvent.layout; setCamSize({w:width,h:height}); }}>

                <SkeletonOverlay keypoints={keypoints} formStatus={formStatus} exercise={exercise} w={camSize.w} h={camSize.h}/>

                <View style={s.overlay}>

                    {/* Top bar */}
                    <View style={s.topBar}>
                        <TouchableOpacity style={s.backBtn} onPress={()=>{ clearInterval(ivl.current); clearInterval(cdIvl.current); onNavigate('dashboard'); }}>
                            <Text style={s.backTxt}>Back</Text>
                        </TouchableOpacity>
                        <Text style={s.topTitle}>Form Analysis</Text>
                        {phase==='recording'&&<View style={s.recDot}><Text style={s.recTxt}>● REC</Text></View>}
                        {(phase==='setup'||phase==='recording')&&(
                            <TouchableOpacity style={s.flipBtn} onPress={()=>setFacing(f=>f==='back'?'front':'back')}>
                                <Text style={s.flipTxt}>⟳ Flip</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Camera type pill */}
                    <View style={[s.camPill,{backgroundColor:facing==='front'?'rgba(0,120,220,0.85)':'rgba(0,130,60,0.85)'}]}>
                        <Text style={s.camPillTxt}>{facing==='front'?'🤳 Front':'📷 Back'} Camera</Text>
                    </View>

                    {/* ── SETUP ── */}
                    {phase==='setup'&&(
                        <ScrollView style={s.panel} contentContainerStyle={{paddingBottom:30}}>

                            {/* Exercise picker */}
                            <TouchableOpacity style={s.picker} onPress={()=>setShowList(!showList)}>
                                <Text style={s.pickerLabel}>Exercise</Text>
                                <View style={s.pickerRow}>
                                    <Text style={s.pickerVal}>{exercise}</Text>
                                    <Text style={s.pickerArrow}>{showList?'▲':'▼'}</Text>
                                </View>
                            </TouchableOpacity>

                            {showList&&(
                                <ScrollView style={s.dropdown} nestedScrollEnabled>
                                    {EXERCISES.map(ex=>(
                                        <TouchableOpacity key={ex} style={[s.dropItem,ex===exercise&&s.dropItemActive]}
                                            onPress={()=>{ setExercise(ex); setShowList(false); }}>
                                            <Text style={s.dropItemTxt}>{ex}</Text>
                                            <Text style={s.dropItemCam}>{getGuide(ex).camera==='front'?'🤳 Front':'📷 Back'}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            {!showList&&(
                                <>
                                    {/* Camera setup guide card */}
                                    <View style={s.guideCard}>
                                        <Text style={s.guideCardTitle}>Camera Setup</Text>

                                        <View style={[s.camTypeBox,{backgroundColor:facing==='front'?'rgba(0,100,200,0.2)':'rgba(0,140,60,0.2)'}]}>
                                            <Text style={s.camTypeIcon}>{facing==='front'?'🤳':'📷'}</Text>
                                            <View style={{flex:1}}>
                                                <Text style={s.camTypeTitle}>{facing==='front'?'Front Camera':'Back Camera'}</Text>
                                                <Text style={s.camTypeSub}>Auto-selected for {exercise}</Text>
                                            </View>
                                            <TouchableOpacity style={s.camSwitchBtn} onPress={()=>setFacing(f=>f==='back'?'front':'back')}>
                                                <Text style={s.camSwitchTxt}>Switch</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={s.guideRows}>
                                            <View style={s.guideRow}>
                                                <Text style={s.guideIcon}>📏</Text>
                                                <View style={{flex:1}}>
                                                    <Text style={s.guideLbl}>Distance from Camera</Text>
                                                    <Text style={s.guideVal}>{g.distance}</Text>
                                                </View>
                                            </View>
                                            <View style={s.guideRow}>
                                                <Text style={s.guideIcon}>🧍</Text>
                                                <View style={{flex:1}}>
                                                    <Text style={s.guideLbl}>Body Position</Text>
                                                    <Text style={s.guideVal}>{g.bodyPosition}</Text>
                                                </View>
                                            </View>
                                            <View style={s.guideRow}>
                                                <Text style={s.guideIcon}>📐</Text>
                                                <View style={{flex:1}}>
                                                    <Text style={s.guideLbl}>Camera Angle</Text>
                                                    <Text style={s.guideVal}>{g.cameraAngle}</Text>
                                                </View>
                                            </View>
                                            <View style={[s.guideRow,{borderBottomWidth:0}]}>
                                                <Text style={s.guideIcon}>💡</Text>
                                                <View style={{flex:1}}>
                                                    <Text style={s.guideLbl}>Pro Tip</Text>
                                                    <Text style={s.guideVal}>{g.tip}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={s.divider}/>
                                        <Text style={s.checkItem}>✓  Good lighting — avoid dark rooms</Text>
                                        <Text style={s.checkItem}>✓  Wear fitted clothing for accuracy</Text>
                                        <Text style={s.checkItem}>✓  Keep phone stable — lean on wall</Text>
                                        <Text style={s.checkItem}>✓  Green = good form · Red = fix form · Blue = target</Text>
                                    </View>

                                    {error&&<View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View>}

                                    <TouchableOpacity style={s.startBtn} onPress={startCountdown}>
                                        <Text style={s.startTxt}>▶  Start Session</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    )}

                    {/* ── COUNTDOWN ── */}
                    {phase==='countdown'&&(
                        <View style={s.center}>
                            <Text style={s.cdGet}>Get in position!</Text>
                            <Text style={s.cdNum}>{countdown}</Text>
                            <Text style={s.cdHint}>{g.cameraAngle} · {g.distance}</Text>
                            <View style={s.cdHintBox}>
                                <Text style={s.cdHintBoxTxt}>{g.bodyPosition}</Text>
                            </View>
                        </View>
                    )}

                    {/* ── RECORDING ── */}
                    {phase==='recording'&&(
                        <>
                            {/* Status banner */}
                            <View style={[s.statusBanner,{backgroundColor:poseOk?'rgba(0,140,0,0.9)':goodR.current>0?'rgba(160,90,0,0.9)':'rgba(160,0,0,0.9)'}]}>
                                <Text style={s.statusBannerTxt}>
                                    {poseOk?'✅  Skeleton detected — '+goodFrames+' frames':'⚠  '+( warning||'Detecting pose...')}
                                </Text>
                            </View>

                            {/* Camera tip when pose not detected */}
                            {!poseOk&&goodFrames===0&&(
                                <View style={s.poseTip}>
                                    <Text style={s.poseTipTxt}>{g.bodyPosition}</Text>
                                </View>
                            )}

                            {/* Live stats */}
                            <View style={s.statsRow}>
                                <View style={s.statBox}>
                                    <Text style={s.statNum}>{reps}</Text>
                                    <Text style={s.statLbl}>REPS</Text>
                                </View>
                                <View style={s.statBox}>
                                    <Text style={[s.statNum,{fontSize:14,
                                        color:formStatus==='correct'?'#00FF88':formStatus==='incorrect'?'#FF4444':'#FFAA00'}]}>
                                        {formStatus==='correct'?'GOOD':formStatus==='incorrect'?'FIX':!poseOk?'FIX CAM':'SCAN'}
                                    </Text>
                                    <Text style={s.statLbl}>FORM</Text>
                                </View>
                                <View style={s.statBox}>
                                    <Text style={[s.statNum,{color:goodFrames>=3?'#00FF88':'#FFAA00'}]}>{goodFrames}</Text>
                                    <Text style={s.statLbl}>FRAMES</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={[s.stopBtn,goodFrames<3&&s.stopBtnDis]} onPress={stopAndAnalyze}>
                                <Text style={s.stopTxt}>{goodFrames<3?'Need '+(3-goodFrames)+' more frames':'⏹  Stop & Analyze'}</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* ── ANALYZING ── */}
                    {phase==='analyzing'&&(
                        <View style={s.center}>
                            <ActivityIndicator color="#FFF" size="large"/>
                            <Text style={s.analyzeTitle}>Analyzing your form...</Text>
                            <Text style={s.analyzeSub}>{kpR.current.length} keyframes processed</Text>
                        </View>
                    )}

                    {/* ── RESULTS ── */}
                    {phase==='results'&&result&&(
                        <ScrollView style={s.panel} contentContainerStyle={{paddingBottom:30}}>
                            {/* Result banner */}
                            <View style={[s.resultBanner,{backgroundColor:result.overall_form==='correct'?'#0a5c2a':'#5c0a0a'}]}>
                                <Text style={s.resultIcon}>{result.overall_form==='correct'?'🏆':'💪'}</Text>
                                <Text style={s.resultTitle}>{result.overall_form==='correct'?'Great Form!':'Room to Improve'}</Text>
                            </View>

                            {/* Score row */}
                            <View style={s.scoreRow}>
                                <View style={s.scoreBox}>
                                    <Text style={s.scoreNum}>{result.total_reps}</Text>
                                    <Text style={s.scoreLbl}>Reps</Text>
                                </View>
                                <View style={[s.scoreBox,{borderColor:result.overall_form==='correct'?'#00FF88':'#FF4444'}]}>
                                    <Text style={[s.scoreNum,{color:result.overall_form==='correct'?'#00FF88':'#FF4444'}]}>
                                        {Math.round((result.confidence||0)*100)}%
                                    </Text>
                                    <Text style={s.scoreLbl}>Confidence</Text>
                                </View>
                                <View style={s.scoreBox}>
                                    <Text style={[s.scoreNum,{fontSize:14,color:result.overall_form==='correct'?'#00FF88':'#FF4444'}]}>
                                        {result.overall_form==='correct'?'✓ Good':'✗ Fix'}
                                    </Text>
                                    <Text style={s.scoreLbl}>Form</Text>
                                </View>
                            </View>

                            {/* Feedback */}
                            {result.feedback&&(
                                <View style={s.feedbackBox}>
                                    <Text style={s.feedbackTxt}>{result.feedback}</Text>
                                </View>
                            )}

                            {/* Issues */}
                            {result.body_part_issues?.length>0&&(
                                <View style={s.section}>
                                    <Text style={s.sectionTitle}>⚠  Areas to Improve</Text>
                                    {result.body_part_issues.map((issue:any,i:number)=>(
                                        <View key={i} style={s.issueRow}>
                                            <View style={s.issueDot}/>
                                            <View style={{flex:1}}>
                                                <Text style={s.issuePart}>{issue.body_part} <Text style={s.issueSev}>({issue.severity})</Text></Text>
                                                <Text style={s.issueTxt}>{issue.feedback}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Good parts */}
                            {result.good_parts?.length>0&&(
                                <View style={s.section}>
                                    <Text style={[s.sectionTitle,{color:'#00FF88'}]}>✓  Good Form On</Text>
                                    {result.good_parts.map((part:string,i:number)=>(
                                        <Text key={i} style={s.goodPart}>✓  {part}</Text>
                                    ))}
                                </View>
                            )}

                            <View style={s.savedBadge}>
                                <Text style={s.savedTxt}>✓ Result saved to your history</Text>
                            </View>

                            <TouchableOpacity style={s.retryBtn} onPress={reset}>
                                <Text style={s.retryTxt}>🔄  Try Again</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}

                </View>
            </CameraView>
        </View>
    );
}

const s = StyleSheet.create({
    root:           {flex:1,backgroundColor:'#000'},
    camera:         {flex:1},
    overlay:        {flex:1,backgroundColor:'transparent'},
    center:         {flex:1,justifyContent:'center',alignItems:'center',padding:20},

    // Top bar
    topBar:         {flexDirection:'row',alignItems:'center',paddingTop:52,paddingHorizontal:16,paddingBottom:10,backgroundColor:'rgba(0,0,0,0.65)'},
    backBtn:        {backgroundColor:'#501313',paddingHorizontal:14,paddingVertical:8,borderRadius:20,marginRight:10},
    backTxt:        {color:'#FFF',fontWeight:'bold',fontSize:13},
    topTitle:       {color:'#FFF',fontSize:16,fontWeight:'700',flex:1},
    recDot:         {backgroundColor:'#CC0000',borderRadius:10,paddingHorizontal:8,paddingVertical:3,marginRight:8},
    recTxt:         {color:'#FFF',fontSize:11,fontWeight:'bold'},
    flipBtn:        {backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,paddingHorizontal:12,paddingVertical:6},
    flipTxt:        {color:'#FFF',fontSize:12,fontWeight:'600'},
    camPill:        {alignSelf:'center',borderRadius:20,paddingHorizontal:14,paddingVertical:5,marginTop:8},
    camPillTxt:     {color:'#FFF',fontSize:12,fontWeight:'600'},

    // Permission
    permTitle:      {color:'#FFF',fontSize:22,fontWeight:'bold',marginBottom:8},
    permSub:        {color:'#888',fontSize:14,textAlign:'center',marginBottom:28},
    btnRed:         {backgroundColor:'#8B2F3F',width:'80%',padding:14,borderRadius:25,alignItems:'center',marginBottom:10},
    btnGhost:       {backgroundColor:'#1a1a1a',width:'80%',padding:14,borderRadius:25,alignItems:'center'},
    btnTxt:         {color:'#FFF',fontWeight:'700',fontSize:15},

    // Panel
    panel:          {flex:1,paddingHorizontal:16,paddingTop:12},

    // Exercise picker
    picker:         {backgroundColor:'rgba(0,0,0,0.85)',borderRadius:14,padding:14,borderWidth:1,borderColor:'#8B2F3F',marginBottom:10},
    pickerLabel:    {color:'#888',fontSize:11,marginBottom:4},
    pickerRow:      {flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
    pickerVal:      {color:'#FFF',fontSize:16,fontWeight:'700'},
    pickerArrow:    {color:'#888',fontSize:14},
    dropdown:       {backgroundColor:'rgba(8,8,8,0.97)',borderRadius:12,maxHeight:240,marginBottom:10},
    dropItem:       {flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:13,borderBottomWidth:1,borderBottomColor:'#1a1a1a'},
    dropItemActive: {backgroundColor:'rgba(139,47,63,0.35)'},
    dropItemTxt:    {color:'#FFF',fontSize:14},
    dropItemCam:    {color:'#888',fontSize:12},

    // Guide card
    guideCard:      {backgroundColor:'rgba(0,0,0,0.88)',borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:'#222'},
    guideCardTitle: {color:'#FFF',fontSize:15,fontWeight:'700',marginBottom:12},
    camTypeBox:     {flexDirection:'row',alignItems:'center',borderRadius:12,padding:12,marginBottom:14,gap:10},
    camTypeIcon:    {fontSize:24},
    camTypeTitle:   {color:'#FFF',fontSize:14,fontWeight:'700'},
    camTypeSub:     {color:'#AAA',fontSize:12,marginTop:2},
    camSwitchBtn:   {backgroundColor:'rgba(255,255,255,0.15)',borderRadius:10,paddingHorizontal:10,paddingVertical:6},
    camSwitchTxt:   {color:'#FFF',fontSize:12},
    guideRows:      {borderWidth:1,borderColor:'#222',borderRadius:10,overflow:'hidden'},
    guideRow:       {flexDirection:'row',alignItems:'flex-start',padding:10,gap:10,borderBottomWidth:1,borderBottomColor:'#222'},
    guideIcon:      {fontSize:18,width:26,textAlign:'center'},
    guideLbl:       {color:'#888',fontSize:11,marginBottom:2},
    guideVal:       {color:'#FFF',fontSize:13,fontWeight:'500',flexShrink:1},
    divider:        {height:1,backgroundColor:'#222',marginVertical:12},
    checkItem:      {color:'#00CC66',fontSize:12,marginBottom:5},
    errorBox:       {backgroundColor:'rgba(160,0,0,0.75)',borderRadius:10,padding:10,marginBottom:10},
    errorTxt:       {color:'#FFF',fontSize:13,textAlign:'center'},
    startBtn:       {backgroundColor:'#8B2F3F',borderRadius:30,padding:16,alignItems:'center',marginTop:4},
    startTxt:       {color:'#FFF',fontSize:17,fontWeight:'700'},

    // Countdown
    cdGet:          {color:'#FFF',fontSize:22,fontWeight:'700',marginBottom:8},
    cdNum:          {color:'#FF4444',fontSize:110,fontWeight:'900',lineHeight:120},
    cdHint:         {color:'#AAA',fontSize:14,marginTop:6},
    cdHintBox:      {backgroundColor:'rgba(0,0,0,0.6)',borderRadius:12,padding:12,marginTop:12,maxWidth:'80%'},
    cdHintBoxTxt:   {color:'#FFF',fontSize:13,textAlign:'center'},

    // Recording
    statusBanner:   {marginHorizontal:16,borderRadius:10,padding:10,alignItems:'center',marginTop:10},
    statusBannerTxt:{color:'#FFF',fontSize:13,fontWeight:'600',textAlign:'center'},
    poseTip:        {backgroundColor:'rgba(0,0,0,0.8)',borderRadius:10,padding:10,marginHorizontal:16,marginTop:6,borderWidth:1,borderColor:'#FFAA00'},
    poseTipTxt:     {color:'#FFD700',fontSize:12,textAlign:'center'},
    statsRow:       {flexDirection:'row',justifyContent:'space-around',paddingHorizontal:16,marginTop:'auto',marginBottom:12},
    statBox:        {backgroundColor:'rgba(0,0,0,0.85)',borderRadius:14,padding:14,alignItems:'center',minWidth:90,borderWidth:1,borderColor:'#222'},
    statNum:        {color:'#FFF',fontSize:28,fontWeight:'800'},
    statLbl:        {color:'#555',fontSize:10,marginTop:3,letterSpacing:1},
    stopBtn:        {backgroundColor:'#B22222',marginHorizontal:24,borderRadius:30,padding:15,alignItems:'center',marginBottom:28},
    stopBtnDis:     {backgroundColor:'#333'},
    stopTxt:        {color:'#FFF',fontSize:15,fontWeight:'700'},

    // Analyzing
    analyzeTitle:   {color:'#FFF',fontSize:18,fontWeight:'700',marginTop:16},
    analyzeSub:     {color:'#888',fontSize:13,marginTop:6},

    // Results
    resultBanner:   {borderRadius:14,padding:16,alignItems:'center',marginBottom:12,flexDirection:'row',gap:10,justifyContent:'center'},
    resultIcon:     {fontSize:24},
    resultTitle:    {color:'#FFF',fontSize:20,fontWeight:'800'},
    scoreRow:       {flexDirection:'row',justifyContent:'space-between',marginBottom:12,gap:8},
    scoreBox:       {flex:1,backgroundColor:'rgba(0,0,0,0.85)',borderRadius:14,padding:14,alignItems:'center',borderWidth:1,borderColor:'#222'},
    scoreNum:       {color:'#FFF',fontSize:24,fontWeight:'800'},
    scoreLbl:       {color:'#555',fontSize:10,marginTop:4,letterSpacing:1},
    feedbackBox:    {backgroundColor:'rgba(30,10,10,0.9)',borderRadius:12,padding:12,marginBottom:12,borderLeftWidth:3,borderLeftColor:'#8B2F3F'},
    feedbackTxt:    {color:'#DDD',fontSize:13,lineHeight:20},
    section:        {backgroundColor:'rgba(0,0,0,0.75)',borderRadius:12,padding:14,marginBottom:10},
    sectionTitle:   {color:'#FF9944',fontSize:13,fontWeight:'700',marginBottom:10,letterSpacing:0.5},
    issueRow:       {flexDirection:'row',alignItems:'flex-start',marginBottom:10,gap:10},
    issueDot:       {width:8,height:8,borderRadius:4,backgroundColor:'#FF4444',marginTop:5},
    issuePart:      {color:'#FF8888',fontSize:13,fontWeight:'700'},
    issueSev:       {color:'#FF6666',fontWeight:'400'},
    issueTxt:       {color:'#CCC',fontSize:12,marginTop:2,lineHeight:18},
    goodPart:       {color:'#00FF88',fontSize:13,marginBottom:4},
    savedBadge:     {backgroundColor:'rgba(0,100,0,0.3)',borderRadius:10,padding:10,alignItems:'center',marginBottom:10,borderWidth:1,borderColor:'rgba(0,200,0,0.3)'},
    savedTxt:       {color:'#00FF88',fontSize:12},
    retryBtn:       {backgroundColor:'#8B2F3F',borderRadius:30,padding:15,alignItems:'center'},
    retryTxt:       {color:'#FFF',fontSize:15,fontWeight:'700'},
});