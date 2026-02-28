import { useAuth, useUser } from '@clerk/clerk-expo';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingsScreenProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings') => void;
}

export default function SettingsScreen({ onNavigate }: SettingsScreenProps) {
    const { signOut } = useAuth();
    const { user } = useUser();

    const handleLogout = async () => {
        Alert.alert(
            'Confirm Logout',
            'Are you sure you want to log out? This will sign you out of your account.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            onNavigate('display');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to log out. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    // TODO: These values should come from stored user data
    // For now, showing placeholder data
    const userData = {
        name: user?.firstName || 'User',
        email: user?.emailAddresses[0]?.emailAddress || 'email@example.com',
        gender: 'Male', // TODO: Get from stored data
        age: '25', // TODO: Get from stored data
        height: '175', // TODO: Get from stored data
        weight: '70', // TODO: Get from stored data
        fitnessGoal: 'Build Muscle' // TODO: Get from stored data
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('dashboard')}>
                        <Text style={styles.backButtonText}>{'<'}</Text>
                    </TouchableOpacity>

                    <View style={styles.contentContainer}>
                        <Text style={styles.title}>Settings</Text>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Account Information</Text>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Name</Text>
                                <Text style={styles.value}>{userData.name}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Email</Text>
                                <Text style={styles.value}>{userData.email}</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Personal Details</Text>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Gender</Text>
                                <Text style={styles.value}>{userData.gender}</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Age</Text>
                                <Text style={styles.value}>{userData.age} years</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Height</Text>
                                <Text style={styles.value}>{userData.height} cm</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Weight</Text>
                                <Text style={styles.value}>{userData.weight} kg</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Fitness</Text>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Fitness Goal</Text>
                                <Text style={styles.value}>{userData.fitnessGoal}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Text style={styles.logoutButtonText}>Log Out</Text>
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
        backgroundColor: '#511820',
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
        marginBottom: 30,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginBottom: 15,
        opacity: 0.9,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    label: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    value: {
        fontSize: 16,
        color: '#CCCCCC',
    },
    logoutButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#D32F2F',
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
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
