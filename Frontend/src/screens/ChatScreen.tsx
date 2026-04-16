import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8000";

export default function ChatScreen({ onNavigate }: { onNavigate: (screen: any) => void }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const token = useSelector((state: RootState) => state.user.accessToken);

    useEffect(() => { loadOrCreateSession(); }, []);

    const loadOrCreateSession = async () => {
        setIsLoadingHistory(true);
        try {
            const res = await fetch(`${API_URL}/api/v1/chat/sessions`, {
                headers: { "Authorization": `Bearer ${token}` },
            });
            const sessions = await res.json();
            if (sessions && sessions.length > 0) {
                const last = sessions[0];
                setSessionId(last.id);
                const msgs = last.messages || [];
                if (msgs.length > 0) {
                    setMessages(msgs.map((m: any, i: number) => ({ id: m.id?.toString() || i.toString(), role: m.role, text: m.content })));
                } else {
                    setMessages([{ id: "welcome", role: "assistant", text: "Hi! I am Arixa, your AI fitness trainer. Ask me anything about workouts or nutrition!" }]);
                }
            } else {
                await createNewSession();
            }
        } catch (e) {
            await createNewSession();
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const createNewSession = async () => {
        try {
            const res = await fetch(`${API_URL}/api/v1/chat/sessions`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            });
            const data = await res.json();
            setSessionId(data.id);
            setMessages([{ id: "welcome", role: "assistant", text: "Hi! I am Arixa, your AI fitness trainer. Ask me anything about workouts or nutrition!" }]);
        } catch (e) { console.error(e); }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !sessionId) return;
        const userMsg = { id: Date.now().toString(), role: "user", text: inputText.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInputText("");
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/v1/chat/sessions/${sessionId}/messages`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ content: userMsg.text }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: data.content || "Sorry, try again." }]);
        } catch (e) {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", text: "Connection error. Please try again." }]);
        } finally { setIsLoading(false); }
    };

    if (isLoadingHistory) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingScreen}>
                    <ActivityIndicator size="large" color="#B30000" />
                    <Text style={styles.loadingScreenText}>Loading your conversation...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => onNavigate("dashboard")} style={styles.backBtn}>
                    <Text style={styles.backText}>{"< Back"}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Arixa AI Chat</Text>
                <View style={styles.dot} />
            </View>
            <TouchableOpacity style={styles.newChatBtn} onPress={createNewSession}>
                <Text style={styles.newChatText}>+ New Chat</Text>
            </TouchableOpacity>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={i => i.id}
                contentContainerStyle={{ padding: 15 }}
                renderItem={({ item }) => (
                    <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.aiBubble]}>
                        {item.role === "assistant" && <Text style={styles.aiLabel}>Arixa</Text>}
                        <Text style={styles.msgText}>{item.text}</Text>
                    </View>
                )}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
            {isLoading && (
                <View style={styles.loading}>
                    <ActivityIndicator color="#B30000" />
                    <Text style={styles.loadingText}> Arixa is thinking...</Text>
                </View>
            )}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={styles.inputRow}>
                    <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder="Ask Arixa anything..." placeholderTextColor="#666" multiline />
                    <TouchableOpacity style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendDisabled]} onPress={sendMessage} disabled={!inputText.trim() || isLoading}>
                        <Text style={styles.sendText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
    loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
    loadingScreenText: { color: "#fff", marginTop: 10, fontSize: 16 },
    header: { flexDirection: "row", alignItems: "center", padding: 15, borderBottomWidth: 1, borderBottomColor: "#333", marginTop: 30 },
    backBtn: { padding: 10, marginRight: 10 },
    backText: { color: "#B30000", fontSize: 16, fontWeight: "bold" },
    title: { color: "#fff", fontSize: 20, fontWeight: "bold", flex: 1 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#1ABC9C" },
    newChatBtn: { alignSelf: "flex-end", margin: 10, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: "#1a1a1a", borderRadius: 20, borderWidth: 1, borderColor: "#B30000" },
    newChatText: { color: "#B30000", fontSize: 13, fontWeight: "bold" },
    bubble: { padding: 12, borderRadius: 14, marginVertical: 6, maxWidth: "75%" },
    userBubble: { alignSelf: "flex-end", backgroundColor: "#0D0D0D", borderColor: "#B30000", borderWidth: 1.5 },
    aiBubble: { alignSelf: "flex-start", backgroundColor: "#330000" },
    aiLabel: { color: "#B30000", fontSize: 11, fontWeight: "bold", marginBottom: 4 },
    msgText: { color: "#fff", fontSize: 15, lineHeight: 22 },
    loading: { flexDirection: "row", alignItems: "center", padding: 10, marginLeft: 15 },
    loadingText: { color: "#999", fontSize: 14 },
    inputRow: { flexDirection: "row", alignItems: "center", padding: 10, borderTopWidth: 1, borderTopColor: "#333", backgroundColor: "#000" },
    input: { flex: 1, backgroundColor: "#1A1A1A", color: "#fff", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, maxHeight: 100, fontSize: 16 },
    sendBtn: { backgroundColor: "#B30000", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
    sendDisabled: { backgroundColor: "#555" },
    sendText: { color: "#fff", fontWeight: "bold" },
});
