import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ChatScreenProps {
    onNavigate: (screen: 'dashboard') => void;
}

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
}

export default function ChatScreen({ onNavigate }: ChatScreenProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

    useEffect(() => {
        // Scroll to bottom when messages change
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!inputText.trim()) return;
        if (!apiKey) {
            alert('Please set EXPO_PUBLIC_OPENAI_API_KEY in your .env file');
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const conversationHistory = messages.map((msg) => ({
                role: msg.role,
                content: msg.text,
            }));

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are Arixa, an AI fitness trainer.' },
                        ...conversationHistory,
                        { role: 'user', content: userMessage.text },
                    ],
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const aiResponse = data.choices[0].message.content;

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: aiResponse,
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                text: 'Sorry, I encountered an error. Please try again.',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        if (item.role === 'system') return null;

        const isUser = item.role === 'user';
        return (
            <View
                style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.aiBubble,
                ]}
            >
                <Text style={styles.messageText}>{item.text}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => onNavigate('dashboard')} style={styles.backButton}>
                    <Text style={styles.backButtonText}>{'< Back'}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Arixa AI Chat</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                style={styles.list}
            />

            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#B30000" />
                    <Text style={styles.loadingText}>Arixa is typing...</Text>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Ask Arixa anything..."
                        placeholderTextColor="#666"
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!inputText.trim() || isLoading}
                    >
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        marginTop: 30,
    },
    backButton: {
        padding: 10,
        marginRight: 10,
    },
    backButtonText: {
        color: '#B30000',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Inter',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: 'Inter',
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 15,
        paddingBottom: 20,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 14,
        marginVertical: 6,
        maxWidth: '75%',
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#0D0D0D',
        borderColor: '#B30000',
        borderWidth: 1.5,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#330000',
    },
    messageText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        marginLeft: 15,
    },
    loadingText: {
        color: '#999',
        marginLeft: 10,
        fontSize: 14,
        fontFamily: 'Inter',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#000',
    },
    input: {
        flex: 1,
        backgroundColor: '#1A1A1A',
        color: '#FFFFFF',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        maxHeight: 100,
        fontFamily: 'Inter',
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: '#B30000',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    sendButtonDisabled: {
        backgroundColor: '#555',
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontFamily: 'Inter',
    },
});
