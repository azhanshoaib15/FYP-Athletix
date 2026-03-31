import { registerRootComponent } from "expo";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Provider, useDispatch, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { authApi } from "./src/api/authApi";
import { logout } from "./src/store/slices/userSlice";
import { store, persistor } from "./src/store/store";
import type { RootState } from "./src/store/store";
import MainTabNavigator from "./src/navigation/MainTabNavigator";
import AuthSelectionScreen from "./src/screens/AuthSelectionScreen";
import ChatScreen from "./src/screens/ChatScreen";
import DisplayScreen from "./src/screens/DisplayScreen";
import FitnessGoalSelectionScreen from "./src/screens/FitnessGoalSelectionScreen";
import FormAnalysisScreen from "./src/screens/FormAnalysisScreen";
import GenderSelectionScreen from "./src/screens/GenderSelectionScreen";
import PersonalInfoScreen from "./src/screens/PersonalInfoScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SignInScreen from "./src/screens/SignInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import VerificationScreen from "./src/screens/VerificationScreen";
import WorkoutScheduleScreen from "./src/screens/WorkoutScheduleScreen";

type ScreenType = "display" | "signin" | "signup" | "dashboard" | "gender" | "verification" | "personalinfo" | "fitnessgoal" | "settings" | "formAnalysis" | "workoutSchedule" | "progress" | "chat" | "authSelection";

function AppContent() {
    const dispatch = useDispatch();
    const { accessToken } = useSelector((state: RootState) => state.user);
    const [currentView, setCurrentView] = useState<ScreenType>("display");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initApp = async () => {
            if (accessToken) {
                try {
                    await authApi.getMe(accessToken);
                    setCurrentView("dashboard");
                } catch (e) {
                    dispatch(logout());
                    setCurrentView("display");
                }
            } else {
                setCurrentView("display");
            }
            setIsLoading(false);
        };
        initApp();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#511820" }}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    const renderScreen = () => {
        switch (currentView) {
            case "signin": return <SignInScreen onNavigate={setCurrentView} />;
            case "signup": return <SignUpScreen onNavigate={setCurrentView} />;
            case "gender": return <GenderSelectionScreen onNavigate={setCurrentView} />;
            case "personalinfo": return <PersonalInfoScreen onNavigate={setCurrentView} />;
            case "fitnessgoal": return <FitnessGoalSelectionScreen onNavigate={setCurrentView} />;
            case "verification": return <VerificationScreen onNavigate={setCurrentView} />;
            case "settings": return <SettingsScreen onNavigate={setCurrentView} />;
            case "formAnalysis": return <FormAnalysisScreen onNavigate={setCurrentView} />;
            case "workoutSchedule": return <WorkoutScheduleScreen onNavigate={setCurrentView} />;
            case "progress": return <ProgressScreen onNavigate={setCurrentView} />;
            case "chat": return <ChatScreen onNavigate={setCurrentView} />;
            case "authSelection": return <AuthSelectionScreen onNavigate={setCurrentView} />;
            case "dashboard":
                return (
                    <NavigationContainer>
                        <MainTabNavigator onNavigate={setCurrentView} />
                    </NavigationContainer>
                );
            default: return <DisplayScreen onNavigate={setCurrentView} />;
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
                <AppContent />
            </PersistGate>
        </Provider>
    );
}

registerRootComponent(App);
