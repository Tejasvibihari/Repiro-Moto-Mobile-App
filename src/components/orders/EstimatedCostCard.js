// components/orders/EstimatedCostCard.js
// Shows the estimate saved with the order at booking time (order.estimatedCost).
// It is NOT the bill: the real amount is generated after the repair and may be higher or lower.
//
// Props:
//   estimatedCost  { total, estimatedMinutes, items: [{ name, price, estimatedMinutes }] }
//   C, isDark

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatINR as fmt, formatMinutes } from '../../utils/priceUtils';

export default function EstimatedCostCard({ estimatedCost, C, isDark }) {
    if (!estimatedCost || !(estimatedCost.total > 0)) return null;
    const items = estimatedCost.items || [];

    return (
        <View style={[s.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            <Text style={[s.heading, { color: C.textMuted }]}>ESTIMATED COST</Text>

            {items.map((item, i) => (
                <View key={`${item.name}-${i}`} style={s.row}>
                    <Text style={[s.label, { color: C.textSecondary }]} numberOfLines={2}>{item.name}</Text>
                    <Text style={[s.value, { color: C.textPrimary }]}>{fmt(item.price)}</Text>
                </View>
            ))}

            <View style={[s.divider, { backgroundColor: C.border }]} />

            <View style={s.row}>
                <Text style={[s.totalLabel, { color: C.textPrimary }]}>ESTIMATED TOTAL</Text>
                <Text style={[s.totalValue, { color: C.primary }]}>{fmt(estimatedCost.total)}</Text>
            </View>

            {estimatedCost.estimatedMinutes > 0 && (
                <Text style={[s.meta, { color: C.textMuted }]}>
                    Approx. {formatMinutes(estimatedCost.estimatedMinutes)}
                </Text>
            )}

            <View style={[s.note, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderColor: C.border }]}>
                <MaterialCommunityIcons name="information-outline" size={14} color={C.textMuted} />
                <Text style={[s.noteText, { color: C.textMuted }]}>
                    This is an estimate, not the final bill. The actual cost may increase or decrease
                    depending on the repair and any parts needed.
                </Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
    heading: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, gap: 12 },
    label: { fontSize: 13, flex: 1 },
    value: { fontSize: 13, fontWeight: '600' },
    divider: { height: 1, marginVertical: 8 },
    totalLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
    totalValue: { fontSize: 18, fontWeight: '900' },
    meta: { fontSize: 11, marginTop: 2 },
    note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 12 },
    noteText: { fontSize: 11, flex: 1, lineHeight: 16 },
});
