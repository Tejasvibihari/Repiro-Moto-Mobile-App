// components/orders/MechanicRatingCard.js
//
// Persists rating state across navigation and app restarts by checking
// GET /api/user/rating-status?orderId=<id> on mount.
//
// ─── BACKEND CHANGES NEEDED ───────────────────────────────────────────────────
//
// 1. Add to userRoutes.js:
//      router.get("/rating-status", authUser, getRatingStatus);
//
// 2. Add to userController.js:
//
//    export const getRatingStatus = async (req, res) => {
//        try {
//            const userId = req.user._id;
//            const { orderId } = req.query;
//            if (!orderId) return res.status(400).json({ success: false, message: "orderId is required" });
//            const order = await Order.findOne({ _id: orderId, userId });
//            if (!order) return res.status(404).json({ success: false, message: "Order not found" });
//            const mechanicIds = order.mechanicIds ?? [];
//            const ratingMap = {};
//            for (const mechId of mechanicIds) {
//                const employee = await Employee.findById(mechId).select("ratings averageRating");
//                if (!employee) continue;
//                const existing = employee.ratings.find(
//                    (r) => r.reviewer?.toString() === userId.toString() && r.orderId?.toString() === orderId
//                );
//                ratingMap[mechId.toString()] = existing
//                    ? { rated: true, rating: existing.rating, comment: existing.comment ?? "" }
//                    : { rated: false };
//            }
//            return res.status(200).json({ success: true, data: ratingMap });
//        } catch (error) {
//            console.error("Error in getRatingStatus:", error);
//            return res.status(500).json({ success: false, message: "Internal server error" });
//        }
//    };
//
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Animated,
    ActivityIndicator,
    Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import axiosClient from '../../services/axiosClient';
import { getImageUrl } from '../../utils/imageUtils';

