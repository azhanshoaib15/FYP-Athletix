import { useAuth, useSignIn } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SignInProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal') => void;
}

export default function SignIn({ onNavigate }: SignInProps) {
    const { isSignedIn } = useAuth();
    const { signIn, setActive, isLoaded } = useSignIn();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const scrollViewRef = useRef<ScrollView>(null);

    // If user is already signed in, navigate to dashboard
    useEffect(() => {
        if (isSignedIn) {
            onNavigate('dashboard');
        }
    }, [isSignedIn]);

    const handleInputFocus = () => {
        scrollViewRef.current?.scrollTo({ y: 350, animated: true });
    };

    const handleSignIn = async () => {
        if (!isLoaded) return;

        // Check if already signed in
        if (isSignedIn) {
            onNavigate('dashboard');
            return;
        }

        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const signInAttempt = await signIn.create({
                identifier: email,
                password,
            });

            if (signInAttempt.status === 'complete') {
                await setActive({ session: signInAttempt.createdSessionId });
                onNavigate('dashboard');
            } else {
                Alert.alert('Error', 'Sign in failed. Please try again.');
            }
        } catch (err: any) {
            console.error('Sign in error:', err);
            const errorMessage = err.errors?.[0]?.message || err.message || 'Sign in failed';

            // Handle specific error for existing session
            if (errorMessage.includes('session') && errorMessage.includes('exist')) {
                onNavigate('dashboard');
            } else {
                Alert.alert('Error', errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: 'https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/background_jojyek.jpg' }}
                style={styles.backgroundImage}
                contentFit="cover"
            />
            <Image
                source={{ uri: 'https://res.cloudinary.com/dgliirggm/image/upload/v1764674093/logo_y5zeid.png' }}
                style={styles.logo}
                contentFit="contain"
            />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('display')}>
                            <Text style={styles.backButtonText}>{'<'}</Text>
                        </TouchableOpacity>
                        <View style={styles.contentContainer}>
                            <Text style={styles.title}>Sign In</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#ccc"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!loading}
                                onFocus={handleInputFocus}
                            />
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Password"
                                    placeholderTextColor="#ccc"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                    onFocus={handleInputFocus}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Text style={styles.eyeIconText}>
                                        {showPassword ? '👁️' : '🔒'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleSignIn}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.buttonText}>Sign In</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onNavigate('gender')} disabled={loading}>
                                <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
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
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    logo: {
        position: 'absolute',
        width: 950,
        height: 532,
        top: -34,
        left: -269,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 350, // Push content down below the logo
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
        marginBottom: 40,
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
    },
    passwordContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    passwordInput: {
        flex: 1,
        height: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingRight: 50,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    eyeIcon: {
        position: 'absolute',
        right: 15,
        height: 50,
        justifyContent: 'center',
    },
    eyeIconText: {
        fontSize: 20,
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
