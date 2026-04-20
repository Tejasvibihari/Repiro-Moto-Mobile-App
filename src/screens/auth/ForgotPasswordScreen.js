// src/screens/auth/ForgotPasswordScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, TextInput, ScrollView, KeyboardAvoidingView,
    TouchableOpacity, StyleSheet, Animated, ActivityIndicator,
    Platform, Dimensions, useColorScheme, Image,
} from 'react-native';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import axiosClient from '../../services/axiosClient';
import Alert from '../../components/common/Alert';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) { }
let useSafeAreaInsets = null;
try { useSafeAreaInsets = require('react-native-safe-area-context').useSafeAreaInsets; } catch (_) { }
let MaterialIcons = null;
try { MaterialIcons = require('@expo/vector-icons').MaterialIcons; } catch (_) { }

const { width: W, height: H } = Dimensions.get('window');
const isSmall = W <= 375 || H <= 667;

function Icon({ name, size = 20, color, style }) {
    if (MaterialIcons) {
        return <MaterialIcons name={name} size={size} color={color} style={style} />;
    }
    const glyphs = {
        'mail-outline': '✉',
        'arrow-back': '←',
        'send': '➤',
        'check-circle': '✓',
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

export default function ForgotPasswordScreen({ navigation }) {
    const scheme = useColorScheme();
    const theme = scheme === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = scheme === 'dark';
    const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: 44, bottom: 34 };

    const [email, setEmail] = useState('');
    const [emailFocus, setEmailFocus] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [alert, setAlert] = useState({ visible: false, message: '', type: 'error' });

    const contentOpacity = useRef(new Animated.Value(0)).current;
    const contentTransY = useRef(new Animated.Value(28)).current;
    const headerTransY = useRef(new Animated.Value(-20)).current;
    const blob1Scale = useRef(new Animated.Value(0.7)).current;
    const blob2Scale = useRef(new Animated.Value(0.7)).current;
    const iconScale = useRef(new Animated.Value(0.5)).current;
    const ctaScale = useRef(new Animated.Value(1)).current;
    const successScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(blob1Scale, { toValue: 1, friction: 6, tension: 35, useNativeDriver: true }),
            Animated.spring(blob2Scale, { toValue: 1, friction: 6, tension: 35, delay: 120, useNativeDriver: true }),
            Animated.spring(headerTransY, { toValue: 0, friction: 8, tension: 55, delay: 80, useNativeDriver: true }),
            Animated.timing(contentOpacity, { toValue: 1, duration: 520, delay: 100, useNativeDriver: true }),
            Animated.spring(contentTransY, { toValue: 0, friction: 7, tension: 55, delay: 100, useNativeDriver: true }),
            Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 70, delay: 220, useNativeDriver: true }),
        ]).start();
    }, []);

    const showAlert = (message, type = 'error') => {
        setAlert({ visible: true, message, type });
        setTimeout(() => setAlert(prev => ({ ...prev, visible: false })), 5000);
    };

    const pressIn = () => Animated.spring(ctaScale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    const pressOut = () => Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 9 }).start();

    const handleSendLink = async () => {
        if (!email) {
            showAlert('Please enter your email address', 'warning');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address', 'warning');
            return;
        }

        setLoading(true);
        try {
            await axiosClient.post('/api/admin/forgotpassword', {
                email,
                userType: 'User',
            });
            setSent(true);
            Animated.spring(successScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }).start();
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to send reset link. Please try again.';
            showAlert(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const s = makeStyles(C, isDark, insets);

    const ctaContent = loading
        ? <ActivityIndicator color="#1a1a1a" size="small" />
        : (
            <View style={s.ctaInner}>
                <Text style={s.ctaText}>Send Reset Link</Text>
                <Icon name="send" size={16} color="#1a1a1a" />
            </View>
        );

    return (
        <View style={s.root}>
            {/* Background */}
            <View style={StyleSheet.absoluteFill}>
                {LinearGradient ? (
                    <LinearGradient
                        colors={isDark ? ['#2E2618', '#1C1610'] : ['#FDECC8', '#FFF8EC']}
                        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.background }]} />
                )}
                <Animated.View style={[s.blob, s.blobTopRight, { transform: [{ scale: blob1Scale }] }]} />
                <Animated.View style={[s.blob, s.blobBottomLeft, { transform: [{ scale: blob2Scale }] }]} />
                <View style={s.watermarkWrap} pointerEvents="none">
                    <Text style={s.watermarkText}>REPAIRO{'\n'}MOTO</Text>
                </View>
                <View style={s.diagonalAccent} pointerEvents="none" />
            </View>

            {/* Corner accents */}
            <View style={[s.corner, s.cornerTL]} pointerEvents="none" />
            <View style={[s.corner, s.cornerTR]} pointerEvents="none" />
            <View style={[s.corner, s.cornerBL]} pointerEvents="none" />
            <View style={[s.corner, s.cornerBR]} pointerEvents="none" />

            {/* Top brand text */}
            <Animated.View style={[s.topBrand, { opacity: contentOpacity, transform: [{ translateY: headerTransY }] }]} pointerEvents="none">
                <Text style={[s.topBrandText, { color: C.primary }]}>REPAIRO MOTO</Text>
            </Animated.View>

            {/* Back button */}
            <Animated.View style={[s.backButton, { opacity: contentOpacity }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={s.backTouchable}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Icon name="arrow-back" size={22} color={C.textPrimary} />
                </TouchableOpacity>
            </Animated.View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
                <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <Animated.View style={[s.header, { opacity: contentOpacity, transform: [{ translateY: contentTransY }] }]}>
                        <Animated.View style={[s.iconBadge, theme.shadow.soft, { transform: [{ scale: iconScale }] }]}>
                            <Image source={require('../../assets/logo/logo300.png')} style={s.iconImage} resizeMode="contain" />
                            <View style={[s.iconRing, { borderColor: C.border }]} />
                        </Animated.View>
                        <Text style={[s.welcomeTitle, { color: C.textPrimary }]}>Forgot Password?</Text>
                        <Text style={[s.welcomeSubtitle, { color: C.textSecondary }]}>
                            No worries! Enter your email and we'll send you a link to reset your password.
                        </Text>
                    </Animated.View>

                    {/* Alert */}
                    {alert.visible && (
                        <Alert type={alert.type} message={alert.message} visible={alert.visible}
                            onDismiss={() => setAlert(prev => ({ ...prev, visible: false }))} autoDismiss={5000} />
                    )}

                    {/* Card */}
                    <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTransY }] }}>
                        {!sent ? (
                            <View style={[s.card, theme.shadow.soft]}>
                                {/* Email field */}
                                <View style={s.fieldGroup}>
                                    <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
                                    <View
                                        style={[
                                            s.shell,
                                            {
                                                backgroundColor: isDark ? '#1C1610' : '#FFF4E0',
                                                borderColor: emailFocus ? C.primary : 'transparent',
                                            },
                                        ]}
                                    >
                                        <Icon name="mail-outline" size={18} color={emailFocus ? C.primary : C.textMuted} />
                                        <TextInput
                                            style={[s.textInput, { color: C.textPrimary }]}
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder="example@gmail.com"
                                            placeholderTextColor={C.textMuted}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            returnKeyType="done"
                                            onFocus={() => setEmailFocus(true)}
                                            onBlur={() => setEmailFocus(false)}
                                            onSubmitEditing={handleSendLink}
                                            selectionColor={C.primary}
                                        />
                                    </View>
                                </View>

                                {/* CTA Button */}
                                <View style={s.ctaWrap}>
                                    {LinearGradient ? (
                                        <LinearGradient
                                            colors={['#E2A731', '#B87D1A']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={s.ctaGradientWrapper}
                                        >
                                            <TouchableOpacity
                                                style={s.ctaButton}
                                                onPress={handleSendLink}
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
                                                onPress={handleSendLink}
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
                            </View>
                        ) : (
                            /* Success state */
                            <Animated.View style={[s.card, s.successCard, theme.shadow.soft, { transform: [{ scale: successScale }] }]}>
                                <View style={s.successIconWrap}>
                                    <View style={[s.successIconCircle, { backgroundColor: isDark ? 'rgba(46,204,154,0.15)' : 'rgba(46,204,154,0.12)' }]}>
                                        <Icon name="check-circle" size={48} color={C.success} />
                                    </View>
                                </View>
                                <Text style={[s.successTitle, { color: C.textPrimary }]}>Link Sent!</Text>
                                <Text style={[s.successMessage, { color: C.textSecondary }]}>
                                    We've sent a password reset link to{'\n'}
                                    <Text style={{ color: C.primary, fontWeight: '700' }}>{email}</Text>
                                </Text>
                                <Text style={[s.successHint, { color: C.textMuted }]}>
                                    Please check your inbox and spam folder. The link will expire in 10 minutes.
                                </Text>

                                {/* Resend button */}
                                <TouchableOpacity
                                    style={[s.resendButton, { borderColor: C.border }]}
                                    onPress={() => { setSent(false); successScale.setValue(0); }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[s.resendText, { color: C.primary }]}>Try another email</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </Animated.View>

                    {/* Footer */}
                    <Animated.View style={[s.footer, { opacity: contentOpacity }]}>
                        <Text style={[s.footerBody, { color: C.textSecondary }]}>Remember your password?{'  '}</Text>
                        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                            <Text style={[s.footerCta, { color: C.primary }]}>Login</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function makeStyles(C, isDark, insets) {
    const STATUS = insets.top || (Platform.OS === 'ios' ? 50 : 28);
    const BOTTOM = insets.bottom || (Platform.OS === 'ios' ? 34 : 16);
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: C.background },
        blob: { position: 'absolute', borderRadius: 9999, backgroundColor: isDark ? 'rgba(226,167,49,0.07)' : 'rgba(226,167,49,0.13)' },
        blobTopRight: { width: W * 0.85, height: W * 0.85, top: -W * 0.32, right: -W * 0.28 },
        blobBottomLeft: { width: W * 0.75, height: W * 0.75, bottom: -W * 0.28, left: -W * 0.25 },
        watermarkWrap: { position: 'absolute', bottom: H * 0.10, left: -W * 0.06, transform: [{ rotate: '-12deg' }] },
        watermarkText: { fontSize: W * 0.27, fontWeight: '900', color: isDark ? 'rgba(226,167,49,0.025)' : 'rgba(226,167,49,0.045)', lineHeight: W * 0.27, letterSpacing: -3 },
        diagonalAccent: { position: 'absolute', width: W * 2.4, height: 2, backgroundColor: C.primary, opacity: 0.10, top: H * 0.38, left: -W * 0.7, transform: [{ rotate: '-12deg' }] },
        corner: { position: 'absolute', width: 18, height: 18, borderColor: C.primary, opacity: isDark ? 0.22 : 0.30, zIndex: 5 },
        cornerTL: { top: STATUS + 8, left: 20, borderTopWidth: 2, borderLeftWidth: 2 },
        cornerTR: { top: STATUS + 8, right: 20, borderTopWidth: 2, borderRightWidth: 2 },
        cornerBL: { bottom: BOTTOM + 8, left: 20, borderBottomWidth: 2, borderLeftWidth: 2 },
        cornerBR: { bottom: BOTTOM + 8, right: 20, borderBottomWidth: 2, borderRightWidth: 2 },
        topBrand: { position: 'absolute', top: STATUS + 18, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
        topBrandText: { fontSize: 13, fontWeight: '900', letterSpacing: 3.5, opacity: 0.18 },
        backButton: { position: 'absolute', top: STATUS + 12, left: 26, zIndex: 20 },
        backTouchable: {
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: isDark ? 'rgba(28,22,16,0.85)' : 'rgba(255,255,255,0.85)',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: C.border,
        },
        scrollContent: { flexGrow: 1, paddingTop: STATUS + (isSmall ? 60 : 72), paddingBottom: BOTTOM + 24, paddingHorizontal: 20, justifyContent: 'center', gap: isSmall ? 20 : 26 },
        header: { alignItems: 'center', gap: isSmall ? 8 : 10 },
        iconImage: { width: isSmall ? 50 : 60, height: isSmall ? 50 : 60, tintColor: C.primary },
        iconBadge: { width: isSmall ? 70 : 78, height: isSmall ? 70 : 78, borderRadius: 22, backgroundColor: isDark ? '#2E2618' : '#FDECC8', alignItems: 'center', justifyContent: 'center', marginBottom: isSmall ? 6 : 10, borderWidth: 1, borderColor: C.border, position: 'relative' },
        iconRing: { position: 'absolute', top: -8, left: -8, width: isSmall ? 86 : 94, height: isSmall ? 86 : 94, borderRadius: 30, borderWidth: 1, opacity: 0.5 },
        welcomeTitle: { fontSize: isSmall ? 24 : 28, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center' },
        welcomeSubtitle: { fontSize: isSmall ? 13 : 14, textAlign: 'center', lineHeight: 21, letterSpacing: 0.1, paddingHorizontal: 12 },

        // Card
        card: {
            backgroundColor: isDark ? 'rgba(28,22,16,0.90)' : 'rgba(255,255,255,0.94)',
            borderRadius: 28, padding: 22, gap: 16,
            borderWidth: 1, borderColor: C.border,
        },
        successCard: { alignItems: 'center', paddingVertical: 36, gap: 14 },

        // Fields
        fieldGroup: { gap: 7 },
        fieldLabel: {
            fontSize: 9, fontWeight: '700', letterSpacing: 1.9,
            textTransform: 'uppercase', color: C.textMuted, paddingHorizontal: 2,
        },
        shell: {
            flexDirection: 'row', alignItems: 'center', gap: 10,
            borderRadius: 14, paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 14 : 11,
            borderWidth: 1.5,
        },
        textInput: { flex: 1, fontSize: 15, paddingVertical: 0, includeFontPadding: false },

        // CTA
        ctaWrap: {
            marginTop: 8,
            shadowColor: '#E2A731',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35, shadowRadius: 18, elevation: 10,
        },
        ctaGradientWrapper: {
            borderRadius: 15, overflow: 'hidden',
            borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
        },
        ctaButton: {
            paddingVertical: 18, paddingHorizontal: 24,
            alignItems: 'center', justifyContent: 'center',
            borderRadius: 15, backgroundColor: 'transparent',
        },
        ctaInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
        ctaText: {
            fontSize: 16, fontWeight: '800', letterSpacing: 1.8,
            textTransform: 'uppercase', color: '#1A1A1A',
            textShadowColor: 'rgba(0,0,0,0.1)',
            textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
        },

        // Success state
        successIconWrap: { marginBottom: 8 },
        successIconCircle: {
            width: 88, height: 88, borderRadius: 44,
            alignItems: 'center', justifyContent: 'center',
        },
        successTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
        successMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
        successHint: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16, marginTop: 4 },
        resendButton: {
            marginTop: 16, paddingVertical: 12, paddingHorizontal: 24,
            borderRadius: 14, borderWidth: 1.5,
        },
        resendText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

        // Footer
        footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', paddingTop: 4 },
        footerBody: { fontSize: 14 },
        footerCta: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
    });
}