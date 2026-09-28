// src/screens/closed/ShopClosedScreen.js
//
// Full-screen overlay shown while the admin has closed the shop (festival, event,
// holiday...). Title, message and emoji are all admin-customisable. It sits on top
// of the app (the navigator stays mounted underneath so nothing is lost when the
// shop reopens) and swallows every touch and the Android back button.

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    BackHandler,
    Platform,
    ScrollView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';

const formatReopen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).toUpperCase();
    return `${date} · ${time}`;
};

export default function ShopClosedScreen({ status, onRetry, checking }) {
    const insets = useSafeAreaInsets();
    const mode = useSelector((s) => s.theme?.mode ?? 'light');
    const isDark = mode === 'dark';
    const theme = isDark ? DarkTheme : LightTheme;
    const C = theme.colors;

    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.92)).current;
    const float = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
        ]).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(float, { toValue: -8, duration: 1400, useNativeDriver: true }),
                Animated.timing(float, { toValue: 0, duration: 1400, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Android: the back button must not reveal the app underneath — leave the app instead.
    useEffect(() => {
        if (Platform.OS !== 'android') return undefined;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            BackHandler.exitApp();
            return true;
        });
        return () => sub.remove();
    }, []);

    const reopen = formatReopen(status?.reopenAt);
    const phone = (status?.contactNo || '').replace(/[^\d+]/g, '');

    return (
        <View style={[styles.root, { backgroundColor: C.background }]} pointerEvents="auto">
            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
                    <Animated.View
                        style={[
                            styles.emojiWrap,
                            { backgroundColor: isDark ? '#2E2618' : '#FDECC8', borderColor: C.primary, transform: [{ translateY: float }] },
                        ]}
                    >
                        <Text style={styles.emoji}>{status?.emoji || '🛠️'}</Text>
                    </Animated.View>

                    <Text style={[styles.title, { color: C.textPrimary }]}>{status?.title || "We'll be back soon"}</Text>
                    <Text style={[styles.message, { color: C.textSecondary }]}>
                        {status?.message || 'Sorry for the inconvenience. We are currently closed and will be back shortly.'}
                    </Text>

                    {!!reopen && (
                        <View style={[styles.reopen, { backgroundColor: `${C.primary}22`, borderColor: C.primary }]}>
                            <Ionicons name="time-outline" size={16} color={C.primary} />
                            <Text style={[styles.reopenText, { color: C.textPrimary }]}>We reopen on {reopen}</Text>
                        </View>
                    )}

                    <View style={styles.actions}>
                        {!!phone && (
                            <TouchableOpacity
                                onPress={() => Linking.openURL(`tel:${phone}`)}
                                activeOpacity={0.85}
                                style={[styles.btn, { backgroundColor: C.primary }]}
                            >
                                <Ionicons name="call-outline" size={18} color="#1a1a1a" />
                                <Text style={[styles.btnText, { color: '#1a1a1a' }]}>Call us</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={onRetry}
                            disabled={checking}
                            activeOpacity={0.85}
                            style={[styles.btn, styles.btnGhost, { borderColor: C.border, backgroundColor: C.surface }]}
                        >
                            {checking
                                ? <ActivityIndicator size="small" color={C.primary} />
                                : <Ionicons name="refresh-outline" size={18} color={C.textPrimary} />}
                            <Text style={[styles.btnText, { color: C.textPrimary }]}>{checking ? 'Checking…' : 'Check again'}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.brand, { color: C.textMuted }]}>REPAIRO MOTO</Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999 },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28 },
    content: { alignItems: 'center', gap: 14 },
    emojiWrap: { width: 128, height: 128, borderRadius: 64, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emoji: { fontSize: 62 },
    title: { fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
    message: { fontSize: 15.5, lineHeight: 23, textAlign: 'center', maxWidth: 340 },
    reopen: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
    reopenText: { fontSize: 13.5, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: 12, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16, minWidth: 140 },
    btnGhost: { borderWidth: 1 },
    btnText: { fontSize: 14.5, fontWeight: '800' },
    brand: { fontSize: 11, fontWeight: '900', letterSpacing: 3, marginTop: 28 },
});
