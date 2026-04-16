import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PersonalInfoScreenProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal') => void;
}

export default function PersonalInfoScreen({ onNavigate }: PersonalInfoScreenProps) {
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    const handleContinue = () => {
        if (!age || !height || !weight) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const ageNum = parseInt(age);
        const heightNum = parseFloat(height);
        const weightNum = parseFloat(weight);

        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
            Alert.alert('Error', 'Please enter a valid age (1-120)');
            return;
        }

        if (isNaN(heightNum) || heightNum < 50 || heightNum > 300) {
            Alert.alert('Error', 'Please enter a valid height in cm (50-300)');
            return;
        }

        if (isNaN(weightNum) || weightNum < 20 || weightNum > 500) {
            Alert.alert('Error', 'Please enter a valid weight in kg (20-500)');
            return;
        }

        // TODO: Store this data (age, height, weight) for later use
        onNavigate('fitnessgoal');
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('gender')}>
                            <Text style={styles.backButtonText}>{'<'}</Text>
                        </TouchableOpacity>
                        <View style={styles.contentContainer}>
                            <Text style={styles.title}>Personal Information</Text>
                            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Age</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your age"
                                    placeholderTextColor="#ccc"
                                    value={age}
                                    onChangeText={setAge}
                                    keyboardType="number-pad"
                                    maxLength={3}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Height (cm)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your height in cm"
                                    placeholderTextColor="#ccc"
                                    value={height}
                                    onChangeText={setHeight}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Weight (kg)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your weight in kg"
                                    placeholderTextColor="#ccc"
                                    value={weight}
                                    onChangeText={setWeight}
                                    keyboardType="decimal-pad"
                                />
                            </View>

                            <TouchableOpacity style={styles.button} onPress={handleContinue}>
                                <Text style={styles.buttonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
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
        marginBottom: 40,
    },
    inputGroup: {
        width: '100%',
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        color: '#FFFFFF',
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        paddingHorizontal: 15,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        fontSize: 16,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#8B2F3F',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
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
