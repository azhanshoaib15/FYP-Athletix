import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DietPlannerModuleScreenProps {
    onNavigate?: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings') => void;
}

export default function DietPlannerModuleScreen({ onNavigate }: DietPlannerModuleScreenProps) {
    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {onNavigate && (
                    <TouchableOpacity style={styles.settingsButton} onPress={() => onNavigate('settings')}>
                        <Image
                            source={require('../assets/setting_Icon.png')}
                            style={styles.settingsIcon}
                            contentFit="contain"
                        />
                    </TouchableOpacity>
                )}
                <View style={styles.content}>
                    <Text style={styles.title}>Diet Planner Module</Text>
                    <Text style={styles.subtitle}>Under Development....</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#511820',
    },
    safeArea: {
        flex: 1,
    },
    settingsButton: {
        position: 'absolute',
        top: 49,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(139, 47, 63, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 10,
    },
    settingsIcon: {
        width: '60%',
        height: '60%',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 18,
        color: '#CCCCCC',
        fontStyle: 'italic',
    },
});