// ─── Star Row ─────────────────────────────────────────────────────────────────
function StarRow({ value, onChange, disabled, size = 30, color }) {
    return (
        <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= value;
                return (
                    <TouchableOpacity
                        key={star}
                        onPress={() => !disabled && onChange(star)}
                        disabled={disabled}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={filled ? 'star' : 'star-outline'}
                            size={size}
                            color={filled ? color : 'rgba(150,140,120,0.35)'}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

// ─── Single mechanic rating panel ─────────────────────────────────────────────
function MechanicRatingPanel({ mechanic, orderId, theme, isDark, initialStatus }) {
    const C = theme.colors;

    // Seed state from server so it survives navigation & restart
    const [rating, setRating] = useState(initialStatus?.rating ?? 0);
    const [comment, setComment] = useState(initialStatus?.comment ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(initialStatus?.rated ?? false);
    const [error, setError] = useState('');

    const successScale = useRef(new Animated.Value(initialStatus?.rated ? 1 : 0.85)).current;
    const successOpacity = useRef(new Animated.Value(initialStatus?.rated ? 1 : 0)).current;

    // Re-sync if parent re-fetches (e.g. pull-to-refresh delivers new initialStatus)
    useEffect(() => {
        if (initialStatus?.rated && !submitted) {
            setSubmitted(true);
            setRating(initialStatus.rating ?? 5);
            setComment(initialStatus.comment ?? '');
            successScale.setValue(1);
            successOpacity.setValue(1);
        }
    }, [initialStatus?.rated]);

    const triggerSuccessAnim = () => {
        Animated.parallel([
            Animated.spring(successScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
            Animated.timing(successOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
        ]).start();
    };

    const handleSubmit = async () => {
        if (rating === 0) { setError('Please select a star rating.'); return; }
        setError('');
        setSubmitting(true);
        try {
            await axiosClient.post('/api/user/rate-employee', {
                orderId,
                employeeId: mechanic._id,
                rating,
                comment: comment.trim(),
            });
            setSubmitted(true);
            triggerSuccessAnim();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to submit rating. Try again.';
            if (err?.response?.status === 400 && msg.toLowerCase().includes('already rated')) {
                // Already submitted in another session — show as done
                setSubmitted(true);
                triggerSuccessAnim();
            } else {
                setError(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const avatarUri = mechanic.profileImage ? getImageUrl(mechanic.profileImage) : null;
    const fullName = [mechanic.firstName, mechanic.lastName].filter(Boolean).join(' ') || 'Mechanic';

    return (
        <View style={[panel.root, {
            backgroundColor: isDark ? '#231E14' : '#FAF7F1',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        }]}>
            {/* Identity row */}
            <View style={panel.identityRow}>
                <View style={[panel.avatarWrap, { borderColor: C.primary + '55' }]}>
                    {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={panel.avatarImg} />
                    ) : (
                        <View style={[panel.avatarFallback, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0' }]}>
                            <Ionicons name="person" size={18} color={C.primary} />
                        </View>
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[panel.name, { color: C.textPrimary }]} numberOfLines={1}>{fullName}</Text>
                    <Text style={[panel.role, { color: C.textMuted }]}>{mechanic.position || 'Mechanic'}</Text>
                </View>
                {mechanic.averageRating > 0 && (
                    <View style={[panel.avgBadge, { backgroundColor: 'rgba(226,167,49,0.12)' }]}>
                        <Ionicons name="star" size={11} color={C.primary} />
                        <Text style={[panel.avgText, { color: C.primary }]}>
                            {Number(mechanic.averageRating).toFixed(1)}
                        </Text>
                    </View>
                )}
            </View>

            {submitted ? (
                /* ── Already rated state ── */
                <Animated.View style={[
                    panel.successBox,
                    {
                        backgroundColor: isDark ? '#1A2A1A' : '#E6F7EC',
                        transform: [{ scale: successScale }],
                        opacity: successOpacity,
                    },
                ]}>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#2ECC9A" />
                    <View style={{ flex: 1, gap: 6 }}>
                        <Text style={panel.successTitle}>Thanks for your feedback!</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <StarRow value={rating} onChange={() => { }} disabled size={16} color={C.primary} />
                            {rating > 0 && (
                                <Text style={[panel.successSubLabel, { color: C.textMuted }]}>
                                    {RATING_LABELS[rating]}
                                </Text>
                            )}
                        </View>
                        {!!comment && (
                            <Text style={[panel.successComment, { color: C.textSecondary }]} numberOfLines={2}>
                                "{comment}"
                            </Text>
                        )}
                    </View>
                </Animated.View>
            ) : (
                /* ── Input form ── */
                <>
                    <View style={panel.starSection}>
                        <View style={panel.starRow}>
                            <StarRow
                                value={rating}
                                onChange={(v) => { setRating(v); if (error) setError(''); }}
                                disabled={submitting}
                                size={32}
                                color={C.primary}
                            />
                            {rating > 0 && (
                                <Text style={[panel.ratingLabel, { color: C.primary }]}>
                                    {RATING_LABELS[rating]}
                                </Text>
                            )}
                        </View>
                        {rating === 0 && (
                            <Text style={[panel.tapHint, { color: C.textMuted }]}>Tap a star to rate</Text>
                        )}
                    </View>

                    <TextInput
                        style={[panel.input, {
                            backgroundColor: isDark ? '#1C1810' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)',
                            color: C.textPrimary,
                        }]}
                        placeholder="Write a comment (optional)"
                        placeholderTextColor={C.textMuted}
                        value={comment}
                        onChangeText={(t) => { setComment(t); if (error) setError(''); }}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                        editable={!submitting}
                    />

                    {!!error && <Text style={panel.errorText}>{error}</Text>}

                    <TouchableOpacity
                        style={[panel.submitBtn, {
                            backgroundColor: rating > 0 ? C.primary : (isDark ? '#2E2618' : '#ECDFD0'),
                            opacity: submitting ? 0.7 : 1,
                        }]}
                        onPress={handleSubmit}
                        disabled={submitting || rating === 0}
                        activeOpacity={0.82}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#1a1a1a" />
                        ) : (
                            <>
                                <Ionicons name="star" size={13} color={rating > 0 ? '#1a1a1a' : C.textMuted} />
                                <Text style={[panel.submitLabel, { color: rating > 0 ? '#1a1a1a' : C.textMuted }]}>
                                    Submit Rating
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}

const AVATAR_SIZE = 40;

const panel = StyleSheet.create({
    root: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarWrap: {
        width: AVATAR_SIZE + 4, height: AVATAR_SIZE + 4,
        borderRadius: (AVATAR_SIZE + 4) / 2, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    avatarImg: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
    avatarFallback: {
        width: AVATAR_SIZE, height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2, alignItems: 'center', justifyContent: 'center',
    },
    name: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
    role: { fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
    avgBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    },
    avgText: { fontSize: 11, fontWeight: '700' },
    starSection: { gap: 6 },
    starRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ratingLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
    tapHint: { fontSize: 11, letterSpacing: 0.2 },
    input: {
        borderWidth: 1, borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 9,
        fontSize: 13, lineHeight: 19, minHeight: 56,
    },
    errorText: { fontSize: 12, color: '#FF6B6B', marginTop: -4 },
    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 12, borderRadius: 10,
    },
    submitLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
    successBox: {
        flexDirection: 'row', alignItems: 'flex-start',
        gap: 10, borderRadius: 10, padding: 12,
    },
    successTitle: { fontSize: 13, fontWeight: '700', color: '#2ECC9A' },
    successSubLabel: { fontSize: 12, fontWeight: '500' },
    successComment: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
});

// ─── Main exported card ───────────────────────────────────────────────────────
export default function MechanicRatingCard({ order, orderId }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideY = useRef(new Animated.Value(14)).current;

    const isCompleted = order?.status === 'Completed';

    const mechanics = (order?.mechanicIds ?? []).filter(
        (m) => m && typeof m === 'object' && m._id
    );

    // { [mechanicId]: { rated: bool, rating: number, comment: string } }
    const [ratingStatusMap, setRatingStatusMap] = useState({});
    const [statusLoading, setStatusLoading] = useState(false);

    const fetchRatingStatus = useCallback(async () => {
        if (!isCompleted || !orderId || mechanics.length === 0) return;
        setStatusLoading(true);
        try {
            const res = await axiosClient.get(`/api/user/rating-status?orderId=${orderId}`);
            if (res.data?.success) setRatingStatusMap(res.data.data ?? {});
        } catch {
            // Silently fail — form still works, backend rejects duplicate with 400
        } finally {
            setStatusLoading(false);
        }
    }, [isCompleted, orderId, mechanics.length]);

    useEffect(() => {
        fetchRatingStatus();
    }, [fetchRatingStatus]);

    useEffect(() => {
        if (isCompleted && mechanics.length > 0) {
            Animated.parallel([
                Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.spring(slideY, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
            ]).start();
        }
    }, [isCompleted, mechanics.length]);

    if (!isCompleted || mechanics.length === 0) return null;

    return (
        <Animated.View style={[
            card.wrapper,
            {
                backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                opacity: fadeIn,
                transform: [{ translateY: slideY }],
            },
        ]}>
            <View style={card.header}>
                <View style={[card.iconBadge, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0' }]}>
                    <Ionicons name="star" size={16} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[card.title, { color: C.textPrimary }]}>
                        Rate Your {mechanics.length > 1 ? 'Mechanics' : 'Mechanic'}
                    </Text>
                    <Text style={[card.subtitle, { color: C.textMuted }]}>
                        Your feedback helps improve our service
                    </Text>
                </View>
                {statusLoading && (
                    <ActivityIndicator size="small" color={C.textMuted} style={{ marginLeft: 8 }} />
                )}
            </View>

            <View style={[card.divider, { backgroundColor: C.border }]} />

            {mechanics.map((mechanic, i) => {
                const mechIdStr = String(mechanic._id ?? i);
                return (
                    <MechanicRatingPanel
                        key={mechIdStr}
                        mechanic={mechanic}
                        orderId={orderId}
                        theme={theme}
                        isDark={isDark}
                        initialStatus={ratingStatusMap[mechIdStr] ?? null}
                    />
                );
            })}
        </Animated.View>
    );
}

const card = StyleSheet.create({
    wrapper: {
        borderRadius: 18, borderWidth: 1, padding: 18, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
    subtitle: { fontSize: 11, marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth },
});