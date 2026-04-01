/**
 * Loader.js — Repairo Moto
 *
 * Three usage modes:
 *
 * 1. Full-screen overlay (blocks UI while loading):
 *    <Loader visible={loading} message="Fetching your bikes..." />
 *
 * 2. Inline / embedded (inside a card or section):
 *    <Loader variant="inline" message="Loading orders..." />
 *
 * 3. Skeleton placeholder (shimmer rows):
 *    <Loader variant="skeleton" rows={4} />
 *
 * Props:
 *   visible    {boolean}  — for overlay mode, controls visibility (default true)
 *   variant    {string}   — 'overlay' | 'inline' | 'skeleton'  (default 'overlay')
 *   message    {string}   — text shown below the logo
 *   rows       {number}   — skeleton row count (default 3)
 *   dimmed     {boolean}  — deprecated, no longer used
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    Image,
    Modal,
    Platform,
    Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';

const { width: W } = Dimensions.get('window');

// ─── Shimmer hook ─────────────────────────────────────────────────────────────
function useShimmer() {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(anim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);
    return anim;
}

// ─── Single skeleton row ──────────────────────────────────────────────────────
function SkeletonRow({ shimmer, isDark, widthFraction = 1, height = 18, style }) {
    const translateX = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-W, W],
    });

    const base = isDark ? '#2A2318' : '#EDE8DC';
    const sheen = isDark ? '#3A3020' : '#F5F0E4';

    return (
        <View
            style={[
                skeletonStyles.row,
                { width: `${widthFraction * 100}%`, height, backgroundColor: base },
                style,
            ]}
        >
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: sheen,
                        opacity: 0.7,
                        transform: [{ translateX }],
                    },
                ]}
            />
        </View>
    );
}

const skeletonStyles = StyleSheet.create({
    row: {
        borderRadius: 8,
        overflow: 'hidden',
    },
});

// ─── Skeleton variant ─────────────────────────────────────────────────────────
function SkeletonLoader({ rows = 3, isDark, theme }) {
    const shimmer = useShimmer();

    return (
        <View style={[skelStyles.wrap, { backgroundColor: theme.colors.background }]}>
            {/* Avatar + title row */}
            <View style={skelStyles.headerRow}>
                <View style={[skelStyles.circle, { backgroundColor: isDark ? '#2A2318' : '#EDE8DC', overflow: 'hidden' }]}>
                    <Animated.View
                        style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#3A3020' : '#F5F0E4', opacity: 0.7, transform: [{ translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] }) }] }]}
                    />
                </View>
                <View style={skelStyles.headerText}>
                    <SkeletonRow shimmer={shimmer} isDark={isDark} widthFraction={0.55} height={16} />
                    <SkeletonRow shimmer={shimmer} isDark={isDark} widthFraction={0.38} height={12} style={{ marginTop: 8 }} />
                </View>
            </View>

            {/* Content rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonRow
                    key={i}
                    shimmer={shimmer}
                    isDark={isDark}
                    widthFraction={i % 3 === 2 ? 0.65 : 1}
                    height={14}
                    style={{ marginTop: i === 0 ? 20 : 12 }}
                />
            ))}

            {/* Card block */}
            <SkeletonRow shimmer={shimmer} isDark={isDark} widthFraction={1} height={80} style={{ marginTop: 20, borderRadius: 14 }} />
        </View>
    );
}

