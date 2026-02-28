import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DisplayProps {
    onNavigate: (screen: 'display' | 'signin' | 'signup' | 'dashboard' | 'gender' | 'verification' | 'personalinfo' | 'fitnessgoal' | 'settings' | 'authSelection') => void;
}

export default function DisplayScreen({ onNavigate }: DisplayProps) {
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
            <Text style={styles.heading}>Athletix</Text>
            <Text style={styles.subtitle}>A Fitness Intelligence Technology</Text>
            <TouchableOpacity style={styles.button} onPress={() => onNavigate('authSelection')}>
                <Text style={styles.buttonText}>Start Now</Text>
            </TouchableOpacity>
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
        elevation: 10, // For Android
    },
    heading: {
        position: 'absolute',
        width: 135,
        height: 43,
        top: 373,
        left: 139,
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 32,
        lineHeight: 32, // 100%
        letterSpacing: 0,
        color: '#FFFFFF',
    },
    subtitle: {
        position: 'absolute',
        width: 294,
        height: 21,
        top: 426,
        left: 67,
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 16,
        lineHeight: 16, // 100%
        letterSpacing: 0,
        color: '#FFFFFF',
    },
    button: {
        position: 'absolute',
        width: 249,
        height: 68,
        top: 713,
        left: 82,
        backgroundColor: '#000000',
        borderRadius: 34, // Circle edges (half of height)
        borderWidth: 1,
        borderColor: '#FFFFFF', // Assuming white border since text is white and bg is black
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 20, // Estimated font size
        color: '#FFFFFF',
    },
});
