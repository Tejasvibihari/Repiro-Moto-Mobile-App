// components/referral/ReferredUsersTab.js
// "My Referrals" tab — searchable + filterable list matching web referral table

import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TextInput,
    FlatList, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const STATUS_CFG = {
    approved: { bg: 'rgba(46,204,154,0.15)', text: '#2ECC9A', label: 'Approved' },
    pending: { bg: 'rgba(226,167,49,0.15)', text: '#E2A731', label: 'Pending' },
    suspended: { bg: 'rgba(255,107,107,0.15)', text: '#FF6B6B', label: 'Suspended' },
};

const FILTERS = ['all', 'approved', 'pending', 'suspended'];

function StatusPill({ status }) {
    const cfg = STATUS_CFG[status?.toLowerCase()] ?? STATUS_CFG.pending;
    return (
        <View style={[sp.wrap, { backgroundColor: cfg.bg }]}>
            <Text style={[sp.label, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
    );
}
const sp = StyleSheet.create({
    wrap: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});

function UserRow({ item, C, isDark }) {
    const name = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || 'Unknown';
    const initials = name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
    const joined = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';

    return (
        <View style={[ur.row, { borderBottomColor: C.border }]}>
            {/* Avatar */}
            {item.profileImage ? (
                <Image
                    source={{ uri: item.profileImage }}
                    style={ur.avatar}
                />
            ) : (
                <View style={[ur.avatarFallback, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                    <Text style={[ur.initials, { color: C.primary }]}>{initials}</Text>
                </View>
            )}

            {/* Info */}
            <View style={ur.info}>
                <Text style={[ur.name, { color: C.textPrimary }]} numberOfLines={1}>{name}</Text>
                <Text style={[ur.email, { color: C.textMuted }]} numberOfLines={1}>{item.email ?? ''}</Text>
                <Text style={[ur.date, { color: C.textMuted }]}>{joined}</Text>
            </View>

            {/* Status */}
            <StatusPill status={item.status} />
        </View>
    );
}

const ur = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatar: { width: 42, height: 42, borderRadius: 21 },
    avatarFallback: {
        width: 42, height: 42, borderRadius: 21,
        alignItems: 'center', justifyContent: 'center',
    },
    initials: { fontSize: 15, fontWeight: '800' },
    info: { flex: 1, gap: 2 },
    name: { fontSize: 13, fontWeight: '700' },
    email: { fontSize: 11 },
    date: { fontSize: 10 },
});

// ─── Main tab ─────────────────────────────────────────────────────────────────
export default function ReferredUsersTab({ referredUsers, C, isDark }) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return referredUsers.filter((u) => {
            const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
            const matchSearch = !q || name.includes(q) || (u.email ?? '').toLowerCase().includes(q);
            const matchFilter = filter === 'all' || (u.status ?? '').toLowerCase() === filter;
            return matchSearch && matchFilter;
        });
    }, [referredUsers, search, filter]);

    return (
        <View style={tab.wrap}>
            {/* Search bar */}
            <View style={[tab.searchBar, {
                backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            }]}>
                <Ionicons name="search-outline" size={17} color={C.textMuted} />
                <TextInput
                    style={[tab.searchInput, { color: C.textPrimary }]}
                    placeholder="Search by name or email…"
                    placeholderTextColor={C.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    selectionColor={C.primary}
                />
                {!!search && (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
                        <Ionicons name="close-circle" size={16} color={C.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter pills */}
            <View style={tab.filterRow}>
                {FILTERS.map((f) => {
                    const active = filter === f;
                    return (
                        <TouchableOpacity
                            key={f}
                            onPress={() => setFilter(f)}
                            style={[tab.filterPill, {
                                backgroundColor: active ? C.primary : isDark ? '#1C1A14' : '#F0EDE6',
                                borderColor: active ? C.primary : 'transparent',
                            }]}
                            activeOpacity={0.75}
                        >
                            <Text style={[tab.filterLabel, { color: active ? '#1a1a1a' : C.textSecondary }]}>
                                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                <View style={[tab.countBadge, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                    <Text style={[tab.countText, { color: C.primary }]}>{filtered.length}</Text>
                </View>
            </View>

            {/* List */}
            {filtered.length === 0 ? (
                <View style={tab.empty}>
                    <MaterialCommunityIcons name="account-multiple-outline" size={44} color={C.textMuted} />
                    <Text style={[tab.emptyTitle, { color: C.textPrimary }]}>No referrals found</Text>
                    <Text style={[tab.emptySub, { color: C.textMuted }]}>
                        Share your referral code to start earning rewards!
                    </Text>
                </View>
            ) : (
                filtered.map((item) => (
                    <UserRow key={item._id} item={item} C={C} isDark={isDark} />
                ))
            )}
        </View>
    );
}

const tab = StyleSheet.create({
    wrap: { gap: 14 },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    filterPill: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5,
    },
    filterLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
    countBadge: {
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 20, marginLeft: 'auto',
    },
    countText: { fontSize: 12, fontWeight: '800' },
    empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '800' },
    emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});