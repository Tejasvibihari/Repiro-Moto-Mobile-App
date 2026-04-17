// screens/order/CheckoutScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Alert,
    ActivityIndicator,
    Linking,
    Platform,
    Dimensions,
    RefreshControl,
    Switch,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Loader from '../../components/common/Loader';
import useOrder from '../../hooks/useOrder';
import axiosClient from '../../services/axiosClient';

// ─── Razorpay — Expo compatible import ───────────────────────────────────────
let RazorpayCheckout = null;
try {
    RazorpayCheckout = require('react-native-razorpay').default;
} catch (_) { }

const RAZORPAY_KEY_ID =
    Constants.expoConfig?.extra?.razorpayKeyId ??
    Constants.manifest?.extra?.razorpayKeyId ??
    '';

const { width: W } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
    `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtSimple = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate = (d) =>
    d
        ? new Date(d).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
        : '—';

// Safely coerce any MongoDB / unknown value to a plain JS number
const toNum = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseFloat(v) || 0;
    if (typeof v === 'object') {
        const raw =
            v.$numberDecimal ?? v.$numberDouble ?? v.$numberInt ?? v.$numberLong ?? v.value;
        return raw != null ? parseFloat(raw) : 0;
    }
    return 0;
};

// Safely coerce qty to integer
const toQty = (v) => {
    if (v == null) return 1;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseInt(v, 10) || 1;
    if (typeof v === 'object') {
        const raw = v.$numberInt ?? v.$numberLong ?? v.value;
        return raw != null ? parseInt(raw, 10) : 1;
    }
    return 1;
};

// ─── Animated entrance ────────────────────────────────────────────────────────
function FadeUp({ delay = 0, children }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const y = useRef(new Animated.Value(16)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
            Animated.spring(y, { toValue: 0, friction: 8, tension: 55, delay, useNativeDriver: true }),
        ]).start();
    }, []);
    return (
        <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>
            {children}
        </Animated.View>
    );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Card({ children, isDark, style }) {
    return (
        <View
            style={[
                crd.wrap,
                {
                    backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}
const crd = StyleSheet.create({
    wrap: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
});

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ text, C }) {
    return <Text style={[sl.label, { color: C.textMuted }]}>{text}</Text>;
}
const sl = StyleSheet.create({
    label: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
});

// ─── 1. Order Summary card ────────────────────────────────────────────────────
function OrderSummaryCard({ order, C, isDark }) {
    const bikeName = `${order.selectedBrand ?? ''} ${order.selectedModel ?? ''}`.trim();

    return (
        <Card isDark={isDark}>
            <SectionLabel text="Order Summary" C={C} />
            <View style={os.topRow}>
                <View style={[os.idBadge, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                    <Text style={[os.idText, { color: C.primary }]}>#{order.orderId}</Text>
                </View>
                <View style={[os.statusBadge, { backgroundColor: 'rgba(46,204,154,0.12)' }]}>
                    <View style={os.statusDot} />
                    <Text style={os.statusLabel}>{order.status?.toUpperCase()}</Text>
                </View>
            </View>
            <View style={os.bikeRow}>
                <View style={[os.bikeIcon, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                    <MaterialCommunityIcons name="motorbike" size={22} color={C.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[os.bikeName, { color: C.textPrimary }]}>{bikeName}</Text>
                    <View style={os.tagRow}>
                        {order.cc && (
                            <View style={[os.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                <Text style={[os.tagText, { color: C.textSecondary }]}>
                                    {String(order.cc)}cc
                                </Text>
                            </View>
                        )}
                        {order.bs && (
                            <View style={[os.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                <Text style={[os.tagText, { color: C.textSecondary }]}>
                                    {String(order.bs)}
                                </Text>
                            </View>
                        )}
                        {order.city && (
                            <View style={[os.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                <Text style={[os.tagText, { color: C.textSecondary }]}>
                                    {String(order.city)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
            <View style={os.infoRow}>
                <Ionicons name="calendar-outline" size={13} color={C.textMuted} />
                <Text style={[os.infoText, { color: C.textMuted }]}>
                    {fmtDate(order.preferredDate)}
                    {order.preferredTime ? ` · ${order.preferredTime}` : ''}
                </Text>
            </View>
            {order.assignedMechanic && (
                <View style={os.infoRow}>
                    <Ionicons name="person-outline" size={13} color={C.textMuted} />
                    <Text style={[os.infoText, { color: C.textMuted }]}>
                        {'Mechanic: '}
                        <Text style={{ fontWeight: '700', color: C.textSecondary }}>
                            {String(order.assignedMechanic)}
                        </Text>
                    </Text>
                </View>
            )}
            {order.invoiceDate && (
                <View style={os.infoRow}>
                    <Ionicons name="document-text-outline" size={13} color={C.textMuted} />
                    <Text style={[os.infoText, { color: C.textMuted }]}>
                        {'Invoice: '}
                        <Text style={{ fontWeight: '700', color: C.textSecondary }}>
                            {fmtDate(order.invoiceDate)}
                        </Text>
                    </Text>
                </View>
            )}
        </Card>
    );
}
const os = StyleSheet.create({
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    idBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    idText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ECC9A' },
    statusLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, color: '#2ECC9A' },
    bikeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    bikeIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bikeName: { fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    tagText: { fontSize: 10, fontWeight: '600' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
    infoText: { fontSize: 12, letterSpacing: 0.1 },
});

// ─── 2. Line item row ─────────────────────────────────────────────────────────
function LineItemRow({ icon, name, qty, price, discountPrice, C, isDark }) {
    const safeQty = toQty(qty);
    const safePrice = toNum(price);
    const safeDiscount = toNum(discountPrice);
    const hasDiscount = safeDiscount > 0 && safeDiscount < safePrice;
    const finalPrice = hasDiscount ? safeDiscount : safePrice;

    const displayName = (() => {
        if (typeof name === 'string') return name;
        if (typeof name === 'number') return String(name);
        if (name && typeof name === 'object')
            return name.serviceName ?? name.name ?? JSON.stringify(name);
        return '';
    })();

    return (
        <View style={lr.row}>
            <View
                style={[lr.iconWrap, { backgroundColor: isDark ? '#2A2318' : '#F5F0E8' }]}
            >
                <MaterialCommunityIcons name={icon} size={14} color={C.primary} />
            </View>
            <View style={lr.nameBlock}>
                <Text style={[lr.name, { color: C.textPrimary }]} numberOfLines={2}>
                    {displayName}
                </Text>
                {safeQty > 1 && (
                    <Text style={[lr.qty, { color: C.textMuted }]}>
                        {'Qty: ' + String(safeQty)}
                    </Text>
                )}
            </View>
            <View style={lr.priceBlock}>
                {hasDiscount && (
                    <Text style={[lr.original, { color: C.textMuted }]}>{fmt(safePrice)}</Text>
                )}
                <Text style={[lr.price, { color: C.textPrimary }]}>{fmt(finalPrice)}</Text>
            </View>
        </View>
    );
}
const lr = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
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
    qty: { fontSize: 11 },
    priceBlock: { alignItems: 'flex-end', gap: 2 },
    original: { fontSize: 11, textDecorationLine: 'line-through' },
    price: { fontSize: 13, fontWeight: '700' },
});

// ─── 3. Service manifest ──────────────────────────────────────────────────────
function ServiceManifest({ order, C, isDark }) {
    const allServices = [];
    if (order.serviceProvided?.length) {
        allServices.push(...order.serviceProvided);
    } else if (order.services?.length) {
        allServices.push(
            ...order.services.map((s) => {
                if (typeof s === 'string')
                    return { serviceName: s, quantity: 1, price: null, discountPrice: null };
                return s;
            })
        );
    }

    const hasServices = allServices.length > 0;
    const hasParts = (order.partsUsed?.length ?? 0) > 0;
    if (!hasServices && !hasParts) return null;

    return (
        <Card isDark={isDark}>
            <SectionLabel text="Service Manifest" C={C} />
            {hasServices && (
                <View>
                    <Text style={[sm.subLabel, { color: C.textMuted }]}>Services</Text>
                    <View
                        style={[
                            sm.itemBox,
                            {
                                backgroundColor: isDark ? '#141210' : '#F8F5EF',
                                borderColor: isDark
                                    ? 'rgba(255,255,255,0.04)'
                                    : 'rgba(0,0,0,0.05)',
                            },
                        ]}
                    >
                        {allServices.map((service, idx) => (
                            <React.Fragment key={idx}>
                                <LineItemRow
                                    name={service.serviceName}
                                    qty={service.quantity || 1}
                                    price={service.price}
                                    discountPrice={service.discountPrice}
                                    icon="wrench"
                                    C={C}
                                    isDark={isDark}
                                />
                                {idx < allServices.length - 1 && (
                                    <View style={[sm.sep, { backgroundColor: C.border }]} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            )}
            {hasParts && (
                <View>
                    <Text style={[sm.subLabel, { color: C.textMuted }]}>Replacement Parts</Text>
                    <View
                        style={[
                            sm.itemBox,
                            {
                                backgroundColor: isDark ? '#141210' : '#F8F5EF',
                                borderColor: isDark
                                    ? 'rgba(255,255,255,0.04)'
                                    : 'rgba(0,0,0,0.05)',
                            },
                        ]}
                    >
                        {order.partsUsed.map((p, i) => (
                            <React.Fragment key={i}>
                                <LineItemRow
                                    name={p.partName}
                                    qty={p.quantity}
                                    price={p.price}
                                    discountPrice={p.discountPrice}
                                    icon="cog"
                                    C={C}
                                    isDark={isDark}
                                />
                                {i < order.partsUsed.length - 1 && (
                                    <View style={[sm.sep, { backgroundColor: C.border }]} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            )}
        </Card>
    );
}
const sm = StyleSheet.create({
    subLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    itemBox: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginBottom: 12 },
    sep: { height: StyleSheet.hairlineWidth, marginLeft: 40 },
});

// ─── 4. Financial Breakdown ───────────────────────────────────────────────────
// Shows full price waterfall: subtotal → service discount → referral bill discount
// → referral balance applied → taxes → TOTAL PAYABLE
function FinancialBreakdown({ total, coupon, referralBalanceApplied = 0, C, isDark }) {
    if (!total) return null;

    const baseAmount = toNum(total.baseAmount);
    const discount = toNum(total.discount);
    const referralDiscount = toNum(total.referralDiscount); // bill-level referral (from admin)
    const sgst = toNum(total.sgst);
    const cgst = toNum(total.cgst);
    const sgstRate = toNum(total.sgstRate);
    const cgstRate = toNum(total.cgstRate);
    const totalAmt = toNum(total.total);
    const finalPayable = toNum(total.finalPayable);

    // What user actually pays after their wallet balance applied
    const adjustedPayable = Math.max(0, finalPayable - referralBalanceApplied);

    // Build waterfall steps for clarity
    const steps = [];
    if (baseAmount > 0) {
        steps.push({ label: 'Subtotal (Services + Parts)', value: fmt(baseAmount), type: 'base' });
    }
    if (discount > 0) {
        const couponLabel = coupon ? `Discount (${coupon})` : 'Discount';
        steps.push({ label: couponLabel, value: `-${fmt(discount)}`, type: 'saving' });
    }
    if (referralDiscount > 0) {
        steps.push({
            label: 'Referral Discount (on bill)',
            value: `-${fmt(referralDiscount)}`,
            type: 'saving',
        });
    }
    if (sgst > 0) {
        steps.push({ label: `SGST (${sgstRate}%)`, value: fmt(sgst), type: 'tax' });
    }
    if (cgst > 0) {
        steps.push({ label: `CGST (${cgstRate}%)`, value: fmt(cgst), type: 'tax' });
    }

    const BreakdownRow = ({ label, value, type }) => {
        const isSaving = type === 'saving';
        const isTax = type === 'tax';
        return (
            <View style={fb.row}>
                <View style={fb.labelWrap}>
                    {isSaving && (
                        <View style={fb.savingDot} />
                    )}
                    <Text style={[fb.label, { color: isTax ? C.textMuted : C.textSecondary }]}>
                        {label}
                    </Text>
                </View>
                <Text
                    style={[
                        fb.value,
                        { color: isSaving ? '#2ECC9A' : isTax ? C.textMuted : C.textSecondary },
                    ]}
                >
                    {value}
                </Text>
            </View>
        );
    };

    return (
        <Card isDark={isDark}>
            <SectionLabel text="Price Breakdown" C={C} />

            {steps.map((step, i) => (
                <BreakdownRow key={i} label={step.label} value={step.value} type={step.type} />
            ))}

            {/* Divider before referral wallet application */}
            {referralBalanceApplied > 0 && (
                <>
                    <View style={[fb.divider, { backgroundColor: C.border }]} />
                    <View style={fb.row}>
                        <View style={fb.labelWrap}>
                            <View style={fb.savingDot} />
                            <Text style={[fb.label, { color: C.textSecondary }]}>
                                🎁 Referral Wallet Applied
                            </Text>
                        </View>
                        <Text style={[fb.value, { color: '#2ECC9A' }]}>
                            {'-' + fmt(referralBalanceApplied)}
                        </Text>
                    </View>
                </>
            )}

            <View style={[fb.divider, { backgroundColor: C.border }]} />

            {/* Show pre-wallet total if wallet is reducing it */}
            {referralBalanceApplied > 0 && finalPayable > 0 && (
                <View style={fb.row}>
                    <Text style={[fb.label, { color: C.textMuted, textDecorationLine: 'line-through' }]}>
                        {'Before wallet: ' + fmt(finalPayable)}
                    </Text>
                    <Text style={{ width: 0 }} />
                </View>
            )}

            {/* Final payable */}
            <View style={[fb.finalRow, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderRadius: 14, padding: 14, marginTop: 6 }]}>
                <View style={{ gap: 3 }}>
                    <Text style={[fb.finalLabel, { color: C.textMuted }]}>TOTAL PAYABLE</Text>
                    {referralBalanceApplied > 0 && adjustedPayable > 0 && (
                        <Text style={[fb.savingsNote, { color: '#2ECC9A' }]}>
                            {'You save ' + fmt(referralBalanceApplied) + ' with wallet!'}
                        </Text>
                    )}
                </View>
                <Text
                    style={[
                        fb.finalValue,
                        { color: adjustedPayable <= 0 ? '#2ECC9A' : C.primary },
                    ]}
                >
                    {adjustedPayable <= 0 ? 'FREE' : fmt(adjustedPayable)}
                </Text>
            </View>
        </Card>
    );
}
const fb = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    savingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2ECC9A',
    },
    label: { fontSize: 13, letterSpacing: 0.1 },
    value: { fontSize: 13, fontWeight: '600' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 10 },
    finalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    finalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
    finalValue: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
    savingsNote: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});

// ─── 5. Referral Balance Card ─────────────────────────────────────────────────
// Fetches live balance from backend. Auto-enables if balance > 0.
function ReferralBalanceCard({
    referralAmount,      // live balance from backend
    useReferral,
    onToggle,
    orderPayable,        // order's finalPayable BEFORE wallet deduction
    isLoadingBalance,
    C,
    isDark,
}) {
    if (isLoadingBalance) {
        return (
            <Card isDark={isDark}>
                <SectionLabel text="Referral Wallet" C={C} />
                <View style={rb.loadingRow}>
                    <ActivityIndicator size="small" color={C.primary} />
                    <Text style={[rb.loadingText, { color: C.textMuted }]}>
                        Checking referral balance…
                    </Text>
                </View>
            </Card>
        );
    }

    // Don't render card at all if no balance
    if (!referralAmount || referralAmount <= 0) return null;

    const applicable = Math.min(referralAmount, orderPayable);
    const coversAll = applicable >= orderPayable && orderPayable > 0;
    const remainder = Math.max(0, orderPayable - applicable);

    return (
        <Card isDark={isDark} style={useReferral ? { borderColor: 'rgba(46,204,154,0.35)', borderWidth: 1.5 } : {}}>
            <SectionLabel text="Referral Wallet" C={C} />

            {/* Balance display */}
            <View
                style={[
                    rb.balanceChip,
                    { backgroundColor: isDark ? '#1A2E1A' : '#E8F7F0' },
                ]}
            >
                <MaterialCommunityIcons name="wallet" size={16} color="#2ECC9A" />
                <Text style={rb.balanceText}>
                    {'Available balance: '}
                    <Text style={{ fontWeight: '900', color: '#2ECC9A' }}>{fmt(referralAmount)}</Text>
                </Text>
            </View>

            {/* Toggle row */}
            <View
                style={[
                    rb.row,
                    {
                        backgroundColor: isDark ? '#141210' : '#F8F5EF',
                        borderColor: useReferral
                            ? 'rgba(46,204,154,0.35)'
                            : isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.07)',
                    },
                ]}
            >
                <View style={[rb.iconWrap, { backgroundColor: useReferral ? 'rgba(46,204,154,0.15)' : (isDark ? '#2A2318' : '#F0EDE6') }]}>
                    <MaterialCommunityIcons
                        name="wallet-giftcard"
                        size={22}
                        color={useReferral ? '#2ECC9A' : C.textMuted}
                    />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[rb.label, { color: C.textPrimary }]}>
                        Apply referral balance
                    </Text>
                    {useReferral ? (
                        coversAll ? (
                            <Text style={[rb.appliedText, { color: '#2ECC9A' }]}>
                                ✓ Covers full bill — no payment needed!
                            </Text>
                        ) : (
                            <Text style={[rb.appliedText, { color: '#2ECC9A' }]}>
                                {'✓ ' + fmt(applicable) + ' applied · Pay ' + fmt(remainder) + ' via Razorpay'}
                            </Text>
                        )
                    ) : (
                        <Text style={[rb.sub, { color: C.textMuted }]}>
                            {'Save ' + fmt(applicable) + ' on this order'}
                        </Text>
                    )}
                </View>
                <Switch
                    value={useReferral}
                    onValueChange={onToggle}
                    trackColor={{
                        false: isDark ? '#333' : '#D1D1D1',
                        true: 'rgba(46,204,154,0.4)',
                    }}
                    thumbColor={useReferral ? '#2ECC9A' : isDark ? '#888' : '#F4F3F4'}
                    ios_backgroundColor={isDark ? '#333' : '#D1D1D1'}
                />
            </View>

            {/* Remaining balance hint */}
            {useReferral && referralAmount > applicable && (
                <View style={[rb.hintRow, { backgroundColor: isDark ? '#1A1A14' : '#F5F0E8' }]}>
                    <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
                    <Text style={[rb.hintText, { color: C.textMuted }]}>
                        {fmt(referralAmount - applicable) + ' wallet balance will remain after this order.'}
                    </Text>
                </View>
            )}
        </Card>
    );
}
const rb = StyleSheet.create({
    balanceChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    balanceText: { fontSize: 13, color: '#2ECC9A', fontWeight: '600' },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        padding: 14,
    },
    iconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
    sub: { fontSize: 11, letterSpacing: 0.1 },
    appliedText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
    },
    hintText: { fontSize: 11, flex: 1, lineHeight: 16 },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    loadingText: { fontSize: 13 },
});

// ─── 6. Razorpay info card ────────────────────────────────────────────────────
function RazorpayInfoCard({ C, isDark }) {
    return (
        <Card isDark={isDark}>
            <SectionLabel text="Payment Method" C={C} />
            <View
                style={[
                    rzpInfo.row,
                    {
                        backgroundColor: isDark ? '#141210' : '#F8F5EF',
                        borderColor: isDark
                            ? 'rgba(91,140,255,0.2)'
                            : 'rgba(91,140,255,0.15)',
                    },
                ]}
            >
                <View
                    style={[rzpInfo.iconWrap, { backgroundColor: 'rgba(91,140,255,0.15)' }]}
                >
                    <MaterialCommunityIcons
                        name="credit-card-fast-outline"
                        size={22}
                        color="#5B8CFF"
                    />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[rzpInfo.label, { color: C.textPrimary }]}>Razorpay</Text>
                    <Text style={[rzpInfo.sub, { color: C.textMuted }]}>
                        UPI, Cards, Net Banking, Wallets
                    </Text>
                </View>
                <View style={[rzpInfo.check, { backgroundColor: '#5B8CFF' }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
            </View>
        </Card>
    );
}
const rzpInfo = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        padding: 14,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
    sub: { fontSize: 11, letterSpacing: 0.1 },
    check: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// ─── 7. Razorpay payment initiator ───────────────────────────────────────────
async function initiateRazorpay({ order, useReferral = false }) {
    if (!RAZORPAY_KEY_ID) {
        return {
            success: false,
            error: 'Razorpay key is not configured. Add RAZORPAY_KEY_ID to your .env and app.config.js extra field.',
        };
    }

    // Step 1: Ask backend to create order (backend verifies referral balance server-side)
    let backendData;
    try {
        const res = await axiosClient.post(
            `/api/orders/${order._id}/create-razorpay-order`,
            { useReferralBalance: useReferral }
        );
        backendData = res.data;
    } catch (err) {
        const msg =
            err.response?.data?.message ??
            err.message ??
            'Failed to create payment order. Please try again.';
        return { success: false, error: msg };
    }

    // Step 2: Full referral cover — no card payment needed
    if (backendData?.fullyCoveredByReferral) {
        return { success: true, fullyCoveredByReferral: true, data: backendData };
    }

    const rzpOrderId = backendData?.razorpayOrderId;
    if (!rzpOrderId) {
        return {
            success: false,
            error: 'Invalid response from payment server. Missing order ID.',
        };
    }

    // Step 3: Payment link fallback (Expo Go)
    if (backendData?.paymentLinkUrl || order.razorpay?.paymentLinkUrl) {
        const url = backendData?.paymentLinkUrl || order.razorpay.paymentLinkUrl;
        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                return { success: true, paymentLinkOpened: true };
            }
        } catch (_) { }
    }

    // Step 4: Native SDK
    if (!RazorpayCheckout) {
        return {
            success: false,
            error:
                'Razorpay SDK is not available in Expo Go.\n\n' +
                'To enable native payments:\n' +
                '1. Run `npx expo prebuild`\n' +
                '2. Run `npx expo run:android` or `npx expo run:ios`\n\n' +
                'Alternatively, ask admin to generate a payment link.',
        };
    }

    const amountPaisa = backendData.amount;
    const options = {
        description: `Payment for Order #${order.orderId}`,
        currency: backendData.currency ?? 'INR',
        key: RAZORPAY_KEY_ID,
        amount: amountPaisa,
        order_id: rzpOrderId,
        name: 'Repairo Moto',
        prefill: {
            email: order.email ?? '',
            contact: order.contactNo ?? '',
            name: order.name ?? '',
        },
        theme: { color: '#e2a731' },
    };

    try {
        const paymentData = await RazorpayCheckout.open(options);
        return { success: true, data: paymentData };
    } catch (err) {
        // Code 2 = user dismissed — not an error
        if (err?.code === 2) return { success: false, dismissed: true };
        return {
            success: false,
            error: err?.description ?? err?.message ?? 'Payment failed. Please try again.',
        };
    }
}

