// components/referral/WithdrawalComponents.js
// Exports:
//   WithdrawalHistoryTab  — list of withdrawal requests (business accounts only)
//   WithdrawModal         — bottom sheet modal to submit a new withdrawal with UPI ID

import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, Modal, Animated, ActivityIndicator,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

// ─── Status badge ─────────────────────────────────────────────────────────────
const W_STATUS = {
    pending: { bg: 'rgba(226,167,49,0.15)', text: '#E2A731', icon: 'clock-outline' },
    approved: { bg: 'rgba(46,204,154,0.15)', text: '#2ECC9A', icon: 'check-circle-outline' },
    paid: { bg: 'rgba(91,140,255,0.15)', text: '#5B8CFF', icon: 'bank-check' },
    rejected: { bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B', icon: 'close-circle-outline' },
};

function WStatusBadge({ status }) {
    const cfg = W_STATUS[status?.toLowerCase()] ?? W_STATUS.pending;
    return (
        <View style={[wb.badge, { backgroundColor: cfg.bg }]}>
            <MaterialCommunityIcons name={cfg.icon} size={12} color={cfg.text} />
            <Text style={[wb.label, { color: cfg.text }]}>{(status ?? 'Pending').toUpperCase()}</Text>
        </View>
    );
}

const wb = StyleSheet.create({
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    label: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});

// ─── Single withdrawal row ────────────────────────────────────────────────────
function WithdrawalRow({ item, C, isDark }) {
    return (
        <View style={[wr.row, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            {/* Left: amount + date */}
            <View style={wr.left}>
                <Text style={[wr.amount, { color: C.textPrimary }]}>{fmt(item.amount)}</Text>
                <Text style={[wr.date, { color: C.textMuted }]}>{fmtDate(item.requestDate)}</Text>
                {item.upiId && (
                    <Text style={[wr.upi, { color: C.textMuted }]} numberOfLines={1}>UPI: {item.upiId}</Text>
                )}
            </View>

            {/* Right: status + processed info */}
            <View style={wr.right}>
                <WStatusBadge status={item.status} />
                {item.processedDate && (
                    <Text style={[wr.processed, { color: C.textMuted }]}>
                        {fmtDate(item.processedDate)}
                    </Text>
                )}
                {item.transactionId && (
                    <Text style={[wr.txn, { color: C.textMuted }]} numberOfLines={1}>
                        TXN: {item.transactionId}
                    </Text>
                )}
                {item.adminNote && (
                    <Text style={[wr.note, { color: C.textMuted }]} numberOfLines={2}>
                        {item.adminNote}
                    </Text>
                )}
            </View>
        </View>
    );
}

const wr = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        gap: 12,
    },
    left: { flex: 1, gap: 3 },
    right: { alignItems: 'flex-end', gap: 4 },
    amount: { fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
    date: { fontSize: 11 },
    upi: { fontSize: 11 },
    processed: { fontSize: 10 },
    txn: { fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    note: { fontSize: 10, fontStyle: 'italic' },
});

// ─── WithdrawalHistoryTab ─────────────────────────────────────────────────────
export function WithdrawalHistoryTab({ withdrawalHistory, stats, C, isDark }) {
    if (withdrawalHistory.length === 0) {
        return (
            <View style={wht.empty}>
                <MaterialCommunityIcons name="bank-transfer-out" size={44} color={C.textMuted} />
                <Text style={[wht.emptyTitle, { color: C.textPrimary }]}>No withdrawals yet</Text>
                <Text style={[wht.emptySub, { color: C.textMuted }]}>
                    Your withdrawal requests will appear here.
                </Text>
            </View>
        );
    }

    return (
        <View style={wht.wrap}>
            {/* Summary row */}
            <View style={[wht.summaryRow, {
                backgroundColor: isDark ? '#1C1A14' : '#F5F0E8',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
            }]}>
                <Text style={[wht.summaryLabel, { color: C.textMuted }]}>Total Withdrawn</Text>
                <Text style={[wht.summaryValue, { color: C.primary }]}>{fmt(stats.totalWithdrawn)}</Text>
            </View>

            {/* List */}
            {[...withdrawalHistory].reverse().map((item, i) => (
                <WithdrawalRow key={item._id ?? i} item={item} C={C} isDark={isDark} />
            ))}
        </View>
    );
}

const wht = StyleSheet.create({
    wrap: { gap: 10 },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 4,
    },
    summaryLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
    summaryValue: { fontSize: 18, fontWeight: '900' },
    empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '800' },
    emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

// ─── WithdrawModal ────────────────────────────────────────────────────────────
/**
 * Props:
 *   visible          boolean
 *   onClose          fn
 *   onSubmit({amount, upiid}) → async fn — should throw on error
 *   availableAmount  number
 *   C, isDark
 */
export function WithdrawModal({ visible, onClose, onSubmit, availableAmount, C, isDark }) {
    const [amount, setAmount] = useState('');
    const [upiId, setUpiId] = useState('');
    const [amountErr, setAmountErr] = useState('');
    const [upiErr, setUpiErr] = useState('');
    const [submitting, setSubmitting] = useState('idle'); // idle | loading | success | error
    const [errMsg, setErrMsg] = useState('');

    const slideY = useRef(new Animated.Value(400)).current;

    useEffect(() => {
        if (visible) {
            setAmount(''); setUpiId('');
            setAmountErr(''); setUpiErr('');
            setSubmitting('idle'); setErrMsg('');
            Animated.spring(slideY, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }).start();
        } else {
            Animated.timing(slideY, { toValue: 400, duration: 260, useNativeDriver: true }).start();
        }
    }, [visible]);

    const validate = () => {
        let ok = true;
        const n = parseFloat(amount);
        if (!amount || isNaN(n) || n <= 0) {
            setAmountErr('Enter a valid amount'); ok = false;
        } else if (n < 100) {
            setAmountErr('Minimum withdrawal is ₹100'); ok = false;
        } else if (n > availableAmount) {
            setAmountErr(`Max available: ${fmt(availableAmount)}`); ok = false;
        } else setAmountErr('');

        if (!upiId.trim()) {
            setUpiErr('UPI ID is required'); ok = false;
        } else if (!/^[\w.\-]{2,}@[\w]{2,}$/.test(upiId.trim())) {
            setUpiErr('Enter a valid UPI ID (e.g. name@upi)'); ok = false;
        } else setUpiErr('');
        return ok;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting('loading');
        try {
            await onSubmit({ amount: parseFloat(amount), upiid: upiId.trim() });
            setSubmitting('success');
            setTimeout(() => onClose(), 1600);
        } catch (err) {
            setSubmitting('error');
            setErrMsg(err.message ?? 'Failed to submit. Please try again.');
        }
    };

    const numAmt = parseFloat(amount) || 0;
    const canSubmit = numAmt >= 100 && numAmt <= availableAmount && upiId.trim().length > 0;

    // Quick fill buttons
    const quickAmounts = [100, 250, 500].filter((n) => n <= availableAmount);

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* Backdrop */}
                <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />

                {/* Sheet */}
                <Animated.View
                    style={[m.sheet, {
                        backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        transform: [{ translateY: slideY }],
                    }]}
                >
                    {/* Handle */}
                    <View style={[m.handle, { backgroundColor: isDark ? '#3A3020' : '#E0DAD0' }]} />

                    {/* Header */}
                    <View style={m.header}>
                        <View>
                            <Text style={[m.title, { color: C.textPrimary }]}>Withdraw Funds</Text>
                            <Text style={[m.sub, { color: C.textMuted }]}>
                                Available: <Text style={{ color: '#2ECC9A', fontWeight: '800' }}>{fmt(availableAmount)}</Text>
                                {'  ·  '}Min: ₹100
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7}>
                            <Ionicons name="close" size={22} color={C.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {/* Amount input */}
                        <View style={m.fieldGroup}>
                            <Text style={[m.fieldLabel, { color: C.textMuted }]}>AMOUNT (₹)</Text>
                            <View style={[m.inputShell, {
                                backgroundColor: isDark ? '#141210' : '#F8F5EF',
                                borderColor: amountErr ? '#FF6B6B' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                            }]}>
                                <Text style={[m.currencySymbol, { color: C.primary }]}>₹</Text>
                                <TextInput
                                    style={[m.input, { color: C.textPrimary }]}
                                    value={amount}
                                    onChangeText={(t) => { setAmount(t); setAmountErr(''); setSubmitting('idle'); }}
                                    placeholder="Enter amount"
                                    placeholderTextColor={C.textMuted}
                                    keyboardType="decimal-pad"
                                    selectionColor={C.primary}
                                />
                            </View>
                            {!!amountErr && <Text style={m.errText}>{amountErr}</Text>}

                            {/* Quick fill */}
                            {quickAmounts.length > 0 && (
                                <View style={m.quickRow}>
                                    {quickAmounts.map((n) => (
                                        <TouchableOpacity
                                            key={n}
                                            style={[m.quickBtn, { borderColor: C.border, backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}
                                            onPress={() => { setAmount(String(n)); setAmountErr(''); }}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[m.quickLabel, { color: C.primary }]}>₹{n}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    <TouchableOpacity
                                        style={[m.quickBtn, { borderColor: C.border, backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}
                                        onPress={() => { setAmount(String(availableAmount)); setAmountErr(''); }}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[m.quickLabel, { color: C.primary }]}>Max</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* UPI ID input */}
                        <View style={m.fieldGroup}>
                            <Text style={[m.fieldLabel, { color: C.textMuted }]}>UPI ID</Text>
                            <View style={[m.inputShell, {
                                backgroundColor: isDark ? '#141210' : '#F8F5EF',
                                borderColor: upiErr ? '#FF6B6B' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                            }]}>
                                <MaterialCommunityIcons name="bank-outline" size={17} color={C.textMuted} />
                                <TextInput
                                    style={[m.input, { color: C.textPrimary }]}
                                    value={upiId}
                                    onChangeText={(t) => { setUpiId(t); setUpiErr(''); setSubmitting('idle'); }}
                                    placeholder="yourname@upi"
                                    placeholderTextColor={C.textMuted}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    selectionColor={C.primary}
                                />
                            </View>
                            {!!upiErr && <Text style={m.errText}>{upiErr}</Text>}
                        </View>

                        {/* Error banner */}
                        {submitting === 'error' && (
                            <View style={[m.errBanner, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
                                <Ionicons name="alert-circle-outline" size={15} color="#FF6B6B" />
                                <Text style={[m.errBannerText, { color: '#FF6B6B' }]}>{errMsg}</Text>
                            </View>
                        )}

                        {/* Note */}
                        <View style={[m.note, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderColor: C.border }]}>
                            <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                            <Text style={[m.noteText, { color: C.textMuted }]}>
                                Requests are processed within 3–5 business days. You'll be notified once processed.
                            </Text>
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            style={[m.submitBtn, {
                                backgroundColor: submitting === 'success' ? '#2ECC9A' : C.primary,
                                opacity: (!canSubmit && submitting !== 'loading') ? 0.5 : 1,
                            }]}
                            onPress={handleSubmit}
                            disabled={submitting === 'loading' || submitting === 'success'}
                            activeOpacity={0.85}
                        >
                            {submitting === 'loading' ? (
                                <ActivityIndicator color="#1a1a1a" size="small" />
                            ) : submitting === 'success' ? (
                                <View style={m.submitInner}>
                                    <MaterialCommunityIcons name="check" size={18} color="#fff" />
                                    <Text style={[m.submitLabel, { color: '#fff' }]}>Request Submitted!</Text>
                                </View>
                            ) : (
                                <View style={m.submitInner}>
                                    <MaterialCommunityIcons name="bank-transfer-out" size={18} color="#1a1a1a" />
                                    <Text style={[m.submitLabel, { color: '#1a1a1a' }]}>Submit Request</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const m = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, borderBottomWidth: 0,
        paddingHorizontal: 22, paddingTop: 10, paddingBottom: 40,
        maxHeight: '85%',
    },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
    title: { fontSize: 20, fontWeight: '900', letterSpacing: 0.1 },
    sub: { fontSize: 12, marginTop: 4 },
    fieldGroup: { gap: 8, marginBottom: 18 },
    fieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', marginLeft: 2 },
    inputShell: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderRadius: 14, borderWidth: 1.5,
        paddingHorizontal: 14, paddingVertical: 13,
    },
    currencySymbol: { fontSize: 18, fontWeight: '800' },
    input: { flex: 1, fontSize: 15, paddingVertical: 0 },
    errText: { fontSize: 11, color: '#FF6B6B', marginLeft: 4 },
    quickRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    quickBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    quickLabel: { fontSize: 12, fontWeight: '700' },
    errBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderRadius: 12, padding: 12, marginBottom: 14,
    },
    errBannerText: { fontSize: 12, flex: 1, lineHeight: 18 },
    note: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 20,
    },
    noteText: { fontSize: 11, flex: 1, lineHeight: 17 },
    submitBtn: {
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center',
    },
    submitInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    submitLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
});