/**
 * LoginForm.js
 * Repairo Moto — Reusable auth form
 *
 * Optional peer deps:
 *   expo-linear-gradient  → npx expo install expo-linear-gradient
 *   @expo/vector-icons    → included with Expo SDK (no install)
 *
 * Both are gracefully handled — app works without them.
 */

import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Platform,
    Keyboard,
    useColorScheme,
} from 'react-native';
import { LightTheme, DarkTheme } from '../../styles/Theme';

// ─── Optional: expo-linear-gradient ──────────────────────────────────────────
let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) { }

// ─── Optional: @expo/vector-icons ────────────────────────────────────────────
let MaterialIcons = null;
try { MaterialIcons = require('@expo/vector-icons').MaterialIcons; } catch (_) { }

// ─── Icon wrapper (falls back to unicode symbols) ─────────────────────────────
function Icon({ name, size = 20, color, style }) {
    if (MaterialIcons) {
        return <MaterialIcons name={name} size={size} color={color} style={style} />;
    }
    const glyphs = {
        person: '⊙',
        lock: '⊛',
        visibility: '◉',
        'visibility-off': '◎',
        'arrow-forward': '→',
        fingerprint: '⌘',
    };
    return (
        <Text
            style={[
                { fontSize: size * 0.82, color, lineHeight: size + 2, includeFontPadding: false },
                style,
            ]}
        >
            {glyphs[name] ?? '·'}
        </Text>
    );
}

// ─── Single input row ──────────────────────────────────────────────────────────
function InputShell({ focused, isDark, C, iconName, children, rightSlot }) {
    return (
        <View
            style={[
                is.shell,
                {
                    backgroundColor: isDark ? '#1C1610' : '#FFF4E0',
                    borderColor: focused ? C.primary : 'transparent',
                },
            ]}
        >
            <Icon name={iconName} size={18} color={focused ? C.primary : C.textMuted} />
            {children}
            {rightSlot}
        </View>
    );
}

const is = StyleSheet.create({
    shell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 11,
        borderWidth: 1.5,
    },
});

// ─── Main export ───────────────────────────────────────────────────────────────
/**
 * Props:
 *  onSubmit(email, password)  — login handler
 *  onForgotPassword()
 *  onGoogleLogin()
 *  onPasskeyLogin()
 *  loading {boolean}          — shows spinner on CTA
 */
