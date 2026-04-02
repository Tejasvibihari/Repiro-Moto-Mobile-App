// components/referral/ReferralStatsRow.js
// Four stat tiles: Total Referrals, Available Balance/Credit, Total Earnings, Total Withdrawn
// canWithdraw  true  → shows "Available Balance" + "Withdrawn"
// canWithdraw  false → shows "Purchase Credit"   + "Used"

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

// ─── Single tile ──────────────────────────────────────────────────────────────
function Tile({ icon, value, label, accent, C, isDark, delay }) {
    const scale = useRef(new Animated.Value(0.84)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, delay, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 340, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                tile.wrap,
                {
                    backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                    transform: [{ scale }],
                    opacity,
                },
            ]}
        >
            <View style={[tile.iconWrap, { backgroundColor: `${accent}1A` }]}>
                <MaterialCommunityIcons name={icon} size={20} color={accent} />
            </View>
            <Text style={[tile.value, { color: C.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </Text>
            <Text style={[tile.label, { color: C.textMuted }]} numberOfLines={2}>
                {label}
            </Text>
        </Animated.View>
    );
}

const tile = StyleSheet.create({
    wrap: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        padding: 13,
        gap: 7,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    value: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
    label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', textAlign: 'center' },
});

// ─── Row ──────────────────────────────────────────────────────────────────────
export default function ReferralStatsRow({ stats, canWithdraw, C, isDark }) {
    return (
        <View style={row.wrap}>
            <View style={row.row}>
                <Tile
                    icon="account-multiple-check"
                    value={String(stats.totalReferrals)}
                    label="Referrals"
                    accent="#5B8CFF"
                    C={C} isDark={isDark} delay={60}
                />
                <Tile
                    icon={canWithdraw ? 'currency-inr' : 'shopping-outline'}
                    value={fmt(stats.availableAmount)}
                    label={canWithdraw ? 'Available' : 'Purchase Credit'}
                    accent="#2ECC9A"
                    C={C} isDark={isDark} delay={120}
                />
            </View>
            <View style={row.row}>
                <Tile
                    icon="trending-up"
                    value={fmt(stats.totalEarnings)}
                    label="Total Earned"
                    accent="#E2A731"
                    C={C} isDark={isDark} delay={180}
                />
                <Tile
                    icon="bank-transfer-out"
                    value={fmt(stats.totalWithdrawn)}
                    label={canWithdraw ? 'Withdrawn' : 'Used'}
                    accent="#FF6B6B"
                    C={C} isDark={isDark} delay={240}
                />
            </View>
        </View>
    );
}

const row = StyleSheet.create({
    wrap: { flexDirection: 'row', gap: 8 },
    row: { flexDirection: 'row', gap: 8, flex: 1 },
});