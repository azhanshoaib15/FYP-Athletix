import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface FitnessGoalSelectionScreenProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal') => void;
}

type FitnessGoal = 'lose-weight' | 'build-muscle' | 'stay-fit' | 'improve-endurance';

export default function FitnessGoalSelectionScreen({ onNavigate }: FitnessGoalSelectionScreenProps) {
    const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);

    const goals: { id: FitnessGoal; title: string; color: string; image: any }[] = [
        {
            id: 'lose-weight',
            title: 'Lose Weight',
            color: '#FF6B6B',
            image: require('../assets/images/Lose Weight.png')
        },
        {
            id: 'build-muscle',
            title: 'Build Muscle',
            color: '#3A2EEB',
            image: require('../assets/images/Build Muscle.png')
        },
        {
            id: 'stay-fit',
            title: 'Stay Fit',
            color: '#4CAF50',
            image: require('../assets/images/Stay_Fit.jpeg')
        },
        {
            id: 'improve-endurance',
            title: 'Improve Endurance',
            color: '#FF8C42',
            image: require('../assets/images/Improve Endurance.png')
        }
    ];

    const handleContinue = () => {
        if (!selectedGoal) {
            Alert.alert('Error', 'Please select a fitness goal');
            return;
        }

        // TODO: Store selected goal for later use
        onNavigate('signup');
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('personalinfo')}>
                        <Text style={styles.backButtonText}>{'<'}</Text>
                    </TouchableOpacity>
                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>Fitness Goal</Text>
                        <Text style={styles.subtitle}>What's your primary fitness goal?</Text>

                        <View style={styles.gridContainer}>
                            {goals.map((goal) => (
                                <TouchableOpacity
                                    key={goal.id}
                                    style={[
                                        styles.goalCard,
                                        { backgroundColor: goal.color },
                                        selectedGoal === goal.id && styles.goalCardSelected
                                    ]}
                                    onPress={() => setSelectedGoal(goal.id)}
                                >
                                    <Image
                                        source={goal.image}
                                        style={styles.goalImage}
                                        contentFit="cover"
                                    />
                                    <View style={styles.goalOverlay}>
                                        <Text style={styles.goalTitle}>{goal.title}</Text>
                                    </View>
                                    {selectedGoal === goal.id && (
                                        <View style={styles.checkmark}>
                                            <Text style={styles.checkmarkText}>✓</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleContinue}>
                            <Text style={styles.buttonText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    safeArea: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 60,
    },
    contentContainer: {
        width: '100%',
        alignItems: 'center',
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
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#CCCCCC',
        marginBottom: 30,
    },
    gridContainer: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
    },
    goalCard: {
        width: '47%',
        aspectRatio: 1,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    goalCardSelected: {
        borderColor: '#FFFFFF',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    goalImage: {
        width: '100%',
        height: '100%',
    },
    goalOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 10,
        alignItems: 'center',
    },
    goalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    checkmark: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#8B2F3F',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
