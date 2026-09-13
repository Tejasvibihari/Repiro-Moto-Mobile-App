// components/dashboard/ServiceDetailSheet.jsx
//
// Bottom drawer shown when a card in "Premium Services" is tapped.
// Shows the full service overview (from serviceDetails.js) and a sticky
// "Book Now" button that triggers the same booking flow the grid used to
// navigate to directly.

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ScrollView,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H } = Dimensions.get('window');
const MAX_SHEET_HEIGHT = SCREEN_H * 0.85;

function Row({ icon, iconColor, text, C }) {
    return (
        <View style={row.wrap}>
            <MaterialCommunityIcons name={icon} size={15} color={iconColor} style={{ marginTop: 1 }} />
            <Text style={[row.text, { color: C.textSecondary }]}>{text}</Text>
        </View>
    );
}
const row = StyleSheet.create({
    wrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    text: { fontSize: 13, lineHeight: 19, flex: 1 },
});

export default function ServiceDetailSheet({ visible, service, onClose, onBook, C, isDark }) {
    const translateY = useRef(new Animated.Value(SCREEN_H)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(translateY, { toValue: 0, speed: 18, bounciness: 4, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: SCREEN_H, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    if (!visible || !service) return null;

    const accent = service.color ?? C.primary;

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[
                    sheet.backdrop,
                    { opacity: backdropOpacity, backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)' },
                ]} />
            </TouchableWithoutFeedback>

            {/* Drawer */}
            <Animated.View
                style={[
                    sheet.container,
                    {
                        backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                        transform: [{ translateY }],
                        maxHeight: MAX_SHEET_HEIGHT,
                    },
                ]}
            >
                {/* Drag handle */}
                <View style={sheet.handleWrap}>
                    <View style={[sheet.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)' }]} />
                </View>

                {/* Header */}
                <View style={sheet.header}>
                    <View style={[sheet.iconCircle, { backgroundColor: `${accent}1E` }]}>
                        <MaterialCommunityIcons name={service.icon} size={24} color={accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[sheet.title, { color: C.textPrimary }]}>{service.label}</Text>
                        <Text style={[sheet.tagline, { color: C.textMuted }]}>{service.tagline}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                        <Ionicons name="close" size={22} color={C.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Meta pills: time + price */}
                <View style={sheet.metaRow}>
                    <View style={[sheet.metaPill, { backgroundColor: isDark ? '#2A2318' : '#F5F0E8' }]}>
                        <Ionicons name="time-outline" size={13} color={C.textMuted} />
                        <Text style={[sheet.metaText, { color: C.textSecondary }]}>{service.estimatedTime}</Text>
                    </View>
                    <View style={[sheet.metaPill, { backgroundColor: `${accent}18` }]}>
                        <MaterialCommunityIcons name="currency-inr" size={13} color={accent} />
                        <Text style={[sheet.metaText, { color: accent, fontWeight: '800' }]}>{service.pricing}</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sheet.scroll}>
                    {/* If skipped */}
                    {service.ifSkipped?.length > 0 && (
                        <View style={[sheet.card, { backgroundColor: isDark ? '#2A1414' : '#FFF5F5', borderColor: 'rgba(255,107,107,0.2)' }]}>
                            <View style={sheet.cardHeaderRow}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#FF6B6B" />
                                <Text style={[sheet.cardHeading, { color: '#FF6B6B' }]}>IF THIS SERVICE IS SKIPPED</Text>
                            </View>
                            <View style={sheet.list}>
                                {service.ifSkipped.map((t, i) => (
                                    <Row key={i} icon="minus-circle-outline" iconColor="#FF6B6B" text={t} C={C} />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Benefits */}
                    {service.benefits?.length > 0 && (
                        <View style={[sheet.card, { backgroundColor: isDark ? '#1A2A1A' : '#F0FBF4', borderColor: 'rgba(46,204,154,0.2)' }]}>
                            <View style={sheet.cardHeaderRow}>
                                <MaterialCommunityIcons name="check-decagram-outline" size={15} color="#2ECC9A" />
                                <Text style={[sheet.cardHeading, { color: '#2ECC9A' }]}>BENEFITS OF THIS SERVICE</Text>
                            </View>
                            <View style={sheet.list}>
                                {service.benefits.map((t, i) => (
                                    <Row key={i} icon="check-circle-outline" iconColor="#2ECC9A" text={t} C={C} />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* What's included */}
                    {service.included?.length > 0 && (
                        <View style={[sheet.card, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <View style={sheet.cardHeaderRow}>
                                <MaterialCommunityIcons name="clipboard-list-outline" size={15} color={C.primary} />
                                <Text style={[sheet.cardHeading, { color: C.textMuted }]}>WHAT'S INCLUDED</Text>
                            </View>
                            <View style={sheet.list}>
                                {service.included.map((t, i) => (
                                    <Row key={i} icon="circle-small" iconColor={C.primary} text={t} C={C} />
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Note */}
                    {!!service.note && (
                        <View style={sheet.noteRow}>
                            <MaterialCommunityIcons name="information-outline" size={13} color={C.textMuted} />
                            <Text style={[sheet.noteText, { color: C.textMuted }]}>{service.note}</Text>
                        </View>
                    )}

                    <View style={{ height: 12 }} />
                </ScrollView>

                {/* Sticky footer — Book Now */}
                <View style={[sheet.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                    <TouchableOpacity
                        style={[sheet.bookBtn, { backgroundColor: C.primary }]}
                        onPress={() => onBook(service)}
                        activeOpacity={0.85}
                    >
                        <MaterialCommunityIcons name="calendar-check-outline" size={17} color="#1a1a1a" />
                        <Text style={sheet.bookLabel}>BOOK {service.label.toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}

const sheet = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject },
    container: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 20 },
            android: { elevation: 20 },
        }),
    },
    handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
    handle: { width: 40, height: 4, borderRadius: 2 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
    iconCircle: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '900', letterSpacing: 0.1 },
    tagline: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    metaRow: {
        gap: 8,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 4,

    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 12,

    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
        lineHeight: 17,
    },
    scroll: { paddingHorizontal: 20, paddingTop: 14, gap: 12 },
    card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardHeading: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
    list: { gap: 7 },
    noteRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingHorizontal: 2 },
    noteText: { fontSize: 11, lineHeight: 16, flex: 1, fontStyle: 'italic' },
    footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12 },
    bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
    bookLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1, color: '#1a1a1a' },
});