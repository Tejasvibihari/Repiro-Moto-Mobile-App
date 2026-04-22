// components/support/SupportOrderCard.js
//
// Usage in SupportScreen:
//   <SupportOrderCard order={order} index={i} navigation={navigation} />
//
// Tapping "Chat with us" navigates to ChatSupportScreen via:
//   navigation.navigate('ChatSupport', { order })

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

const STATUS_META = {
    'Pending': { label: 'Pending', color: '#e2a731', icon: 'time' },
    'Mechanic Assigned': { label: 'Mechanic Assigned', color: '#3498db', icon: 'person' },
    'Mechanic Arrived': { label: 'Mechanic Arrived', color: '#2ecc71', icon: 'location' },
    'In Progress': { label: 'In Progress', color: '#5B9CF6', icon: 'construct' },
    'Work Completed': { label: 'Work Completed', color: '#9b59b6', icon: 'checkmark-done' },
    'Invoice Generated': { label: 'Invoice Generated', color: '#f39c12', icon: 'document' },
    'Completed': { label: 'Completed', color: '#2ECC9A', icon: 'checkmark-circle' },
    'Cancelled': { label: 'Cancelled', color: '#FF6B6B', icon: 'close-circle' }
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SupportOrderCard({ order, index = 0, navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const translateY = useRef(new Animated.Value(24)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0, speed: 18, bounciness: 5,
                delay: index * 80, useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1, duration: 280,
                delay: index * 80, useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const statusKey = order?.status ?? 'Completed';
    const meta = STATUS_META[statusKey] ?? STATUS_META['Completed'];

    const serviceLabel = order?.serviceType || order?.service?.name || order?.serviceName || 'Repair Service';
    const bikeLabel = order?.bike
        ? `${order.bike.brand ?? ''} ${order.bike.model ?? ''}`.trim()
        : order?.bikeName ?? '';
    const orderId = order?._id
        ? `#${String(order.orderId)}`
        : '#------';
    const completedAt = order?.completedAt || order?.updatedAt || order?.createdAt;

    const handleChatPress = () => {
        navigation?.navigate('ChatSupport', { order });
    };

    return (
        <Animated.View style={{ transform: [{ translateY }], opacity }}>
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        shadowColor: theme.colors.primary,
                    },
                ]}
            >
                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.orderId, { color: theme.colors.textPrimary }]}>
                            {orderId}
                        </Text>
                        {completedAt ? (
                            <Text style={[styles.dateText, { color: theme.colors.textMuted }]}>
                                {formatDate(completedAt)}
                            </Text>
                        ) : null}
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` }]}>
                        <Ionicons name={meta.icon} size={12} color={meta.color} />
                        <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                {/* Details */}
                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <View style={[styles.detailIcon, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0' }]}>
                            <Ionicons name="construct-outline" size={14} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>Service</Text>
                            <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                                {serviceLabel}
                            </Text>
                        </View>
                    </View>

                    {bikeLabel ? (
                        <View style={styles.detailItem}>
                            <View style={[styles.detailIcon, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0' }]}>
                                <MaterialCommunityIcons name="bicycle" size={14} color={theme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.detailLabel, { color: theme.colors.textMuted }]}>Bike</Text>
                                <Text style={[styles.detailValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                                    {bikeLabel}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                </View>

                {/* Chat CTA */}
                <TouchableOpacity
                    style={[styles.chatBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleChatPress}
                    activeOpacity={0.78}
                >
                    <Ionicons name="chatbubble-ellipses" size={16} color="#1a1a1a" />
                    <Text style={styles.chatBtnText}>Chat with us about this order</Text>
                    <Ionicons name="arrow-forward" size={14} color="#1a1a1a" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        marginBottom: 14,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
        gap: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerLeft: { gap: 2 },
    orderId: { fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
    dateText: { fontSize: 12, fontWeight: '500' },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    divider: { height: StyleSheet.hairlineWidth },
    detailsRow: { flexDirection: 'row', gap: 20 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    detailIcon: {
        width: 30, height: 30, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    detailLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
    detailValue: { fontSize: 13, fontWeight: '700', marginTop: 1 },
    chatBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
    },
    chatBtnText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', letterSpacing: 0.1 },
});