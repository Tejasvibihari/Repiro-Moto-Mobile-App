// components/orders/FinancialSummaryCard.js
// Financial summary at the bottom of order detail:
//   Services subtotal, labor, discount, referral discount, TOTAL AMOUNT

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';

const fmt = (n) => `₹${Number(n ?? 0).toFixed(2)}`;

// ─── Single row ───────────────────────────────────────────────────────────────
function Row({ label, value, muted, strike, positive, C }) {
    return (
        <View style={row.wrap}>
            <Text style={[row.label, { color: muted ? C.textMuted : C.textSecondary }]}>
                {label}
            </Text>
            <Text style={[
                row.value,
                {
                    color: positive ? '#2ECC9A' : muted ? C.textMuted : C.textPrimary,
                    textDecorationLine: strike ? 'line-through' : 'none',
                },
            ]}>
                {value}
            </Text>
        </View>
    );
}

const row = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    label: { fontSize: 13, letterSpacing: 0.1 },
    value: { fontSize: 13, fontWeight: '600' },
});

// ─── FinancialSummaryCard ─────────────────────────────────────────────────────
/**
 * Props:
 *   total {object}:
 *     subTotal        number
 *     total           number
 *     discount        number
 *     referralDiscount number
 *     discountType    string
 *   coupon    string
 *   invoiceDate string
 *   status    string
 */
export default function FinancialSummaryCard({ total = {}, coupon, invoiceDate, status }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const {
        subTotal = 0,
        total: totalAmt = 0,
        discount = 0,
        referralDiscount = 0,
    } = total;

    // Derive labor as difference (serviceProvided sum is in subTotal)
    // If you have a separate labor field, replace this
    const hasDiscount = discount > 0;
    const hasReferral = referralDiscount > 0;
    const showInvoiceDate = !!invoiceDate;
    const isPending = !totalAmt || totalAmt === 0;

    return (
        <View style={[card.wrap, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            {/* Header */}
            <View style={card.header}>
                <Text style={[card.title, { color: C.textMuted }]}>FINANCIAL SUMMARY</Text>
                {showInvoiceDate && (() => {
                    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    const d = new Date(invoiceDate);
                    const label = !isNaN(d.getTime())
                        ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
                        : invoiceDate;
                    return (
                        <Text style={[card.invoiceDate, { color: C.textMuted }]}>
                            {label}
                        </Text>
                    );
                })()}
            </View>

            {/* Line items */}
            {isPending ? (
                <View style={card.pendingWrap}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color={C.textMuted} />
                    <Text style={[card.pendingText, { color: C.textMuted }]}>
                        Invoice will be generated after service is completed.
                    </Text>
                </View>
            ) : (
                <View style={card.rows}>
                    {subTotal > 0 && (
                        <Row label="Services" value={fmt(subTotal)} C={C} />
                    )}
                    {hasDiscount && (
                        <Row label={`Discount${coupon ? ` (${coupon})` : ''}`} value={`-${fmt(discount)}`} positive C={C} />
                    )}
                    {hasReferral && (
                        <Row label="Referral Discount" value={`-${fmt(referralDiscount)}`} positive C={C} />
                    )}

                    {/* Divider */}
                    <View style={[card.divider, { backgroundColor: C.border }]} />

                    {/* Total */}
                    <View style={card.totalRow}>
                        <Text style={[card.totalLabel, { color: C.textPrimary }]}>TOTAL AMOUNT</Text>
                        <Text style={[card.totalValue, { color: C.primary }]}>{fmt(totalAmt)}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const card = StyleSheet.create({
    wrap: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        gap: 14,
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
    invoiceDate: {
        fontSize: 11,
        fontWeight: '600',
    },
    rows: { gap: 0 },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    totalLabel: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1.4,
    },
    totalValue: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    pendingWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 6,
    },
    pendingText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
});