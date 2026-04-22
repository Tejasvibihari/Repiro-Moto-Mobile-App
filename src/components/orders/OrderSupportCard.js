// components/orders/OrderSupportCard.js
//
// A "Having an issue?" card shown on OrderDetailScreen.
// Tapping navigates to the Support screen (drawer route "Support")
// and pre-fires an automatic greeting message tied to the order.
//
// ─── HOW TO USE ───────────────────────────────────────────────────────────────
//
// In OrderDetailScreen.js, import and drop in after MechanicRatingCard:
//
//   import OrderSupportCard from '../../components/orders/OrderSupportCard';
//
//   <OrderSupportCard order={order} navigation={navigation} />
//
// The navigation prop flows from the screen's props automatically.
// The Support screen must accept route.params.autoMessage (string).
//
// ─── SUPPORT SCREEN CHANGES ───────────────────────────────────────────────────
// In SupportScreen.js, read the autoMessage param on mount and inject it:
//
//   const route = useRoute();
//   useEffect(() => {
//     if (route.params?.autoMessage) {
//       // Add as first message in chat — see bottom of this file for snippet
//       setMessages([{
//         id: Date.now().toString(),
//         text: route.params.autoMessage,
//         sender: 'user',
//         timestamp: new Date(),
//       }]);
//       // optionally auto-send it to the backend here
//     }
//   }, []);
//
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';

// Quick-action items shown as chips inside the card
const QUICK_ACTIONS = [
    {
        id: 'mechanic_late',
        icon: 'clock-alert-outline',
        label: 'Mechanic is late',
        message: (order) =>
            `Hi! I have a concern about my order #${order.orderId}. The mechanic hasn't arrived yet and I'm worried about the delay. Could you please help me with this?`,
    },
    {
        id: 'wrong_service',
        icon: 'wrench-clock',
        label: 'Wrong service done',
        message: (order) =>
            `Hi! I'm reaching out about order #${order.orderId} for my ${order.selectedBrand} ${order.selectedModel}. The service performed doesn't match what I had requested. Could someone please look into this?`,
    },
    {
        id: 'payment_issue',
        icon: 'credit-card-off-outline',
        label: 'Payment issue',
        message: (order) =>
            `Hi! I'm facing a payment issue with order #${order.orderId}. The payment status doesn't seem right. Could you help me resolve this?`,
    },
    {
        id: 'other',
        icon: 'chat-question-outline',
        label: 'Other issue',
        message: (order) =>
            `Hi! I need help with my order #${order.orderId} (${order.selectedBrand} ${order.selectedModel}). Could you please assist me?`,
    },
];

// Builds the default greeting when tapping the main CTA (not a quick action)
function buildGreeting(order) {
    const statusLabel = order.status ?? 'active';
    const bike = [order.selectedBrand, order.selectedModel, order.modelName]
        .filter(Boolean)
        .join(' ');
    return `Hi! I need help with my order #${order.orderId}${bike ? ` for my ${bike}` : ''}. The current status is "${statusLabel}". Could someone please assist me?`;
}

// ─── Quick action chip ────────────────────────────────────────────────────────
function QuickChip({ action, order, onPress, theme, isDark }) {
    const C = theme.colors;
    return (
        <TouchableOpacity
            style={[chip.root, {
                backgroundColor: isDark ? '#2A2318' : '#FFF4E0',
                borderColor: isDark ? 'rgba(226,167,49,0.2)' : 'rgba(226,167,49,0.25)',
            }]}
            onPress={() => onPress(action.message(order))}
            activeOpacity={0.75}
        >
            <MaterialCommunityIcons name={action.icon} size={13} color={C.primary} />
            <Text style={[chip.label, { color: C.textSecondary }]}>{action.label}</Text>
        </TouchableOpacity>
    );
}

const chip = StyleSheet.create({
    root: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 11,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
});

// ─── Main card ────────────────────────────────────────────────────────────────
export default function OrderSupportCard({ order, navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideY = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
        ]).start();
    }, []);

    const goToSupport = (autoMessage) => {
        // Navigate directly to ChatSupportScreen, passing order and autoMessage
        navigation.navigate('ChatSupport', { order, autoMessage });
    };
    return (
        <Animated.View
            style={[
                card.wrapper,
                {
                    backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                    opacity: fadeIn,
                    transform: [{ translateY: slideY }],
                },
            ]}
        >
            {/* ── Header row ── */}
            <View style={card.headerRow}>
                <View style={[card.iconWrap, { backgroundColor: isDark ? '#1A1E2E' : '#EEF2FF' }]}>
                    <Ionicons name="help-buoy-outline" size={18} color="#5B8CFF" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[card.title, { color: C.textPrimary }]}>Having an Issue?</Text>
                    <Text style={[card.subtitle, { color: C.textMuted }]}>
                        We're here to help — tap below to reach our support team
                    </Text>
                </View>
            </View>

            {/* ── Divider ── */}
            <View style={[card.divider, { backgroundColor: C.border }]} />

            {/* ── Quick action chips ── */}
            <View style={card.chipsRow}>
                {QUICK_ACTIONS.map((action) => (
                    <QuickChip
                        key={action.id}
                        action={action}
                        order={order}
                        onPress={goToSupport}
                        theme={theme}
                        isDark={isDark}
                    />
                ))}
            </View>

            {/* ── Main CTA button ── */}
            <TouchableOpacity
                style={[card.ctaBtn, {
                    backgroundColor: isDark ? '#1A1E2E' : '#EEF2FF',
                    borderColor: isDark ? 'rgba(91,140,255,0.2)' : 'rgba(91,140,255,0.3)',
                }]}
                onPress={() => goToSupport(buildGreeting(order))}
                activeOpacity={0.8}
            >
                <View style={card.ctaLeft}>
                    <View style={[card.ctaIconBadge, { backgroundColor: '#5B8CFF' }]}>
                        <Ionicons name="chatbubbles" size={15} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[card.ctaTitle, { color: C.textPrimary }]}>
                            Chat with Support
                        </Text>
                        <Text style={[card.ctaSub, { color: C.textMuted }]}>
                            Typically replies within a few minutes
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
        </Animated.View>
    );
}

const card = StyleSheet.create({
    wrapper: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: 11,
        marginTop: 3,
        lineHeight: 16,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 13,
        paddingHorizontal: 14,
    },
    ctaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    ctaIconBadge: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaTitle: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    ctaSub: {
        fontSize: 11,
        marginTop: 2,
    },
});