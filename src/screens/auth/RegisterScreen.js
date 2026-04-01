// src/screens/auth/RegisterScreen.js
import React, { useRef, useEffect } from 'react';
import {
    View, Text, ScrollView, KeyboardAvoidingView,
    StyleSheet, Animated, Platform, Dimensions, useColorScheme, Image,
} from 'react-native';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import RegisterForm from '../../components/auth/RegistrationForm';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) { }
let useSafeAreaInsets = null;
try { useSafeAreaInsets = require('react-native-safe-area-context').useSafeAreaInsets; } catch (_) { }

const { width: W, height: H } = Dimensions.get('window');
const isSmall = W <= 375 || H <= 667;

export default function RegisterScreen({ navigation }) {
    const scheme = useColorScheme();
    const theme = scheme === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = scheme === 'dark';
    const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: 44, bottom: 34 };

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

    const s = screenStyles(C, isDark, insets);

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

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View style={[s.header, { opacity: contentOpacity, transform: [{ translateY: contentTransY }] }]}>
                        <Animated.View style={[s.iconBadge, theme.shadow.soft, { transform: [{ scale: iconScale }] }]}>
                            <Image source={require('../../assets/logo/logo300.png')} style={s.iconImage} resizeMode="contain" />
                            <View style={[s.iconRing, { borderColor: C.border }]} />
                        </Animated.View>
                        <Text style={[s.welcomeTitle, { color: C.textPrimary }]}>Join the Atelier</Text>
                        <Text style={[s.welcomeSubtitle, { color: C.textSecondary }]}>Start your journey with precision care.</Text>
                    </Animated.View>

                    <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTransY }] }}>
                        <RegisterForm onSubmit={(d) => console.log('Register →', d)} onLogin={() => navigation?.navigate('Login')} />
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function screenStyles(C, isDark, insets) {
    const STATUS = insets.top || (Platform.OS === 'ios' ? 50 : 28);
    const BOTTOM = insets.bottom || (Platform.OS === 'ios' ? 34 : 16);
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: C.background },
        blob: { position: 'absolute', borderRadius: 9999, backgroundColor: isDark ? 'rgba(226,167,49,0.07)' : 'rgba(226,167,49,0.13)' },
        blobTopRight: { width: W * 0.85, height: W * 0.85, top: -W * 0.32, right: -W * 0.28 },
        blobBottomLeft: { width: W * 0.75, height: W * 0.75, bottom: -W * 0.28, left: -W * 0.25 },
        watermarkWrap: { position: 'absolute', bottom: H * 0.10, left: -W * 0.06, transform: [{ rotate: '-12deg' }], pointerEvents: 'none' },
        watermarkText: { fontSize: W * 0.27, fontWeight: '900', color: isDark ? 'rgba(226,167,49,0.025)' : 'rgba(226,167,49,0.045)', lineHeight: W * 0.27, letterSpacing: -3 },
        diagonalAccent: { position: 'absolute', width: W * 2.4, height: 2, backgroundColor: C.primary, opacity: 0.10, top: H * 0.38, left: -W * 0.7, transform: [{ rotate: '-12deg' }] },
        corner: { position: 'absolute', width: 16, height: 16, borderColor: C.primary, opacity: isDark ? 0.22 : 0.30, zIndex: 5 },
        cornerTL: { top: STATUS + 6, left: 16, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
        cornerTR: { top: STATUS + 6, right: 16, borderTopWidth: 1.5, borderRightWidth: 1.5 },
        cornerBL: { bottom: BOTTOM + 6, left: 16, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
        cornerBR: { bottom: BOTTOM + 6, right: 16, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
        topBrand: { position: 'absolute', top: STATUS + 12, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
        topBrandText: { fontSize: 11, fontWeight: '900', letterSpacing: 3, opacity: 0.18 },
        scrollContent: { flexGrow: 1, paddingTop: STATUS + (isSmall ? 28 : 40), paddingBottom: BOTTOM + 20, paddingHorizontal: 20, justifyContent: 'center', gap: isSmall ? 16 : 20 },
        header: { alignItems: 'center', gap: isSmall ? 6 : 8 },
        iconImage: { width: isSmall ? 42 : 48, height: isSmall ? 42 : 48, tintColor: C.primary },
        iconBadge: { width: isSmall ? 60 : 66, height: isSmall ? 60 : 66, borderRadius: 18, backgroundColor: isDark ? '#2E2618' : '#FDECC8', alignItems: 'center', justifyContent: 'center', marginBottom: isSmall ? 4 : 6, borderWidth: 1, borderColor: C.border, position: 'relative' },
        iconRing: { position: 'absolute', top: -6, left: -6, width: isSmall ? 72 : 78, height: isSmall ? 72 : 78, borderRadius: 24, borderWidth: 1, opacity: 0.5 },
        welcomeTitle: { fontSize: isSmall ? 22 : 24, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
        welcomeSubtitle: { fontSize: isSmall ? 12 : 13, textAlign: 'center', lineHeight: 18, letterSpacing: 0.1, paddingHorizontal: 12 },
    });
}