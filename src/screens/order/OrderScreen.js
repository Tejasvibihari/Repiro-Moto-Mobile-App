// screens/order/OrderScreen.js
// "Service History" screen — matches the design:
//   - TabScreenWrapper (hamburger topbar)
//   - Large bold heading + subtitle
//   - Filter tabs (All / In Progress / Completed / Cancelled)
//   - FlatList of OrderCards
//   - Empty state
//   - Pull-to-refresh

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Animated,
    RefreshControl,
    Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import TabScreenWrapper from '../../components/common/TabScreenWrapper';
import OrderCard from '../../components/orders/OrderCard';
import Loader from '../../components/common/Loader';
import useOrder from '../../hooks/useOrder'; // ← your orders hook (see note below)

// ─── Filter tab config ────────────────────────────────────────────────────────
const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
];

// ─── Filter Tab Bar ───────────────────────────────────────────────────────────
function FilterTabs({ active, onChange, C, isDark }) {
    return (
        <View style={tabStyles.scrollWrap}>
            <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tabStyles.row}
            >
                {FILTERS.map((f) => {
                    const isActive = active === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            onPress={() => onChange(f.key)}
                            style={[
                                tabStyles.tab,
                                {
                                    backgroundColor: isActive
                                        ? C.primary
                                        : isDark ? '#1C1A14' : '#F0EDE6',
                                    borderColor: isActive
                                        ? C.primary
                                        : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                                },
                            ]}
                            activeOpacity={0.75}
                        >
                            <Text
                                style={[
                                    tabStyles.label,
                                    { color: isActive ? '#1a1a1a' : C.textSecondary },
                                ]}
                            >
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </Animated.ScrollView>
        </View>
    );
}

const tabStyles = StyleSheet.create({
    scrollWrap: { marginHorizontal: -20 },
    row: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 2,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({ C, count }) {
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideY = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 420, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideY }] }}>
            <Text style={[headerStyles.title, { color: C.textPrimary }]}>
                Service History
            </Text>
            <Text style={[headerStyles.subtitle, { color: C.textSecondary }]}>
                Detailed record of your machine's{'\n'}precision maintenance.
            </Text>
        </Animated.View>
    );
}

const headerStyles = StyleSheet.create({
    title: {
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: -0.5,
        lineHeight: 36,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 20,
        marginTop: 6,
        letterSpacing: 0.1,
    },
});

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filter, C, isDark }) {
    const label = filter === 'all'
        ? 'No orders yet'
        : `No ${FILTERS.find(f => f.key === filter)?.label ?? ''} orders`;

    return (
        <View style={emptyStyles.wrap}>
            <View style={[emptyStyles.iconWrap, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                <MaterialCommunityIcons name="tools" size={36} color={C.primary} />
            </View>
            <Text style={[emptyStyles.title, { color: C.textPrimary }]}>{label}</Text>
            <Text style={[emptyStyles.sub, { color: C.textMuted }]}>
                Your service history will appear here once you book a service.
            </Text>
        </View>
    );
}

const emptyStyles = StyleSheet.create({
    wrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 14,
        paddingHorizontal: 24,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    sub: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },
});

// ─── OrderScreen ──────────────────────────────────────────────────────────────
export default function OrderScreen({ navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const [activeFilter, setActiveFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { orders, loading, refetch } = useOrder();
    // ── Filter + sort newest first ─────────────────────────────────────────────
    const sorted = [...orders].sort((a, b) =>
        new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
    );
    const filtered = activeFilter === 'all'
        ? sorted
        : sorted.filter(o =>
            (o.status ?? '').toLowerCase().replace(' ', '_') === activeFilter
        );

    // ── Pull-to-refresh ───────────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch?.();
        setRefreshing(false);
    }, [refetch]);

    // ── Navigation handlers ───────────────────────────────────────────────────
    const handleCardPress = (order) => {
        navigation?.navigate?.('OrderDetail', { orderId: order._id, order });
    };

    const handleCta = (order) => {
        const status = (order?.status ?? '').toLowerCase().replace(' ', '_');
        if (status === 'in_progress') {
            navigation?.navigate?.('TrackService', { orderId: order._id });
        } else {
            navigation?.navigate?.('OrderDetail', { orderId: order._id, order });
        }
    };

    // ── List header (rendered inside FlatList so it scrolls) ─────────────────
    const ListHeader = (
        <View style={screenStyles.listHeader}>
            {/* <PageHeader C={C} count={filtered.length} /> */}
            <FilterTabs
                active={activeFilter}
                onChange={setActiveFilter}
                C={C}
                isDark={isDark}
            />
        </View>
    );

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading && orders.length === 0) {
        return (
            <TabScreenWrapper navigation={navigation} greeting="Orders">
                <Loader variant="skeleton" rows={5} />
            </TabScreenWrapper>
        );
    }

    return (
        <TabScreenWrapper navigation={navigation} greeting="Orders">
            <FlatList
                data={filtered}
                keyExtractor={(item) => item._id ?? item.orderId ?? Math.random().toString()}
                renderItem={({ item, index }) => (
                    <OrderCard
                        order={item}
                        onPress={handleCardPress}
                        onCta={handleCta}
                        delay={index * 70}
                    />
                )}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={
                    !loading && (
                        <EmptyState filter={activeFilter} C={C} isDark={isDark} />
                    )
                }
                contentContainerStyle={[
                    screenStyles.listContent,
                    { backgroundColor: theme.colors.background },
                ]}
                ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={C.primary}
                        colors={[C.primary]}
                    />
                }
                // Bottom padding so last card clears tab bar
                ListFooterComponent={<View style={{ height: 100 }} />}
            />
        </TabScreenWrapper>
    );
}

// ─── Screen styles ────────────────────────────────────────────────────────────
const screenStyles = StyleSheet.create({
    listContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    listHeader: {
        gap: 18,
        paddingTop: 22,
        paddingBottom: 8,
    },
});