export default function LoginForm({
    onSubmit,
    onForgotPassword,
    onGoogleLogin,
    onPasskeyLogin,
    loading = false,
}) {
    const scheme = useColorScheme();
    const theme = scheme === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = scheme === 'dark';
    const s = makeStyles(C, isDark);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [emailFocus, setEmailFocus] = useState(false);
    const [passFocus, setPassFocus] = useState(false);

    const passRef = useRef(null);
    const ctaScale = useRef(new Animated.Value(1)).current;

    const pressIn = () => Animated.spring(ctaScale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    const pressOut = () => Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 9 }).start();

    const handleLogin = () => {
        Keyboard.dismiss();
        onSubmit?.(email, password);
    };

    // CTA inner content
    const ctaContent = loading
        ? <ActivityIndicator color="#1a1a1a" size="small" />
        : (
            <View style={s.ctaInner}>
                <Text style={s.ctaText}>Login to Garage</Text>
                <Icon name="arrow-forward" size={16} color="#1a1a1a" />
            </View>
        );

    // CTA button (with or without gradient wrapper)
    const ctaButton = (
        <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <TouchableOpacity
                style={[s.ctaButton, !LinearGradient && { backgroundColor: C.primary }]}
                onPress={handleLogin}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={1}
                disabled={loading}
            >
                {ctaContent}
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={[s.card, theme.shadow.soft]}>

            {/* ── Email / Phone ──────────────────────────────────────────── */}
            <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Phone or Email</Text>
                <InputShell focused={emailFocus} isDark={isDark} C={C} iconName="person">
                    <TextInput
                        style={[s.textInput, { color: C.textPrimary }]}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="example@gmail.com"
                        placeholderTextColor={C.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        onFocus={() => setEmailFocus(true)}
                        onBlur={() => setEmailFocus(false)}
                        onSubmitEditing={() => passRef.current?.focus()}
                        selectionColor={C.primary}
                    />
                </InputShell>
            </View>

            {/* ── Password ───────────────────────────────────────────────── */}
            <View style={s.fieldGroup}>
                <View style={s.labelRow}>
                    <Text style={s.fieldLabel}>Password</Text>
                    <TouchableOpacity
                        onPress={onForgotPassword}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={[s.forgotLink, { color: C.primary }]}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>
                <InputShell
                    focused={passFocus}
                    isDark={isDark}
                    C={C}
                    iconName="lock"
                    rightSlot={
                        <TouchableOpacity
                            onPress={() => setShowPass(v => !v)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Icon
                                name={showPass ? 'visibility-off' : 'visibility'}
                                size={18}
                                color={C.textMuted}
                            />
                        </TouchableOpacity>
                    }
                >
                    <TextInput
                        ref={passRef}
                        style={[s.textInput, { color: C.textPrimary }]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor={C.textMuted}
                        secureTextEntry={!showPass}
                        returnKeyType="done"
                        onFocus={() => setPassFocus(true)}
                        onBlur={() => setPassFocus(false)}
                        onSubmitEditing={handleLogin}
                        selectionColor={C.primary}
                    />
                </InputShell>
            </View>

            {/* ── CTA Button ─────────────────────────────────────────────── */}
            {/* ── CTA Button ─────────────────────────────────────────────── */}
            <View style={s.ctaWrap}>
                {LinearGradient ? (
                    <LinearGradient
                        colors={['#E2A731', '#B87D1A']}   // deeper, premium gold gradient
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={s.ctaGradientWrapper}
                    >
                        <TouchableOpacity
                            style={s.ctaButton}
                            onPress={handleLogin}
                            onPressIn={pressIn}
                            onPressOut={pressOut}
                            activeOpacity={0.92}
                            disabled={loading}
                        >
                            {ctaContent}
                        </TouchableOpacity>
                    </LinearGradient>
                ) : (
                    <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                        <TouchableOpacity
                            style={[s.ctaButton, { backgroundColor: C.primary }]}
                            onPress={handleLogin}
                            onPressIn={pressIn}
                            onPressOut={pressOut}
                            activeOpacity={0.92}
                            disabled={loading}
                        >
                            {ctaContent}
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>

            {/* ── Divider ────────────────────────────────────────────────── */}
            {/* <View style={s.divider}>
                <View style={[s.divLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]} />
                <Text style={[s.divLabel, { color: C.textMuted }]}>or access with</Text>
                <View style={[s.divLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]} />
            </View> */}

            {/* ── Social Buttons ─────────────────────────────────────────── */}
            {/* <View style={s.socialRow}>
                <TouchableOpacity
                    style={[s.socialBtn, { backgroundColor: isDark ? '#2E2618' : '#FDECC8', borderColor: C.border }]}
                    onPress={onGoogleLogin}
                    activeOpacity={0.72}
                >
                    <Text style={[s.googleLetter, { color: C.textSecondary }]}>G</Text>
                    <Text style={[s.socialLabel, { color: C.textSecondary }]}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[s.socialBtn, { backgroundColor: isDark ? '#2E2618' : '#FDECC8', borderColor: C.border }]}
                    onPress={onPasskeyLogin}
                    activeOpacity={0.72}
                >
                    <Icon name="fingerprint" size={17} color={C.textSecondary} />
                    <Text style={[s.socialLabel, { color: C.textSecondary }]}>Passkey</Text>
                </TouchableOpacity>
            </View> */}

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C, isDark) {
    return StyleSheet.create({

        card: {
            backgroundColor: isDark ? 'rgba(28,22,16,0.90)' : 'rgba(255,255,255,0.94)',
            borderRadius: 28,
            padding: 22,
            gap: 16,
            borderWidth: 1,
            borderColor: C.border,
        },

        // Fields
        fieldGroup: { gap: 7 },

        fieldLabel: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1.9,
            textTransform: 'uppercase',
            color: C.textMuted,
            paddingHorizontal: 2,
        },

        labelRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 2,
        },

        forgotLink: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.2,
        },

        textInput: {
            flex: 1,
            fontSize: 15,
            paddingVertical: 0,
            includeFontPadding: false,
        },

        // CTA
        ctaWrap: {
            marginTop: 8,
            shadowColor: '#E2A731',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 18,
            elevation: 10,
        },

        ctaGradientWrapper: {
            borderRadius: 15,
            overflow: 'hidden',
            // Inner shadow simulation
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)',
        },

        ctaButton: {
            paddingVertical: 18,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 15,
            backgroundColor: 'transparent', // gradient overrides if used
        },

        ctaInner: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
        },

        ctaText: {
            fontSize: 16,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: '#1A1A1A',
            // slight text shadow for depth
            textShadowColor: 'rgba(0,0,0,0.1)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        },


        // Divider
        divider: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        divLine: {
            flex: 1,
            height: StyleSheet.hairlineWidth,
        },
        divLabel: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
        },

        // Social
        socialRow: { flexDirection: 'row', gap: 10 },

        socialBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            borderRadius: 14,
            paddingVertical: 13,
            borderWidth: 1,
        },

        googleLetter: {
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: -0.5,
        },

        socialLabel: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.1,
            textTransform: 'uppercase',
        },
    });
}