// screens/support/ChatSupportScreen.js

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
    Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import useChat from '../../hooks/useChat';

const QUICK_REPLIES = [
    { id: 'q1', label: '🔧 Job not done properly' },
    { id: 'q2', label: '💰 Billing issue' },
    { id: 'q3', label: '⏰ Mechanic was late' },
    { id: 'q4', label: '📦 Part quality concern' },
    { id: 'q5', label: '⭐ Leave a review request' },
    { id: 'q6', label: '📄 Need invoice copy' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
}
function formatDateLabel(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Date separator ───────────────────────────────────────────────────────────
const DateSeparator = ({ label, theme }) => (
    <View style={styles.dateSepRow}>
        <View style={[styles.dateSepLine, { backgroundColor: theme.colors.border }]} />
        <Text style={[styles.dateSepText, { color: theme.colors.textMuted }]}>{label}</Text>
        <View style={[styles.dateSepLine, { backgroundColor: theme.colors.border }]} />
    </View>
);

// ─── Message bubble ───────────────────────────────────────────────────────────
const MessageBubble = React.memo(({ msg, theme, isDark }) => {
    const isUser = msg.senderType === 'user';
    const isPending = !!msg._pending;
    const isFailed = !!msg._failed;

    const slideX = useRef(new Animated.Value(isUser ? 18 : -18)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideX, { toValue: 0, speed: 22, bounciness: 4, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    }, []);

    const bubbleBg = isUser ? theme.colors.primary : (isDark ? '#2E2618' : '#FFF4E0');
    const textColor = isUser ? '#1a1a1a' : theme.colors.textPrimary;

    return (
        <Animated.View
            style={[
                styles.bubbleRow,
                isUser ? styles.bubbleRowUser : styles.bubbleRowBot,
                { opacity, transform: [{ translateX: slideX }] },
            ]}
        >
            {!isUser && (
                <View style={[styles.botAvatar, { backgroundColor: `${theme.colors.primary}22` }]}>
                    <Ionicons name="headset" size={13} color={theme.colors.primary} />
                </View>
            )}
            <View style={[styles.bubbleCol, isUser && { alignItems: 'flex-end' }]}>
                <View
                    style={[
                        styles.bubble,
                        isUser ? styles.bubbleUser : styles.bubbleBot,
                        { backgroundColor: bubbleBg },
                        !isUser && { borderColor: theme.colors.border, borderWidth: 1 },
                        isFailed && { opacity: 0.5 },
                    ]}
                >
                    <Text style={[styles.bubbleText, { color: textColor }]}>
                        {msg.message}
                    </Text>
                </View>
                <View style={[styles.tsRow, isUser && { flexDirection: 'row-reverse' }]}>
                    <Text style={[styles.tsText, { color: theme.colors.textMuted }]}>
                        {formatTime(msg.createdAt)}
                    </Text>
                    {isUser && (
                        <Ionicons
                            name={
                                isFailed ? 'alert-circle' :
                                    isPending ? 'time-outline' :
                                        msg.isRead ? 'checkmark-done' : 'checkmark'
                            }
                            size={12}
                            color={
                                isFailed ? theme.colors.error :
                                    msg.isRead ? '#5B9CF6' :
                                        theme.colors.textMuted
                            }
                        />
                    )}
                    {isFailed && (
                        <Text style={[styles.failedText, { color: theme.colors.error }]}>
                            Failed
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
});

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ theme, isDark }) {
    const d1 = useRef(new Animated.Value(0)).current;
    const d2 = useRef(new Animated.Value(0)).current;
    const d3 = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const a = (d, delay) => Animated.loop(Animated.sequence([
            Animated.delay(delay),
            Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
            Animated.delay(560),
        ])).start();
        a(d1, 0); a(d2, 160); a(d3, 320);
    }, []);
    const dot = (d) => ({
        width: 7, height: 7, borderRadius: 4,
        backgroundColor: theme.colors.primary,
        opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
    });
    return (
        <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
            <View style={[styles.botAvatar, { backgroundColor: `${theme.colors.primary}22` }]}>
                <Ionicons name="headset" size={13} color={theme.colors.primary} />
            </View>
            <View style={[styles.bubble, styles.bubbleBot, {
                backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                borderColor: theme.colors.border, borderWidth: 1,
                paddingVertical: 14, paddingHorizontal: 18,
            }]}>
                <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                    <Animated.View style={dot(d1)} />
                    <Animated.View style={dot(d2)} />
                    <Animated.View style={dot(d3)} />
                </View>
            </View>
        </View>
    );
}

// ─── Connection banner ────────────────────────────────────────────────────────
function ConnectionBanner({ connected, error, theme }) {
    if (connected) return null;
    const color = error ? theme.colors.error : theme.colors.warning;
    return (
        <View style={[styles.connBanner, { backgroundColor: `${color}18` }]}>
            <ActivityIndicator size={10} color={color} />
            <Text style={[styles.connText, { color }]}>
                {error ?? 'Connecting to chat…'}
            </Text>
        </View>
    );
}

// ─── Order pill ───────────────────────────────────────────────────────────────
function OrderPill({ order, theme, isDark }) {
    const orderId = order?._id ? `#${String(order._id).slice(-6).toUpperCase()}` : '';
    const serviceLabel = order?.serviceType || order?.service?.name || order?.serviceName || 'Service';
    const bikeLabel = order?.bike
        ? `${order.bike.brand ?? ''} ${order.bike.model ?? ''}`.trim()
        : order?.bikeName ?? '';
    return (
        <View style={[styles.orderPill, {
            backgroundColor: isDark ? '#231E14' : '#FFF8EC',
            borderColor: theme.colors.border,
        }]}>
            <View style={[styles.orderPillIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="construct-outline" size={12} color={theme.colors.primary} />
            </View>
            <Text style={[styles.orderPillId, { color: theme.colors.primary }]}>{orderId}</Text>
            <View style={[styles.dot, { backgroundColor: theme.colors.textMuted }]} />
            <Text style={[styles.orderPillService, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {serviceLabel}
            </Text>
            {bikeLabel ? (
                <>
                    <View style={[styles.dot, { backgroundColor: theme.colors.textMuted }]} />
                    <MaterialCommunityIcons name="bicycle" size={11} color={theme.colors.textMuted} />
                    <Text style={[styles.orderPillBike, { color: theme.colors.textMuted }]} numberOfLines={1}>
                        {bikeLabel}
                    </Text>
                </>
            ) : null}
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatSupportScreen({ route, navigation }) {
    const order = route?.params?.order ?? {};
    const orderId = order?._id ?? null;

    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const {
        messages, loading, sending, connected,
        error, adminTyping, hasMore,
        sendMessage, sendTyping, loadMore,
    } = useChat(orderId);

    const [inputText, setInputText] = useState('');
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    const [inputHeight, setInputHeight] = useState(0);  // tracks real TextInput height

    const listRef = useRef(null);
    const inputRef = useRef(null);

    // ── Keyboard listeners — scroll to bottom when keyboard opens ─────────────
    useEffect(() => {
        const show = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                // Small delay lets KeyboardAvoidingView finish its layout shift
                setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
            }
        );
        return () => show.remove();
    }, []);

    // Hide chips once user sends a message
    useEffect(() => {
        if (messages.some((m) => m.senderType === 'user')) setShowQuickReplies(false);
    }, [messages]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }, []);

    useEffect(() => {
        if (!loading) scrollToBottom();
    }, [messages.length, adminTyping, loading]);

    // ── Typing debounce ───────────────────────────────────────────────────────
    const typingTimer = useRef(null);
    const handleTextChange = useCallback((text) => {
        setInputText(text);
        sendTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => sendTyping(false), 2000);
    }, [sendTyping]);

    // ── Send ──────────────────────────────────────────────────────────────────
    const handleSend = useCallback(() => {
        const trimmed = inputText.trim();
        if (!trimmed) return;
        sendTyping(false);
        sendMessage(trimmed);
        setInputText('');
        setShowQuickReplies(false);
        // Keep keyboard open after send
        inputRef.current?.focus();
    }, [inputText, sendMessage, sendTyping]);

    const handleQuickReply = useCallback((text) => {
        sendMessage(text);
        setShowQuickReplies(false);
    }, [sendMessage]);

    // ── List data with date separators ────────────────────────────────────────
    const listData = useMemo(() => {
        const items = [];
        let lastLabel = null;
        for (const msg of messages) {
            const label = formatDateLabel(msg.createdAt);
            if (label !== lastLabel) {
                items.push({ type: 'date', id: `date_${msg._id ?? msg.createdAt}`, label });
                lastLabel = label;
            }
            items.push({ type: 'msg', ...msg });
        }
        if (adminTyping) items.push({ type: 'typing', id: 'typing_indicator' });
        return items;
    }, [messages, adminTyping]);

    const renderItem = useCallback(({ item }) => {
        if (item.type === 'date') return <DateSeparator label={item.label} theme={theme} />;
        if (item.type === 'typing') return <TypingIndicator theme={theme} isDark={isDark} />;
        return <MessageBubble msg={item} theme={theme} isDark={isDark} />;
    }, [theme, isDark]);

    const canSend = inputText.trim().length > 0 && !sending;

    // ── Header entrance animation ─────────────────────────────────────────────
    const headerTY = useRef(new Animated.Value(-10)).current;
    const headerOpacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.spring(headerTY, { toValue: 0, speed: 20, bounciness: 3, useNativeDriver: true }),
            Animated.timing(headerOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        // ── Root: flex:1, background ─────────────────────────────────────────
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

            {/* ── Fixed header (above KAV) ──────────────────────────────────── */}
            <Animated.View style={[styles.header, {
                paddingTop: insets.top + 8,
                backgroundColor: theme.colors.background,
                borderBottomColor: theme.colors.border,
                opacity: headerOpacity,
                transform: [{ translateY: headerTY }],
            }]}>
                <TouchableOpacity
                    style={[styles.backBtn, {
                        backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                        borderColor: theme.colors.border,
                    }]}
                    onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.72}
                >
                    <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={[styles.supportAvatar, { backgroundColor: `${theme.colors.primary}22` }]}>
                        <Ionicons name="headset" size={18} color={theme.colors.primary} />
                        <View style={[styles.onlineDot, {
                            backgroundColor: connected ? '#2ECC9A' : theme.colors.textMuted,
                            borderColor: theme.colors.background,
                        }]} />
                    </View>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                            Repairo Support
                        </Text>
                        <Text style={[styles.headerSub, {
                            color: connected ? '#2ECC9A' : theme.colors.textMuted,
                        }]}>
                            {adminTyping ? 'Typing…' : connected ? 'Online · Replies in ~2 hrs' : 'Connecting…'}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            {/* ── Connection banner ─────────────────────────────────────────── */}
            <ConnectionBanner connected={connected} error={error} theme={theme} />

            {/* ── Order pill ────────────────────────────────────────────────── */}
            <OrderPill order={order} theme={theme} isDark={isDark} />

            {/* ── KAV wraps ONLY the scrollable list + input bar ────────────── */}
            {/*                                                                  */}
            {/*  iOS  → behavior="padding"  KAV shrinks its own height          */}
            {/*  Android → behavior="height" or nothing; we rely on             */}
            {/*            android:windowSoftInputMode="adjustResize" instead    */}
            {/*                                                                  */}
            <KeyboardAvoidingView
                style={styles.kavFlex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                // keyboardVerticalOffset accounts for the header + pill that sit
                // OUTSIDE the KAV.  Approximate combined height:
                //   header ≈ insets.top + 8 + 40 + 12  (paddingTop+paddingBottom+title)
                //   connBanner ≈ 0 (hidden when connected)
                //   orderPill ≈ 40
                // We compute it dynamically so it stays accurate on all devices.
                keyboardVerticalOffset={
                    Platform.OS === 'ios'
                        ? insets.top + 8 + 52 + 40   // header + pill
                        : 0
                }
            >
                {/* ── Message list ─────────────────────────────────────────── */}
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                            Loading messages…
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={listData}
                        keyExtractor={(item) => String(item._id ?? item.id)}
                        renderItem={renderItem}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyWrap}>
                                <View style={[styles.emptyIcon, { backgroundColor: `${theme.colors.primary}18` }]}>
                                    <Ionicons name="chatbubbles-outline" size={34} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                                    Start the conversation
                                </Text>
                                <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                                    Describe your concern and our support team will respond shortly.
                                </Text>
                            </View>
                        )}
                        contentContainerStyle={[
                            styles.listContent,
                            listData.length === 0 && styles.listEmpty,
                        ]}
                        // Keeps content pinned to bottom naturally
                        contentInsetAdjustmentBehavior="never"
                        showsVerticalScrollIndicator={false}
                        // Re-scroll when content grows (new message / keyboard)
                        onContentSizeChange={scrollToBottom}
                        onScrollBeginDrag={({ nativeEvent }) => {
                            if (nativeEvent.contentOffset.y < 40 && hasMore) loadMore();
                        }}
                        // Dismiss keyboard on drag (feels natural in chat)
                        keyboardDismissMode="interactive"
                        keyboardShouldPersistTaps="handled"
                    />
                )}

                {/* ── Quick-reply chips ─────────────────────────────────────── */}
                {showQuickReplies && !loading && (
                    <View style={[styles.qrWrap, { borderTopColor: theme.colors.border }]}>
                        <Text style={[styles.qrLabel, { color: theme.colors.textMuted }]}>
                            QUICK OPTIONS
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.qrScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            {QUICK_REPLIES.map((qr) => (
                                <TouchableOpacity
                                    key={qr.id}
                                    style={[styles.chip, {
                                        backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                                        borderColor: theme.colors.primary,
                                    }]}
                                    onPress={() => handleQuickReply(qr.label)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.chipText, { color: theme.colors.primary }]}>
                                        {qr.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* ── Input bar ─────────────────────────────────────────────── */}
                <View style={[styles.inputBar, {
                    backgroundColor: theme.colors.background,
                    borderTopColor: theme.colors.border,
                    // Safe area bottom only when keyboard is NOT up
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
                }]}>
                    {/* Multi-line input */}
                    <View style={[styles.inputWrap, {
                        backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                        borderColor: canSend ? theme.colors.primary : theme.colors.border,
                    }]}>
                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: theme.colors.textPrimary }]}
                            placeholder="Type your message…"
                            placeholderTextColor={theme.colors.textMuted}
                            value={inputText}
                            onChangeText={handleTextChange}
                            multiline
                            maxLength={500}
                            // Let the input grow naturally, capped via maxHeight on inputWrap
                            onContentSizeChange={(e) => {
                                setInputHeight(e.nativeEvent.contentSize.height);
                            }}
                            // Never steal keyboard dismiss — the FlatList handles that
                            blurOnSubmit={false}
                            // On Android, Enter key can send
                            onSubmitEditing={Platform.OS === 'android' ? handleSend : undefined}
                            returnKeyType={Platform.OS === 'android' ? 'send' : 'default'}
                            textAlignVertical="center"
                            scrollEnabled={inputHeight > 80}
                        />
                    </View>

                    {/* Send button */}
                    <TouchableOpacity
                        style={[styles.sendBtn, {
                            backgroundColor: canSend
                                ? theme.colors.primary
                                : isDark ? '#2E2618' : '#F0E8D0',
                        }]}
                        onPress={handleSend}
                        activeOpacity={0.8}
                        disabled={!canSend}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Ionicons
                                name="send"
                                size={18}
                                color={canSend ? '#1a1a1a' : theme.colors.textMuted}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1 },
    kavFlex: { flex: 1 },   // KAV fills remaining space after header + pill

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 10, zIndex: 10,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    supportAvatar: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    onlineDot: {
        position: 'absolute', bottom: 0, right: 0,
        width: 11, height: 11, borderRadius: 6, borderWidth: 2,
    },
    headerTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
    headerSub: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },

    // Connection banner
    connBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 6,
    },
    connText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

    // Order pill
    orderPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        marginHorizontal: 14, marginVertical: 8,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, borderWidth: 1,
    },
    orderPillIcon: {
        width: 22, height: 22, borderRadius: 7,
        alignItems: 'center', justifyContent: 'center',
    },
    orderPillId: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
    orderPillService: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
    orderPillBike: { fontSize: 11, fontWeight: '500', flexShrink: 1 },
    dot: { width: 3, height: 3, borderRadius: 2, opacity: 0.5 },

    // List
    listContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
    listEmpty: { flex: 1 },

    // Empty state
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    emptyIcon: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
    emptySub: { fontSize: 13, lineHeight: 20, textAlign: 'center' },

    // Loading
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },

    // Date separator
    dateSepRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
    dateSepLine: { flex: 1, height: StyleSheet.hairlineWidth },
    dateSepText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },

    // Bubbles
    bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6, gap: 7 },
    bubbleRowUser: { flexDirection: 'row-reverse' },
    bubbleRowBot: { flexDirection: 'row' },
    bubbleCol: { maxWidth: '78%', gap: 3 },
    botAvatar: {
        width: 27, height: 27, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4, flexShrink: 0,
    },
    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    bubbleUser: { borderBottomRightRadius: 4 },
    bubbleBot: { borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 14, lineHeight: 21 },
    tsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tsText: { fontSize: 10, fontWeight: '500' },
    failedText: { fontSize: 10, fontWeight: '700' },

    // Quick replies
    qrWrap: { paddingTop: 10, paddingBottom: 6, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
    qrLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 14 },
    qrScroll: { paddingHorizontal: 14, gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 12, fontWeight: '700' },

    // Input bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        paddingHorizontal: 14,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    inputWrap: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1.5,   // slightly thicker — easier to spot focus
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 10 : 7,
        maxHeight: 120,     // ~5 lines before scrolling inside the input
        justifyContent: 'center',
    },
    input: {
        fontSize: 14,
        lineHeight: 20,
        // Android needs explicit minHeight so single-line isn't too short
        minHeight: Platform.OS === 'android' ? 36 : undefined,
        padding: 0,         // remove Android default inner padding
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        // Align button with bottom of the input even when input is tall
        marginBottom: Platform.OS === 'ios' ? 0 : 2,
    },
});