// ─── 8. Success overlay ───────────────────────────────────────────────────────
function SuccessOverlay({ visible, amount, orderId, invoiceNumber, onDone, C, isDark }) {
    const scale = useRef(new Animated.Value(0.7)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 6, tension: 65, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[so.wrap, { opacity }]}>
            <Animated.View
                style={[
                    so.card,
                    { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', transform: [{ scale }] },
                ]}
            >
                <View style={so.iconWrap}>
                    <View style={so.ring}>
                        <MaterialCommunityIcons name="check-circle" size={64} color="#2ECC9A" />
                    </View>
                </View>
                <Text style={[so.title, { color: C.textPrimary }]}>Payment Successful!</Text>
                <Text style={[so.amount, { color: '#2ECC9A' }]}>
                    {amount > 0 ? fmt(amount) : 'FREE'}
                </Text>
                <Text style={[so.sub, { color: C.textMuted }]}>{'Order #' + String(orderId)}</Text>
                {invoiceNumber && (
                    <View
                        style={[
                            so.invoiceBadge,
                            { backgroundColor: isDark ? '#1A2A1A' : '#E6F7EC' },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="file-document-outline"
                            size={14}
                            color="#2ECC9A"
                        />
                        <Text style={[so.invoiceText, { color: '#2ECC9A' }]}>
                            {'Invoice #' + String(invoiceNumber) + ' Generated'}
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    style={[so.btn, { backgroundColor: C.primary }]}
                    onPress={onDone}
                    activeOpacity={0.85}
                >
                    <Text style={so.btnLabel}>VIEW ORDER</Text>
                    <Ionicons name="arrow-forward" size={16} color="#1a1a1a" />
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
}
const so = StyleSheet.create({
    wrap: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: 24,
    },
    card: { width: '100%', borderRadius: 28, padding: 32, alignItems: 'center', gap: 12 },
    iconWrap: { marginBottom: 8 },
    ring: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(46,204,154,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3, textAlign: 'center' },
    amount: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
    sub: { fontSize: 12, letterSpacing: 0.5 },
    invoiceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    invoiceText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 12,
    },
    btnLabel: { fontSize: 14, fontWeight: '900', color: '#1a1a1a', letterSpacing: 1.2 },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function CheckoutScreen({ route, navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const orderId = route?.params?.orderId;

    // Redux user (for userId)
    const userFromStore = useSelector((s) => s.user?.user ?? s.auth?.user);

    const {
        currentOrder: order,
        loading: orderLoading,
        error: orderError,
        fetchOrderById,
    } = useOrder();

    // ── State ───────────────────────────────────────────────────────────────
    const [refreshing, setRefreshing] = useState(false);
    const [paying, setPaying] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [paidAmount, setPaidAmount] = useState(0);
    const [invoiceNumber, setInvoiceNumber] = useState(null);

    // Referral state — fetched live from backend
    const [referralBalance, setReferralBalance] = useState(0);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [balanceFetched, setBalanceFetched] = useState(false);
    // Default ON if balance > 0 (will be set after fetch)
    const [useReferral, setUseReferral] = useState(false);

    // ── Fetch order ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (orderId) fetchOrderById(orderId);
    }, [orderId, fetchOrderById]);

    // ── Fetch live referral balance from backend ─────────────────────────────
    // We hit the same endpoint used by useReferral hook so server enforces truth.
    const fetchReferralBalance = useCallback(async () => {
        const userId = userFromStore?._id;
        if (!userId) return;
        setLoadingBalance(true);
        try {
            const res = await axiosClient.get(`/api/user/get-user-by-id/${userId}`);
            const amount = toNum(res.data?.user?.referralAmount ?? 0);
            setReferralBalance(amount);
            // Auto-enable if balance is available
            if (amount > 0) setUseReferral(true);
        } catch (err) {
            console.warn('Could not fetch referral balance:', err?.message);
            // Fallback to Redux store value
            const storeBalance = toNum(userFromStore?.referralAmount ?? 0);
            setReferralBalance(storeBalance);
            if (storeBalance > 0) setUseReferral(true);
        } finally {
            setLoadingBalance(false);
            setBalanceFetched(true);
        }
    }, [userFromStore?._id]);

    useEffect(() => {
        fetchReferralBalance();
    }, [fetchReferralBalance]);

    // ── Pull-to-refresh ─────────────────────────────────────────────────────
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchOrderById(orderId), fetchReferralBalance()]);
        setRefreshing(false);
    }, [orderId, fetchOrderById, fetchReferralBalance]);

    // ── Verify payment ──────────────────────────────────────────────────────
    const verifyPayment = useCallback(
        async (paymentData) => {
            try {
                const res = await axiosClient.post(
                    `/api/orders/${orderId}/verify-payment`,
                    {
                        razorpay_order_id: paymentData.razorpay_order_id,
                        razorpay_payment_id: paymentData.razorpay_payment_id,
                        razorpay_signature: paymentData.razorpay_signature,
                    }
                );
                return { success: true, invoiceNumber: res.data?.invoiceNumber ?? null };
            } catch (err) {
                return {
                    success: false,
                    error:
                        `Payment received but verification failed.\n\n` +
                        `Contact support with Payment ID:\n${paymentData.razorpay_payment_id}`,
                };
            }
        },
        [orderId]
    );

    // ── Derived values ──────────────────────────────────────────────────────
    const orderPayable = toNum(order?.total?.finalPayable);
    const referralApplicable = useReferral ? Math.min(referralBalance, orderPayable) : 0;
    const finalPayable = Math.max(0, orderPayable - referralApplicable);
    const alreadyPaid = order?.paymentStatus === 'paid';

    // ── Pay handler ─────────────────────────────────────────────────────────
    const handlePay = useCallback(async () => {
        if (!order || paying) return;

        // Sanity check: if user toggled referral on but balance is 0 server-side,
        // backend will ignore it. Warn user proactively only if client thinks it covers all.
        if (useReferral && finalPayable <= 0 && referralBalance <= 0) {
            Alert.alert(
                'No Referral Balance',
                'Your referral balance appears to be empty. Please refresh and try again.',
                [{ text: 'OK' }]
            );
            return;
        }

        setPaying(true);
        try {
            const result = await initiateRazorpay({ order, useReferral });

            if (result.dismissed) {
                setPaying(false);
                return;
            }

            if (result.paymentLinkOpened) {
                setPaying(false);
                Alert.alert(
                    'Payment Initiated',
                    'Complete the payment in the browser. Pull to refresh to see your updated order status.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Fully covered by referral wallet
            if (result.fullyCoveredByReferral) {
                setPaidAmount(0);
                setInvoiceNumber(result.data?.invoiceNumber ?? null);
                // Refresh balance since it was deducted
                fetchReferralBalance();
                setPaymentSuccess(true);
                setPaying(false);
                return;
            }

            if (!result.success) {
                setPaying(false);
                Alert.alert(
                    'Payment Failed',
                    result.error ?? 'Something went wrong.',
                    [{ text: 'Try Again' }]
                );
                return;
            }

            // Verify with backend — referral deducted HERE (not before)
            const verification = await verifyPayment(result.data);
            if (verification.success) {
                setPaidAmount(finalPayable);
                setInvoiceNumber(verification.invoiceNumber);
                // Refresh balance after successful deduction
                fetchReferralBalance();
                setPaymentSuccess(true);
            } else {
                Alert.alert('Verification Failed', verification.error, [{ text: 'OK' }]);
            }
        } catch (err) {
            Alert.alert(
                'Error',
                err?.message ?? 'An unexpected error occurred.',
                [{ text: 'OK' }]
            );
        } finally {
            setPaying(false);
        }
    }, [order, useReferral, verifyPayment, paying, finalPayable, referralBalance, fetchReferralBalance]);

    // ── Guards ──────────────────────────────────────────────────────────────
    if (orderLoading && !order) {
        return (
            <ScreenWrapper title="Checkout">
                <Loader variant="skeleton" rows={6} />
            </ScreenWrapper>
        );
    }

    if (orderError && !order) {
        return (
            <ScreenWrapper title="Checkout">
                <View style={s.center}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={48}
                        color={C.textMuted}
                    />
                    <Text style={[s.errorText, { color: C.textMuted }]}>
                        {orderError ?? 'Order not found'}
                    </Text>
                    <TouchableOpacity
                        style={[s.retryBtn, { backgroundColor: C.primary }]}
                        onPress={() => fetchOrderById(orderId)}
                    >
                        <Text style={s.retryLabel}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    if (alreadyPaid) {
        return (
            <ScreenWrapper title="Checkout">
                <View style={s.center}>
                    <MaterialCommunityIcons name="check-circle" size={64} color="#2ECC9A" />
                    <Text style={[s.paidTitle, { color: C.textPrimary }]}>Payment Complete</Text>
                    <Text style={[s.paidSub, { color: C.textMuted }]}>
                        This order has already been paid.
                    </Text>
                    <TouchableOpacity
                        style={[s.retryBtn, { backgroundColor: C.primary }]}
                        onPress={() => navigation?.navigate?.('OrderDetail', { orderId })}
                    >
                        <Text style={s.retryLabel}>View Order</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    if (!order) return null;

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <ScreenWrapper title="Checkout">
            <ScrollView
                contentContainerStyle={[
                    s.scroll,
                    { backgroundColor: theme.colors.background },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={C.primary}
                        colors={[C.primary]}
                    />
                }
            >
                {/* Order summary */}
                <FadeUp delay={0}>
                    <OrderSummaryCard order={order} C={C} isDark={isDark} />
                </FadeUp>

                {/* Services + parts */}
                <FadeUp delay={60}>
                    <ServiceManifest order={order} C={C} isDark={isDark} />
                </FadeUp>

                {/* Referral wallet — always shown while loading, hidden when empty */}
                <FadeUp delay={100}>
                    <ReferralBalanceCard
                        referralAmount={referralBalance}
                        useReferral={useReferral}
                        onToggle={setUseReferral}
                        orderPayable={orderPayable}
                        isLoadingBalance={loadingBalance && !balanceFetched}
                        C={C}
                        isDark={isDark}
                    />
                </FadeUp>

                {/* Full price breakdown */}
                <FadeUp delay={140}>
                    <FinancialBreakdown
                        total={order.total}
                        coupon={order.coupon}
                        referralBalanceApplied={referralApplicable}
                        C={C}
                        isDark={isDark}
                    />
                </FadeUp>

                {/* Payment method */}
                <FadeUp delay={180}>
                    <RazorpayInfoCard C={C} isDark={isDark} />
                </FadeUp>

                {/* Expo Go warning */}
                {!RazorpayCheckout && (
                    <FadeUp delay={200}>
                        <View
                            style={[
                                s.expoNote,
                                {
                                    backgroundColor: isDark ? '#1A1A2E' : '#EEF2FF',
                                    borderColor: isDark
                                        ? 'rgba(91,140,255,0.2)'
                                        : 'rgba(91,140,255,0.2)',
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="information-outline"
                                size={15}
                                color="#5B8CFF"
                            />
                            <Text style={s.expoNoteText}>
                                {'Native Razorpay SDK requires a custom dev client. Run '}
                                <Text style={{ fontWeight: '800' }}>npx expo prebuild</Text>
                                {' then '}
                                <Text style={{ fontWeight: '800' }}>npx expo run:android</Text>
                                {' to enable payments.'}
                            </Text>
                        </View>
                    </FadeUp>
                )}

                {/* Security note */}
                <FadeUp delay={220}>
                    <View
                        style={[
                            s.secNote,
                            {
                                backgroundColor: isDark ? '#1C1A14' : '#F8F5EF',
                                borderColor: C.border,
                            },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="shield-check-outline"
                            size={14}
                            color={C.textMuted}
                        />
                        <Text style={[s.secText, { color: C.textMuted }]}>
                            Payments are secured by Razorpay with 256-bit SSL encryption. Your card
                            details are never stored.
                        </Text>
                    </View>
                </FadeUp>

                <View style={{ height: 130 }} />
            </ScrollView>

            {/* ── Sticky pay button ── */}
            <View
                style={[
                    s.stickyBar,
                    {
                        backgroundColor: theme.colors.background,
                        borderTopColor: C.border,
                        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
                    },
                ]}
            >
                {/* Mini breakdown summary in sticky bar */}
                <View style={s.amountRow}>
                    <View style={{ gap: 2 }}>
                        <Text style={[s.amountLabel, { color: C.textMuted }]}>Total Payable</Text>
                        {useReferral && referralApplicable > 0 && (
                            <Text style={s.savingsBadge}>
                                {'Wallet: -' + fmtSimple(referralApplicable)}
                            </Text>
                        )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        {useReferral && referralApplicable > 0 && orderPayable > finalPayable && (
                            <Text style={[s.originalAmount, { color: C.textMuted }]}>
                                {fmtSimple(orderPayable)}
                            </Text>
                        )}
                        <Text style={[s.amountValue, { color: C.primary }]}>
                            {fmtSimple(finalPayable)}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        s.payBtn,
                        {
                            backgroundColor: paying
                                ? isDark
                                    ? '#2A2318'
                                    : '#EDE8DC'
                                : finalPayable <= 0
                                    ? '#2ECC9A'
                                    : C.primary,
                            shadowColor: finalPayable <= 0 ? '#2ECC9A' : C.primary,
                            opacity: paying ? 0.8 : 1,
                        },
                    ]}
                    onPress={handlePay}
                    disabled={paying}
                    activeOpacity={0.88}
                >
                    {paying ? (
                        <View style={s.payBtnInner}>
                            <ActivityIndicator size="small" color="#1a1a1a" />
                            <Text style={[s.payBtnLabel, { color: '#1a1a1a' }]}>
                                Processing…
                            </Text>
                        </View>
                    ) : (
                        <View style={s.payBtnInner}>
                            <MaterialCommunityIcons
                                name={
                                    finalPayable <= 0
                                        ? 'check-circle'
                                        : 'credit-card-fast-outline'
                                }
                                size={20}
                                color="#1a1a1a"
                            />
                            <Text style={s.payBtnLabel}>
                                {finalPayable <= 0
                                    ? 'Confirm Order (Free)'
                                    : 'Pay ' + fmtSimple(finalPayable)}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Payment success overlay */}
            <SuccessOverlay
                visible={paymentSuccess}
                amount={paidAmount}
                orderId={order.orderId}
                invoiceNumber={invoiceNumber}
                C={C}
                isDark={isDark}
                onDone={() => {
                    setPaymentSuccess(false);
                    navigation?.navigate?.('OrderDetail', { orderId });
                }}
            />
        </ScreenWrapper>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    scroll: { flexGrow: 1, gap: 14, paddingTop: 16, paddingBottom: 24 },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
    },
    errorText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    paidTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
    paidSub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    retryBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
    retryLabel: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1 },
    expoNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
    },
    expoNoteText: { fontSize: 11, color: '#5B8CFF', flex: 1, lineHeight: 17 },
    secNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
    },
    secText: { fontSize: 11, flex: 1, lineHeight: 17 },
    stickyBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 12,
        paddingHorizontal: 20,
        gap: 10,
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    amountLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
    savingsBadge: { fontSize: 10, fontWeight: '700', color: '#2ECC9A' },
    originalAmount: { fontSize: 11, textDecorationLine: 'line-through' },
    amountValue: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
    payBtn: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    payBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    payBtnLabel: { fontSize: 16, fontWeight: '900', color: '#1a1a1a', letterSpacing: 1 },
});