import { CameraView, useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FormAnalysisProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings' | 'formAnalysis') => void;
}

export default function FormAnalysisScreen({ onNavigate }: FormAnalysisProps) {
    const [permission, requestPermission] = useCameraPermissions();

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
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
            <CameraView style={styles.camera} facing="back">
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={() => onNavigate('dashboard')}>
                        <Text style={styles.text}>Back</Text>
                    </TouchableOpacity>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#000000',
    },
    permissionContainer: {
        alignItems: 'center',
        padding: 20,
    },
    message: {
        textAlign: 'center',
        paddingBottom: 20,
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    permissionButton: {
        backgroundColor: '#8B2F3F',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        marginTop: 10,
        width: '80%',
        alignItems: 'center',
    },
    permissionBackButton: {
        backgroundColor: '#501313',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        marginTop: 15,
        width: '80%',
        alignItems: 'center',
    },
    permissionButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 64,
    },
    button: {
        flex: 1,
        alignSelf: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#501313',
        padding: 10,
        borderRadius: 30,
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
});
