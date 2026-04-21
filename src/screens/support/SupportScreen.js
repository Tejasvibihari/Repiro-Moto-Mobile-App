// screens/support/SupportScreen.js
import React, { useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Loader from '../../components/common/Loader';
import SupportOrderCard from '../../components/support/SupportOrderCard';
import useOrder from '../../hooks/useOrder';
import { useNavigation } from '@react-navigation/native';


// ── Config ────────────────────────────────────────────────────────────────────
const WHATSAPP_NUMBER = '919876543210'; // replace with your actual support number (country code + number)
const SUPPORT_EMAIL = 'support@repairomoto.in';
const SUPPORT_PHONE = '+91 98765 43210';

const QUICK_LINKS = [
    {
        id: 'whatsapp',
        icon: 'logo-whatsapp',
        label: 'WhatsApp Us',
        sub: 'Fastest response',
        color: '#25D366',
        onPress: () => Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`),
    },
    {
        id: 'email',
        icon: 'mail-outline',
        label: 'Email Support',
        sub: SUPPORT_EMAIL,
        color: '#5B9CF6',
        onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
    },
    // {
    //     id: 'call',
    //     icon: 'call-outline',
    //     label: 'Call Us',
    //     sub: SUPPORT_PHONE,
    //     color: '#2ECC9A',
    //     onPress: () => Linking.openURL(`tel:${SUPPORT_PHONE}`),
    // },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function isWithin7Days(dateStr) {
    if (!dateStr) return false;
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    return now - then <= 7 * 24 * 60 * 60 * 1000;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SupportScreen({ navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const insets = useSafeAreaInsets();

    const { orders, loading } = useOrder();

    // Filter: completed orders within last 7 days
    const recentOrders = useMemo(
        () =>
            (orders ?? []).filter((o) => {
                // const isCompleted = o?.status?.toLowerCase() === 'completed';
                const dateStr = o?.completedAt || o?.updatedAt || o?.createdAt;
                return isWithin7Days(dateStr);
            }),
        [orders]
    );

    // Chat handler — opens WhatsApp with pre-filled order context
    const handleChat = useCallback((order) => {
        const orderId = order?._id
            ? `#${String(order._id).slice(-6).toUpperCase()}`
            : '';
        const service = order?.serviceType || order?.serviceName || 'service';
        const msg = encodeURIComponent(
            `Hi, I need help with my recent order ${orderId} (${service}). Can you assist me?`
        );
        Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`);
    }, []);

    return (
        <ScreenWrapper title="Support">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scroll,
                    { paddingBottom: insets.bottom + 100 },
                ]}
            >
                {/* ── Hero blurb ─────────────────────────────────── */}
                <View
                    style={[
                        styles.heroBanner,
                        {
                            backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                            borderColor: theme.colors.border,
                        },
                    ]}
                >
                    <View
                        style={[
                            styles.heroIcon,
                            { backgroundColor: `${theme.colors.primary}22` },
                        ]}
                    >
                        <Ionicons
                            name="headset-outline"
                            size={28}
                            color={theme.colors.primary}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
                            We're here for you
                        </Text>
                        <Text style={[styles.heroSub, { color: theme.colors.textSecondary }]}>
                            Reach us via WhatsApp, call, or email. Typical reply time: under 2 hrs.
                        </Text>
                    </View>
                </View>

                {/* ── Quick contact links ────────────────────────── */}
                <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>
                    CONTACT US
                </Text>

                <View style={styles.linksGrid}>
                    {QUICK_LINKS.map((link) => (
                        <TouchableOpacity
                            key={link.id}
                            style={[
                                styles.linkCard,
                                {
                                    backgroundColor: theme.colors.surface,
                                    borderColor: theme.colors.border,
                                    shadowColor: theme.colors.primary,
                                },
                            ]}
                            onPress={link.onPress}
                            activeOpacity={0.75}
                        >
                            <View
                                style={[
                                    styles.linkIconWrap,
                                    { backgroundColor: `${link.color}18` },
                                ]}
                            >
                                <Ionicons name={link.icon} size={20} color={link.color} />
                            </View>
                            <Text style={[styles.linkLabel, { color: theme.colors.textPrimary }]}>
                                {link.label}
                            </Text>
                            <Text
                                style={[styles.linkSub, { color: theme.colors.textMuted }]}
                                numberOfLines={1}
                            >
                                {link.sub}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Recent orders ──────────────────────────────── */}
                <Text style={[styles.sectionLabel, { color: theme.colors.textMuted, marginTop: 28 }]}>
                    RECENT BOOKINGS (LAST 7 DAYS)
                </Text>

                {loading ? (
                    <Loader variant="inline" message="Fetching orders..." />
                ) : recentOrders.length === 0 ? (
                    <View
                        style={[
                            styles.emptyBox,
                            {
                                backgroundColor: isDark ? '#231E14' : '#FFF8EC',
                                borderColor: theme.colors.border,
                            },
                        ]}
                    >
                        <Ionicons
                            name="receipt-outline"
                            size={34}
                            color={theme.colors.textMuted}
                        />
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                            No completed orders in the last 7 days
                        </Text>
                        <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
                            You can still reach us using the options above.
                        </Text>
                    </View>
                ) : (
                    recentOrders.map((order, i) => (
                        <SupportOrderCard
                            key={order._id ?? i}
                            order={order}
                            index={i}
                            navigation={navigation}   // ← add this
                        />
                    ))
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scroll: {
        paddingTop: 20,
    },

    // Hero
    heroBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 28,
    },
    heroIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.2,
        marginBottom: 4,
    },
    heroSub: {
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '400',
    },

    // Section label
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 14,
    },

    // Quick links grid
    linksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    linkCard: {
        width: '47%',
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        gap: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
        elevation: 3,
    },
    linkIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkLabel: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    linkSub: {
        fontSize: 11,
        fontWeight: '500',
    },

    // Empty state
    emptyBox: {
        borderRadius: 18,
        borderWidth: 1,
        paddingVertical: 36,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 4,
    },
    emptySub: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});