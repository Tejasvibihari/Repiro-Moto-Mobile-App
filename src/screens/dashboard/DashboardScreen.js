// screens/dashboard/DashboardScreen.js
//
// Home Dashboard sections:
//   1. Greeting header + notification bell + theme toggle
//   2. Search bar
//   3. Offer/Announcement Banner Carousel (auto-slide + swipeable)
//   4. Quick Actions: Book Service + Emergency Repair (compact rectangular buttons)
//   5. Active / Recent Order Card (most recent order)
//   6. Your Garage (bikes list + Add New Bike)
//   7. Premium Services grid
//   8. Nearby Service Centers
//   9. Exclusive Offers (horizontal scroll)

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Animated,
    FlatList,
    Dimensions,
    RefreshControl,
    Platform,
    Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import TabScreenWrapper from '../../components/common/TabScreenWrapper';
import useFetchBike from '../../hooks/useBikes';
import useFetchOrder from '../../hooks/useOrder';
import axiosClient from '../../services/axiosClient';
import { getImageUrl } from '../../utils/imageUtils';
import ServiceDetailSheet from '../../components/dashboard/ServiceDetailSheet.js';
import SERVICE_DETAILS from '../../data/serviceDetails.js';


const { width: W } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
}

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Animated section wrapper ─────────────────────────────────────────────────
function FadeUp({ delay = 0, children }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const y = useRef(new Animated.Value(18)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
            Animated.spring(y, { toValue: 0, friction: 8, tension: 55, delay, useNativeDriver: true }),
        ]).start();
    }, []);
    return <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>{children}</Animated.View>;
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, actionLabel, onAction, C }) {
    return (
        <View style={sh.row}>
            <Text style={[sh.title, { color: C.textPrimary }]}>{title}</Text>
            {!!actionLabel && (
                <TouchableOpacity onPress={onAction} activeOpacity={0.75}>
                    <Text style={[sh.action, { color: C.primary }]}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
const sh = StyleSheet.create({
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '800', letterSpacing: 0.1 },
    action: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});

// ══════════════════════════════════════════════════════════════════════════════
// BANNER CAROUSEL — auto-slides on a timer, and the user can swipe it manually.
// Aspect ratio matches the admin console's crop (16:9), so images always fit
// without stretching. Fetches /api/banner/active (admin-curated, ordered, max 5).
// ══════════════════════════════════════════════════════════════════════════════
const BANNER_H_PADDING = 20;
const BANNER_CARD_WIDTH = W - BANNER_H_PADDING * 2; // visual card width (for aspect ratio)
const BANNER_HEIGHT = Math.round((BANNER_CARD_WIDTH * 9) / 16); // 16:9, matches admin crop
const BANNER_AUTO_SLIDE_MS = 4000;
// The paging "pitch" — the distance the list scrolls per page — MUST be the
// full screen width, because that's the actual footprint of each FlatList item.
const BANNER_PAGE_WIDTH = W;

function BannerCarousel({ banners, onBannerPress, C, isDark }) {
    const listRef = useRef(null);
    const indexRef = useRef(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const timerRef = useRef(null);

    const stopAutoSlide = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startAutoSlide = useCallback(() => {
        stopAutoSlide();
        if (!banners || banners.length <= 1) return;
        timerRef.current = setInterval(() => {
            const next = (indexRef.current + 1) % banners.length;
            listRef.current?.scrollToOffset({ offset: next * BANNER_PAGE_WIDTH, animated: true });
            indexRef.current = next;
            setActiveIndex(next);
        }, BANNER_AUTO_SLIDE_MS);
    }, [banners, stopAutoSlide]);

    useEffect(() => {
        indexRef.current = 0;
        setActiveIndex(0);
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        startAutoSlide();
        return stopAutoSlide;
    }, [banners, startAutoSlide, stopAutoSlide]);

    const handleMomentumScrollEnd = (e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_PAGE_WIDTH);
        indexRef.current = idx;
        setActiveIndex(idx);
    };

    if (!banners || banners.length === 0) return null;

    return (
        <View style={bc.wrap}>
            <FlatList
                ref={listRef}
                data={banners}
                keyExtractor={(item) => item._id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={BANNER_PAGE_WIDTH}
                decelerationRate="fast"
                bounces={false}
                onScrollBeginDrag={stopAutoSlide}
                onMomentumScrollEnd={(e) => {
                    handleMomentumScrollEnd(e);
                    startAutoSlide();
                }}
                renderItem={({ item }) => (
                    // Item is EXACTLY the full screen width — this is the true
                    // paging unit. The visual inset/padding goes on the inner
                    // TouchableOpacity, not on this wrapper, so it never affects
                    // how much of the neighbor peeks in.
                    <View style={{ width: BANNER_PAGE_WIDTH, paddingHorizontal: BANNER_H_PADDING }}>
                        <TouchableOpacity
                            activeOpacity={item.link ? 0.9 : 1}
                            onPress={() => onBannerPress(item)}
                            style={[
                                bc.slide,
                                { height: BANNER_HEIGHT, backgroundColor: isDark ? '#1C1A14' : '#F5F2EC' },
                            ]}
                        >
                            <Image source={{ uri: getImageUrl(item.image) }} style={bc.image} resizeMode="cover" />
                        </TouchableOpacity>
                    </View>
                )}
            />

            {banners.length > 1 && (
                <View style={bc.dotsRow}>
                    {banners.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                bc.dot,
                                {
                                    width: i === activeIndex ? 16 : 6,
                                    backgroundColor: i === activeIndex ? C.primary : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                                },
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}
const bc = StyleSheet.create({
    wrap: { marginBottom: 20 },
    slide: {
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    image: { width: '100%', height: '100%' },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 },
    dot: { height: 6, borderRadius: 3 },
});
// ══════════════════════════════════════════════════════════════════════════════
// 3. QUICK ACTIONS — compact rectangular buttons (not large square cards)
// ══════════════════════════════════════════════════════════════════════════════
function QuickActions({ onBookService, onEmergency, C, isDark }) {
    const actions = [
        {
            key: 'book',
            label: 'BOOK SERVICE',
            icon: 'tools',
            onPress: onBookService,
            accent: C.primary,
            textColor: '#1a1a1a',
        },
        {
            key: 'emergency',
            label: 'EMERGENCY REPAIR',
            icon: 'alert-octagon',
            onPress: onEmergency,
            accent: '#FF6B6B',
            textColor: '#fff',
        },
    ];

    return (
        <View style={qa.row}>
            {actions.map((a) => (
                <TouchableOpacity
                    key={a.key}
                    style={[qa.btn, { backgroundColor: a.accent, shadowColor: a.accent }]}
                    onPress={a.onPress}
                    activeOpacity={0.82}
                >
                    <View style={[qa.iconWrap, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                        <MaterialCommunityIcons name={a.icon} size={17} color={a.textColor} />
                    </View>
                    <Text style={[qa.label, { color: a.textColor }]} numberOfLines={1}>
                        {a.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}
const qa = StyleSheet.create({
    row: { flexDirection: 'row', gap: 12 },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
        elevation: 5,
    },
    iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.4, flexShrink: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. ACTIVE / RECENT ORDER CARD
// ══════════════════════════════════════════════════════════════════════════════
const ORDER_STATUS_CFG = {
    'pending': { color: '#E2A731', icon: 'clock-outline', label: 'Pending' },
    'mechanic assigned': { color: '#5B8CFF', icon: 'account-hard-hat', label: 'Mechanic Assigned' },
    'mechanic arrived': { color: '#5B8CFF', icon: 'car-clock-outline', label: 'Mechanic Arrived' },
    'in progress': { color: '#5B8CFF', icon: 'progress-wrench', label: 'In Progress' },
    'work completed': { color: '#2ECC9A', icon: 'check-circle-outline', label: 'Work Completed' },
    'invoice generated': { color: '#2ECC9A', icon: 'receipt', label: 'Invoice Generated' },
    'completed': { color: '#2ECC9A', icon: 'check-circle-outline', label: 'Completed' },
    'cancelled': { color: '#FF6B6B', icon: 'close-circle-outline', label: 'Cancelled' },
};
function RecentOrderCard({ order, onPress, C, isDark }) {
    if (!order) return null;
    const statusKey = (order.status ?? 'pending').toLowerCase();
    const cfg = ORDER_STATUS_CFG[statusKey] ?? ORDER_STATUS_CFG['pending'];
    const isActive = ['pending', 'in progress', 'mechanic assigned'].includes(statusKey);
    const bikeName = `${order.selectedBrand ?? ''} ${order.selectedModel ?? ''}`.trim();

    // Pulse animation for active orders
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (!isActive) return;
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, [isActive]);

    return (
        <TouchableOpacity
            style={[oc.card, {
                backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                borderLeftColor: cfg.color,
                borderLeftWidth: 4,
            }]}
            onPress={() => onPress(order)}
            activeOpacity={0.82}
        >
            {/* Status pill */}
            <View style={oc.topRow}>
                <View style={[oc.pill, { backgroundColor: `${cfg.color}1A` }]}>
                    {isActive && (
                        <Animated.View style={[oc.pulseDot, { backgroundColor: cfg.color, transform: [{ scale: pulse }] }]} />
                    )}
                    <MaterialCommunityIcons name={cfg.icon} size={13} color={cfg.color} />
                    <Text style={[oc.pillLabel, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
                </View>
                <Text style={[oc.orderId, { color: C.textMuted }]}>#{order.orderId}</Text>
            </View>

            {/* Bike name */}
            <Text style={[oc.bikeName, { color: C.textPrimary }]} numberOfLines={1}>
                {bikeName || 'Service Order'}
            </Text>

            {/* Service tags */}
            <View style={oc.tagsRow}>
                {(order.services ?? []).slice(0, 3).map((svc, i) => (
                    <View key={i} style={[oc.tag, { backgroundColor: isDark ? '#2A2318' : '#F5F0E8' }]}>
                        <Text style={[oc.tagText, { color: C.textSecondary }]} numberOfLines={1}>{svc}</Text>
                    </View>
                ))}
            </View>

            {/* Date + CTA */}
            <View style={oc.bottomRow}>
                <View style={oc.dateRow}>
                    <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
                    <Text style={[oc.date, { color: C.textMuted }]}>{fmtDate(order.preferredDate)}</Text>
                </View>
                <View style={[oc.ctaBtn, { backgroundColor: isActive ? cfg.color : isDark ? '#2A2318' : '#F0EDE6' }]}>
                    <Text style={[oc.ctaLabel, { color: isActive ? '#1a1a1a' : C.textSecondary }]}>
                        {isActive ? 'TRACK' : 'VIEW'}
                    </Text>
                    <Ionicons name="arrow-forward" size={12} color={isActive ? '#1a1a1a' : C.textSecondary} />
                </View>
            </View>
        </TouchableOpacity>
    );
}
const oc = StyleSheet.create({
    card: {
        borderRadius: 18, borderWidth: 1, padding: 16, gap: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 10, elevation: 4,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
    pulseDot: { width: 6, height: 6, borderRadius: 3 },
    pillLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
    orderId: { fontSize: 11, fontWeight: '600' },
    bikeName: { fontSize: 17, fontWeight: '800', letterSpacing: 0.1 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    tagText: { fontSize: 11, fontWeight: '600' },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    date: { fontSize: 11 },
    ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
    ctaLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. YOUR GARAGE
// ══════════════════════════════════════════════════════════════════════════════
function GarageSection({ bikes, onAddBike, onBikeTap, C, isDark }) {
    if (bikes.length === 0) {
        return (
            <View style={[gs.emptyCard, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                <MaterialCommunityIcons name="motorbike" size={36} color={C.textMuted} />
                <Text style={[gs.emptyTitle, { color: C.textPrimary }]}>No bikes yet</Text>
                <Text style={[gs.emptySub, { color: C.textMuted }]}>Add your first bike to get started</Text>
                <TouchableOpacity style={[gs.addBtn, { backgroundColor: C.primary }]} onPress={onAddBike} activeOpacity={0.82}>
                    <Ionicons name="add" size={16} color="#1a1a1a" />
                    <Text style={gs.addLabel}>ADD YOUR BIKE</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <FlatList
            data={bikes}
            keyExtractor={(b) => b._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={gs.listContent}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            renderItem={({ item }) => (
                <TouchableOpacity
                    style={[gs.bikeCard, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}
                    onPress={() => onBikeTap(item)}
                    activeOpacity={0.82}
                >
                    {/* Bike image or icon */}
                    <View style={[gs.imgWrap, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                        <MaterialCommunityIcons name="motorbike" size={32} color={C.primary} />
                    </View>
                    <Text style={[gs.bikeName, { color: C.textPrimary }]} numberOfLines={1}>
                        {item.brand} {item.model}
                    </Text>
                    <Text style={[gs.bikeYear, { color: C.textMuted }]}>{item.year} · {item.cc ?? item.engineCC ?? '—'} CC</Text>
                    {/* Status dot */}
                    <View style={[gs.statusDot, { backgroundColor: '#2ECC9A' }]} />
                </TouchableOpacity>
            )}
        />
    );
}
const BIKE_CARD_W = W * 0.42;
const gs = StyleSheet.create({
    listContent: { paddingRight: 4 },
    bikeCard: {
        width: BIKE_CARD_W, borderRadius: 18, borderWidth: 1, padding: 14, gap: 8,
        position: 'relative',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    imgWrap: { width: '100%', height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    bikeName: { fontSize: 14, fontWeight: '800', letterSpacing: 0.1 },
    bikeYear: { fontSize: 11 },
    statusDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4 },
    emptyCard: {
        borderRadius: 18, borderWidth: 1, padding: 28,
        alignItems: 'center', gap: 10,
    },
    emptyTitle: { fontSize: 16, fontWeight: '800' },
    emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, marginTop: 6 },
    addLabel: { fontSize: 12, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1.2 },
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. PREMIUM SERVICES GRID
// ══════════════════════════════════════════════════════════════════════════════
const SERVICES = [
    { id: '1', label: 'General Service', sub: 'Full bike diagnostic', icon: 'cog-outline', color: '#E2A731' },
    { id: '2', label: 'Oil Change', sub: 'Synthetic & Mineral', icon: 'oil', color: '#5B8CFF' },
    { id: '3', label: 'Brake Repair', sub: 'Pad replacement', icon: 'car-brake-alert', color: '#FF6B6B' },
    { id: 'clutch-gear', label: 'Clutch & Gear Service', sub: 'Smooth shifting & control', icon: 'car-clutch', color: '#2ECC9A' },
    { id: '5', label: 'Engine Tune-up', sub: 'Performance boost', icon: 'engine-outline', color: '#E2A731' },
    { id: '6', label: 'Chain & Sprocket', sub: 'Drive train service', icon: 'link-variant', color: '#5B8CFF' },
];
// Maps Premium Services grid ids -> NewOrderForm's QUICK_SERVICES ids
const DASHBOARD_TO_ORDER_SERVICE_ID = {
    '1': 'general_service',
    '2': 'oil_change',
    '3': 'brake_repair',
    'clutch-gear': 'clutch_gear',
    '5': 'engine_tune',
    '6': 'chain_sprocket',
};
function ServicesGrid({ onServiceTap, C, isDark }) {
    const rows = [];
    for (let i = 0; i < SERVICES.length; i += 2) {
        rows.push(SERVICES.slice(i, i + 2));
    }
    return (
        <View style={sg.grid}>
            {rows.map((row, ri) => (
                <View key={ri} style={sg.row}>
                    {row.map((svc) => (
                        <TouchableOpacity
                            key={svc.id}
                            style={[sg.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}
                            onPress={() => onServiceTap(svc)}
                            activeOpacity={0.82}
                        >
                            <View style={[sg.iconCircle, { backgroundColor: `${svc.color}18` }]}>
                                <MaterialCommunityIcons name={svc.icon} size={24} color={svc.color} />
                            </View>
                            <Text style={[sg.label, { color: C.textPrimary }]}>{svc.label}</Text>
                            <Text style={[sg.sub, { color: C.textMuted }]}>{svc.sub}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ))}
        </View>
    );
}
const sg = StyleSheet.create({
    grid: { gap: 12 },
    row: { flexDirection: 'row', gap: 12 },
    card: {
        flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    iconCircle: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.1 },
    sub: { fontSize: 11, lineHeight: 16 },
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. NEARBY SERVICE CENTERS
// ══════════════════════════════════════════════════════════════════════════════
const CENTERS = [
    { id: '1', name: 'Repairs Central', distance: '2.4 km', status: 'OPEN NOW', statusColor: '#2ECC9A' },
    { id: '2', name: 'MotoFix Express', distance: '3.8 km', status: 'OPEN NOW', statusColor: '#2ECC9A' },
    { id: '3', name: 'Quick Tune Garage', distance: '5.1 km', status: 'CLOSED', statusColor: '#FF6B6B' },
];

function NearbySection({ onViewMap, onCenterTap, C, isDark }) {
    return (
        <View style={nb.wrap}>
            {/* Map preview placeholder */}
            <TouchableOpacity
                style={[nb.mapPreview, { backgroundColor: isDark ? '#1C1A14' : '#E8F0E0' }]}
                onPress={onViewMap}
                activeOpacity={0.88}
            >
                {/* Grid lines decoration */}
                <View style={nb.gridOverlay} pointerEvents="none">
                    {[0.25, 0.5, 0.75].map((f) => (
                        <View key={f} style={[nb.gridLine, { left: `${f * 100}%`, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]} />
                    ))}
                    {[0.33, 0.66].map((f) => (
                        <View key={f} style={[nb.gridLineH, { top: `${f * 100}%`, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]} />
                    ))}
                </View>

                {/* Center pin */}
                <View style={[nb.pin, { backgroundColor: C.primary }]}>
                    <Ionicons name="location" size={14} color="#1a1a1a" />
                </View>
                <Text style={[nb.mapLabel, { color: C.textMuted }]}>Tap to open full map</Text>
            </TouchableOpacity>

            {/* Centers list */}
            <View style={nb.list}>
                {CENTERS.map((center) => (
                    <TouchableOpacity
                        key={center.id}
                        style={[nb.centerRow, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}
                        onPress={() => onCenterTap(center)}
                        activeOpacity={0.82}
                    >
                        <View style={[nb.centerIcon, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                            <MaterialCommunityIcons name="garage-open-variant" size={18} color={C.primary} />
                        </View>
                        <View style={nb.centerInfo}>
                            <Text style={[nb.centerName, { color: C.textPrimary }]}>{center.name}</Text>
                            <Text style={[nb.centerDist, { color: C.textMuted }]}>{center.distance}</Text>
                        </View>
                        <View style={[nb.statusBadge, { backgroundColor: `${center.statusColor}18` }]}>
                            <Text style={[nb.statusLabel, { color: center.statusColor }]}>{center.status}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={15} color={C.textMuted} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}
const nb = StyleSheet.create({
    wrap: { gap: 12 },
    mapPreview: {
        height: 130, borderRadius: 18, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative',
    },
    gridOverlay: { ...StyleSheet.absoluteFillObject },
    gridLine: { position: 'absolute', top: 0, bottom: 0, width: 1 },
    gridLineH: { position: 'absolute', left: 0, right: 0, height: 1 },
    pin: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', shadowColor: '#E2A731', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
    mapLabel: { fontSize: 11, letterSpacing: 0.3 },
    list: { gap: 8 },
    centerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13 },
    centerIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    centerInfo: { flex: 1, gap: 2 },
    centerName: { fontSize: 13, fontWeight: '700' },
    centerDist: { fontSize: 11 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    statusLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});



// ══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function DashboardScreen({ navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';
    const user = useSelector((s) => s.auth.user);

    const [searchText, setSearchText] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [searchFocus, setSearchFocus] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [serviceSheetVisible, setServiceSheetVisible] = useState(false);
    const [banners, setBanners] = useState([]);
    const { bikes, refetch: refetchBikes } = useFetchBike?.() ?? { bikes: [], refetch: async () => { } };
    const { orders, refetch: refetchOrders } = useFetchOrder?.() ?? { orders: [], refetch: async () => { } };

    // Most recent non-cancelled order
    const recentOrder = orders
        .filter((o) => (o.status ?? '').toLowerCase() !== 'cancelled')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] ?? null;

    // ── Banners: admin-curated, ordered, capped at 5 on the backend ──────────
    const fetchBanners = useCallback(async () => {
        try {
            const res = await axiosClient.get('/api/admin/banner/active');
            setBanners(res.data?.banners || []);
        } catch (err) {
            console.log('Failed to fetch banners:', err?.message);
        }
    }, []);

    useEffect(() => {
        fetchBanners();
    }, [fetchBanners]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchBikes(), refetchOrders(), fetchBanners()]);
        setRefreshing(false);
    }, [refetchBikes, refetchOrders, fetchBanners]);

    const firstName = user?.firstName ?? 'Rider';

    // ── Handlers ──────────────────────────────────────────────────────────────
    // Pass serviceType so BookServiceScreen/NewOrderForm pre-selects the right type
    const goBookService = () => navigation?.navigate?.('NewOrder', { serviceType: 'Schedule Repair' });
    const goEmergency = () => navigation?.navigate?.('NewOrder', { serviceType: 'Emergency Repair' });
    const goOrderDetail = (o) => navigation?.navigate?.('OrderDetail', { orderId: o._id });
    const goOrders = () => navigation?.navigate?.('Orders');
    const goAddBike = () => navigation?.navigate?.('AddBike');
    const goMyBikes = () => navigation?.navigate?.('MyBikes');
    const goBikeTap = (b) => navigation?.navigate?.('BikeDetail', { bikeId: b._id });
    const openServiceSheet = (s) => {
        const details = SERVICE_DETAILS[s.id] ?? { ...s, ifSkipped: [], benefits: [], included: [] };
        setSelectedService({ ...details, id: s.id }); // ← id add ki, taaki Book Now ko pata rahe konsi service hai
        setServiceSheetVisible(true);
    };

    const closeServiceSheet = () => setServiceSheetVisible(false);

    const handleBookFromSheet = (service) => {
        setServiceSheetVisible(false);
        navigation?.navigate?.('NewOrder', {
            serviceType: 'Schedule Repair',
            preselectedServiceId: DASHBOARD_TO_ORDER_SERVICE_ID[service.id] ?? null,
        });
    };
    const goCenterTap = () => { };
    const goOfferTap = (o) => navigation?.navigate?.('OfferDetail', { code: o.code });
    const goSearch = () => { };

    // Banner tap: open external links directly, treat anything else as an
    // in-app route name so admins can point a banner at a screen too.
    const goBannerTap = (banner) => {
        if (!banner?.link) return;
        if (/^https?:\/\//i.test(banner.link)) {
            Linking.openURL(banner.link).catch(() => { });
        } else {
            navigation?.navigate?.(banner.link);
        }
    };

    const s = makeStyles(C, isDark);

    return (
        <TabScreenWrapper navigation={navigation}>
            <ScrollView
                contentContainerStyle={[s.scroll, { backgroundColor: theme.colors.background }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
                }
            >
                {/* ── Greeting ────────────────────────────────────────── */}
                {/* <FadeUp delay={0}>
                    <View style={s.greetBlock}>
                        <Text style={[s.greetEyebrow, { color: C.primary }]}>{getGreeting()}</Text>
                        <View style={s.greetRow}>
                            <Text style={[s.greetName, { color: C.textPrimary }]}>
                                Hi, {firstName} 👋
                            </Text>
                        </View>
                    </View>
                </FadeUp> */}

                {/* ── Search bar ──────────────────────────────────────── */}
                {/* <FadeUp delay={60}>
                    <TouchableOpacity
                        style={[s.searchBar, {
                            backgroundColor: isDark ? '#1C1A14' : '#F5F2EC',
                            borderColor: searchFocus ? C.primary : 'transparent',
                        }]}
                        activeOpacity={0.85}
                        onPress={goSearch}
                    >
                        <Ionicons name="search-outline" size={17} color={C.textMuted} />
                        <Text style={[s.searchPlaceholder, { color: C.textMuted }]}>
                            Search services or issues…
                        </Text>
                    </TouchableOpacity>
                </FadeUp> */}

                {/* ── Offer / Announcement Banners ─────────────────────── */}
                {banners.length > 0 && (
                    <FadeUp delay={60}>
                        <BannerCarousel
                            banners={banners}
                            onBannerPress={goBannerTap}
                            C={C}
                            isDark={isDark}
                        />
                    </FadeUp>
                )}

                {/* ── Quick Actions ────────────────────────────────────── */}
                <FadeUp delay={100}>
                    <View style={s.section}>
                        <QuickActions
                            onBookService={goBookService}
                            onEmergency={goEmergency}
                            C={C}
                            isDark={isDark}
                        />
                    </View>
                </FadeUp>

                {/* ── Recent / Active Order ────────────────────────────── */}
                {recentOrder && (
                    <FadeUp delay={140}>
                        <View style={s.section}>
                            <SectionHeader
                                title="Recent Order"
                                actionLabel="All Orders →"
                                onAction={goOrders}
                                C={C}
                            />
                            <RecentOrderCard
                                order={recentOrder}
                                onPress={goOrderDetail}
                                C={C}
                                isDark={isDark}
                            />
                        </View>
                    </FadeUp>
                )}

                {/* ── Your Garage ──────────────────────────────────────── */}
                <FadeUp delay={180}>
                    <View style={s.section}>
                        <SectionHeader
                            title="Your Garage"
                            actionLabel="ADD NEW BIKE +"
                            onAction={goAddBike}
                            C={C}
                        />
                        <GarageSection
                            bikes={bikes}
                            onAddBike={goAddBike}
                            onBikeTap={goBikeTap}
                            C={C}
                            isDark={isDark}
                        />
                    </View>
                </FadeUp>

                {/* ── Premium Services ─────────────────────────────────── */}
                <FadeUp delay={220}>
                    <View style={s.section}>
                        <SectionHeader
                            title="Doorstep Services"
                            C={C}
                        />
                        <ServicesGrid
                            onServiceTap={openServiceSheet}
                            C={C}
                            isDark={isDark}
                        />
                    </View>
                </FadeUp>

                {/* ── Nearby Service Centers ───────────────────────────── */}
                {/* <FadeUp delay={260}>
                    <View style={s.section}>
                        <SectionHeader
                            title="Nearby Service Centers"
                            actionLabel="VIEW MAP"
                            onAction={goViewMap}
                            C={C}
                        />
                        <NearbySection
                            onViewMap={goViewMap}
                            onCenterTap={goCenterTap}
                            C={C}
                            isDark={isDark}
                        />
                    </View>
                </FadeUp> */}

                {/* ── Exclusive Offers ─────────────────────────────────── */}

                <View style={{ height: 100 }} />

            </ScrollView>
            <ServiceDetailSheet
                visible={serviceSheetVisible}
                service={selectedService}
                onClose={closeServiceSheet}
                onBook={handleBookFromSheet}
                C={C}
                isDark={isDark}
            />
        </TabScreenWrapper>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C, isDark) {
    return StyleSheet.create({
        scroll: {
            flexGrow: 1,
            paddingTop: 16,
            paddingBottom: 24,
            gap: 0,
        },

        // Greeting
        greetBlock: { paddingHorizontal: 20, marginBottom: 16, gap: 2 },
        greetEyebrow: {
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
        },
        greetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        greetName: { fontSize: 26, fontWeight: '900', letterSpacing: -0.3 },

        // Search
        searchBar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginHorizontal: 20,
            marginBottom: 16,
            borderRadius: 14,
            borderWidth: 1.5,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 13 : 10,
        },
        searchPlaceholder: { fontSize: 14, flex: 1 },

        // Sections
        section: {
            gap: 14,
            paddingHorizontal: 20,
            marginBottom: 28,
        },

        // Offers bleed
        offersBleed: {
            marginHorizontal: -20,
            paddingLeft: 20,
        },
    });
}