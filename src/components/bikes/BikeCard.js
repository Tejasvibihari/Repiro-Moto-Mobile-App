import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * BikeCard – renders a single bike in the garage list.
 *
 * Props:
 *   bike      {object}       – bike data (brand, model, cc, bs, _id)
 *   theme     {object}       – current theme (LightTheme / DarkTheme)
 *   isDark    {boolean}
 *   onPress   {function}     – tap handler (e.g. navigate to detail)
 *   onEdit    {function}     – edit handler (e.g. navigate to edit screen)
 *   onDelete  {function}     – delete handler (e.g. show confirmation then delete)
 *   delay     {number}       – entrance animation delay (ms)
 */
export default function BikeCard({ bike, theme, isDark, onPress, onEdit, onDelete, delay = 0 }) {
    const translateY = useRef(new Animated.Value(24)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 380,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                tension: 55,
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const s = makeStyles(theme, isDark);

    // Build the bike name from brand and model
    const bikeName = `${bike.brand} ${bike.model}`;

    // Use _id as a VIN substitute (masked)
    const maskedVin = bike._id ? `••••${bike._id.slice(-4)}` : '••••----';

    // Specs row: CC • BS
    const specs = [];
    if (bike.cc) specs.push(`${bike.cc} CC`);
    if (bike.bs) specs.push(`BS${bike.bs.toUpperCase()}`);
    const specsText = specs.join(' • ');

    return (
        <Animated.View
            style={[
                s.card,
                { opacity, transform: [{ translateY }] },
            ]}
        >
            {/* ── Bike image ─────────────────────────────── */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onPress?.(bike)}
                style={s.imageWrap}
            >
                <Image
                    source={require('../../assets/images/bike-placeholder.jpg')}
                    style={s.bikeImage}
                    resizeMode="cover"
                />
                {/* Badges omitted because fields missing */}
            </TouchableOpacity>

            {/* ── Info section ────────────────────────────── */}
            <View style={s.infoSection}>
                {/* Type label */}
                <Text style={[s.typeLabel, { color: theme.colors.primary }]}>
                    MOTORCYCLE
                </Text>

                {/* Name */}
                <Text
                    style={[s.bikeName, { color: theme.colors.textPrimary }]}
                    numberOfLines={2}
                >
                    {bikeName}
                </Text>

                {/* Specs row: CC • BS */}
                {specsText ? (
                    <Text style={[s.specsText, { color: theme.colors.primary }]}>
                        {specsText}
                    </Text>
                ) : null}

                {/* Details row: VIN */}
                {/* <View style={s.detailsRow}>
                    <View style={[s.detailChip, { backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow }]}>
                        <Text style={[s.detailLabel, { color: theme.colors.textMuted }]}>VIN</Text>
                        <Text style={[s.detailValue, { color: theme.colors.textPrimary }]}>{maskedVin}</Text>
                    </View>
                </View> */}

                {/* Action buttons: Edit & Delete */}
                <View style={s.actionRow}>
                    <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: isDark ? '#2E2618' : '#FDECC8' }]}
                        activeOpacity={0.7}
                        onPress={() => onEdit?.(bike)}
                    >
                        <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                        <Text style={[s.actionText, { color: theme.colors.primary }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: isDark ? '#2E2618' : '#FDECC8' }]}
                        activeOpacity={0.7}
                        onPress={() => onDelete?.(bike)}
                    >
                        <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                        <Text style={[s.actionText, { color: '#FF6B6B' }]}>Delete</Text>
                    </TouchableOpacity>
                </View>

                {/* View Specifications link */}
                {/* <TouchableOpacity
                    style={[s.specBtn, { borderColor: theme.colors.border }]}
                    activeOpacity={0.7}
                    onPress={() => onPress?.(bike)}
                >
                    <Text style={[s.specBtnText, { color: theme.colors.textPrimary }]}>
                        View Details
                    </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={theme.colors.primary}
                    />
                </TouchableOpacity> */}
            </View>
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const IMG_HEIGHT = 200;

function makeStyles(theme, isDark) {
    return StyleSheet.create({
        card: {
            borderRadius: 20,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
            marginBottom: 20,
            ...theme.shadow.soft,
        },
        imageWrap: {
            position: 'relative',
            width: '100%',
            height: IMG_HEIGHT,
            backgroundColor: isDark ? theme.colors.surfaceLow : '#f5f0e6',
        },
        bikeImage: {
            width: '100%',
            height: '100%',
        },
        infoSection: {
            padding: 16,
            gap: 6,
        },
        typeLabel: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.5,
        },
        bikeName: {
            fontSize: 22,
            fontWeight: '800',
            letterSpacing: 0.2,
            lineHeight: 28,
        },
        specsText: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1,
            marginBottom: 4,
        },
        detailsRow: {
            flexDirection: 'row',
            gap: 10,
            marginTop: 4,
        },
        detailChip: {
            flex: 1,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            gap: 2,
        },
        detailLabel: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 1,
        },
        detailValue: {
            fontSize: 14,
            fontWeight: '700',
            letterSpacing: 0.3,
        },
        actionRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 8,
        },
        actionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 10,
            borderRadius: 12,
        },
        actionText: {
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.2,
        },
        specBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
        },
        specBtnText: {
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.2,
        },
    });
}