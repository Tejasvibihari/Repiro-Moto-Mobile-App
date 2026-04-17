// screens/order/OrderDetailScreen.js
import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Alert,
    Platform,
    RefreshControl,
    TextInput,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Image,
    FlatList,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Loader from '../../components/common/Loader';
import { MechanicCard, VendorCard } from '../../components/orders/MechanicCard';
import useOrder from '../../hooks/useOrder';
import PopUp from '../../components/common/PopUp';
import axiosClient from '../../services/axiosClient';
import { getImageUrl } from '../../utils/imageUtils';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_STEPS = [
    {
        key: 'Pending',
        label: 'Pending',
        icon: 'clock-outline',
        desc: 'Order placed, awaiting assignment',
    },
    {
        key: 'Mechanic Assigned',
        label: 'Assigned',
        icon: 'account-check-outline',
        desc: 'Mechanic has been assigned',
    },
    {
        key: 'Mechanic Arrived',
        label: 'Arrived',
        icon: 'map-marker-check-outline',
        desc: 'Mechanic has arrived at location',
    },
    {
        key: 'In Progress',
        label: 'In Progress',
        icon: 'wrench-outline',
        desc: 'Work is currently in progress',
    },
    {
        key: 'Work Completed',
        label: 'Work Done',               // ← clarified to avoid confusion with final "Completed"
        icon: 'check-circle-outline',
        desc: 'Work completed by mechanic',
    },
    {
        key: 'Invoice Generated',
        label: 'Invoice Ready',
        icon: 'file-document-outline',
        desc: 'Invoice ready, payment pending',
    },
    {
        key: 'Completed',
        label: 'Completed',                // ← final state: paid & done
        icon: 'flag-checkered',
        desc: 'Order fully completed & paid',
    },
];

