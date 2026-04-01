// components/orders/OrderCard.js
// Matches the Service History card design:
//   - ORDER ID label + amber order number
//   - Status badge (IN PROGRESS / COMPLETED / CANCELLED / PENDING)
//   - Bike icon + bike name + service type
//   - Date · Time row
//   - Context-aware CTA button

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending: {
        label: 'PENDING',
        dotColor: '#E2A731',
        badgeBg: 'rgba(226,167,49,0.12)',
        badgeBorder: 'rgba(226,167,49,0.25)',
        textColor: '#E2A731',
        ctaLabel: 'VIEW DETAILS',
        ctaVariant: 'ghost',
    },
    mechanic_assigned: {
        label: 'MECHANIC ASSIGNED',
        dotColor: '#7B68EE',
        badgeBg: 'rgba(123,104,238,0.12)',
        badgeBorder: 'rgba(123,104,238,0.25)',
        textColor: '#7B68EE',
        ctaLabel: 'VIEW DETAILS',
        ctaVariant: 'ghost',
    },
    in_progress: {
        label: 'IN PROGRESS',
        dotColor: '#5B8CFF',
        badgeBg: 'rgba(91,140,255,0.12)',
        badgeBorder: 'rgba(91,140,255,0.25)',
        textColor: '#5B8CFF',
        ctaLabel: 'TRACK SERVICE',
        ctaVariant: 'primary',
    },
    invoice_generated: {
        label: 'INVOICE GENERATED',
        dotColor: '#2ECC9A',
        badgeBg: 'rgba(46,204,154,0.12)',
        badgeBorder: 'rgba(46,204,154,0.25)',
        textColor: '#2ECC9A',
        ctaLabel: 'VIEW INVOICE',
        ctaVariant: 'primary',
    },
    completed: {
        label: 'COMPLETED',
        dotColor: '#2ECC9A',
        badgeBg: 'rgba(46,204,154,0.12)',
        badgeBorder: 'rgba(46,204,154,0.25)',
        textColor: '#2ECC9A',
        ctaLabel: 'VIEW DETAILS',
        ctaVariant: 'ghost',
    },
    cancelled: {
        label: 'CANCELLED',
        dotColor: '#FF6B6B',
        badgeBg: 'rgba(255,107,107,0.10)',
        badgeBorder: 'rgba(255,107,107,0.22)',
        textColor: '#FF6B6B',
        ctaLabel: 'VIEW DETAILS',
        ctaVariant: 'ghost',
    },
};

// ─── Format date helper (Hermes-safe, no Intl) ───────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const mon = MONTHS[d.getMonth()];
        const day = d.getDate();
        const year = d.getFullYear();
        let hrs = d.getHours();
        const mins = String(d.getMinutes()).padStart(2, '0');
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12 || 12;
        return `${mon} ${day}, ${year} · ${hrs}:${mins} ${ampm}`;
    } catch {
        return dateStr;
    }
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, cfg }) {
    return (
        <View style={[
            badgeStyles.wrap,
            { backgroundColor: cfg.badgeBg, borderColor: cfg.badgeBorder },
        ]}>
            <View style={[badgeStyles.dot, { backgroundColor: cfg.dotColor }]} />
            <Text style={[badgeStyles.label, { color: cfg.textColor }]}>{cfg.label}</Text>
        </View>
    );
}

const badgeStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    label: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
});

// ─── Bike icon tile ───────────────────────────────────────────────────────────
function BikeIconTile({ isDark, C, status }) {
    const isCompleted = status === 'completed' || status === 'cancelled';
    return (
        <View style={[
            tileStyles.wrap,
            { backgroundColor: isDark ? '#2A2318' : '#EDE8DC' },
        ]}>
            {isCompleted
                ? <MaterialCommunityIcons name="tools" size={20} color={C.textMuted} />
                : <MaterialCommunityIcons name="motorbike" size={20} color={C.primary} />
            }
        </View>
    );
}

