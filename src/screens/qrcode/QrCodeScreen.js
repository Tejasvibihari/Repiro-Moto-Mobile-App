// screens/refer/ReferEarnScreen.js
//
// Install deps:
//   npx expo install react-native-svg react-native-qrcode-svg expo-clipboard expo-sharing
//
// Register in navigator:
//   <Stack.Screen name="ReferEarn" component={ReferEarnScreen} />
//
// The screen reads referral info from Redux state.auth.user:
//   user.referralCode   — e.g. "TEJASVI20"
//   user.referralLink   — e.g. "https://repairomoto.in/refer/TEJASVI20"
//   user.firstName, user.totalReferrals, user.referralEarnings

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Linking,
    Share,
    Platform,
    Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import QrCode from '../../components/referral/QrCode';

const { width: W } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BASE_REFERRAL_URL = 'https://repairomoto.in/refer/';

function buildReferralLink(code) {
    return code ? `${BASE_REFERRAL_URL}${code}` : BASE_REFERRAL_URL;
}

// ─── Animated entrance wrapper ────────────────────────────────────────────────
function FadeSlide({ delay = 0, children }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const slideY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1, duration: 420, delay, useNativeDriver: true,
            }),
            Animated.spring(slideY, {
                toValue: 0, friction: 8, tension: 55, delay, useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity, transform: [{ translateY: slideY }] }}>
            {children}
        </Animated.View>
    );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ icon, value, label, C, isDark, delay }) {
    return (
        <FadeSlide delay={delay}>
            <View style={[stat.tile, {
                backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
            }]}>
                <View style={[stat.iconWrap, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                    <MaterialCommunityIcons name={icon} size={20} color={C.primary} />
                </View>
                <Text style={[stat.value, { color: C.textPrimary }]}>{value}</Text>
                <Text style={[stat.label, { color: C.textMuted }]}>{label}</Text>
            </View>
        </FadeSlide>
    );
}

const stat = StyleSheet.create({
    tile: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
    label: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
});

// ─── Copy code row ────────────────────────────────────────────────────────────
function CopyCodeRow({ code, C, isDark }) {
    const [copied, setCopied] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleCopy = useCallback(async () => {
        if (!code) return;
        await Clipboard.setStringAsync(code);
        setCopied(true);
        Animated.sequence([
            Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true, speed: 50 }),
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
        ]).start();
        setTimeout(() => setCopied(false), 2500);
    }, [code]);

    return (
        <View style={[cpRow.wrap, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: C.border,
        }]}>
            {/* Code display */}
            <View style={cpRow.codeBlock}>
                <Text style={[cpRow.codeLabel, { color: C.textMuted }]}>YOUR REFERRAL CODE</Text>
                <Text style={[cpRow.code, { color: C.primary }]}>
                    {code ?? '——'}
                </Text>
            </View>

            {/* Copy button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                    style={[
                        cpRow.copyBtn,
                        {
                            backgroundColor: copied ? '#2ECC9A' : C.primary,
                        },
                    ]}
                    onPress={handleCopy}
                    activeOpacity={0.82}
                >
                    <MaterialCommunityIcons
                        name={copied ? 'check' : 'content-copy'}
                        size={16}
                        color="#1a1a1a"
                    />
                    <Text style={cpRow.copyLabel}>
                        {copied ? 'COPIED!' : 'COPY'}
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const cpRow = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        borderWidth: 1,
        paddingLeft: 18,
        paddingRight: 10,
        paddingVertical: 12,
        gap: 12,
    },
    codeBlock: { flex: 1, gap: 3 },
    codeLabel: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },
    code: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 3,
    },
    copyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    copyLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#1a1a1a',
        letterSpacing: 1.2,
    },
});

// ─── Share button ─────────────────────────────────────────────────────────────
function ShareButton({ label, icon, iconColor, bg, border, onPress }) {
    const scale = useRef(new Animated.Value(1)).current;
    const pIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50 }).start();
    const pOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

    return (
        <Animated.View style={[{ flex: 1, transform: [{ scale }] }]}>
            <TouchableOpacity
                style={[shareBtn.btn, { backgroundColor: bg, borderColor: border }]}
                onPress={onPress}
                onPressIn={pIn}
                onPressOut={pOut}
                activeOpacity={1}
            >
                <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
                <Text style={[shareBtn.label, { color: iconColor }]}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const shareBtn = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    label: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
});

// ─── How it works steps ───────────────────────────────────────────────────────
const HOW_STEPS = [
    { icon: 'share-variant', title: 'Share Your Code', desc: 'Share your unique referral code or QR with friends.' },
    { icon: 'account-plus', title: 'Friend Signs Up', desc: 'They register using your referral code.' },
    { icon: 'tools', title: 'First Booking', desc: 'Your friend books their first service.' },
    { icon: 'gift', title: 'Both Earn Rewards', desc: 'You both get discount credits on the next service.' },
];

function HowItWorks({ C, isDark }) {
    return (
        <View style={[how.card, {
            backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
        }]}>
            <Text style={[how.title, { color: C.textMuted }]}>HOW IT WORKS</Text>
            {HOW_STEPS.map((step, i) => (
                <View key={i} style={how.stepRow}>
                    {/* Step line */}
                    <View style={how.left}>
                        <View style={[how.iconCircle, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0', borderColor: C.border }]}>
                            <MaterialCommunityIcons name={step.icon} size={16} color={C.primary} />
                        </View>
                        {i < HOW_STEPS.length - 1 && (
                            <View style={[how.connector, { backgroundColor: C.border }]} />
                        )}
                    </View>
                    {/* Text */}
                    <View style={how.textBlock}>
                        <Text style={[how.stepTitle, { color: C.textPrimary }]}>{step.title}</Text>
                        <Text style={[how.stepDesc, { color: C.textMuted }]}>{step.desc}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const how = StyleSheet.create({
    card: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        gap: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    title: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    stepRow: {
        flexDirection: 'row',
        gap: 14,
        minHeight: 56,
    },
    left: {
        alignItems: 'center',
        width: 34,
    },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    connector: {
        flex: 1,
        width: 1.5,
        marginVertical: 4,
    },
    textBlock: {
        flex: 1,
        paddingTop: 5,
        paddingBottom: 16,
        gap: 3,
    },
    stepTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.1 },
    stepDesc: { fontSize: 12, lineHeight: 18, letterSpacing: 0.1 },
});

// ─── ReferEarnScreen ──────────────────────────────────────────────────────────
export default function QrCodeScreen({ navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';
    const user = useSelector((s) => s.auth.user);

    const referralCode = user?.referralCode ?? 'RIDER100';
    const referralLink = user?.referralLink ?? buildReferralLink(referralCode);
    const firstName = user?.firstName ?? 'Rider';
    const totalReferrals = user?.totalReferrals ?? 0;
    const referralEarnings = user?.referralEarnings ?? 0;

    // ── WhatsApp share ────────────────────────────────────────────────────────
    const handleWhatsApp = useCallback(() => {
        const message =
            `Hey! 👋 I use *Repairo Moto* for all my bike servicing needs — affordable, reliable & fast.\n\n` +
            `Use my referral code *${referralCode}* to get a discount on your first service! 🏍️\n\n` +
            `Book now 👉 ${referralLink}`;
        const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => {
            // WhatsApp not installed — fall back to generic share
            handleGenericShare();
        });
    }, [referralCode, referralLink]);

    // ── Generic share ─────────────────────────────────────────────────────────
    const handleGenericShare = useCallback(async () => {
        try {
            await Share.share({
                message:
                    `Use my Repairo Moto referral code ${referralCode} for a discount on your first bike service!\n${referralLink}`,
                url: referralLink, // iOS only
                title: 'Repairo Moto Referral',
            });
        } catch (_) { }
    }, [referralCode, referralLink]);

    return (
        <ScreenWrapper title="Refer & Earn">
            <ScrollView
                contentContainerStyle={[
                    screen.scroll,
                    { backgroundColor: theme.colors.background },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero heading ─────────────────────────────────── */}
                <FadeSlide delay={0}>
                    <View style={screen.hero}>
                        <Text style={[screen.heroTitle, { color: C.textPrimary }]}>
                            Invite Friends,{'\n'}Earn Rewards 🎁
                        </Text>
                        <Text style={[screen.heroSub, { color: C.textSecondary }]}>
                            Share your code and both you and your friend get a discount on your next service.
                        </Text>
                    </View>
                </FadeSlide>

                {/* ── Stats row ────────────────────────────────────── */}


                {/* ── QR Code card ─────────────────────────────────── */}
                <FadeSlide delay={240}>
                    <View style={[screen.qrCard, {
                        backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
                    }]}>
                        <Text style={[screen.qrLabel, { color: C.textMuted }]}>SCAN TO REFER</Text>
                        <Text style={[screen.qrSub, { color: C.textSecondary }]}>
                            Friend scans this to sign up with your code applied automatically
                        </Text>

                        {/* QR Code */}
                        <View style={screen.qrCenter}>
                            <QrCode
                                value={referralLink}
                                size={W * 0.56}
                                logo={require('../../assets/logo/logo300.png')}
                                logoSize={36}
                                label={`repairomoto.in/refer/${referralCode}`}
                            />
                        </View>
                    </View>
                </FadeSlide>

                {/* ── Copy code ────────────────────────────────────── */}
                <FadeSlide delay={300}>
                    <CopyCodeRow code={referralCode} C={C} isDark={isDark} />
                </FadeSlide>

                {/* ── Share buttons ─────────────────────────────────── */}
                <FadeSlide delay={360}>
                    <View style={screen.shareRow}>
                        {/* WhatsApp */}
                        <ShareButton
                            label="WhatsApp"
                            icon="whatsapp"
                            iconColor="#FFFFFF"
                            bg="#25D366"
                            border="#25D366"
                            onPress={handleWhatsApp}
                        />
                        {/* Generic share */}
                        <ShareButton
                            label="Share Link"
                            icon="share-variant"
                            iconColor={isDark ? '#1a1a1a' : '#1a1a1a'}
                            bg={C.primary}
                            border={C.primary}
                            onPress={handleGenericShare}
                        />
                    </View>
                </FadeSlide>

                {/* ── How it works ──────────────────────────────────── */}
                <FadeSlide delay={420}>
                    <HowItWorks C={C} isDark={isDark} />
                </FadeSlide>

                {/* ── Terms note ────────────────────────────────────── */}
                <FadeSlide delay={480}>
                    <View style={screen.termsWrap}>
                        <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
                        <Text style={[screen.terms, { color: C.textMuted }]}>
                            Referral rewards are credited after the referred user completes their first paid service. Maximum 50 referrals per account. T&C apply.
                        </Text>
                    </View>
                </FadeSlide>

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

// ─── Screen styles ────────────────────────────────────────────────────────────
const screen = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        gap: 16,
        paddingTop: 20,
        paddingBottom: 32,
    },

    // Hero
    hero: { gap: 8 },
    heroTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.4,
        lineHeight: 34,
    },
    heroSub: {
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: 0.1,
    },

    // QR Card
    qrCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        gap: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    qrLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        alignSelf: 'flex-start',
    },
    qrSub: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        letterSpacing: 0.1,
        paddingHorizontal: 8,
    },
    qrCenter: {
        marginTop: 8,
        marginBottom: 4,
    },

    // Share
    shareRow: {
        flexDirection: 'row',
        gap: 12,
    },

    // Terms
    termsWrap: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-start',
        opacity: 0.7,
    },
    terms: {
        fontSize: 11,
        lineHeight: 17,
        flex: 1,
        letterSpacing: 0.1,
    },
});