const STATUS_COLORS = {
    'Pending': { bg: 'rgba(226,167,49,0.15)', text: '#E2A731', dot: '#E2A731' },
    'Mechanic Assigned': { bg: 'rgba(91,140,255,0.15)', text: '#5B8CFF', dot: '#5B8CFF' },
    'Mechanic Arrived': { bg: 'rgba(140,91,255,0.15)', text: '#8C5BFF', dot: '#8C5BFF' },
    'In Progress': { bg: 'rgba(255,165,0,0.15)', text: '#FFA500', dot: '#FFA500' },
    'Work Completed': { bg: 'rgba(46,204,154,0.12)', text: '#2ECC9A', dot: '#2ECC9A' },
    'Invoice Generated': { bg: 'rgba(91,140,255,0.15)', text: '#5B8CFF', dot: '#5B8CFF' },
    'Completed': { bg: 'rgba(46,204,154,0.15)', text: '#2ECC9A', dot: '#2ECC9A' },
    'Cancelled': { bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B', dot: '#FF6B6B' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCurrency = (n) =>
    `₹${Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
    const cfg = STATUS_COLORS[status] ?? STATUS_COLORS['Pending'];
    return (
        <View style={[pill.wrap, { backgroundColor: cfg.bg }]}>
            <View style={[pill.dot, { backgroundColor: cfg.dot }]} />
            <Text style={[pill.label, { color: cfg.text }]}>
                {(status ?? 'Pending').toUpperCase()}
            </Text>
        </View>
    );
}
const pill = StyleSheet.create({
    wrap: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    label: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
});

// ─── Progress Stepper ─────────────────────────────────────────────────────────
function OrderProgressStepper({ status, C, isDark }) {
    if (status === 'Cancelled') {
        return (
            <View style={[ps.card, {
                backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
            }]}>
                <View style={ps.cancelledRow}>
                    <View style={[ps.cancelIcon, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
                        <MaterialCommunityIcons name="close-circle" size={28} color="#FF6B6B" />
                    </View>
                    <View>
                        <Text style={[ps.cancelTitle, { color: '#FF6B6B' }]}>Order Cancelled</Text>
                        <Text style={[ps.cancelSub, { color: C.textMuted }]}>
                            This order has been cancelled
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);

    return (
        <View style={[ps.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            <Text style={[ps.heading, { color: C.textMuted }]}>ORDER PROGRESS</Text>
            {STATUS_STEPS.map((step, idx) => {
                const isDone = idx < currentIdx;
                const isActive = idx === currentIdx;
                const isPending = idx > currentIdx;
                const isLast = idx === STATUS_STEPS.length - 1;

                return (
                    <View key={step.key} style={ps.stepRow}>
                        {/* Line + dot column */}
                        <View style={ps.lineCol}>
                            <View style={[
                                ps.dot,
                                isDone && { backgroundColor: '#2ECC9A', borderColor: '#2ECC9A' },
                                isActive && { backgroundColor: C.primary, borderColor: C.primary },
                                isPending && {
                                    backgroundColor: 'transparent',
                                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
                                },
                            ]}>
                                {isDone ? (
                                    <Ionicons name="checkmark" size={10} color="#fff" />
                                ) : isActive ? (
                                    <View style={ps.activePulse} />
                                ) : null}
                            </View>
                            {!isLast && (
                                <View style={[
                                    ps.line,
                                    { backgroundColor: isDone ? '#2ECC9A' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') },
                                ]} />
                            )}
                        </View>

                        {/* Content */}
                        <View style={[ps.content, { paddingBottom: isLast ? 0 : 18 }]}>
                            <View style={ps.stepHeader}>
                                <Text style={[
                                    ps.stepLabel,
                                    {
                                        color: isDone ? '#2ECC9A' : isActive ? C.primary : C.textMuted,
                                        fontWeight: isActive ? '800' : '600',
                                    },
                                ]}>
                                    {step.label}
                                </Text>
                                {isActive && (
                                    <View style={[ps.activeBadge, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                                        <Text style={[ps.activeBadgeText, { color: C.primary }]}>CURRENT</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[ps.stepDesc, { color: C.textMuted }]}>{step.desc}</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const ps = StyleSheet.create({
    card: {
        borderRadius: 18, borderWidth: 1, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    heading: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, marginBottom: 16 },
    stepRow: { flexDirection: 'row', gap: 14 },
    lineCol: { alignItems: 'center', width: 20 },
    dot: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    activePulse: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a1a1a',
    },
    line: { flex: 1, width: 2, marginTop: 2 },
    content: { flex: 1, paddingBottom: 18 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    stepLabel: { fontSize: 13, letterSpacing: 0.1 },
    stepDesc: { fontSize: 11, lineHeight: 16 },
    activeBadge: {
        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
    },
    activeBadgeText: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    cancelledRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    cancelIcon: {
        width: 52, height: 52, borderRadius: 26,
        alignItems: 'center', justifyContent: 'center',
    },
    cancelTitle: { fontSize: 15, fontWeight: '800' },
    cancelSub: { fontSize: 12, marginTop: 2 },
});

// ─── Service Manifest Card ────────────────────────────────────────────────────
function ServiceManifestCard({ serviceProvided = [], partsUsed = [], services = [], C, isDark }) {
    const hasServices = serviceProvided.length > 0 || services.length > 0;
    const hasParts = partsUsed.length > 0;
    if (!hasServices && !hasParts) return null;

    return (
        <View style={[smc.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            <Text style={[smc.heading, { color: C.textMuted }]}>SERVICE MANIFEST</Text>

            {hasServices && (
                <View style={smc.section}>
                    <View style={smc.sectionHeader}>
                        <MaterialCommunityIcons name="wrench" size={13} color={C.primary} />
                        <Text style={[smc.sectionTitle, { color: C.textSecondary }]}>Services</Text>
                    </View>
                    <View style={[smc.itemBox, {
                        backgroundColor: isDark ? '#141210' : '#F8F5EF',
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
                    }]}>
                        {(serviceProvided.length > 0 ? serviceProvided : services).map((s, i) => {
                            const name = typeof s === 'string' ? s : s.serviceName;
                            const price = typeof s === 'object' ? s.price : null;
                            const discountPrice = typeof s === 'object' ? s.discountPrice : null;
                            const qty = typeof s === 'object' ? s.quantity : 1;
                            const finalPrice = discountPrice > 0 && discountPrice < price ? discountPrice : price;
                            return (
                                <View key={i} style={[smc.lineItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[smc.itemName, { color: C.textPrimary }]}>{name}</Text>
                                        {qty > 1 && <Text style={[smc.itemMeta, { color: C.textMuted }]}>Qty: {qty}</Text>}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {discountPrice > 0 && discountPrice < price && (
                                            <Text style={[smc.strikePrice, { color: C.textMuted }]}>{fmtCurrency(price)}</Text>
                                        )}
                                        {finalPrice != null && (
                                            <Text style={[smc.itemPrice, { color: C.textPrimary }]}>{fmtCurrency(finalPrice)}</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {hasParts && (
                <View style={smc.section}>
                    <View style={smc.sectionHeader}>
                        <MaterialCommunityIcons name="cog" size={13} color={C.primary} />
                        <Text style={[smc.sectionTitle, { color: C.textSecondary }]}>Replacement Parts</Text>
                    </View>
                    <View style={[smc.itemBox, {
                        backgroundColor: isDark ? '#141210' : '#F8F5EF',
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
                    }]}>
                        {partsUsed.map((p, i) => {
                            const finalPrice = p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price;
                            return (
                                <View key={i} style={[smc.lineItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[smc.itemName, { color: C.textPrimary }]}>{p.partName}</Text>
                                        {p.quantity > 1 && <Text style={[smc.itemMeta, { color: C.textMuted }]}>Qty: {p.quantity}</Text>}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {p.discountPrice > 0 && p.discountPrice < p.price && (
                                            <Text style={[smc.strikePrice, { color: C.textMuted }]}>{fmtCurrency(p.price)}</Text>
                                        )}
                                        <Text style={[smc.itemPrice, { color: C.textPrimary }]}>{fmtCurrency(finalPrice)}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </View>
    );
}

const smc = StyleSheet.create({
    card: {
        borderRadius: 18, borderWidth: 1, padding: 18, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    heading: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
    section: { gap: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    itemBox: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    lineItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
    itemName: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
    itemMeta: { fontSize: 11, marginTop: 2 },
    itemPrice: { fontSize: 13, fontWeight: '700' },
    strikePrice: { fontSize: 11, textDecorationLine: 'line-through' },
});

// ─── Financial Summary Card ───────────────────────────────────────────────────
function FinancialSummaryCard({ total, coupon, paymentStatus, paymentMethod, amountPaid, paymentDate, C, isDark }) {
    if (!total) return null;

    const {
        baseAmount = 0,
        discount = 0,
        referralDiscount = 0,
        sgst = 0,
        cgst = 0,
        sgstRate = 0,
        cgstRate = 0,
        total: totalAmt = 0,
        finalPayable = 0,
    } = total;

    const isPaid = paymentStatus === 'paid';

    return (
        <View style={[fin.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            <Text style={[fin.heading, { color: C.textMuted }]}>FINANCIAL BREAKDOWN</Text>

            {/* Payment status badge */}
            <View style={[fin.payBadge, {
                backgroundColor: isPaid
                    ? (isDark ? '#1A2A1A' : '#E6F7EC')
                    : (isDark ? '#2A2318' : '#FFF4E0'),
                borderColor: isPaid ? 'rgba(46,204,154,0.3)' : 'rgba(226,167,49,0.3)',
            }]}>
                <MaterialCommunityIcons
                    name={isPaid ? 'check-circle' : 'clock-outline'}
                    size={15}
                    color={isPaid ? '#2ECC9A' : '#E2A731'}
                />
                <View style={{ flex: 1 }}>
                    <Text style={[fin.payBadgeTitle, { color: isPaid ? '#2ECC9A' : '#E2A731' }]}>
                        {isPaid ? 'Payment Received' : 'Payment Pending'}
                    </Text>
                    {isPaid && paymentDate && (
                        <Text style={[fin.payBadgeSub, { color: C.textMuted }]}>
                            Paid via {(paymentMethod ?? 'online').toUpperCase()} on {fmtDate(paymentDate)}
                        </Text>
                    )}
                    {isPaid && amountPaid > 0 && (
                        <Text style={[fin.payBadgeSub, { color: C.textMuted }]}>
                            Amount: {fmtCurrency(amountPaid)}
                        </Text>
                    )}
                </View>
            </View>

            {/* Breakdown rows */}
            <View style={fin.rows}>
                {baseAmount > 0 && (
                    <FinRow label="Subtotal" value={fmtCurrency(baseAmount)} C={C} />
                )}
                {discount > 0 && (
                    <FinRow
                        label={`Discount${coupon ? ` (${coupon})` : ''}`}
                        value={`-${fmtCurrency(discount)}`}
                        positive
                        C={C}
                    />
                )}
                {referralDiscount > 0 && (
                    <FinRow
                        label="Referral Discount"
                        value={`-${fmtCurrency(referralDiscount)}`}
                        positive
                        C={C}
                    />
                )}
                {sgst > 0 && (
                    <FinRow label={`SGST (${sgstRate}%)`} value={fmtCurrency(sgst)} muted C={C} />
                )}
                {cgst > 0 && (
                    <FinRow label={`CGST (${cgstRate}%)`} value={fmtCurrency(cgst)} muted C={C} />
                )}

                <View style={[fin.divider, { backgroundColor: C.border }]} />

                <View style={fin.totalRow}>
                    <Text style={[fin.totalLabel, { color: C.textPrimary }]}>
                        {isPaid ? 'TOTAL PAID' : 'TOTAL PAYABLE'}
                    </Text>
                    <Text style={[fin.totalValue, { color: isPaid ? '#2ECC9A' : C.primary }]}>
                        {fmtCurrency(isPaid ? (amountPaid || finalPayable) : finalPayable)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

function FinRow({ label, value, positive, muted, C }) {
    return (
        <View style={fin.row}>
            <Text style={[fin.rowLabel, { color: muted ? C.textMuted : C.textSecondary }]}>{label}</Text>
            <Text style={[fin.rowValue, { color: positive ? '#2ECC9A' : (muted ? C.textMuted : C.textSecondary) }]}>
                {value}
            </Text>
        </View>
    );
}

const fin = StyleSheet.create({
    card: {
        borderRadius: 18, borderWidth: 1, padding: 18, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    heading: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
    payBadge: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        borderRadius: 14, borderWidth: 1, padding: 12,
    },
    payBadgeTitle: { fontSize: 13, fontWeight: '700' },
    payBadgeSub: { fontSize: 11, marginTop: 2 },
    rows: { gap: 0 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    rowLabel: { fontSize: 13 },
    rowValue: { fontSize: 13, fontWeight: '600' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    totalValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
});

function PhotosCard({ beforePhotos = [], afterPhotos = [], photosDeleted = false, C, isDark, onPhotoPress }) {
    const hasBefore = beforePhotos.length > 0;
    const hasAfter = afterPhotos.length > 0;
    if (!hasBefore && !hasAfter && !photosDeleted) return null;

    // Helper to get full image URL
    const getPhotoUrl = (path) => getImageUrl(path);

    if (photosDeleted) {
        return (
            <View style={[phc.card, {
                backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
            }]}>
                <Text style={[phc.heading, { color: C.textMuted }]}>REPAIR PHOTOS</Text>
                <View style={[phc.deletedBanner, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                    <MaterialCommunityIcons name="image-off-outline" size={22} color="#E2A731" />
                    <Text style={[phc.deletedText, { color: C.textSecondary }]}>
                        Photos have been automatically deleted after 7 days of order completion.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[phc.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            <Text style={[phc.heading, { color: C.textMuted }]}>REPAIR PHOTOS</Text>

            {/* Auto-delete notice */}
            <View style={[phc.notice, {
                backgroundColor: isDark ? '#1A1A2E' : '#EEF2FF',
                borderColor: isDark ? 'rgba(91,140,255,0.2)' : 'rgba(91,140,255,0.2)',
            }]}>
                <MaterialCommunityIcons name="information-outline" size={13} color="#5B8CFF" />
                <Text style={phc.noticeText}>
                    Photos are automatically deleted 7 days after order completion.
                </Text>
            </View>

            {hasBefore && (
                <View style={phc.section}>
                    <View style={phc.sectionHeader}>
                        <View style={[phc.dot, { backgroundColor: '#E2A731' }]} />
                        <Text style={[phc.sectionTitle, { color: C.textSecondary }]}>Before Repair</Text>
                        <Text style={[phc.count, { color: C.textMuted }]}>{beforePhotos.length}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={phc.photoRow}>
                        {beforePhotos.map((uri, i) => {
                            const fullUrl = getPhotoUrl(uri);
                            if (!fullUrl) return null;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[phc.thumb, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}
                                    onPress={() => onPhotoPress({ photos: beforePhotos, index: i, type: 'Before' })}
                                    activeOpacity={0.85}
                                >
                                    <Image source={{ uri: fullUrl }} style={phc.thumbImg} resizeMode="cover" />
                                    <View style={phc.thumbOverlay}>
                                        <Ionicons name="expand-outline" size={14} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {hasAfter && (
                <View style={phc.section}>
                    <View style={phc.sectionHeader}>
                        <View style={[phc.dot, { backgroundColor: '#2ECC9A' }]} />
                        <Text style={[phc.sectionTitle, { color: C.textSecondary }]}>After Repair</Text>
                        <Text style={[phc.count, { color: C.textMuted }]}>{afterPhotos.length}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={phc.photoRow}>
                        {afterPhotos.map((uri, i) => {
                            const fullUrl = getPhotoUrl(uri);
                            if (!fullUrl) return null;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[phc.thumb, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}
                                    onPress={() => onPhotoPress({ photos: afterPhotos, index: i, type: 'After' })}
                                    activeOpacity={0.85}
                                >
                                    <Image source={{ uri: fullUrl }} style={phc.thumbImg} resizeMode="cover" />
                                    <View style={phc.thumbOverlay}>
                                        <Ionicons name="expand-outline" size={14} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const phc = StyleSheet.create({
    card: {
        borderRadius: 18, borderWidth: 1, padding: 18, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    heading: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
    notice: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 7,
        borderRadius: 10, borderWidth: 1, padding: 10,
    },
    noticeText: { fontSize: 11, color: '#5B8CFF', flex: 1, lineHeight: 16 },
    section: { gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    sectionTitle: { fontSize: 12, fontWeight: '700' },
    count: { fontSize: 11 },
    photoRow: { gap: 10, paddingRight: 4 },
    thumb: {
        width: 110, height: 110, borderRadius: 12, overflow: 'hidden',
        borderWidth: 1,
    },
    thumbImg: { width: '100%', height: '100%' },
    thumbOverlay: {
        position: 'absolute', bottom: 6, right: 6,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 20, padding: 5,
    },
    deletedBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        borderRadius: 12, padding: 14,
    },
    deletedText: { fontSize: 12, flex: 1, lineHeight: 18 },
});

function FullScreenPhotoViewer({ visible, photos = [], initialIndex = 0, type = '', onClose }) {
    const [current, setCurrent] = useState(initialIndex);
    const flatRef = useRef(null);

    // Helper to get full image URL
    const getPhotoUrl = (path) => getImageUrl(path);

    useEffect(() => {
        if (visible) setCurrent(initialIndex);
    }, [visible, initialIndex]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={fsv.container}>
                <StatusBar hidden />

                {/* Header */}
                <View style={fsv.header}>
                    <View style={fsv.badge}>
                        <View style={[fsv.badgeDot, { backgroundColor: type === 'Before' ? '#E2A731' : '#2ECC9A' }]} />
                        <Text style={fsv.badgeText}>{type} Repair</Text>
                    </View>
                    <Text style={fsv.counter}>{current + 1} / {photos.length}</Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={fsv.closeBtn}
                        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    >
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Photos */}
                <FlatList
                    ref={flatRef}
                    data={photos}
                    keyExtractor={(_, i) => i.toString()}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
                    onMomentumScrollEnd={(e) => {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                        setCurrent(idx);
                    }}
                    renderItem={({ item }) => {
                        const fullUrl = getPhotoUrl(item);
                        if (!fullUrl) return null;
                        return (
                            <View style={fsv.imgWrap}>
                                <Image
                                    source={{ uri: fullUrl }}
                                    style={fsv.img}
                                    resizeMode="contain"
                                />
                            </View>
                        );
                    }}
                />

                {/* Notice */}
                <View style={fsv.notice}>
                    <MaterialCommunityIcons name="clock-alert-outline" size={13} color="rgba(255,255,255,0.55)" />
                    <Text style={fsv.noticeText}>
                        Photos are automatically deleted 7 days after order completion
                    </Text>
                </View>
            </View>
        </Modal>
    );
}
const fsv = StyleSheet.create({
    container: {
        flex: 1, backgroundColor: '#000',
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 52 : 36,
        paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 10,
    },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    badgeDot: { width: 8, height: 8, borderRadius: 4 },
    badgeText: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
    counter: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    closeBtn: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20, padding: 6,
    },
    imgWrap: {
        width: SCREEN_W, height: SCREEN_H,
        alignItems: 'center', justifyContent: 'center',
    },
    img: { width: SCREEN_W, height: SCREEN_H * 0.75 },
    notice: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    noticeText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.2 },
});

// ─── Reason Input Modal ───────────────────────────────────────────────────────
const ReasonInputModal = ({ visible, onClose, onSubmit, loading, theme }) => {
    const [reason, setReason] = useState('');
    const [validationError, setValidationError] = useState('');
    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const isDark = theme.mode === 'dark';

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, speed: 22, bounciness: 7, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
            setReason('');
            setValidationError('');
        } else {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 0.92, duration: 160, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleSubmit = () => {
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            setValidationError('Please provide a reason for cancellation.');
            return;
        }
        setValidationError('');
        onSubmit(trimmedReason);
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[
                    rim.backdrop,
                    { opacity: backdropOpacity, backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)' },
                ]} />
            </TouchableWithoutFeedback>
            <View style={rim.centeredWrapper} pointerEvents="box-none">
                <Animated.View style={[
                    rim.card,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                        ...Platform.select({
                            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.3 : 0.2, shadowRadius: 24 },
                            android: { elevation: 16 },
                        }),
                    },
                ]}>
                    <TouchableOpacity style={rim.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                    <View style={[rim.iconBadge, { backgroundColor: isDark ? '#271F00' : '#FFFBEC' }]}>
                        <Ionicons name="warning" size={42} color="#e2a731" />
                    </View>
                    <Text style={[rim.title, { color: theme.colors.textPrimary }]}>Cancel Order</Text>
                    <Text style={[rim.message, { color: theme.colors.textSecondary }]}>
                        Please provide a reason for cancellation (required):
                    </Text>
                    <TextInput
                        style={[rim.input, {
                            backgroundColor: theme.colors.background,
                            borderColor: validationError ? '#FF6B6B' : theme.colors.border,
                            color: theme.colors.textPrimary,
                        }]}
                        placeholder="e.g., Changed mind, Found another service..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={reason}
                        onChangeText={(t) => { setReason(t); if (validationError) setValidationError(''); }}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                    {validationError ? (
                        <Text style={[rim.errorText, { color: '#FF6B6B' }]}>{validationError}</Text>
                    ) : null}
                    <View style={rim.buttonRow}>
                        <View style={{ flex: 1 }}>
                            <TouchableOpacity
                                style={[rim.secondaryBtn, { borderColor: theme.colors.border }]}
                                onPress={onClose}
                                disabled={loading}
                            >
                                <Text style={[rim.secondaryLabel, { color: theme.colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <TouchableOpacity
                                style={[rim.primaryBtn, { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 }]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#1a1a1a" />
                                ) : (
                                    <Text style={rim.primaryLabel}>Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const rim = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject },
    centeredWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    card: {
        width: '100%', maxWidth: 360, borderRadius: 28, borderWidth: 1,
        paddingTop: 28, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center',
    },
    closeBtn: { position: 'absolute', top: 12, right: 12, padding: 6, zIndex: 1 },
    iconBadge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2, marginBottom: 8 },
    message: { fontSize: 14, lineHeight: 22, textAlign: 'center', letterSpacing: 0.1, marginBottom: 16, paddingHorizontal: 4 },
    input: {
        width: '100%', borderWidth: 1, borderRadius: 14,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, lineHeight: 20,
        marginBottom: 8, minHeight: 80, textAlignVertical: 'top',
    },
    errorText: { fontSize: 12, alignSelf: 'flex-start', marginBottom: 12 },
    buttonRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
    primaryBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    primaryLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    secondaryBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    secondaryLabel: { fontSize: 14, fontWeight: '600' },
});

// ─── Action Buttons ───────────────────────────────────────────────────────────
function ActionButtons({ order, onCancel, onViewInvoice, onPay, C, isDark }) {
    const status = order?.status;
    const paymentStatus = order?.paymentStatus;
    const finalPayable = order?.total?.finalPayable ?? 0;

    const canCancel = ['Pending', 'Mechanic Assigned'].includes(status);
    const isCompleted = status === 'Work Completed';
    const isInvoiceGenerated = status === 'Invoice Generated';
    const isPaid = paymentStatus === 'paid';

    const showPayButton = isInvoiceGenerated && !isPaid && finalPayable > 0;
    const showViewInvoice = (status === 'Completed' || isInvoiceGenerated) && isPaid;

    if (!canCancel && !isCompleted && !isInvoiceGenerated && !showViewInvoice) return null;

    return (
        <View style={ab.container}>
            {canCancel && (
                <TouchableOpacity
                    style={[ab.btn, {
                        backgroundColor: isDark ? '#2A1414' : '#FFF5F5',
                        borderColor: 'rgba(255,107,107,0.3)',
                    }]}
                    onPress={onCancel}
                    activeOpacity={0.78}
                >
                    <MaterialCommunityIcons name="close-circle-outline" size={15} color="#FF6B6B" />
                    <Text style={ab.cancelLabel}>Cancel Order</Text>
                </TouchableOpacity>
            )}

            {isCompleted && !isInvoiceGenerated && (
                <View style={ab.messageRow}>
                    <ActivityIndicator size="small" color={C.primary} />
                    <Text style={[ab.messageText, { color: C.textSecondary }]}>
                        Generating your bill, please wait...
                    </Text>
                </View>
            )}

            {showPayButton && (
                <TouchableOpacity
                    style={[ab.btn, { backgroundColor: C.primary }]}
                    onPress={onPay}
                    activeOpacity={0.82}
                >
                    <MaterialCommunityIcons name="credit-card-fast-outline" size={15} color="#1a1a1a" />
                    <Text style={ab.payLabel}>Pay Now — {fmtCurrency(finalPayable)}</Text>
                </TouchableOpacity>
            )}

            {showViewInvoice && (
                <TouchableOpacity
                    style={[ab.btn, {
                        backgroundColor: isDark ? '#1C3D2E' : '#E6F7EC',
                        borderColor: '#2ECC9A',
                    }]}
                    onPress={onViewInvoice}
                    activeOpacity={0.82}
                >
                    <MaterialCommunityIcons name="file-document-outline" size={15} color="#2ECC9A" />
                    <Text style={[ab.btnLabel, { color: '#2ECC9A' }]}>View Invoice</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const ab = StyleSheet.create({
    container: { gap: 10 },
    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: 'transparent',
    },
    cancelLabel: { fontSize: 12, fontWeight: '700', color: '#FF6B6B', letterSpacing: 0.5 },
    payLabel: { fontSize: 12, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.8 },
    btnLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
    messageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
    messageText: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
});

// ─── Order Header Card ────────────────────────────────────────────────────────
function OrderHeaderCard({ order, C, isDark, onCancel, onViewInvoice, onPay }) {
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideY = useRef(new Animated.Value(16)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
        ]).start();
    }, []);

    const bikeName = `${order.selectedBrand ?? ''} ${order.selectedModel ?? ''}`.trim();
    const modelFull = order.modelName ? `${bikeName} ${order.modelName}` : bikeName;

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const estimatedDateStr = (() => {
        if (!order.preferredDate) return null;
        const d = new Date(order.preferredDate);
        if (isNaN(d.getTime())) return null;
        const dayName = DAYS[d.getDay()];
        const mon = MONTHS[d.getMonth()];
        const day = d.getDate();
        let hrs = d.getHours();
        const mins = String(d.getMinutes()).padStart(2, '0');
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12 || 12;
        return `${dayName}, ${mon} ${day} · ${hrs}:${mins} ${ampm}`;
    })();

    return (
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideY }] }}>
            <View style={[hdr.card, {
                backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
            }]}>
                <View style={hdr.topRow}>
                    <Text style={[hdr.orderLabel, { color: C.textMuted }]}>#{order.orderId}</Text>
                    <StatusPill status={order.status} />
                </View>

                <Text style={[hdr.bikeName, { color: C.textPrimary }]} numberOfLines={2}>
                    {modelFull || 'Unknown Bike'}
                </Text>

                {estimatedDateStr && (
                    <View style={hdr.etaRow}>
                        <Ionicons name="time-outline" size={13} color={C.textMuted} />
                        <Text style={[hdr.eta, { color: C.textMuted }]}>Scheduled: {estimatedDateStr}</Text>
                    </View>
                )}

                <View style={hdr.pillRow}>
                    {order.cc && (
                        <View style={[hdr.infoPill, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                            <Text style={[hdr.infoPillText, { color: C.textSecondary }]}>{order.cc} CC</Text>
                        </View>
                    )}
                    {order.bs && (
                        <View style={[hdr.infoPill, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                            <Text style={[hdr.infoPillText, { color: C.textSecondary }]}>{order.bs}</Text>
                        </View>
                    )}
                    {order.city && (
                        <View style={[hdr.infoPill, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                            <Ionicons name="location-outline" size={11} color={C.textMuted} />
                            <Text style={[hdr.infoPillText, { color: C.textSecondary }]}>{order.city}</Text>
                        </View>
                    )}
                    {order.serviceType && (
                        <View style={[hdr.infoPill, {
                            backgroundColor: order.serviceType === 'Emergency Repair'
                                ? 'rgba(255,107,107,0.12)' : (isDark ? '#2A2318' : '#F0EDE6'),
                        }]}>
                            <MaterialCommunityIcons
                                name={order.serviceType === 'Emergency Repair' ? 'alert-circle-outline' : 'calendar-clock'}
                                size={11}
                                color={order.serviceType === 'Emergency Repair' ? '#FF6B6B' : C.textMuted}
                            />
                            <Text style={[hdr.infoPillText, {
                                color: order.serviceType === 'Emergency Repair' ? '#FF6B6B' : C.textSecondary,
                            }]}>
                                {order.serviceType}
                            </Text>
                        </View>
                    )}
                </View>

                {order.paymentStatus === 'paid' && (
                    <View style={[hdr.paidBadge, { backgroundColor: isDark ? '#1A2A1A' : '#E6F7EC' }]}>
                        <MaterialCommunityIcons name="check-circle" size={14} color="#2ECC9A" />
                        <Text style={hdr.paidText}>Payment Complete</Text>
                    </View>
                )}

                {order.cancellationReason && (
                    <View style={[hdr.cancelNote, {
                        backgroundColor: isDark ? '#2A1414' : '#FFF5F5',
                        borderColor: 'rgba(255,107,107,0.2)',
                    }]}>
                        <MaterialCommunityIcons name="close-circle-outline" size={13} color="#FF6B6B" />
                        <Text style={[hdr.cancelNoteText, { color: '#FF6B6B' }]}>
                            Cancelled: {order.cancellationReason}
                        </Text>
                    </View>
                )}

                <ActionButtons
                    order={order}
                    onCancel={onCancel}
                    onViewInvoice={onViewInvoice}
                    onPay={onPay}
                    C={C}
                    isDark={isDark}
                />
            </View>
        </Animated.View>
    );
}

const hdr = StyleSheet.create({
    card: {
        borderRadius: 20, borderWidth: 1, padding: 18, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1, shadowRadius: 14, elevation: 4,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
    bikeName: { fontSize: 26, fontWeight: '900', letterSpacing: -0.4, lineHeight: 32 },
    etaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    eta: { fontSize: 12, letterSpacing: 0.1 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    infoPill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    infoPillText: { fontSize: 11, fontWeight: '600' },
    paidBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start',
    },
    paidText: { fontSize: 11, fontWeight: '700', color: '#2ECC9A', letterSpacing: 0.3 },
    cancelNote: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 7,
        borderRadius: 10, borderWidth: 1, padding: 10,
    },
    cancelNoteText: { fontSize: 12, flex: 1, lineHeight: 18 },
});

// ─── Issues Card ──────────────────────────────────────────────────────────────
function IssuesCard({ issues, otherService, C, isDark }) {
    if (!issues && !otherService) return null;
    return (
        <View style={[iss.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            <Text style={[iss.label, { color: C.textMuted }]}>REPORTED ISSUES</Text>
            {!!issues && <Text style={[iss.text, { color: C.textSecondary }]}>{issues}</Text>}
            {!!otherService && (
                <Text style={[iss.text, { color: C.textSecondary }]}>Additional: {otherService}</Text>
            )}
        </View>
    );
}

const iss = StyleSheet.create({
    card: {
        borderRadius: 18, borderWidth: 1, padding: 16, gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
    text: { fontSize: 13, lineHeight: 20, letterSpacing: 0.1 },
});

// ─── Invoice Modal ────────────────────────────────────────────────────────────
// ─── Invoice Modal (drop-in replacement inside OrderDetailScreen.js) ──────────
// Replace the existing InvoiceModal function and invM StyleSheet with this file.

function InvoiceModal({ visible, invoice, onClose, theme, loading }) {
    const isDark = theme.mode === 'dark';
    const C = theme.colors;
    if (!visible) return null;

    // ── Helpers ───────────────────────────────────────────────────────────────
    const safeNum = (v) => {
        if (v == null) return 0;
        if (typeof v === 'number') return v;
        if (typeof v === 'object') {
            const raw = v.$numberDecimal ?? v.$numberDouble ?? v.$numberInt ?? v.value;
            return raw != null ? parseFloat(raw) : 0;
        }
        return parseFloat(v) || 0;
    };
    const fmt = (n) =>
        `₹${safeNum(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const t = invoice?.total ?? {};
    const pd = invoice?.paymentDetails ?? {};

    // ── Discount waterfall values ─────────────────────────────────────────────
    const subTotal = safeNum(t.subTotal || t.baseAmount);
    const billDiscount = safeNum(t.discount);
    const referralDiscount = safeNum(t.referralDiscount);   // admin applied on bill
    const walletUsed = safeNum(t.walletAmountUsed ?? pd.walletAmountUsed);
    const sgst = safeNum(t.sgst);
    const cgst = safeNum(t.cgst);
    const sgstRate = safeNum(t.sgstRate);
    const cgstRate = safeNum(t.cgstRate);
    const preWalletTotal = safeNum(t.total ?? t.finalPayable);
    const finalPayable = safeNum(t.finalPayable);
    const totalSettled = safeNum(t.totalAmountPaid ?? pd.totalSettled ?? pd.amountPaid);

    // Gateway amount (Razorpay charge only, excluding wallet)
    const gatewayAmount = safeNum(pd.amountPaid);
    const isCash = pd.method === 'cash';
    const isFullWallet = pd.method === 'referral';

    // ── Per-item discount helper ───────────────────────────────────────────────
    const hasItemDiscount = (item) =>
        safeNum(item.discountPrice) > 0 &&
        safeNum(item.discountPrice) < safeNum(item.price);

    const effectivePrice = (item) =>
        hasItemDiscount(item) ? safeNum(item.discountPrice) : safeNum(item.price);

    return (
        <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
            <View style={[invM.container, { backgroundColor: isDark ? '#0F0E0B' : '#F5F2EB' }]}>

                {/* ── Header ───────────────────────────────────────────────── */}
                <View style={[invM.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                    <Text style={[invM.headerTitle, { color: C.textPrimary }]}>Invoice</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={24} color={C.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* ── Loading / empty ───────────────────────────────────────── */}
                {loading ? (
                    <View style={invM.loadingWrap}>
                        <ActivityIndicator size="large" color={C.primary} />
                        <Text style={[invM.loadingText, { color: C.textMuted }]}>Loading invoice…</Text>
                    </View>
                ) : !invoice ? (
                    <View style={invM.loadingWrap}>
                        <MaterialCommunityIcons name="file-document-outline" size={48} color={C.textMuted} />
                        <Text style={[invM.loadingText, { color: C.textMuted }]}>Invoice not found</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={invM.scroll} showsVerticalScrollIndicator={false}>

                        {/* ── Invoice ID card ───────────────────────────────── */}
                        <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <View style={invM.invIdRow}>
                                <View style={[invM.invBadge, { backgroundColor: isDark ? '#1A2A1A' : '#E6F7EC' }]}>
                                    <MaterialCommunityIcons name="check-circle" size={16} color="#2ECC9A" />
                                    <Text style={invM.invBadgeText}>PAID</Text>
                                </View>
                                <Text style={[invM.invNumber, { color: C.primary }]}>
                                    #{invoice.invoiceNumber}
                                </Text>
                            </View>
                            <View style={invM.metaRow}>
                                <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
                                <Text style={[invM.metaText, { color: C.textMuted }]}>
                                    Invoice: {fmtDate(invoice.invoiceDate)}
                                </Text>
                            </View>
                            {pd.paymentDate && (
                                <View style={invM.metaRow}>
                                    <Ionicons name="card-outline" size={12} color={C.textMuted} />
                                    <Text style={[invM.metaText, { color: C.textMuted }]}>
                                        Paid: {fmtDate(pd.paymentDate)}
                                        {pd.method ? ` · ${pd.method.toUpperCase()}` : ''}
                                    </Text>
                                </View>
                            )}
                            {pd.razorpayPaymentId && (
                                <View style={invM.metaRow}>
                                    <Ionicons name="receipt-outline" size={12} color={C.textMuted} />
                                    <Text style={[invM.metaText, { color: C.textMuted }]} numberOfLines={1}>
                                        Txn: {pd.razorpayPaymentId}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* ── Customer ──────────────────────────────────────── */}
                        <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <Text style={[invM.sectionLabel, { color: C.textMuted }]}>CUSTOMER</Text>
                            <Text style={[invM.customerName, { color: C.textPrimary }]}>
                                {invoice.customerDetails?.name}
                            </Text>
                            {invoice.customerDetails?.email ? (
                                <Text style={[invM.customerDetail, { color: C.textSecondary }]}>
                                    {invoice.customerDetails.email}
                                </Text>
                            ) : null}
                            {invoice.customerDetails?.contactNo ? (
                                <Text style={[invM.customerDetail, { color: C.textSecondary }]}>
                                    {invoice.customerDetails.contactNo}
                                </Text>
                            ) : null}
                            {invoice.customerDetails?.city ? (
                                <Text style={[invM.customerDetail, { color: C.textSecondary }]}>
                                    {invoice.customerDetails.city}
                                </Text>
                            ) : null}
                        </View>

                        {/* ── Vehicle ───────────────────────────────────────── */}
                        <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <Text style={[invM.sectionLabel, { color: C.textMuted }]}>VEHICLE</Text>
                            <Text style={[invM.customerName, { color: C.textPrimary }]}>
                                {invoice.vehicleDetails?.brand} {invoice.vehicleDetails?.model}
                                {invoice.vehicleDetails?.modelName ? ` ${invoice.vehicleDetails.modelName}` : ''}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                {invoice.vehicleDetails?.cc ? (
                                    <View style={[invM.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                        <Text style={[invM.tagText, { color: C.textSecondary }]}>
                                            {invoice.vehicleDetails.cc} cc
                                        </Text>
                                    </View>
                                ) : null}
                                {invoice.vehicleDetails?.bs ? (
                                    <View style={[invM.tag, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
                                        <Text style={[invM.tagText, { color: C.textSecondary }]}>
                                            {invoice.vehicleDetails.bs}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>

                        {/* ── Services ──────────────────────────────────────── */}
                        {invoice.serviceProvided?.length > 0 && (
                            <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                                <View style={invM.sectionHeaderRow}>
                                    <MaterialCommunityIcons name="wrench" size={13} color={C.primary} />
                                    <Text style={[invM.sectionLabel, { color: C.textMuted, marginBottom: 0 }]}>
                                        SERVICES
                                    </Text>
                                </View>
                                <View style={[invM.itemBox, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }]}>
                                    {invoice.serviceProvided.map((s, i) => {
                                        const unitPrice = safeNum(s.price);
                                        const effPrice = effectivePrice(s);
                                        const qty = safeNum(s.quantity) || 1;
                                        const lineTotal = effPrice * qty;
                                        const discounted = hasItemDiscount(s);
                                        return (
                                            <View key={i} style={[
                                                invM.lineItem,
                                                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
                                            ]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[invM.itemName, { color: C.textPrimary }]}>
                                                        {s.serviceName}
                                                    </Text>
                                                    <View style={invM.itemMeta}>
                                                        <Text style={[invM.itemMetaText, { color: C.textMuted }]}>
                                                            Qty: {qty}
                                                        </Text>
                                                        {discounted && (
                                                            <Text style={[invM.itemMetaText, { color: C.textMuted, textDecorationLine: 'line-through' }]}>
                                                                {fmt(unitPrice)}/unit
                                                            </Text>
                                                        )}
                                                        <Text style={[invM.itemMetaText, { color: discounted ? '#2ECC9A' : C.textMuted }]}>
                                                            {fmt(effPrice)}/unit
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={invM.priceCol}>
                                                    {discounted && qty > 1 && (
                                                        <Text style={[invM.strikePrice, { color: C.textMuted }]}>
                                                            {fmt(unitPrice * qty)}
                                                        </Text>
                                                    )}
                                                    <Text style={[invM.itemPrice, { color: C.textPrimary }]}>
                                                        {fmt(lineTotal)}
                                                    </Text>
                                                    {discounted && (
                                                        <View style={invM.savingsBadge}>
                                                            <Text style={invM.savingsBadgeText}>
                                                                -{fmt((unitPrice - effPrice) * qty)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* ── Parts ─────────────────────────────────────────── */}
                        {invoice.partsUsed?.length > 0 && (
                            <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                                <View style={invM.sectionHeaderRow}>
                                    <MaterialCommunityIcons name="cog" size={13} color={C.primary} />
                                    <Text style={[invM.sectionLabel, { color: C.textMuted, marginBottom: 0 }]}>
                                        PARTS USED
                                    </Text>
                                </View>
                                <View style={[invM.itemBox, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }]}>
                                    {invoice.partsUsed.map((p, i) => {
                                        const unitPrice = safeNum(p.price);
                                        const effPrice = effectivePrice(p);
                                        const qty = safeNum(p.quantity) || 1;
                                        const lineTotal = effPrice * qty;
                                        const discounted = hasItemDiscount(p);
                                        return (
                                            <View key={i} style={[
                                                invM.lineItem,
                                                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
                                            ]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[invM.itemName, { color: C.textPrimary }]}>
                                                        {p.partName}
                                                    </Text>
                                                    <View style={invM.itemMeta}>
                                                        <Text style={[invM.itemMetaText, { color: C.textMuted }]}>
                                                            Qty: {qty}
                                                        </Text>
                                                        {discounted && (
                                                            <Text style={[invM.itemMetaText, { color: C.textMuted, textDecorationLine: 'line-through' }]}>
                                                                {fmt(unitPrice)}/unit
                                                            </Text>
                                                        )}
                                                        <Text style={[invM.itemMetaText, { color: discounted ? '#2ECC9A' : C.textMuted }]}>
                                                            {fmt(effPrice)}/unit
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={invM.priceCol}>
                                                    {discounted && qty > 1 && (
                                                        <Text style={[invM.strikePrice, { color: C.textMuted }]}>
                                                            {fmt(unitPrice * qty)}
                                                        </Text>
                                                    )}
                                                    <Text style={[invM.itemPrice, { color: C.textPrimary }]}>
                                                        {fmt(lineTotal)}
                                                    </Text>
                                                    {discounted && (
                                                        <View style={invM.savingsBadge}>
                                                            <Text style={invM.savingsBadgeText}>
                                                                -{fmt((unitPrice - effPrice) * qty)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* ── Payment Breakdown ──────────────────────────────── */}
                        <View style={[invM.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <Text style={[invM.sectionLabel, { color: C.textMuted }]}>PAYMENT BREAKDOWN</Text>

                            {/* Subtotal */}
                            {subTotal > 0 && (
                                <InvRow label="Subtotal (Services + Parts)" value={fmt(subTotal)} C={C} />
                            )}

                            {/* Per-item discount total — derived */}
                            {(() => {
                                const itemSavings = [
                                    ...(invoice.serviceProvided || []),
                                    ...(invoice.partsUsed || []),
                                ].reduce((acc, item) => {
                                    if (hasItemDiscount(item)) {
                                        const qty = safeNum(item.quantity) || 1;
                                        acc += (safeNum(item.price) - effectivePrice(item)) * qty;
                                    }
                                    return acc;
                                }, 0);
                                if (itemSavings <= 0) return null;
                                return (
                                    <InvRow
                                        label="Item Discounts"
                                        value={`-${fmt(itemSavings)}`}
                                        positive
                                        C={C}
                                    />
                                );
                            })()}

                            {/* Bill-level discount */}
                            {billDiscount > 0 && (
                                <InvRow
                                    label={`Bill Discount${invoice.total?.discountType ? ` (${invoice.total.discountType})` : ''}`}
                                    value={`-${fmt(billDiscount)}`}
                                    positive
                                    C={C}
                                />
                            )}

                            {/* Admin referral discount on bill */}
                            {referralDiscount > 0 && (
                                <InvRow
                                    label="Referral Discount (on bill)"
                                    value={`-${fmt(referralDiscount)}`}
                                    positive
                                    C={C}
                                />
                            )}

                            {/* Taxes */}
                            {sgst > 0 && (
                                <InvRow
                                    label={`SGST (${sgstRate}%)`}
                                    value={fmt(sgst)}
                                    muted
                                    C={C}
                                />
                            )}
                            {cgst > 0 && (
                                <InvRow
                                    label={`CGST (${cgstRate}%)`}
                                    value={fmt(cgst)}
                                    muted
                                    C={C}
                                />
                            )}

                            {/* Pre-wallet subtotal divider */}
                            <View style={[invM.divider, { backgroundColor: C.border }]} />

                            {/* Wallet deduction */}
                            {walletUsed > 0 && (
                                <>
                                    <InvRow
                                        label="Pre-wallet Total"
                                        value={fmt(preWalletTotal)}
                                        C={C}
                                    />
                                    <InvRow
                                        label="🎁 Referral Wallet Used"
                                        value={`-${fmt(walletUsed)}`}
                                        positive
                                        C={C}
                                    />
                                    <View style={[invM.divider, { backgroundColor: C.border }]} />
                                </>
                            )}

                            {/* Final payable line */}
                            <View style={[invM.totalRow, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderRadius: 12, padding: 12, marginTop: 4 }]}>
                                <View style={{ gap: 3 }}>
                                    <Text style={[invM.totalLabel, { color: C.textMuted }]}>TOTAL PAID</Text>
                                    {walletUsed > 0 && !isCash && (
                                        <Text style={invM.walletNote}>
                                            {isFullWallet
                                                ? `Fully covered by wallet`
                                                : `Gateway: ${fmt(gatewayAmount)} + Wallet: ${fmt(walletUsed)}`}
                                        </Text>
                                    )}
                                    {isCash && (
                                        <Text style={[invM.walletNote, { color: C.textMuted }]}>
                                            Cash on Delivery
                                        </Text>
                                    )}
                                </View>
                                <Text style={[invM.totalValue, { color: '#2ECC9A' }]}>
                                    {fmt(totalSettled || finalPayable)}
                                </Text>
                            </View>
                        </View>

                        <View style={{ height: 48 }} />
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

// ── Small row helper ──────────────────────────────────────────────────────────
function InvRow({ label, value, positive, muted, C }) {
    return (
        <View style={invM.bRow}>
            <Text style={[invM.bLabel, { color: muted ? C.textMuted : C.textSecondary }]}>
                {label}
            </Text>
            <Text style={[invM.bValue, { color: positive ? '#2ECC9A' : (muted ? C.textMuted : C.textSecondary) }]}>
                {value}
            </Text>
        </View>
    );
}

const invM = StyleSheet.create({
    container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { fontSize: 14 },
    scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

    card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },

    // Invoice ID card
    invIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    invBadgeText: { fontSize: 10, fontWeight: '800', color: '#2ECC9A', letterSpacing: 1 },
    invNumber: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 12, letterSpacing: 0.1 },

    // Customer / Vehicle
    sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, marginBottom: 4 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    customerName: { fontSize: 15, fontWeight: '700' },
    customerDetail: { fontSize: 12 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    tagText: { fontSize: 10, fontWeight: '600' },

    // Line items
    itemBox: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    lineItem: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: 12, paddingVertical: 12, gap: 8,
    },
    itemName: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
    itemMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
    itemMetaText: { fontSize: 11 },
    priceCol: { alignItems: 'flex-end', gap: 3 },
    strikePrice: { fontSize: 11, textDecorationLine: 'line-through' },
    itemPrice: { fontSize: 13, fontWeight: '700' },
    savingsBadge: { backgroundColor: 'rgba(46,204,154,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    savingsBadgeText: { fontSize: 10, fontWeight: '700', color: '#2ECC9A' },

    // Breakdown rows
    bRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    bLabel: { fontSize: 13, flex: 1 },
    bValue: { fontSize: 13, fontWeight: '600' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },

    // Total
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
    totalValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
    walletNote: { fontSize: 10, fontWeight: '700', color: '#2ECC9A', letterSpacing: 0.2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrderDetailScreen({ route, navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const orderId = route?.params?.orderId;

    const {
        currentOrder: order,
        loading: orderLoading,
        canceling,
        cancelOrder,
        fetchOrderById,
        error: orderError,
    } = useOrder();

    const [refreshing, setRefreshing] = useState(false);
    const [reasonModalVisible, setReasonModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [invoiceData, setInvoiceData] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);

    // Photo viewer state
    const [photoViewerState, setPhotoViewerState] = useState({
        visible: false,
        photos: [],
        initialIndex: 0,
        type: '',
    });

    useEffect(() => {
        if (orderId) fetchOrderById(orderId);
    }, [orderId, fetchOrderById]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOrderById(orderId);
        setRefreshing(false);
    }, [orderId, fetchOrderById]);

    const handleCancelPress = () => setReasonModalVisible(true);

    const handlePayNow = () => {
        navigation.navigate('Checkout', { orderId: order._id });
    };

    const handleViewInvoice = async () => {
        try {
            setInvoiceLoading(true);
            setInvoiceModalVisible(true);
            const res = await axiosClient.get(`/api/orders/${order._id}/invoice`);
            setInvoiceData(res.data?.invoice || null);
        } catch (err) {
            setInvoiceModalVisible(false);
            const msg = err.response?.data?.message || 'Failed to fetch invoice';
            setErrorMessage(msg);
            setErrorModalVisible(true);
        } finally {
            setInvoiceLoading(false);
        }
    };

    const handleCancelSubmit = async (reason) => {
        try {
            await cancelOrder(orderId, reason);
            setReasonModalVisible(false);
            setSuccessModalVisible(true);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to cancel order';
            setErrorMessage(msg);
            setReasonModalVisible(false);
            setErrorModalVisible(true);
        }
    };

    const handlePhotoPress = ({ photos, index, type }) => {
        setPhotoViewerState({ visible: true, photos, initialIndex: index, type });
    };

    if (orderLoading && !order) {
        return (
            <ScreenWrapper title="Order Details">
                <Loader variant="skeleton" rows={6} />
            </ScreenWrapper>
        );
    }

    if (orderError && !order) {
        return (
            <ScreenWrapper title="Order Details">
                <View style={screen.errorWrap}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={48} color={C.textMuted} />
                    <Text style={[screen.errorText, { color: C.textMuted }]}>{orderError ?? 'Order not found'}</Text>
                    <TouchableOpacity onPress={() => fetchOrderById(orderId)} style={[screen.retryBtn, { backgroundColor: C.primary }]}>
                        <Text style={screen.retryLabel}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    if (!order) return null;

    return (
        <ScreenWrapper title="Order Details">
            <ScrollView
                contentContainerStyle={[screen.scroll, { backgroundColor: theme.colors.background }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
                }
            >
                {/* Header card */}
                <OrderHeaderCard
                    order={order}
                    C={C}
                    isDark={isDark}
                    onCancel={handleCancelPress}
                    onViewInvoice={handleViewInvoice}
                    onPay={handlePayNow}
                />

                {/* Progress stepper */}
                <OrderProgressStepper status={order.status} C={C} isDark={isDark} />

                {/* Service manifest */}
                <ServiceManifestCard
                    serviceProvided={order.serviceProvided ?? []}
                    partsUsed={order.partsUsed ?? []}
                    services={order.services ?? []}
                    C={C}
                    isDark={isDark}
                />

                {/* Issues */}
                <IssuesCard issues={order.issues} otherService={order.otherService} C={C} isDark={isDark} />

                {/* Before / After Photos */}
                <PhotosCard
                    beforePhotos={order.beforePhotos ?? []}
                    afterPhotos={order.afterPhotos ?? []}
                    photosDeleted={order.photosDeleted ?? false}
                    C={C}
                    isDark={isDark}
                    onPhotoPress={handlePhotoPress}
                />

                {/* Mechanic card */}
                <MechanicCard
                    mechanicName={order.assignedMechanic}
                    mechanicId={order.mechanicId}
                    mechanicImage={order.mechanicImage}
                    onMessage={() => Alert.alert('Message', 'Chat coming soon.')}
                />

                {/* Financial summary */}
                <FinancialSummaryCard
                    total={order.total}
                    coupon={order.coupon}
                    paymentStatus={order.paymentStatus}
                    paymentMethod={order.paymentMethod}
                    amountPaid={order.amountPaid}
                    paymentDate={order.paymentDate}
                    C={C}
                    isDark={isDark}
                />

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Reason Input Modal */}
            <ReasonInputModal
                visible={reasonModalVisible}
                onClose={() => setReasonModalVisible(false)}
                onSubmit={handleCancelSubmit}
                loading={canceling}
                theme={{ colors: C, mode }}
            />

            {/* Success PopUp */}
            <PopUp
                visible={successModalVisible}
                type="success"
                title="Order Cancelled"
                message="Your order has been cancelled successfully."
                primaryLabel="OK"
                onPrimary={() => setSuccessModalVisible(false)}
                onClose={() => setSuccessModalVisible(false)}
                showCloseIcon
            />

            {/* Error PopUp */}
            <PopUp
                visible={errorModalVisible}
                type="error"
                title="Error"
                message={errorMessage}
                primaryLabel="OK"
                onPrimary={() => setErrorModalVisible(false)}
                onClose={() => setErrorModalVisible(false)}
                showCloseIcon
            />

            {/* Invoice Modal */}
            <InvoiceModal
                visible={invoiceModalVisible}
                invoice={invoiceData}
                onClose={() => { setInvoiceModalVisible(false); setInvoiceData(null); }}
                theme={{ colors: C, mode }}
                loading={invoiceLoading}
            />

            {/* Full Screen Photo Viewer */}
            <FullScreenPhotoViewer
                visible={photoViewerState.visible}
                photos={photoViewerState.photos}
                initialIndex={photoViewerState.initialIndex}
                type={photoViewerState.type}
                onClose={() => setPhotoViewerState((s) => ({ ...s, visible: false }))}
            />
        </ScreenWrapper>
    );
}

const screen = StyleSheet.create({
    scroll: { flexGrow: 1, gap: 14, paddingTop: 16, paddingBottom: 32 },
    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
    errorText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    retryBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
    retryLabel: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1 },
});