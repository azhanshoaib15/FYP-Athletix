import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const FORM_ANALYSIS_URL = process.env.EXPO_PUBLIC_FORM_ANALYSIS_URL || 'https://desirable-playfulness-production-a1dd.up.railway.app';

interface FormAnalysisProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings' | 'formAnalysis') => void;
}

export default function FormAnalysisScreen({ onNavigate }: FormAnalysisProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const cameraRef = useRef<any>(null);

    const analyzeForm = async () => {
        if (!cameraRef.current) return;
        setIsAnalyzing(true);
        setError(null);
        setResult(null);
        try {
            const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
            const response = await fetch(`${FORM_ANALYSIS_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: photo.base64 }),
            });
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            const data = await response.json();
            setResult(data);
        } catch (e: any) {
            setError(e.message || 'Analysis failed');
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
                    <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('dashboard')}>
                        <Text style={styles.text}>← Back</Text>
                    </TouchableOpacity>

                    {result && (
                        <ScrollView style={styles.resultContainer}>
                            <Text style={styles.resultTitle}>Analysis Result</Text>
                            <Text style={styles.resultText}>{JSON.stringify(result, null, 2)}</Text>
                        </ScrollView>
                    )}

                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Error: {error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.analyzeButton, isAnalyzing && styles.analyzeButtonDisabled]}
                        onPress={analyzeForm}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.analyzeButtonText}>Analyze Form</Text>
                        )}
                    </TouchableOpacity>
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
    analyzeButton: { backgroundColor: '#8B2F3F', paddingVertical: 15, borderRadius: 30, alignItems: 'center', marginBottom: 30 },
    analyzeButtonDisabled: { backgroundColor: '#555555' },
    analyzeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    resultContainer: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: 10, maxHeight: 300 },
    resultTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 5 },
    resultText: { color: '#CCCCCC', fontSize: 12 },
    errorContainer: { backgroundColor: 'rgba(139,47,63,0.8)', borderRadius: 10, padding: 10 },
    errorText: { color: '#FFFFFF', fontSize: 14 },
});