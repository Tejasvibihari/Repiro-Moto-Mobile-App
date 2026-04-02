// screens/refer/ReferEarnScreen.js
// Parent screen — Refer & Earn dashboard.
// Composes: ReferralStatsRow, ReferredUsersTab, WithdrawalHistoryTab, WithdrawModal
// Register: <Drawer.Screen name="ReferEarn" component={ReferEarnScreen} />

import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Animated, RefreshControl, Linking, Share, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Loader from '../../components/common/Loader';
import ReferralStatsRow from '../../components/referral/ReferralStatsRow';
import ReferredUsersTab from '../../components/referral/ReferredUsersTab';
import { WithdrawalHistoryTab, WithdrawModal } from '../../components/referral/WithdrawalComponents';
import useReferral from '../../hooks/useReferral';

const BASE_URL = 'https://repairomoto.in/refer/';

// ─── Tab bar ──────────────────────────────────────────────────────────────────
const TABS = [
    { key: 'overview', label: 'Overview', icon: 'view-grid-outline' },
    { key: 'referrals', label: 'My Referrals', icon: 'account-multiple-outline' },
    { key: 'withdrawals', label: 'Withdrawals', icon: 'bank-transfer-out' },
];

function TabBar({ active, onChange, canWithdraw, C }) {
    const tabs = canWithdraw ? TABS : TABS.filter((t) => t.key !== 'withdrawals');
    return (
        <View style={tb.row}>
            {tabs.map((t) => {
                const on = active === t.key;
                return (
                    <TouchableOpacity key={t.key}
                        style={[tb.tab, { borderBottomColor: on ? C.primary : 'transparent', borderBottomWidth: 2 }]}
                        onPress={() => onChange(t.key)} activeOpacity={0.75}>
                        <MaterialCommunityIcons name={t.icon} size={15} color={on ? C.primary : C.textMuted} />
                        <Text style={[tb.label, { color: on ? C.primary : C.textMuted, fontWeight: on ? '700' : '500' }]}>
                            {t.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
const tb = StyleSheet.create({
    row: { flexDirection: 'row' },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
    label: { fontSize: 10, letterSpacing: 0.2 },
});

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ stats, canWithdraw, C, isDark }) {
    const conv = stats.totalReferrals > 0
        ? ((stats.activeReferrals / stats.totalReferrals) * 100).toFixed(1) : '0.0';
    const avg = stats.totalReferrals > 0
        ? Math.round(stats.totalEarnings / stats.totalReferrals) : 0;
    const Row = ({ label, value, vc }) => (
        <View style={ov.row}>
            <Text style={[ov.rl, { color: C.textSecondary }]}>{label}</Text>
            <Text style={[ov.rv, { color: vc ?? C.textPrimary }]}>{value}</Text>
        </View>
    );
    const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`;
    return (
        <View style={{ gap: 14 }}>
            <View style={[ov.card, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: C.border }]}>
                <Text style={[ov.ct, { color: C.textMuted }]}>EARNINGS BREAKDOWN</Text>
                <Row label={canWithdraw ? 'Available Balance' : 'Purchase Credit'} value={fmt(stats.availableAmount)} vc="#2ECC9A" />
                <Row label="Pending Amount" value={fmt(stats.pendingAmount)} vc="#E2A731" />
                <Row label={canWithdraw ? 'Total Withdrawn' : 'Total Used'} value={fmt(stats.totalWithdrawn)} vc="#FF6B6B" />
                <View style={[ov.div, { backgroundColor: C.border }]} />
                <View style={ov.row}>
                    <Text style={[ov.rl, { color: C.textPrimary, fontWeight: '800' }]}>Total Earnings</Text>
                    <Text style={[ov.total, { color: C.primary }]}>{fmt(stats.totalEarnings)}</Text>
                </View>
                {!canWithdraw && (
                    <View style={[ov.note, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderColor: C.border }]}>
                        <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
                        <Text style={[ov.noteT, { color: C.textMuted }]}>
                            Credit is applied automatically at checkout. No expiry date.
                        </Text>
                    </View>
                )}
            </View>
            <View style={[ov.card, { backgroundColor: isDark ? '#141210' : '#F8F5EF', borderColor: C.border }]}>
                <Text style={[ov.ct, { color: C.textMuted }]}>REFERRAL STATS</Text>
                <Row label="Total Referrals" value={String(stats.totalReferrals)} />
                <Row label="Active Referrals" value={String(stats.activeReferrals)} vc="#2ECC9A" />
                <Row label="Conversion Rate" value={`${conv}%`} />
                <Row label="Avg. per Referral" value={`₹${avg}`} />
            </View>
        </View>
    );
}
const ov = StyleSheet.create({
    card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 0 },
    ct: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
    rl: { fontSize: 13 },
    rv: { fontSize: 13, fontWeight: '700' },
    total: { fontSize: 20, fontWeight: '900' },
    div: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
    note: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 10 },
    noteT: { fontSize: 11, flex: 1, lineHeight: 17 },
});

// ─── Action strip: copy code + WhatsApp + share + withdraw ────────────────────
function ActionStrip({ referralCode, referralLink, canWithdraw, availableAmount, onWithdraw, C, isDark }) {
    const [copied, setCopied] = useState(false);
    const sc = useRef(new Animated.Value(1)).current;

    const copy = useCallback(async () => {
        await Clipboard.setStringAsync(referralCode);
        setCopied(true);
        Animated.sequence([
            Animated.spring(sc, { toValue: 0.93, useNativeDriver: true, speed: 50 }),
            Animated.spring(sc, { toValue: 1, useNativeDriver: true, speed: 20 }),
        ]).start();
        setTimeout(() => setCopied(false), 2500);
    }, [referralCode]);

    const whatsapp = useCallback(() => {
        const msg = `Hey! 👋 Use my *Repairo Moto* referral code *${referralCode}* for a discount on your first bike service! 🏍️\n\nBook here 👉 ${referralLink}`;
        Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
            Share.share({ message: `Use code ${referralCode} on Repairo Moto!\n${referralLink}` })
        );
    }, [referralCode, referralLink]);

    const shareLink = useCallback(async () => {
        await Share.share({ message: `Use my Repairo Moto code ${referralCode}!\n${referralLink}`, url: referralLink });
    }, [referralCode, referralLink]);

    return (
        <View style={[as.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
            {/* Code row */}
            <View style={as.cr}>
                <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[as.cl, { color: C.textMuted }]}>YOUR REFERRAL CODE</Text>
                    <Text style={[as.code, { color: C.primary }]}>{referralCode || '——'}</Text>
                </View>
                <Animated.View style={{ transform: [{ scale: sc }] }}>
                    <TouchableOpacity
                        style={[as.copyBtn, { backgroundColor: copied ? '#2ECC9A' : C.primary }]}
                        onPress={copy} activeOpacity={0.82}>
                        <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={15} color="#1a1a1a" />
                        <Text style={as.copyL}>{copied ? 'COPIED!' : 'COPY'}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
            {/* Buttons */}
            <View style={as.br}>
                <TouchableOpacity style={[as.btn, { backgroundColor: '#25D366', flex: 1.2 }]} onPress={whatsapp} activeOpacity={0.82}>
                    <MaterialCommunityIcons name="whatsapp" size={16} color="#fff" />
                    <Text style={[as.bl, { color: '#fff' }]}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[as.btn, { backgroundColor: isDark ? '#2A2318' : '#F5F0E8', borderColor: C.border, borderWidth: 1, flex: 1 }]} onPress={shareLink} activeOpacity={0.82}>
                    <MaterialCommunityIcons name="share-variant" size={16} color={C.primary} />
                    <Text style={[as.bl, { color: C.primary }]}>Share</Text>
                </TouchableOpacity>
                {canWithdraw && (
                    <TouchableOpacity
                        style={[as.btn, { backgroundColor: availableAmount > 0 ? C.primary : (isDark ? '#2A2318' : '#EDE8DC'), flex: 1, opacity: availableAmount > 0 ? 1 : 0.5 }]}
                        onPress={onWithdraw} disabled={availableAmount <= 0} activeOpacity={0.82}>
                        <MaterialCommunityIcons name="bank-transfer-out" size={16} color={availableAmount > 0 ? '#1a1a1a' : C.textMuted} />
                        <Text style={[as.bl, { color: availableAmount > 0 ? '#1a1a1a' : C.textMuted }]}>Withdraw</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
const as = StyleSheet.create({
    card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    cr: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cl: { fontSize: 8, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
    code: { fontSize: 22, fontWeight: '900', letterSpacing: 3 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
    copyL: { fontSize: 11, fontWeight: '800', color: '#1a1a1a', letterSpacing: 1 },
    br: { flexDirection: 'row', gap: 10 },
    btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
    bl: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});

// ─── Personal account notice ──────────────────────────────────────────────────
function PersonalNotice({ C, isDark }) {
    return (
        <View style={[pn.w, { backgroundColor: isDark ? '#151A2A' : '#EEF4FF', borderColor: 'rgba(91,140,255,0.25)' }]}>
            <MaterialCommunityIcons name="shopping-outline" size={17} color="#5B8CFF" />
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={[pn.t, { color: '#5B8CFF' }]}>Personal Account — Purchase Credit</Text>
                <Text style={[pn.s, { color: isDark ? '#8AACFF' : '#3B6AE8' }]}>
                    Your balance is applied as a discount at checkout. Upgrade to Business to withdraw cash.
                </Text>
            </View>
        </View>
    );
}
const pn = StyleSheet.create({
    w: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
    t: { fontSize: 12, fontWeight: '800' },
    s: { fontSize: 11, lineHeight: 17 },
});

// ─── ReferEarnScreen ──────────────────────────────────────────────────────────
export default function ReferEarnScreen({ navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';
    const user = useSelector((s) => s.auth.user);

    const [activeTab, setActiveTab] = useState('overview');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);

    const { referredUsers, withdrawalHistory, stats, loading, refreshing, error, canWithdraw, refetch, submitWithdrawal } = useReferral();

    const referralCode = user?.referralCode ?? '';
    const referralLink = `${BASE_URL}${referralCode}`;

    if (loading) {
        return (
            <ScreenWrapper title="Refer & Earn">
                <Loader variant="skeleton" rows={5} />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper title="Refer & Earn">
            <ScrollView
                contentContainerStyle={[s.scroll, { backgroundColor: theme.colors.background }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={C.primary} colors={[C.primary]} />}
            >
                {/* Error */}
                {!!error && (
                    <View style={[s.errBanner, { backgroundColor: 'rgba(255,107,107,0.1)', borderColor: 'rgba(255,107,107,0.25)' }]}>
                        <Ionicons name="alert-circle-outline" size={15} color="#FF6B6B" />
                        <Text style={s.errText}>{error}</Text>
                    </View>
                )}


                {/* Hero */}
                <View style={{ gap: 8 }}>
                    <Text style={[s.heroTitle, { color: C.textPrimary }]}>Refer Friends,{'\n'}Earn Rewards 🎁</Text>
                    <Text style={[s.heroSub, { color: C.textSecondary }]}>
                        {canWithdraw
                            ? 'Earn ₹150 cash per referral. Withdraw directly to your UPI account.'
                            : 'Earn ₹150 credit per referral — applied automatically on your next service.'}
                    </Text>
                </View>

                {/* Stats */}
                <ReferralStatsRow stats={stats} canWithdraw={canWithdraw} C={C} isDark={isDark} />

                {/* Action strip */}
                <ActionStrip
                    referralCode={referralCode}
                    referralLink={referralLink}
                    canWithdraw={canWithdraw}
                    availableAmount={stats.availableAmount}
                    onWithdraw={() => setShowWithdrawModal(true)}
                    C={C} isDark={isDark}
                />

                {/* Tabbed card */}
                <View style={[s.tabCard, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                    <TabBar active={activeTab} onChange={setActiveTab} canWithdraw={canWithdraw} C={C} />
                    <View style={[s.tabDiv, { backgroundColor: C.border }]} />
                    <View style={s.tabContent}>
                        {activeTab === 'overview' && <OverviewTab stats={stats} canWithdraw={canWithdraw} C={C} isDark={isDark} />}
                        {activeTab === 'referrals' && <ReferredUsersTab referredUsers={referredUsers} C={C} isDark={isDark} />}
                        {activeTab === 'withdrawals' && canWithdraw && <WithdrawalHistoryTab withdrawalHistory={withdrawalHistory} stats={stats} C={C} isDark={isDark} />}
                    </View>
                </View>
                {/* Personal notice */}
                {!canWithdraw && <PersonalNotice C={C} isDark={isDark} />}

                {/* Terms */}
                <View style={s.terms}>
                    <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
                    <Text style={[s.termsText, { color: C.textMuted }]}>
                        Rewards credited after referred user completes their first paid service. Max 50 referrals/account. T&C apply.
                    </Text>
                </View>

                <View style={{ height: 40 }} />

            </ScrollView>

            <WithdrawModal
                visible={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                onSubmit={submitWithdrawal}
                availableAmount={stats.availableAmount}
                C={C} isDark={isDark}
            />

        </ScreenWrapper>
    );
}

const s = StyleSheet.create({
    scroll: { flexGrow: 1, gap: 16, paddingTop: 20, paddingBottom: 32 },
    errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
    errText: { flex: 1, fontSize: 12, color: '#FF6B6B', lineHeight: 18 },
    heroTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.4, lineHeight: 32 },
    heroSub: { fontSize: 13, lineHeight: 20 },
    tabCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    tabDiv: { height: StyleSheet.hairlineWidth },
    tabContent: { padding: 16 },
    terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, opacity: 0.7 },
    termsText: { flex: 1, fontSize: 11, lineHeight: 17 },
});