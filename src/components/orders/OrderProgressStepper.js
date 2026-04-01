// components/orders/OrderProgressStepper.js
// 4-step progress: Received → Inspection → Servicing → Ready
// Active step = gold filled, completed = gold with check, pending = dark empty

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';

const STEPS = [
    { key: 'received', label: 'Received', sub: 'On Queue', icon: 'inbox-arrow-down' },
    { key: 'inspection', label: 'Inspection', sub: '10:30 Am', icon: 'magnify-scan' },
    { key: 'servicing', label: 'Servicing', sub: 'Active Now', icon: 'tools' },
    { key: 'ready', label: 'Ready', sub: 'Pending', icon: 'check-circle-outline' },
];

// Map order status → active step index
function statusToStep(status) {
    switch ((status ?? '').toLowerCase()) {
        case 'pending': return 0;
        case 'mechanic assigned': return 1;
        case 'in progress': return 2;
        case 'invoice generated': return 3;
        case 'completed': return 4;
        default: return 0;
    }
}

export default function OrderProgressStepper({ status, preferredTime }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const activeStep = statusToStep(status);

    const progressAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: activeStep / (STEPS.length - 1),
            duration: 900,
            delay: 200,
            useNativeDriver: false,
        }).start();
    }, [activeStep]);

    return (
        <View style={[s.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            {/* Track + dots */}
            <View style={s.trackWrap}>
                {/* Background track */}
                <View style={[s.track, { backgroundColor: isDark ? '#2A2318' : '#EDE8DC' }]} />
                {/* Filled progress track */}
                <Animated.View
                    style={[
                        s.trackFill,
                        {
                            backgroundColor: C.primary,
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        },
                    ]}
                />
                {/* Step nodes */}
                <View style={s.stepsRow}>
                    {STEPS.map((step, i) => {
                        const done = i < activeStep;
                        const active = i === activeStep;
                        const nodeBg = done || active
                            ? C.primary
                            : isDark ? '#2A2318' : '#EDE8DC';
                        const nodeSize = active ? 40 : 34;

                        return (
                            <View key={step.key} style={s.stepCol}>
                                <View style={[
                                    s.node,
                                    {
                                        width: nodeSize,
                                        height: nodeSize,
                                        borderRadius: nodeSize / 2,
                                        backgroundColor: nodeBg,
                                        borderWidth: active ? 2.5 : 0,
                                        borderColor: active ? C.primary : 'transparent',
                                        shadowColor: active ? C.primary : 'transparent',
                                        shadowOpacity: active ? 0.5 : 0,
                                        shadowRadius: 10,
                                        shadowOffset: { width: 0, height: 0 },
                                        elevation: active ? 6 : 0,
                                    },
                                ]}>
                                    {done ? (
                                        <MaterialCommunityIcons name="check" size={16} color="#1a1a1a" />
                                    ) : (
                                        <MaterialCommunityIcons
                                            name={step.icon}
                                            size={active ? 18 : 15}
                                            color={active ? '#1a1a1a' : C.textMuted}
                                        />
                                    )}
                                </View>
                                <Text style={[s.stepLabel, {
                                    color: done || active ? C.textPrimary : C.textMuted,
                                    fontWeight: active ? '700' : '500',
                                }]} numberOfLines={1}>
                                    {step.label}
                                </Text>
                                <Text style={[s.stepSub, { color: C.textMuted }]} numberOfLines={1}>
                                    {i === 0 && preferredTime ? preferredTime : step.sub}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        paddingBottom: 10,
    },
    trackWrap: {
        position: 'relative',
        paddingBottom: 8,
    },
    track: {
        position: 'absolute',
        top: 17,
        left: '10%',
        right: '10%',
        height: 3,
        borderRadius: 2,
    },
    trackFill: {
        position: 'absolute',
        top: 17,
        left: '10%',
        height: 3,
        borderRadius: 2,
    },
    stepsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    stepCol: {
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    node: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepLabel: {
        fontSize: 10,
        letterSpacing: 0.2,
        textAlign: 'center',
    },
    stepSub: {
        fontSize: 9,
        letterSpacing: 0.1,
        textAlign: 'center',
        opacity: 0.7,
    },
});