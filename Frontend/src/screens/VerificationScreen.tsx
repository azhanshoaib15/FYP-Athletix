import { useSignUp } from '@clerk/clerk-expo';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface VerificationScreenProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal') => void;
}

export default function VerificationScreen({ onNavigate }: VerificationScreenProps) {
    const { signUp, setActive, isLoaded } = useSignUp();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerification = async () => {
        if (!isLoaded) return;

        if (!code || code.length !== 6) {
            Alert.alert('Error', 'Please enter the 6-digit verification code');
            return;
        }

        setLoading(true);
        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status === 'complete') {
                await setActive({ session: completeSignUp.createdSessionId });
                onNavigate('dashboard');
            } else {
                Alert.alert('Error', 'Verification failed. Please try again.');
            }
        } catch (err: any) {
            Alert.alert('Error', err.errors?.[0]?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!isLoaded) return;

        try {
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            Alert.alert('Success', 'Verification code resent to your email');
        } catch (err: any) {
            Alert.alert('Error', err.errors?.[0]?.message || 'Failed to resend code');
        }
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
                        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('signup')}>
                            <Text style={styles.backButtonText}>{'<'}</Text>
                        </TouchableOpacity>
                        <View style={styles.contentContainer}>
                            <Text style={styles.title}>Verify Email</Text>
                            <Text style={styles.subtitle}>
                                Enter the 6-digit code sent to your email
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-digit code"
                                placeholderTextColor="#ccc"
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                maxLength={6}
                                editable={!loading}
                                autoFocus
                            />
                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleVerification}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Verify</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                                <Text style={styles.linkText}>Didn't receive code? Resend</Text>
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
        backgroundColor: '#511820',
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
        textAlign: 'center',
    },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        paddingHorizontal: 15,
        color: '#FFFFFF',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 8,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#8B2F3F',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    linkText: {
        color: '#FFFFFF',
        marginTop: 10,
    },
});
