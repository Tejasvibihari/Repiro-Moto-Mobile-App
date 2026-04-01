// components/orders/ServiceManifestCard.js
// Shows "SERVICE MANIFEST" section:
//   - Primary Services (serviceProvided[])
//   - Replacement Parts (partsUsed[])
// Each line item: name + qty + price, with discount strike-through if applicable

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n ?? 0).toFixed(2)}`;

// ─── Single line item ─────────────────────────────────────────────────────────
function LineItem({ name, qty, price, discountPrice, C, isDark, icon, iconLib = 'mci' }) {
    const hasDiscount = discountPrice && discountPrice > 0 && discountPrice < price;
    const finalPrice = hasDiscount ? discountPrice : price;

    return (
        <View style={li.row}>
            {/* Icon */}
            <View style={[li.iconWrap, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                <MaterialCommunityIcons name={icon} size={14} color={C.primary} />
            </View>

            {/* Name + qty */}
            <View style={li.nameBlock}>
                <Text style={[li.name, { color: C.textPrimary }]} numberOfLines={2}>
                    {name}
                </Text>
                {qty > 1 && (
                    <Text style={[li.qty, { color: C.textMuted }]}>Qty: {qty}</Text>
                )}
            </View>

            {/* Price */}
            <View style={li.priceBlock}>
                {hasDiscount && (
                    <Text style={[li.original, { color: C.textMuted }]}>{fmt(price)}</Text>
                )}
                <Text style={[li.price, { color: C.textPrimary }]}>{fmt(finalPrice)}</Text>
            </View>
        </View>
    );
}

const li = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingVertical: 8,
    },
    iconWrap: {
        width: 30,
        height: 30,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    nameBlock: { flex: 1, gap: 2 },
    name: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1, lineHeight: 18 },
    qty: { fontSize: 11, letterSpacing: 0.1 },
    priceBlock: { alignItems: 'flex-end', gap: 1 },
    original: { fontSize: 11, textDecorationLine: 'line-through' },
    price: { fontSize: 13, fontWeight: '700' },
});

// ─── Sub-section header ───────────────────────────────────────────────────────
function SubHeader({ label, count, C }) {
    return (
        <View style={sh.row}>
            <Text style={[sh.label, { color: C.textMuted }]}>{label}</Text>
            {count > 0 && (
                <View style={[sh.badge, { backgroundColor: C.primary }]}>
                    <Text style={sh.count}>{count}</Text>
                </View>
            )}
        </View>
    );
}

const sh = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
    badge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
    count: { fontSize: 9, fontWeight: '800', color: '#1a1a1a' },
});

// ─── Main card ────────────────────────────────────────────────────────────────
/**
 * Props:
 *   serviceProvided  [{serviceName, quantity, price, discountPrice}]
 *   partsUsed        [{partName, quantity, price, discountPrice}]
 *   services         [string]  — booked service names (shown if serviceProvided is empty)
 */
export default function ServiceManifestCard({ serviceProvided = [], partsUsed = [], services = [] }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const totalItems = serviceProvided.length + partsUsed.length + services.length;

    return (
        <View style={[card.wrap, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>

            {/* Card header */}
            <View style={card.header}>
                <Text style={[card.title, { color: C.textMuted }]}>SERVICE MANIFEST</Text>
                <Text style={[card.count, { color: C.textMuted }]}>
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                </Text>
            </View>

            {/* Primary Services */}
            {(serviceProvided.length > 0 || services.length > 0) && (
                <View style={card.section}>
                    <SubHeader label="Primary Services" count={serviceProvided.length || services.length} C={C} />
                    <View style={[card.itemsBox, {
                        backgroundColor: isDark ? '#141210' : '#F8F5EF',
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
                    }]}>
                        {serviceProvided.length > 0
                            ? serviceProvided.map((svc, i) => (
                                <React.Fragment key={i}>
                                    <LineItem
                                        name={svc.serviceName}
                                        qty={svc.quantity}
                                        price={svc.price}
                                        discountPrice={svc.discountPrice}
                                        C={C}
                                        isDark={isDark}
                                        icon="wrench"
                                    />
                                    {i < serviceProvided.length - 1 && (
                                        <View style={[card.sep, { backgroundColor: C.border }]} />
                                    )}
                                </React.Fragment>
                            ))
                            : services.map((svc, i) => (
                                <React.Fragment key={i}>
                                    <LineItem
                                        name={svc}
                                        qty={1}
                                        price={null}
                                        C={C}
                                        isDark={isDark}
                                        icon="wrench"
                                    />
                                    {i < services.length - 1 && (
                                        <View style={[card.sep, { backgroundColor: C.border }]} />
                                    )}
                                </React.Fragment>
                            ))
                        }
                    </View>
                </View>
            )}

            {/* Replacement Parts */}
            {partsUsed.length > 0 && (
                <View style={card.section}>
                    <SubHeader label="Replacement Parts" count={partsUsed.length} C={C} />
                    <View style={[card.itemsBox, {
                        backgroundColor: isDark ? '#141210' : '#F8F5EF',
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
                    }]}>
                        {partsUsed.map((part, i) => (
                            <React.Fragment key={i}>
                                <LineItem
                                    name={part.partName}
                                    qty={part.quantity}
                                    price={part.price}
                                    discountPrice={part.discountPrice}
                                    C={C}
                                    isDark={isDark}
                                    icon="cog"
                                />
                                {i < partsUsed.length - 1 && (
                                    <View style={[card.sep, { backgroundColor: C.border }]} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            )}

            {/* Other service note */}
        </View>
    );
}

const card = StyleSheet.create({
    wrap: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },
    count: {
        fontSize: 11,
        fontWeight: '600',
    },
    section: { gap: 8 },
    itemsBox: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    sep: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 40,
    },
});