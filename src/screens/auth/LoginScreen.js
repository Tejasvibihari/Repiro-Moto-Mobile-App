// src/screens/auth/LoginScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, ScrollView, KeyboardAvoidingView,
    TouchableOpacity, StyleSheet, Animated,
    Platform, Dimensions, useColorScheme, Image,
} from 'react-native';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import LoginForm from '../../components/auth/LoginForm';
import axiosClient from '../../services/axiosClient';
import useAuth from '../../hooks/useAuth';
import Alert from '../../components/common/Alert';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) { }
let useSafeAreaInsets = null;
try { useSafeAreaInsets = require('react-native-safe-area-context').useSafeAreaInsets; } catch (_) { }

const { width: W, height: H } = Dimensions.get('window');
const isSmall = W <= 375 || H <= 667;

export default function LoginScreen({ navigation }) {
    const scheme = useColorScheme();
    const theme = scheme === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = scheme === 'dark';
    const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: 44, bottom: 34 };
    const { signIn } = useAuth();

    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ visible: false, message: '', type: 'error' });

    const contentOpacity = useRef(new Animated.Value(0)).current;
    const contentTransY = useRef(new Animated.Value(28)).current;
    const headerTransY = useRef(new Animated.Value(-20)).current;
    const blob1Scale = useRef(new Animated.Value(0.7)).current;
    const blob2Scale = useRef(new Animated.Value(0.7)).current;
    const iconScale = useRef(new Animated.Value(0.5)).current;

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

    const handleLogin = async (email, password) => {
        if (!email || !password) { showAlert('Please enter email and password', 'warning'); return; }
        setLoading(true);
        try {
            const response = await axiosClient.post('/api/user/auth/user-sign-in', { email, password });
            signIn(response.data);
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed. Please try again.';
            showAlert(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const s = makeStyles(C, isDark, insets);

    // ✅ No StatusBar here — DynamicStatusBar in AppEntry handles it
    return (
        <View style={s.root}>
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

            <View style={[s.corner, s.cornerTL]} pointerEvents="none" />
            <View style={[s.corner, s.cornerTR]} pointerEvents="none" />
            <View style={[s.corner, s.cornerBL]} pointerEvents="none" />
            <View style={[s.corner, s.cornerBR]} pointerEvents="none" />

            <Animated.View style={[s.topBrand, { opacity: contentOpacity, transform: [{ translateY: headerTransY }] }]} pointerEvents="none">
                <Text style={[s.topBrandText, { color: C.primary }]}>REPAIRO MOTO</Text>
            </Animated.View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
                <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Animated.View style={[s.header, { opacity: contentOpacity, transform: [{ translateY: contentTransY }] }]}>
                        <Animated.View style={[s.iconBadge, theme.shadow.soft, { transform: [{ scale: iconScale }] }]}>
                            <Image source={require('../../assets/logo/logo300.png')} style={s.iconImage} resizeMode="contain" />
                            <View style={[s.iconRing, { borderColor: C.border }]} />
                        </Animated.View>
                        <Text style={[s.welcomeTitle, { color: C.textPrimary }]}>Welcome Back</Text>
                        <Text style={[s.welcomeSubtitle, { color: C.textSecondary }]}>Precision care for your ultimate machine.</Text>
                    </Animated.View>

                    {alert.visible && (
                        <Alert type={alert.type} message={alert.message} visible={alert.visible}
                            onDismiss={() => setAlert(prev => ({ ...prev, visible: false }))} autoDismiss={5000} />
                    )}

                    <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTransY }] }}>
                        <LoginForm onSubmit={handleLogin} onForgotPassword={() => navigation.navigate('ForgotPassword')} loading={loading} />
                    </Animated.View>

                    <Animated.View style={[s.footer, { opacity: contentOpacity }]}>
                        <Text style={[s.footerBody, { color: C.textSecondary }]}>Are you a new user?{'  '}</Text>
                        <TouchableOpacity onPress={() => navigation?.navigate('Register')} activeOpacity={0.7}>
                            <Text style={[s.footerCta, { color: C.primary }]}>Create Account</Text>
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
    const VPAD = isSmall ? 20 : 28;
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
        scrollContent: { flexGrow: 1, paddingTop: STATUS + (isSmall ? 36 : 52), paddingBottom: BOTTOM + 24, paddingHorizontal: 20, justifyContent: 'center', gap: isSmall ? 20 : 26 },
        header: { alignItems: 'center', gap: isSmall ? 8 : 10 },
        iconImage: { width: isSmall ? 50 : 60, height: isSmall ? 50 : 60, tintColor: C.primary },
        iconBadge: { width: isSmall ? 70 : 78, height: isSmall ? 70 : 78, borderRadius: 22, backgroundColor: isDark ? '#2E2618' : '#FDECC8', alignItems: 'center', justifyContent: 'center', marginBottom: isSmall ? 6 : 10, borderWidth: 1, borderColor: C.border, position: 'relative' },
        iconRing: { position: 'absolute', top: -8, left: -8, width: isSmall ? 86 : 94, height: isSmall ? 86 : 94, borderRadius: 30, borderWidth: 1, opacity: 0.5 },
        welcomeTitle: { fontSize: isSmall ? 24 : 28, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center' },
        welcomeSubtitle: { fontSize: isSmall ? 13 : 14, textAlign: 'center', lineHeight: 21, letterSpacing: 0.1, paddingHorizontal: 12 },
        footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', paddingTop: 4 },
        footerBody: { fontSize: 14 },
        footerCta: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
    });
}