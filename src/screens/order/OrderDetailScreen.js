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
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Loader from '../../components/common/Loader';
import OrderProgressStepper from '../../components/orders/OrderProgressStepper';
import ServiceManifestCard from '../../components/orders/ServiceManifestCard';
import { MechanicCard, VendorCard } from '../../components/orders/MechanicCard';
import FinancialSummaryCard from '../../components/orders/FinancialSummaryCard';
import useOrder from '../../hooks/useOrder';
import PopUp from '../../components/common/PopUp'; // assuming PopUp is exported

// ─── Reason Input Modal (styled like PopUp) ──────────────────────────────────
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

    const handleReasonChange = (text) => {
        setReason(text);
        if (validationError) setValidationError('');
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropOpacity, backgroundColor: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.45)" },
                    ]}
                />
            </TouchableWithoutFeedback>
            <View style={styles.centeredWrapper} pointerEvents="box-none">
                <Animated.View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                            ...Platform.select({
                                ios: {
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: isDark ? 0.3 : 0.2,
                                    shadowRadius: 24,
                                },
                                android: { elevation: 16 },
                            }),
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.closeBtn}
                        onPress={onClose}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>

                    <View style={[styles.iconBadge, { backgroundColor: isDark ? '#271F00' : '#FFFBEC' }]}>
                        <Ionicons name="warning" size={42} color="#e2a731" />
                    </View>

                    <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Cancel Order</Text>
                    <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                        Please provide a reason for cancellation (required):
                    </Text>

                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.colors.background,
                                borderColor: validationError ? '#FF6B6B' : theme.colors.border,
                                color: theme.colors.textPrimary,
                            },
                        ]}
                        placeholder="e.g., Changed mind, Found another service..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={reason}
                        onChangeText={handleReasonChange}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                    {validationError ? (
                        <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{validationError}</Text>
                    ) : null}

                    <View style={styles.buttonRow}>
                        <View style={styles.btnWrap}>
                            <TouchableOpacity
                                style={[
                                    styles.secondaryBtn,
                                    { borderColor: theme.colors.border, backgroundColor: 'transparent' },
                                ]}
                                onPress={onClose}
                                disabled={loading}
                            >
                                <Text style={[styles.secondaryLabel, { color: theme.colors.textSecondary }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.btnWrap}>
                            <TouchableOpacity
                                style={[
                                    styles.primaryBtn,
                                    { backgroundColor: theme.colors.primary, opacity: loading ? 0.7 : 1 },
                                ]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="#1a1a1a" />
                                ) : (
                                    <Text style={styles.primaryLabel}>Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};


// ─── Status badge (unchanged) ────────────────────────────────────────────────
const STATUS_COLORS = {
    'pending': { bg: 'rgba(226,167,49,0.15)', text: '#E2A731', dot: '#E2A731' },
    'in progress': { bg: 'rgba(91,140,255,0.15)', text: '#5B8CFF', dot: '#5B8CFF' },
    'mechanic assigned': { bg: 'rgba(91,140,255,0.15)', text: '#5B8CFF', dot: '#5B8CFF' },
    'completed': { bg: 'rgba(46,204,154,0.15)', text: '#2ECC9A', dot: '#2ECC9A' },
    'invoice generated': { bg: 'rgba(46,204,154,0.15)', text: '#2ECC9A', dot: '#2ECC9A' },
    'cancelled': { bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B', dot: '#FF6B6B' },
};

function StatusPill({ status }) {
    const key = (status ?? '').toLowerCase();
    const cfg = STATUS_COLORS[key] ?? STATUS_COLORS['pending'];
    return (
        <View style={[pill.wrap, { backgroundColor: cfg.bg }]}>
            <View style={[pill.dot, { backgroundColor: cfg.dot }]} />
            <Text style={[pill.label, { color: cfg.text }]}>{(status ?? 'Pending').toUpperCase()}</Text>
        </View>
    );
}

const pill = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    label: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
});

