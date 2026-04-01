// components/orders/MechanicCard.js
// "MASTER MECHANIC" card — shows assigned mechanic name, image, rating, message button
// Also exports VendorCard for the garage/vendor section

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Image,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import { getImageUrl } from '../../utils/imageUtils';

// ─── Avatar placeholder ───────────────────────────────────────────────────────
function AvatarPlaceholder({ name, size = 52, C, isDark }) {
    const initials = (name ?? '??')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <View style={[
            avStyles.wrap,
            {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: isDark ? '#2A2318' : '#FFF4E0',
                borderColor: C.primary,
            },
        ]}>
            <Text style={[avStyles.initials, { color: C.primary, fontSize: size * 0.34 }]}>
                {initials}
            </Text>
        </View>
    );
}

// ─── Mechanic Avatar (image or initials fallback) ─────────────────────────────
function MechanicAvatar({ name, image, size = 52, C, isDark }) {
    if (image) {
        return (
            <Image
                source={{ uri: getImageUrl(image) }}
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 2,
                    borderColor: C.primary,
                }}
            />
        );
    }
    return <AvatarPlaceholder name={name} size={size} C={C} isDark={isDark} />;
}

const avStyles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    initials: {
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

// ─── Star rating ──────────────────────────────────────────────────────────────
function StarRating({ rating = 4.5, C }) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    return (
        <View style={starStyles.row}>
            {Array.from({ length: 5 }).map((_, i) => (
                <MaterialCommunityIcons
                    key={i}
                    name={i < full ? 'star' : half && i === full ? 'star-half-full' : 'star-outline'}
                    size={12}
                    color={i <= full ? C.primary : C.textMuted}
                />
            ))}
            <Text style={[starStyles.label, { color: C.textMuted }]}>{rating}</Text>
        </View>
    );
}

const starStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    label: { fontSize: 11, fontWeight: '600', marginLeft: 2 },
});

// ─── MechanicCard ─────────────────────────────────────────────────────────────
/**
 * Props:
 *   mechanicName   string  — from order.assignedMechanic
 *   mechanicId     string  — from order.mechanicId
 *   mechanicImage  string  — from order.mechanicImage (future field)
 *   onMessage      fn      — optional message handler
 */
export function MechanicCard({ mechanicName, mechanicId, mechanicImage, onMessage }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    if (!mechanicName) return null;

    return (
        <View style={[mech.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            {/* Header */}
            <Text style={[mech.sectionLabel, { color: C.textMuted }]}>MASTER MECHANIC</Text>

            {/* Mechanic info row */}
            <View style={mech.infoRow}>
                <MechanicAvatar name={mechanicName} image={mechanicId?.profileImage} C={C} isDark={isDark} />
                <View style={mech.textBlock}>
                    <Text style={[mech.name, { color: C.textPrimary }]}>{mechanicName}</Text>
                    <StarRating rating={4.8} C={C} />
                    <Text style={[mech.role, { color: C.textMuted }]}>Lead Mechanic</Text>
                </View>
            </View>

            {/* Message button */}
            <TouchableOpacity
                style={[mech.msgBtn, {
                    backgroundColor: isDark ? '#2A2318' : '#F5F0E8',
                    borderColor: C.border,
                }]}
                onPress={onMessage}
                activeOpacity={0.75}
            >
                <Ionicons name="chatbubble-outline" size={15} color={C.primary} />
                <Text style={[mech.msgLabel, { color: C.textSecondary }]}>MESSAGE MECHANIC</Text>
            </TouchableOpacity>
        </View>
    );
}

const mech = StyleSheet.create({
    card: {
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
    sectionLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    textBlock: { flex: 1, gap: 4 },
    name: { fontSize: 17, fontWeight: '800', letterSpacing: 0.1 },
    role: { fontSize: 11, letterSpacing: 0.2 },
    msgBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    msgLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
});

// ─── VendorCard ───────────────────────────────────────────────────────────────
/**
 * Props:
 *   vendorName   string  — from order.assignedVendor
 *   vendorId     string  — from order.vendorId
 *   city         string  — from order.city
 *   contactNo    string  — from order.contactNo
 *   onCall       fn      — optional call handler
 */
export function VendorCard({ vendorName, vendorId, city, contactNo, onCall }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    if (!vendorName) return null;

    const handleCall = () => {
        if (onCall) { onCall(); return; }
        if (contactNo) Linking.openURL(`tel:${contactNo}`);
    };

    return (
        <View style={[vendor.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            {/* Label */}
            <Text style={[vendor.sectionLabel, { color: C.textMuted }]}>SERVICE GARAGE</Text>

            {/* Garage info */}
            <View style={vendor.infoRow}>
                {/* Garage icon tile */}
                <View style={[vendor.iconTile, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                    <MaterialCommunityIcons name="garage-open-variant" size={24} color={C.primary} />
                </View>

                <View style={vendor.textBlock}>
                    <Text style={[vendor.name, { color: C.textPrimary }]}>{vendorName}</Text>
                    {!!city && (
                        <View style={vendor.locationRow}>
                            <Ionicons name="location-outline" size={12} color={C.textMuted} />
                            <Text style={[vendor.location, { color: C.textMuted }]}>{city}</Text>
                        </View>
                    )}
                    {!!contactNo && (
                        <View style={vendor.locationRow}>
                            <Ionicons name="call-outline" size={12} color={C.textMuted} />
                            <Text style={[vendor.location, { color: C.textMuted }]}>{contactNo}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Call button */}
            {!!contactNo && (
                <TouchableOpacity
                    style={[vendor.callBtn, { backgroundColor: isDark ? '#2A2318' : '#F5F0E8', borderColor: C.border }]}
                    onPress={handleCall}
                    activeOpacity={0.75}
                >
                    <Ionicons name="call-outline" size={15} color={C.primary} />
                    <Text style={[vendor.callLabel, { color: C.textSecondary }]}>CALL GARAGE</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const vendor = StyleSheet.create({
    card: {
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
    sectionLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    iconTile: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textBlock: { flex: 1, gap: 5 },
    name: { fontSize: 15, fontWeight: '800', letterSpacing: 0.1 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    location: { fontSize: 12, letterSpacing: 0.1 },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    callLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
});