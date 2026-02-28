import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';

const Tab = createBottomTabNavigator();

interface MainTabNavigatorProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings' | 'formAnalysis' | 'workoutSchedule' | 'progress' | 'chat') => void;
}

export default function MainTabNavigator({ onNavigate }: MainTabNavigatorProps) {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#FFFFFF',
                tabBarInactiveTintColor: '#CCCCCC',
                tabBarStyle: {
                    backgroundColor: '#8B2F3F',
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                    display: 'none',
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="HomeDashboard"
                options={{
                    tabBarLabel: 'Home Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            >
                {() => <DashboardScreen onNavigate={onNavigate} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
}