// ─── Action buttons (updated to use reason modal) ────────────────────────────
function ActionButtons({ order, onCancel, onDownload, C, isDark }) {
    const canCancel = ['Pending', 'Mechanic Assigned'].includes(order?.status ?? '');
    const hasInvoice = ['Invoice Generated', 'Completed'].includes(order?.status ?? '');

    if (!canCancel && !hasInvoice) return null;

    return (
        <View style={ab.row}>
            {canCancel && (
                <TouchableOpacity
                    style={[ab.btn, {
                        backgroundColor: isDark ? '#2A1414' : '#FFF5F5',
                        borderColor: 'rgba(255,107,107,0.3)',
                    }]}
                    onPress={onCancel}
                    activeOpacity={0.78}
                >
                    <Text style={ab.cancelLabel}>Cancel Order</Text>
                </TouchableOpacity>
            )}
            {hasInvoice && (
                <TouchableOpacity
                    style={[ab.btn, { backgroundColor: C.primary, flex: 1 }]}
                    onPress={onDownload}
                    activeOpacity={0.82}
                >
                    <MaterialCommunityIcons name="download" size={15} color="#1a1a1a" />
                    <Text style={ab.downloadLabel}>Download Invoice</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const ab = StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    cancelLabel: { fontSize: 12, fontWeight: '700', color: '#FF6B6B', letterSpacing: 0.5 },
    downloadLabel: { fontSize: 12, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.8 },
});

// ─── Order header card (unchanged) ───────────────────────────────────────────
function OrderHeaderCard({ order, C, isDark, onCancel, onDownload }) {
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
                    <View>
                        <Text style={[hdr.orderLabel, { color: C.textMuted }]}>#{order.orderId}</Text>
                    </View>
                    <StatusPill status={order.status} />
                </View>

                <Text style={[hdr.bikeName, { color: C.textPrimary }]} numberOfLines={2}>
                    {modelFull || 'Unknown Bike'}
                </Text>

                {estimatedDateStr && (
                    <View style={hdr.etaRow}>
                        <Ionicons name="time-outline" size={13} color={C.textMuted} />
                        <Text style={[hdr.eta, { color: C.textMuted }]}>
                            Scheduled: {estimatedDateStr}
                        </Text>
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
                </View>

                <ActionButtons
                    order={order}
                    onCancel={onCancel}
                    onDownload={onDownload}
                    C={C}
                    isDark={isDark}
                />
            </View>
        </Animated.View>
    );
}

const hdr = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 4,
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
    bikeName: { fontSize: 26, fontWeight: '900', letterSpacing: -0.4, lineHeight: 32 },
    etaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    eta: { fontSize: 12, letterSpacing: 0.1 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    infoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    infoPillText: { fontSize: 11, fontWeight: '600' },
});

// ─── Issues card (unchanged) ─────────────────────────────────────────────────
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
                <Text style={[iss.text, { color: C.textSecondary }]}>
                    Additional: {otherService}
                </Text>
            )}
        </View>
    );
}

const iss = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        gap: 8,
    },
    label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
    text: { fontSize: 13, lineHeight: 20, letterSpacing: 0.1 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function OrderDetailScreen({ route, navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    const orderId = route?.params?.orderId;

    // Use the hook as the single source of truth
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

    // Fetch order on mount
    useEffect(() => {
        if (orderId) {
            fetchOrderById(orderId);
        }
    }, [orderId, fetchOrderById]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOrderById(orderId);
        setRefreshing(false);
    }, [orderId, fetchOrderById]);

    // Cancel flow: open reason modal
    const handleCancelPress = () => {
        setReasonModalVisible(true);
    };

    // Submit reason and cancel
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

    // Download invoice (placeholder)
    const handleDownload = () => {
        Alert.alert('Invoice', 'Invoice download coming soon.');
    };

    // Loading state
    if (orderLoading && !order) {
        return (
            <ScreenWrapper title="Order Details">
                <Loader variant="skeleton" rows={6} />
            </ScreenWrapper>
        );
    }

    // Error state
    if (orderError && !order) {
        return (
            <ScreenWrapper title="Order Details">
                <View style={screen.errorWrap}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={48} color={C.textMuted} />
                    <Text style={[screen.errorText, { color: C.textMuted }]}>
                        {orderError ?? 'Order not found'}
                    </Text>
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
                contentContainerStyle={[
                    screen.scroll,
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
                {/* Order header card */}
                <OrderHeaderCard
                    order={order}
                    C={C}
                    isDark={isDark}
                    onCancel={handleCancelPress}
                    onDownload={handleDownload}
                />

                {/* Progress stepper */}
                <OrderProgressStepper
                    status={order.status}
                    preferredTime={order.preferredTime}
                />

                {/* Service manifest */}
                {(order.serviceProvided?.length > 0 || order.services?.length > 0 || order.partsUsed?.length > 0) && (
                    <ServiceManifestCard
                        serviceProvided={order.serviceProvided ?? []}
                        partsUsed={order.partsUsed ?? []}
                        services={order.services ?? []}
                    />
                )}

                {/* Issues */}
                <IssuesCard
                    issues={order.issues}
                    otherService={order.otherService}
                    C={C}
                    isDark={isDark}
                />

                {/* Mechanic card */}
                <MechanicCard
                    mechanicName={order.assignedMechanic}
                    mechanicId={order.mechanicId}
                    mechanicImage={order.mechanicImage}
                    onMessage={() => Alert.alert('Message', 'Chat coming soon.')}
                />

                {/* Vendor card */}
                {/* <VendorCard
                    vendorName={order.assignedVendor}
                    vendorId={order.vendorId}
                    city={order.city}
                    contactNo={order.contactNo}
                /> */}

                {/* Financial summary */}
                <FinancialSummaryCard
                    total={order.total}
                    coupon={order.coupon}
                    invoiceDate={order.invoiceDate}
                    status={order.status}
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
                title="Cancellation Failed"
                message={errorMessage}
                primaryLabel="Try Again"
                onPrimary={() => setErrorModalVisible(false)}
                onClose={() => setErrorModalVisible(false)}
                showCloseIcon
            />
        </ScreenWrapper>
    );
}

const screen = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        gap: 14,
        paddingTop: 16,
        paddingBottom: 32,
    },
    errorWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 32,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    retryBtn: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 4,
    },
    retryLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: 1,
    },
});

// Styles for ReasonInputModal (add after screen styles or at bottom)
const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    centeredWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 28,
        borderWidth: 1,
        paddingTop: 28,
        paddingBottom: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        padding: 6,
        zIndex: 1,
    },
    iconBadge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.2,
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        letterSpacing: 0.1,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    btnWrap: {
        flex: 1,
    },
    primaryBtn: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    secondaryBtn: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    secondaryLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
});