const tileStyles = StyleSheet.create({
    wrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ─── OrderCard ────────────────────────────────────────────────────────────────
/**
 * Props:
 *   order {object}:
 *     _id            string   — internal id
 *     orderId        string   — display id e.g. "RM-1234"
 *     status         string   — 'in_progress' | 'pending' | 'completed' | 'cancelled'
 *     bikeName       string   — e.g. "Ducati Panigale V4"
 *     serviceType    string   — e.g. "Full Engine Diagnostics"
 *     scheduledAt    string   — ISO date string
 *     createdAt      string   — fallback date
 *
 *   onPress(order)   — tapped the card
 *   onCta(order)     — tapped the CTA button
 *   delay  {number}  — stagger animation delay in ms
 */
export default function OrderCard({ order, onPress, onCta, delay = 0 }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const status = (order?.status ?? 'Pending').toLowerCase().replace(/ /g, '_');
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

    const displayId = order?.orderId ?? order?._id?.slice(-6)?.toUpperCase() ?? '------';
    const bikeName = `${order?.selectedBrand ?? ''} ${order?.selectedModel ?? ''}`.trim() || 'Unknown Bike';
    const serviceType = Array.isArray(order?.services) && order.services.length > 0
        ? order.services.join(', ')
        : 'Service';
    const dateStr = formatDateTime(order?.preferredDate ?? order?.createdAt);

    // ── Entrance animation ────────────────────────────────────────────────────
    const translateY = useRef(new Animated.Value(24)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 360,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                tension: 60,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // ── Press scale ───────────────────────────────────────────────────────────
    const cardScale = useRef(new Animated.Value(1)).current;
    const pressIn = () => Animated.spring(cardScale, { toValue: 0.985, useNativeDriver: true, speed: 50 }).start();
    const pressOut = () => Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 18 }).start();

    // ── CTA button ────────────────────────────────────────────────────────────
    const isPrimary = cfg.ctaVariant === 'primary';
    const ctaBg = isPrimary
        ? C.primary
        : isDark ? '#2A2318' : '#EDEBE6';
    const ctaColor = isPrimary ? '#1a1a1a' : C.textSecondary;

    const s = makeStyles(C, isDark);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY }, { scale: cardScale }] }}>
            <TouchableOpacity
                onPress={() => onPress?.(order)}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={1}
            >
                <View style={s.card}>

                    {/* ── Top row: ORDER ID + Status badge ──────────── */}
                    <View style={s.topRow}>
                        <Text style={[s.orderLabel, { color: C.textMuted }]}>ORDER ID</Text>
                        <StatusBadge status={status} cfg={cfg} />
                    </View>

                    {/* ── Order number ───────────────────────────────── */}
                    <Text style={[s.orderId, { color: C.primary }]}>#{displayId}</Text>

                    {/* ── Divider ────────────────────────────────────── */}
                    <View style={[s.divider, { backgroundColor: C.border }]} />

                    {/* ── Bike + service ─────────────────────────────── */}
                    <View style={s.bikeRow}>
                        <BikeIconTile isDark={isDark} C={C} status={status} />
                        <View style={s.bikeInfo}>
                            <Text style={[s.bikeName, { color: C.textPrimary }]} numberOfLines={1}>
                                {bikeName}
                            </Text>
                            <Text style={[s.serviceType, { color: C.textMuted }]} numberOfLines={1}>
                                {serviceType}
                            </Text>
                        </View>
                    </View>

                    {/* ── Date / time ────────────────────────────────── */}
                    {!!dateStr && (
                        <View style={s.dateRow}>
                            <Ionicons name="calendar-outline" size={13} color={C.textMuted} />
                            <Text style={[s.dateText, { color: C.textMuted }]}>{dateStr}</Text>
                        </View>
                    )}

                    {/* ── CTA button ─────────────────────────────────── */}
                    <TouchableOpacity
                        style={[s.ctaBtn, { backgroundColor: ctaBg }]}
                        onPress={() => onCta?.(order)}
                        activeOpacity={0.82}
                    >
                        <Text style={[s.ctaText, { color: ctaColor }]}>{cfg.ctaLabel}</Text>
                    </TouchableOpacity>

                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C, isDark) {
    return StyleSheet.create({
        card: {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
            padding: 18,
            gap: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 12,
            elevation: 4,
        },

        // Top row
        topRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        orderLabel: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1.8,
            textTransform: 'uppercase',
        },

        // Order ID
        orderId: {
            fontSize: 22,
            fontWeight: '800',
            letterSpacing: 0.5,
            marginTop: -4,
        },

        // Divider
        divider: {
            height: StyleSheet.hairlineWidth,
            marginVertical: 2,
        },

        // Bike row
        bikeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        bikeInfo: {
            flex: 1,
            gap: 3,
        },
        bikeName: {
            fontSize: 15,
            fontWeight: '700',
            letterSpacing: 0.1,
        },
        serviceType: {
            fontSize: 12,
            letterSpacing: 0.1,
        },

        // Date
        dateRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        dateText: {
            fontSize: 12,
            letterSpacing: 0.1,
        },

        // CTA
        ctaBtn: {
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 2,
        },
        ctaText: {
            fontSize: 12,
            fontWeight: '800',
            letterSpacing: 2,
            textTransform: 'uppercase',
        },
    });
}