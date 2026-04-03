// components/orders/ServiceTypeStep.js
// Step 0 of the booking flow — choose Schedule Repair or Emergency Repair.
// Emergency card has a pulsing red glow to communicate urgency.
// Props:
//   selected        'Schedule Repair' | 'Emergency Repair' | ''
//   onSelect(value) fn
//   onNext          fn — called when user confirms selection
//   C, isDark

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const SERVICE_TYPES_CONFIG = [
    {
        value: 'Schedule Repair',
        label: 'Schedule Repair',
        tagline: 'Book at your convenience',
        description: 'Choose a preferred date & time. A mechanic will arrive as scheduled.',
        icon: 'calendar-clock',
        iconLib: 'mci',
        accent: '#E2A731',
        textDark: '#1a1a1a',
    },
    {
        value: 'Emergency Repair',
        label: 'Emergency Repair',
        tagline: 'Need help right now?',
        description: 'Get the nearest available mechanic dispatched to your location ASAP.',
        icon: 'alert-octagon',
        iconLib: 'mci',
        accent: '#FF6B6B',
        textDark: '#fff',
    },
];

// ─── Emergency pulse ring ─────────────────────────────────────────────────────
function PulseRing({ color, size = 80 }) {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.timing(scale, { toValue: 1.5, duration: 1200, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: color,
                opacity,
                transform: [{ scale }],
            }}
            pointerEvents="none"
        />
    );
}

// ─── Single type card ─────────────────────────────────────────────────────────
function TypeCard({ cfg, selected, onPress, isDark }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isEmergency = cfg.value === 'Emergency Repair';

    const pIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
    const pOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

    const bgColor = selected
        ? cfg.accent
        : isDark ? '#1C1A14' : '#FFFFFF';

    const borderColor = selected
        ? cfg.accent
        : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    const iconBg = selected
        ? 'rgba(0,0,0,0.2)'
        : `${cfg.accent}20`;

    const labelColor = selected
        ? (isEmergency ? '#fff' : '#1a1a1a')
        : (isDark ? '#F0EAD6' : '#1a1a1a');

    const subColor = selected
        ? (isEmergency ? 'rgba(255,255,255,0.75)' : 'rgba(26,26,26,0.65)')
        : (isDark ? '#9E8E78' : '#6B5E4A');

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={pIn}
                onPressOut={pOut}
                activeOpacity={1}
                style={[
                    s.card,
                    {
                        backgroundColor: bgColor,
                        borderColor,
                        shadowColor: selected ? cfg.accent : '#000',
                        shadowOpacity: selected ? 0.35 : 0.08,
                    },
                ]}
            >
                {/* Icon area */}
                <View style={s.iconArea}>
                    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Pulse ring for emergency when selected */}
                        {isEmergency && selected && (
                            <PulseRing color={cfg.accent} size={72} />
                        )}
                        <View style={[s.iconCircle, { backgroundColor: iconBg }]}>
                            <MaterialCommunityIcons
                                name={cfg.icon}
                                size={32}
                                color={selected ? (isEmergency ? '#fff' : '#1a1a1a') : cfg.accent}
                            />
                        </View>
                    </View>

                    {/* Selected check */}
                    {selected && (
                        <View style={[s.checkBadge, { backgroundColor: isEmergency ? '#fff' : '#1a1a1a' }]}>
                            <Ionicons
                                name="checkmark"
                                size={12}
                                color={selected ? cfg.accent : '#fff'}
                            />
                        </View>
                    )}
                </View>

                {/* Text */}
                <View style={s.textBlock}>
                    <Text style={[s.label, { color: labelColor }]}>{cfg.label}</Text>
                    <Text style={[s.tagline, { color: cfg.accent, opacity: selected ? 1 : 0.9 }]}>
                        {cfg.tagline}
                    </Text>
                    <Text style={[s.desc, { color: subColor }]}>{cfg.description}</Text>
                </View>

                {/* Bottom badge for emergency */}
                {isEmergency && selected && (
                    <View style={[s.urgentBadge, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
                        <View style={s.urgentDot} />
                        <Text style={s.urgentLabel}>PRIORITY DISPATCH</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ServiceTypeStep({ selected, onSelect, onNext, C, isDark }) {
    const canContinue = !!selected;

    return (
        <View style={s.wrap}>
            {/* Cards */}
            {SERVICE_TYPES_CONFIG.map((cfg) => (
                <TypeCard
                    key={cfg.value}
                    cfg={cfg}
                    selected={selected === cfg.value}
                    onPress={() => onSelect(cfg.value)}
                    isDark={isDark}
                />
            ))}

            {/* Info note */}
            <View style={[s.note, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderColor: C.border }]}>
                <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                <Text style={[s.noteText, { color: C.textMuted }]}>
                    Emergency repairs incur a priority dispatch fee. Standard scheduling is free.
                </Text>
            </View>

            {/* Continue CTA */}
            <TouchableOpacity
                style={[
                    s.cta,
                    {
                        backgroundColor: canContinue ? C.primary : (isDark ? '#2A2318' : '#EDE8DC'),
                        opacity: canContinue ? 1 : 0.5,
                        shadowColor: canContinue ? C.primary : 'transparent',
                    },
                ]}
                onPress={onNext}
                disabled={!canContinue}
                activeOpacity={0.85}
            >
                <Text style={[s.ctaLabel, { color: canContinue ? '#1a1a1a' : C.textMuted }]}>
                    Continue
                </Text>
                <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={canContinue ? '#1a1a1a' : C.textMuted}
                />
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { gap: 14 },

    card: {
        borderRadius: 20,
        borderWidth: 1.5,
        padding: 20,
        gap: 14,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 16,
        elevation: 6,
    },

    iconArea: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    checkBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },

    textBlock: { gap: 5 },

    label: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 0.1,
    },

    tagline: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },

    desc: {
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0.1,
    },

    urgentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    urgentDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
    urgentLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1.5,
    },

    note: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
    },
    noteText: {
        fontSize: 11,
        flex: 1,
        lineHeight: 17,
    },

    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 17,
        borderRadius: 16,
        marginTop: 4,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    ctaLabel: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});