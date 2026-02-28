import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { NavigationContainer } from '@react-navigation/native';
import { registerRootComponent } from 'expo';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import AuthSelectionScreen from './src/screens/AuthSelectionScreen';
import ChatScreen from './src/screens/ChatScreen';
import DisplayScreen from './src/screens/DisplayScreen';
import FitnessGoalSelectionScreen from './src/screens/FitnessGoalSelectionScreen';
import FormAnalysisScreen from './src/screens/FormAnalysisScreen';
import GenderSelectionScreen from './src/screens/GenderSelectionScreen';
import PersonalInfoScreen from './src/screens/PersonalInfoScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SignInScreen from './src/screens/SignInScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import VerificationScreen from './src/screens/VerificationScreen';
import WorkoutScheduleScreen from './src/screens/WorkoutScheduleScreen';
import { persistor, store } from './src/store/store';

const tokenCache = {
    async getToken(key: string) {
        try {
            return SecureStore.getItemAsync(key);
        } catch (err) {
            return null;
        }
    },
    async saveToken(key: string, value: string) {
        try {
            return SecureStore.setItemAsync(key, value);
        } catch (err) {
            return;
        }
    },
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
    throw new Error('Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env');
}

function AppContent() {
    const { isSignedIn, isLoaded } = useAuth();
    const [currentView, setCurrentView] = useState<'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings' | 'formAnalysis' | 'workoutSchedule' | 'progress' | 'chat' | 'authSelection'>('display');

    // Update view based on authentication state
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            setCurrentView('dashboard');
        } else if (isLoaded && !isSignedIn && currentView === 'dashboard') {
            setCurrentView('display');
        }
    }, [isSignedIn, isLoaded]);

    // Show loading while Clerk initializes
    if (!isLoaded) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#511820' }}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    const renderScreen = () => {
        switch (currentView) {
            case 'signin':
                return <SignInScreen onNavigate={setCurrentView} />;
            case 'signup':
                return <SignUpScreen onNavigate={setCurrentView} />;
            case 'gender':
                return <GenderSelectionScreen onNavigate={setCurrentView} />;
            case 'personalinfo':
                return <PersonalInfoScreen onNavigate={setCurrentView} />;
            case 'fitnessgoal':
                return <FitnessGoalSelectionScreen onNavigate={setCurrentView} />;
            case 'verification':
                return <VerificationScreen onNavigate={setCurrentView} />;
            case 'settings':
                return <SettingsScreen onNavigate={setCurrentView} />;
            case 'dashboard':
                return (
                    <NavigationContainer>
                        <MainTabNavigator onNavigate={setCurrentView} />
                    </NavigationContainer>
                );
            case 'formAnalysis':
                return <FormAnalysisScreen onNavigate={setCurrentView} />;
            case 'workoutSchedule':
                return <WorkoutScheduleScreen onNavigate={setCurrentView} />;
            case 'progress':
                return <ProgressScreen onNavigate={setCurrentView} />;
            case 'chat':
                return <ChatScreen onNavigate={setCurrentView} />;
            case 'authSelection':
                return <AuthSelectionScreen onNavigate={setCurrentView} />;
            default:
                return <DisplayScreen onNavigate={setCurrentView} />;
        }
    };

    return (
        <SafeAreaProvider>
            {renderScreen()}
        </SafeAreaProvider>
    );
}

export default function App() {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <ClerkProvider
                    publishableKey={publishableKey}
                    tokenCache={tokenCache}
                >
                    <AppContent />
                </ClerkProvider>
            </PersistGate>
        </Provider>
    );
}

registerRootComponent(App);
