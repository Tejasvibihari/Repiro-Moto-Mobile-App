// components/orders/OrderCard.js
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

// ─── Status config (matches Order model enum) ─────────────────────────────────
const STATUS_CONFIG = {
    pending: {
        label: 'PENDING',
        dotColor: '#E2A731',
        badgeBg: 'rgba(226,167,49,0.12)',
        badgeBorder: 'rgba(226,167,49,0.25)',
        textColor: '#E2A731',
    },
    mechanic_assigned: {
        label: 'MECHANIC ASSIGNED',
        dotColor: '#7B68EE',
        badgeBg: 'rgba(123,104,238,0.12)',
        badgeBorder: 'rgba(123,104,238,0.25)',
        textColor: '#7B68EE',
    },
    mechanic_arrived: {
        label: 'MECHANIC ARRIVED',
        dotColor: '#4A90E2',
        badgeBg: 'rgba(74,144,226,0.12)',
        badgeBorder: 'rgba(74,144,226,0.25)',
        textColor: '#4A90E2',
    },
    in_progress: {
        label: 'IN PROGRESS',
        dotColor: '#5B8CFF',
        badgeBg: 'rgba(91,140,255,0.12)',
        badgeBorder: 'rgba(91,140,255,0.25)',
        textColor: '#5B8CFF',
    },
    work_completed: {
        label: 'WORK COMPLETED',
        dotColor: '#2ECC9A',
        badgeBg: 'rgba(46,204,154,0.12)',
        badgeBorder: 'rgba(46,204,154,0.25)',
        textColor: '#2ECC9A',
    },
    invoice_generated: {
        label: 'INVOICE GENERATED',
        dotColor: '#F39C12',
        badgeBg: 'rgba(243,156,18,0.12)',
        badgeBorder: 'rgba(243,156,18,0.25)',
        textColor: '#F39C12',
    },
    completed: {
        label: 'COMPLETED',
        dotColor: '#2ECC9A',
        badgeBg: 'rgba(46,204,154,0.12)',
        badgeBorder: 'rgba(46,204,154,0.25)',
        textColor: '#2ECC9A',
    },
    cancelled: {
        label: 'CANCELLED',
        dotColor: '#FF6B6B',
        badgeBg: 'rgba(255,107,107,0.10)',
        badgeBorder: 'rgba(255,107,107,0.22)',
        textColor: '#FF6B6B',
    },
};

// ─── Payment status config ────────────────────────────────────────────────────
const PAYMENT_CONFIG = {
    unpaid: {
        label: 'UNPAID',
        dotColor: '#FF6B6B',
        badgeBg: 'rgba(255,107,107,0.10)',
        badgeBorder: 'rgba(255,107,107,0.22)',
        textColor: '#FF6B6B',
    },
    partial: {
        label: 'PARTIAL',
        dotColor: '#F39C12',
        badgeBg: 'rgba(243,156,18,0.12)',
        badgeBorder: 'rgba(243,156,18,0.25)',
        textColor: '#F39C12',
    },
    paid: {
        label: 'PAID',
        dotColor: '#2ECC9A',
        badgeBg: 'rgba(46,204,154,0.12)',
        badgeBorder: 'rgba(46,204,154,0.25)',
        textColor: '#2ECC9A',
    },
};

// ─── Format date helper (Hermes-safe, no Intl) ───────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

// ─── Badge component (reusable) ──────────────────────────────────────────────
function Badge({ config }) {
    return (
        <View style={[
            badgeStyles.wrap,
            { backgroundColor: config.badgeBg, borderColor: config.badgeBorder },
        ]}>
            <View style={[badgeStyles.dot, { backgroundColor: config.dotColor }]} />
            <Text style={[badgeStyles.label, { color: config.textColor }]}>{config.label}</Text>
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
 *     _id            string
 *     orderId        string
 *     status         string   (from model enum)
 *     paymentStatus  string   ('unpaid'|'partial'|'paid')
 *     selectedBrand  string
 *     selectedModel  string
 *     services       array
 *     preferredDate  string
 *     createdAt      string
 *
 *   onPress(order)   — tapped the card
 *   onCta(order)     — tapped the "VIEW DETAILS" button
 *   delay  {number}  — stagger animation delay in ms
 */
export default function OrderCard({ order, onPress, onCta, delay = 0 }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    // Order status mapping
    const rawStatus = order?.status ?? 'Pending';
    const statusKey = rawStatus.toLowerCase().replace(/ /g, '_');
    const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;

    // Payment status mapping
    const paymentKey = order?.paymentStatus ?? 'unpaid';
    const paymentCfg = PAYMENT_CONFIG[paymentKey] ?? PAYMENT_CONFIG.unpaid;

    const displayId = order?.orderId ?? order?._id?.slice(-6)?.toUpperCase() ?? '------';
    const bikeName = `${order?.selectedBrand ?? ''} ${order?.selectedModel ?? ''}`.trim() || 'Unknown Bike';
    const serviceType = Array.isArray(order?.services) && order.services.length > 0
        ? order.services.join(', ')
        : 'Service';
    const dateStr = formatDateTime(order?.preferredDate ?? order?.createdAt);

    // Entrance animation
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

    // Press scale
    const cardScale = useRef(new Animated.Value(1)).current;
    const pressIn = () => Animated.spring(cardScale, { toValue: 0.985, useNativeDriver: true, speed: 50 }).start();
    const pressOut = () => Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 18 }).start();

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

                    {/* Top row: ORDER ID + Status badge + Payment badge */}
                    <View style={s.topRow}>
                        <Text style={[s.orderLabel, { color: C.textMuted }]}>ORDER ID</Text>
                        <View style={s.badgeRow}>
                            <Badge config={statusCfg} />
                            <Badge config={paymentCfg} />
                        </View>
                    </View>

                    {/* Order number */}
                    <Text style={[s.orderId, { color: C.primary }]}>#{displayId}</Text>

                    {/* Divider */}
                    <View style={[s.divider, { backgroundColor: C.border }]} />

                    {/* Bike + service */}
                    <View style={s.bikeRow}>
                        <BikeIconTile isDark={isDark} C={C} status={statusKey} />
                        <View style={s.bikeInfo}>
                            <Text style={[s.bikeName, { color: C.textPrimary }]} numberOfLines={1}>
                                {bikeName}
                            </Text>
                            <Text style={[s.serviceType, { color: C.textMuted }]} numberOfLines={1}>
                                {serviceType}
                            </Text>
                        </View>
                    </View>

                    {/* Date / time */}
                    {!!dateStr && (
                        <View style={s.dateRow}>
                            <Ionicons name="calendar-outline" size={13} color={C.textMuted} />
                            <Text style={[s.dateText, { color: C.textMuted }]}>{dateStr}</Text>
                        </View>
                    )}

                    {/* Single CTA button: VIEW DETAILS */}
                    <TouchableOpacity
                        style={[s.ctaBtn, { backgroundColor: isDark ? '#2A2318' : '#EDEBE6' }]}
                        onPress={() => onCta?.(order)}
                        activeOpacity={0.82}
                    >
                        <Text style={[s.ctaText, { color: C.textSecondary }]}>VIEW DETAILS</Text>
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
        badgeRow: {
            flexDirection: 'row',
            gap: 8,
        },
        orderId: {
            fontSize: 22,
            fontWeight: '800',
            letterSpacing: 0.5,
            marginTop: -4,
        },
        divider: {
            height: StyleSheet.hairlineWidth,
            marginVertical: 2,
        },
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
        dateRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        dateText: {
            fontSize: 12,
            letterSpacing: 0.1,
        },
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