const skelStyles = StyleSheet.create({
    wrap: { padding: 20, borderRadius: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    circle: { width: 50, height: 50, borderRadius: 25 },
    headerText: { flex: 1, gap: 0 },
});

// ─── Logo spinner core (no pulse animations) ──────────────────────────────────
function LogoSpinner({ theme, isDark, size = 'md' }) {
    const LOGO_SIZE = size === 'sm' ? 38 : 56;
    const RING1_SIZE = size === 'sm' ? 76 : 110;
    const RING2_SIZE = size === 'sm' ? 100 : 142;
    const DOT_SIZE = size === 'sm' ? 6 : 9;

    // Outer ring spin
    const ring1Rot = useRef(new Animated.Value(0)).current;
    // Inner ring counter-spin
    const ring2Rot = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Ring 1 — clockwise, 1.4s
        Animated.loop(
            Animated.timing(ring1Rot, {
                toValue: 1,
                duration: 1400,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // Ring 2 — counter-clockwise, 2.2s
        Animated.loop(
            Animated.timing(ring2Rot, {
                toValue: -1,
                duration: 2200,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const ring1Interpolate = ring1Rot.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });
    // Fixed interpolation for decreasing value
    const ring2Interpolate = ring2Rot.interpolate({
        inputRange: [-1, 0],
        outputRange: ['-360deg', '0deg'],
    });

    return (
        <View style={{ width: RING2_SIZE, height: RING2_SIZE, alignItems: 'center', justifyContent: 'center' }}>

            {/* Outer orbit ring with dot */}
            <Animated.View
                style={{
                    position: 'absolute',
                    width: RING2_SIZE,
                    height: RING2_SIZE,
                    borderRadius: RING2_SIZE / 2,
                    borderWidth: 1.5,
                    borderColor: theme.colors.primary,
                    borderStyle: 'dashed',
                    opacity: 0.35,
                    transform: [{ rotate: ring1Interpolate }],
                }}
            />

            {/* Outer orbit dot */}
            <Animated.View
                style={{
                    position: 'absolute',
                    width: RING2_SIZE,
                    height: RING2_SIZE,
                    transform: [{ rotate: ring1Interpolate }],
                }}
            >
                <View
                    style={{
                        position: 'absolute',
                        top: -DOT_SIZE / 2,
                        left: RING2_SIZE / 2 - DOT_SIZE / 2,
                        width: DOT_SIZE,
                        height: DOT_SIZE,
                        borderRadius: DOT_SIZE / 2,
                        backgroundColor: theme.colors.primary,
                    }}
                />
            </Animated.View>

            {/* Inner ring solid arc */}
            <Animated.View
                style={{
                    position: 'absolute',
                    width: RING1_SIZE,
                    height: RING1_SIZE,
                    borderRadius: RING1_SIZE / 2,
                    borderWidth: 2.5,
                    borderColor: 'transparent',
                    borderTopColor: theme.colors.primary,
                    borderRightColor: theme.colors.primary,
                    transform: [{ rotate: ring2Interpolate }],
                }}
            />

            {/* Inner ring trailing arc (faint) */}
            <Animated.View
                style={{
                    position: 'absolute',
                    width: RING1_SIZE,
                    height: RING1_SIZE,
                    borderRadius: RING1_SIZE / 2,
                    borderWidth: 1.5,
                    borderColor: 'transparent',
                    borderBottomColor: theme.colors.primary,
                    opacity: 0.3,
                    transform: [{ rotate: ring2Interpolate }],
                }}
            />

            {/* Logo tile (static, no pulse) */}
            <View
                style={[
                    logoSpinStyles.tile,
                    {
                        width: LOGO_SIZE,
                        height: LOGO_SIZE,
                        borderRadius: LOGO_SIZE * 0.30,
                        backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                        borderColor: theme.colors.border,
                        shadowColor: theme.colors.primary,
                    },
                ]}
            >
                <Image
                    source={require('../../assets/logo/logo300.png')}
                    style={{ width: LOGO_SIZE * 0.70, height: LOGO_SIZE * 0.70, tintColor: theme.colors.primary }}
                    resizeMode="contain"
                />
            </View>
        </View>
    );
}

const logoSpinStyles = StyleSheet.create({
    tile: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
});

// ─── Inline variant ───────────────────────────────────────────────────────────
function InlineLoader({ message, theme, isDark }) {
    const fadeIn = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View style={[inlineStyles.wrap, { opacity: fadeIn }]}>
            <LogoSpinner theme={theme} isDark={isDark} size="sm" />
            {!!message && (
                <Text style={[inlineStyles.msg, { color: theme.colors.textMuted }]}>{message}</Text>
            )}
        </Animated.View>
    );
}

const inlineStyles = StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 18 },
    msg: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
});

// ─── Overlay loader card (no background backdrop) ─────────────────────────────
function OverlayCard({ message, theme, isDark }) {
    const scale = useRef(new Animated.Value(0.82)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
    }, []);

    // Dots animation
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dot3 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const dotAnim = (dot, delay) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay(600),
                ])
            ).start();
        dotAnim(dot1, 0);
        dotAnim(dot2, 200);
        dotAnim(dot3, 400);
    }, []);

    const dotStyle = (dot) => ({
        width: 5, height: 5, borderRadius: 3,
        backgroundColor: theme.colors.primary,
        opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
    });

    return (
        <Animated.View
            style={[
                overlayStyles.card,
                {
                    backgroundColor: isDark ? 'rgba(28,22,16,0.97)' : 'rgba(255,252,245,0.97)',
                    borderColor: theme.colors.border,
                    transform: [{ scale }],
                    opacity,
                    shadowColor: theme.colors.primary,
                },
            ]}
        >
            <LogoSpinner theme={theme} isDark={isDark} size="md" />

            <View style={overlayStyles.bottomRow}>
                {!!message ? (
                    <Text style={[overlayStyles.msg, { color: theme.colors.textSecondary }]}>
                        {message}
                    </Text>
                ) : (
                    <Text style={[overlayStyles.msg, { color: theme.colors.textSecondary }]}>
                        Loading
                    </Text>
                )}
                {/* Bouncing dots */}
                <View style={overlayStyles.dots}>
                    <Animated.View style={dotStyle(dot1)} />
                    <Animated.View style={dotStyle(dot2)} />
                    <Animated.View style={dotStyle(dot3)} />
                </View>
            </View>
        </Animated.View>
    );
}

const overlayStyles = StyleSheet.create({
    card: {
        borderRadius: 28,
        paddingVertical: 36,
        paddingHorizontal: 40,
        alignItems: 'center',
        gap: 24,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 40,
        elevation: 20,
        minWidth: 220,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    msg: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
    },
    dots: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'flex-end',
        paddingBottom: 2,
    },
});

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Loader({
    visible = true,
    variant = 'overlay',   // 'overlay' | 'inline' | 'skeleton'
    message = '',
    rows = 3,
    dimmed = true,        // kept for compatibility, no effect
}) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    // ── Skeleton ──────────────────────────────────────────────────────────────
    if (variant === 'skeleton') {
        return <SkeletonLoader rows={rows} isDark={isDark} theme={theme} />;
    }

    // ── Inline ────────────────────────────────────────────────────────────────
    if (variant === 'inline') {
        return <InlineLoader message={message} theme={theme} isDark={isDark} />;
    }

    // ── Overlay (default) – with transparent background ──────────────────────
    if (!visible) return null;

    return (
        <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
            <View style={modalStyles.backdrop}>
                <OverlayCard message={message} theme={theme} isDark={isDark} />
            </View>
        </Modal>
    );
}

const modalStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent', // No background overlay
    },
});