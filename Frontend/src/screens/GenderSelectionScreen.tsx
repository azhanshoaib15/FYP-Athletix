import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface GenderSelectionProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal') => void;
}

export default function GenderSelectionScreen({ onNavigate }: GenderSelectionProps) {
    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.contentContainer}>
                <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('display')}>
                    <Text style={styles.backButtonText}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Select Gender</Text>
                <View style={styles.selectionContainer}>
                    <TouchableOpacity
                        style={[styles.genderContainer, styles.maleContainer]}
                        onPress={() => onNavigate('personalinfo')}
                    >
                        <Image
                            source={require('../assets/images/male-39108_1280.png')}
                            style={styles.genderImage}
                            contentFit="contain"
                        />
                        <Text style={styles.genderText}>Male</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.genderContainer, styles.femaleContainer]}
                        onPress={() => onNavigate('personalinfo')}
                    >
                        <Image
                            source={require('../assets/images/female-1294228_1280.png')}
                            style={styles.genderImage}
                            contentFit="contain"
                        />
                        <Text style={styles.genderText}>Female</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    backButtonText: {
        color: '#000000',
        fontSize: 24,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 32,
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginBottom: 40,
    },
    selectionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        gap: 20,
    },
    genderContainer: {
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        padding: 10,
    },
    maleContainer: {
        backgroundColor: '#ADD8E6',
    },
    femaleContainer: {
        backgroundColor: '#FFC0CB',
    },
    genderImage: {
        width: '80%',
        height: '80%',
    },
    genderText: {
        marginTop: 10,
        fontSize: 18,
        fontWeight: 'bold',
        position: 'absolute',
        bottom: -30,
        color: '#FFFFFF',
    },
});
