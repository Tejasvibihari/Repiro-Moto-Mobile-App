// components/common/QrCode.js
//
// Install deps first:
//   npx expo install react-native-svg react-native-qrcode-svg
//
// Props:
//   value        {string}   — the string to encode (URL, code, etc.) REQUIRED
//   size         {number}   — outer QR size in px (default 220)
//   logo         {any}      — require('...') or { uri: '...' } — shown in center (optional)
//   logoSize     {number}   — logo width/height (default 44)
//   color        {string}   — QR foreground color (default theme primary)
//   bgColor      {string}   — QR background color (default theme surface)
//   showCorners  {boolean}  — draw decorative amber corner frames (default true)
//   label        {string}   — small caption below QR (optional)

import React, { useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';

// ─── Decorative corner bracket ────────────────────────────────────────────────
function Corner({ position, color, size = 22, thickness = 3, radius = 6 }) {
    const borderStyle = {
        tl: { borderTopWidth: thickness, borderLeftWidth: thickness, borderTopLeftRadius: radius },
        tr: { borderTopWidth: thickness, borderRightWidth: thickness, borderTopRightRadius: radius },
        bl: { borderBottomWidth: thickness, borderLeftWidth: thickness, borderBottomLeftRadius: radius },
        br: { borderBottomWidth: thickness, borderRightWidth: thickness, borderBottomRightRadius: radius },
    }[position];

    const posStyle = {
        tl: { top: -2, left: -2 },
        tr: { top: -2, right: -2 },
        bl: { bottom: -2, left: -2 },
        br: { bottom: -2, right: -2 },
    }[position];

    return (
        <View
            style={[
                {
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderColor: color,
                },
                borderStyle,
                posStyle,
            ]}
        />
    );
}

// ─── QrCode ───────────────────────────────────────────────────────────────────
export default function QrCode({
    value,
    size = 220,
    logo,
    logoSize = 44,
    color,
    bgColor,
    showCorners = true,
    label,
}) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const qrColor = color ?? (isDark ? '#F0EAD6' : '#1A1A1A');
    const qrBg = bgColor ?? (isDark ? '#1C1610' : '#FFFFFF');
    const frameClr = C.primary;

    // Pulse animation on mount
    const scale = useRef(new Animated.Value(0.88)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                friction: 6,
                tension: 65,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 380,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const padding = 14;
    const innerSize = size - padding * 2;

    return (
        <Animated.View style={{ alignItems: 'center', gap: 12, opacity, transform: [{ scale }] }}>
            {/* QR frame */}
            <View
                style={[
                    styles.frame,
                    {
                        width: size,
                        height: size,
                        padding,
                        backgroundColor: qrBg,
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        shadowColor: C.primary,
                    },
                ]}
            >
                {/* Corner brackets */}
                {showCorners && (
                    <>
                        <Corner position="tl" color={frameClr} />
                        <Corner position="tr" color={frameClr} />
                        <Corner position="bl" color={frameClr} />
                        <Corner position="br" color={frameClr} />
                    </>
                )}

                {/* QR code */}
                <QRCode
                    value={value || ' '}
                    size={innerSize}
                    color={qrColor}
                    backgroundColor={qrBg}
                    // Higher error correction so logo overlay doesn't break readability
                    ecl="H"
                />

                {/* Center logo overlay */}
                {logo && (
                    <View
                        style={[
                            styles.logoWrap,
                            {
                                width: logoSize + 8,
                                height: logoSize + 8,
                                borderRadius: (logoSize + 8) * 0.22,
                                backgroundColor: qrBg,
                                borderColor: C.primary,
                            },
                        ]}
                    >
                        <Image
                            source={logo}
                            style={{
                                width: logoSize,
                                height: logoSize,
                                borderRadius: logoSize * 0.18,
                                tintColor: C.primary,
                            }}
                            resizeMode="contain"
                        />
                    </View>
                )}
            </View>

            {/* Optional label */}
            {!!label && (
                <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    frame: {
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 28,
        elevation: 10,
    },
    logoWrap: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
    },
});