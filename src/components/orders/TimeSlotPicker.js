// src/components/orders/TimeSlotPicker.js
//
// Presentational grid of bookable time slots. Used by the "When to come?" step of a new
// service request and by the reschedule sheet. All data comes from useBookingSlots().
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOW_STOCK_AT = 3;   // show "2 left" once a slot is nearly full

const subtitleFor = (slot, isCurrent) => {
    if (isCurrent) return 'Current';
    if (!slot.available) return slot.unavailableReason === 'SLOT_FULL' ? 'Fully booked' : 'Unavailable';
    if (slot.remaining != null && slot.remaining <= LOW_STOCK_AT) return `${slot.remaining} left`;
    return slot.subtitle;
};

export default function TimeSlotPicker({
    theme,
    isDark = false,
    hasDate = false,          // false → ask the user to pick a date first
    slots = [],
    loading = false,
    error = null,
    onRetry,
    selected = '',            // the slot `value` currently chosen
    onSelect,
    disabled = false,         // whole date blocked (shop closed / daily limit reached)
    currentValue = '',        // reschedule: the booking's present time, shown as "Current"
    compact = false,
}) {
    const C = theme.colors;

    if (!hasDate) {
        return <Text style={[s.hint, { color: C.textMuted }]}>Pick a date first to see the available time slots.</Text>;
    }

    if (loading && slots.length === 0) {
        return (
            <View style={s.stateRow}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={[s.hint, { color: C.textMuted, fontStyle: 'normal' }]}>Loading time slots…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[s.box, { backgroundColor: (C.error || '#D64545') + '14', borderColor: (C.error || '#D64545') + '55' }]}>
                <Ionicons name="cloud-offline-outline" size={18} color={C.error || '#D64545'} />
                <Text style={[s.boxText, { color: C.textPrimary }]}>{error}</Text>
                {!!onRetry && (
                    <TouchableOpacity onPress={onRetry} activeOpacity={0.8} style={[s.retry, { backgroundColor: C.primary }]}>
                        <Text style={s.retryText}>Retry</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    if (slots.length === 0) {
        return (
            <View style={[s.box, { backgroundColor: C.warning + '20', borderColor: C.warning + '55' }]}>
                <Ionicons name="time-outline" size={18} color={C.warning} />
                <Text style={[s.boxText, { color: C.warning, fontWeight: '600' }]}>
                    No time slots are available for the selected date. Please choose another date.
                </Text>
            </View>
        );
    }

    return (
        <View style={[s.grid, loading && { opacity: 0.6 }]}>
            {slots.map((slot) => {
                const isSelected = selected === slot.value;
                const isCurrent = !!currentValue && currentValue === slot.value;
                const off = disabled || !slot.available || isCurrent;
                const subtitle = subtitleFor(slot, isCurrent);
                const urgent = slot.available && slot.remaining != null && slot.remaining <= LOW_STOCK_AT;
                return (
                    <TouchableOpacity
                        key={slot.key}
                        onPress={() => onSelect?.(slot.value)}
                        disabled={off}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected, disabled: off }}
                        style={[
                            s.tile,
                            compact && s.tileCompact,
                            {
                                borderColor: isSelected ? C.primary : C.border,
                                backgroundColor: isSelected ? C.primary : isDark ? C.surfaceLow : '#FFF',
                                opacity: off ? 0.4 : 1,
                            },
                        ]}
                    >
                        <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            style={[s.title, { color: isSelected ? '#1a1a1a' : C.textPrimary, fontWeight: isSelected ? '800' : '700' }]}
                        >
                            {slot.title}
                        </Text>
                        {!!subtitle && (
                            <Text
                                numberOfLines={1}
                                style={[s.subtitle, { color: isSelected ? '#1a1a1a' : urgent ? (C.error || '#D64545') : C.textMuted }]}
                            >
                                {subtitle}
                            </Text>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const s = StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { width: '48%', minHeight: 54, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
    tileCompact: { borderRadius: 12, minHeight: 48 },
    title: { fontSize: 12.5, letterSpacing: 0.2 },
    subtitle: { fontSize: 10.5, fontWeight: '600' },
    hint: { fontSize: 12, fontStyle: 'italic' },
    stateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    box: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
    boxText: { flex: 1, fontSize: 13, lineHeight: 18 },
    retry: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    retryText: { fontSize: 12, fontWeight: '800', color: '#1a1a1a' },
});
