// components/orders/CouponCard.js
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useCoupon from '../../hooks/useCoupon';

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;

// Statuses at/after which the backend refuses to attach or remove a coupon —
// mirrors applyCouponToOrder / removeCouponFromOrder in couponController.js.
const LOCKED_STATUSES = ['Invoice Generated', 'Completed', 'Cancelled'];

/**
 * Shown on an order's detail page. Lets the customer attach a coupon to a
 * not-yet-invoiced order, or remove one they applied earlier. The actual
 * discount amount is never computed or shown here — it's only known once
 * the admin generates the real invoice, so this only ever displays the
 * coupon's terms (e.g. "10% off, up to ₹200"), not a rupee figure.
 *
 * @param {object} order - the current order (needs _id, status, coupon)
 * @param {() => void} onChanged - called after a successful apply/remove so
 *   the parent can refetch the order
 */
export default function CouponCard({ order, C, isDark, onChanged }) {
    const { verifying, applying, removing, verifyCoupon, applyCoupon, removeCoupon } = useCoupon();
    const [code, setCode] = useState('');
    const [preview, setPreview] = useState(null); // result of the last successful verify
    const [inlineError, setInlineError] = useState(null);

    if (!order) return null;

    const isLocked = LOCKED_STATUSES.includes(order.status);
    const appliedCoupon = order.coupon?.code ? order.coupon : null;

    // Once an invoice exists, coupon management belongs on the invoice/payment
    // screens (which read the finalized total.couponCode/couponDiscount) —
    // this card has nothing useful left to do.
    if (isLocked && !appliedCoupon) return null;

    const handleVerify = async () => {
        const trimmed = code.trim();
        if (!trimmed) return;
        setInlineError(null);
        setPreview(null);
        try {
            const res = await verifyCoupon({ code: trimmed, serviceType: order.serviceType });
            setPreview(res.coupon);
        } catch (err) {
            setInlineError(err.message);
        }
    };

    const handleApply = async () => {
        const trimmed = code.trim();
        if (!trimmed) return;
        setInlineError(null);
        try {
            await applyCoupon({ orderId: order._id, code: trimmed });
            setCode('');
            setPreview(null);
            onChanged?.();
        } catch (err) {
            setInlineError(err.message);
        }
    };

    const handleRemove = () => {
        Alert.alert('Remove coupon?', `Remove "${appliedCoupon.code}" from this order?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await removeCoupon({ orderId: order._id });
                        onChanged?.();
                    } catch (err) {
                        Alert.alert('Could not remove coupon', err.message);
                    }
                },
            },
        ]);
    };

    return (
        <View
            style={[
                cc.card,
                {
                    backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                },
            ]}
        >
            <Text style={[cc.heading, { color: C.textMuted }]}>COUPON</Text>

            {appliedCoupon ? (
                <View
                    style={[
                        cc.appliedRow,
                        { backgroundColor: isDark ? '#1A2A1A' : '#E6F7EC', borderColor: 'rgba(46,204,154,0.3)' },
                    ]}
                >
                    <MaterialCommunityIcons name="ticket-percent" size={18} color="#2ECC9A" />
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[cc.appliedCode, { color: C.textPrimary }]}>{appliedCoupon.code}</Text>
                        <Text style={[cc.appliedSub, { color: C.textMuted }]}>
                            {appliedCoupon.discountType === 'percentage'
                                ? `${appliedCoupon.discountValue}% off`
                                : `${fmt(appliedCoupon.discountValue)} off`}
                            {isLocked ? ' · finalized on your invoice' : ' · will apply at invoicing'}
                        </Text>
                    </View>
                    {!isLocked && (
                        <TouchableOpacity onPress={handleRemove} disabled={removing} style={cc.removeBtn}>
                            {removing ? (
                                <ActivityIndicator size="small" color={C.textMuted} />
                            ) : (
                                <MaterialCommunityIcons name="close-circle-outline" size={20} color={C.textMuted} />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <>
                    <View
                        style={[
                            cc.inputRow,
                            { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
                        ]}
                    >
                        <MaterialCommunityIcons name="ticket-outline" size={18} color={C.textMuted} />
                        <TextInput
                            value={code}
                            onChangeText={(t) => {
                                setCode(t.toUpperCase());
                                setPreview(null);
                                setInlineError(null);
                            }}
                            placeholder="Enter coupon code"
                            placeholderTextColor={C.textMuted}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            style={[cc.input, { color: C.textPrimary }]}
                        />
                        <TouchableOpacity
                            onPress={handleVerify}
                            disabled={verifying || !code.trim()}
                            style={[cc.checkBtn, { opacity: verifying || !code.trim() ? 0.5 : 1 }]}
                        >
                            {verifying ? (
                                <ActivityIndicator size="small" color={C.primary} />
                            ) : (
                                <Text style={[cc.checkLabel, { color: C.primary }]}>Check</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {inlineError && (
                        <Text style={[cc.errorText, { color: '#FF6B6B' }]}>{inlineError}</Text>
                    )}

                    {preview && !inlineError && (
                        <View style={cc.previewBlock}>
                            <Text style={[cc.previewText, { color: '#2ECC9A' }]}>
                                {`✓ ${preview.code} — ${preview.discountType === 'percentage'
                                    ? `${preview.discountValue}% off`
                                    : `${fmt(preview.discountValue)} off`
                                    } is valid for this order.`}
                            </Text>
                            <TouchableOpacity
                                onPress={handleApply}
                                disabled={applying}
                                style={[cc.applyBtn, { backgroundColor: C.primary, opacity: applying ? 0.7 : 1 }]}
                            >
                                {applying ? (
                                    <ActivityIndicator size="small" color="#1a1a1a" />
                                ) : (
                                    <Text style={cc.applyLabel}>Apply Coupon</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const cc = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    heading: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    input: { flex: 1, fontSize: 14, fontWeight: '600', paddingVertical: 10, letterSpacing: 0.5 },
    checkBtn: { paddingHorizontal: 10, paddingVertical: 8 },
    checkLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    errorText: { fontSize: 12, fontWeight: '600' },
    previewBlock: { gap: 10 },
    previewText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
    applyBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    applyLabel: { fontSize: 13, fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.5 },
    appliedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    appliedCode: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
    appliedSub: { fontSize: 11 },
    removeBtn: { padding: 4 },
});