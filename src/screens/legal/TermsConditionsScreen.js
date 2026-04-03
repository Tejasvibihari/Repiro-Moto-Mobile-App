// screens/legal/TermsConditionsScreen.js
// Drop-in screen — register it in AppNavigator as:
//   <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
// Navigate to it with:
//   navigation.navigate('TermsConditions')

import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Content Data ─────────────────────────────────────────────────────────────
const SECTIONS = [
    {
        id: 'eligibility',
        icon: 'person-circle-outline',
        iconLib: 'ion',
        title: 'Eligibility & Account',
        color: '#5B9CF6',
        items: [
            'You must be at least 18 years old to use Repairo Moto services.',
            'You must provide accurate personal details including name, phone number, and location during registration.',
            'One account per user is permitted. Creating multiple accounts may result in permanent suspension.',
            'You are responsible for maintaining the confidentiality of your account credentials.',
            'Repairo Moto reserves the right to suspend or terminate accounts found to be fraudulent or in violation of these terms.',
        ],
    },
    {
        id: 'booking',
        icon: 'construct-outline',
        iconLib: 'ion',
        title: 'Booking & Service',
        color: '#e2a731',
        items: [
            'Users can book a certified mechanic for two-wheeler repairs through the app.',
            'The mechanic will arrive at the location specified by the user at the time of booking.',
            'Repairo Moto does not guarantee a fixed arrival time, though we strive to reach you within the estimated window.',
            'You must ensure the vehicle is accessible and safe for the mechanic to work on.',
            'Service scope is limited to repairs agreed upon at booking. Additional work requires a separate booking or on-site agreement.',
            'Repairo Moto reserves the right to cancel a booking if a mechanic is unavailable in your area.',
        ],
    },
    {
        id: 'payment',
        icon: 'wallet-outline',
        iconLib: 'ion',
        title: 'Payments & Charges',
        color: '#2ECC9A',
        items: [
            'All service charges are displayed transparently before confirmation of the booking.',
            'Payment is accepted via UPI, credit/debit card, net banking, or Repairo Moto wallet.',
            'Wallet balance can be topped up and used for future bookings.',
            'In case of a cancellation by the user after mechanic dispatch, a cancellation fee may apply.',
            'All taxes applicable under Indian law (GST etc.) are included in the final invoice.',
            'Repairo Moto is not responsible for payment failures caused by third-party payment gateways.',
        ],
    },
    {
        id: 'mechanic',
        icon: 'bicycle',
        iconLib: 'mci',
        title: 'Mechanic & Quality',
        color: '#e2a731',
        items: [
            'All mechanics on the platform are background-verified and trained professionals.',
            'Repairo Moto does not employ mechanics directly; they are independent service providers.',
            'You may rate and review your mechanic after service completion.',
            'If you are dissatisfied with the quality of service, raise a dispute within 24 hours via the app.',
            'Repairo Moto will investigate all complaints and may offer a re-service or partial refund at its discretion.',
            'Mechanics are not authorised to demand additional cash outside the agreed service charge.',
        ],
    },
    {
        id: 'liability',
        icon: 'shield-checkmark-outline',
        iconLib: 'ion',
        title: 'Liability & Warranty',
        color: '#FF6B6B',
        items: [
            'Repairo Moto provides a 7-day service warranty on labour performed by our mechanics.',
            'Warranty on parts depends on the manufacturer and is separate from the service warranty.',
            'Repairo Moto is not liable for pre-existing damage or faults unrelated to the booked repair.',
            'In case of accidental damage caused by a mechanic during service, Repairo Moto will cover repair costs up to the service value.',
            'Repairo Moto is not liable for delays caused by traffic, weather, or events beyond our control.',
        ],
    },
    {
        id: 'referral',
        icon: 'gift-outline',
        iconLib: 'ion',
        title: 'Refer & Earn',
        color: '#5B9CF6',
        items: [
            'Users can refer friends using a unique referral code available in the app.',
            'Referral rewards are credited to your wallet after the referred user completes their first paid booking.',
            'Referral rewards cannot be withdrawn as cash and can only be used for bookings.',
            'Repairo Moto may modify or discontinue the referral programme at any time without prior notice.',
            'Any attempt to game or exploit the referral system will result in forfeiture of rewards and account suspension.',
        ],
    },
    {
        id: 'privacy',
        icon: 'lock-closed-outline',
        iconLib: 'ion',
        title: 'Privacy & Data',
        color: '#2ECC9A',
        items: [
            'We collect your name, phone number, location, and vehicle details to provide and improve our services.',
            'Your location is used only during active bookings and is not stored permanently.',
            'We do not sell your personal data to third parties.',
            'Data may be shared with mechanics and payment partners solely to fulfil your booking.',
            'You can request deletion of your account and data by contacting support@repairomoto.in.',
        ],
    },
    {
        id: 'conduct',
        icon: 'people-outline',
        iconLib: 'ion',
        title: 'User Conduct',
        color: '#e2a731',
        items: [
            'Users must treat mechanics with respect. Abusive, threatening, or discriminatory behaviour will result in account termination.',
            'Do not attempt to contact mechanics outside of the app for off-platform bookings.',
            'Any fraudulent dispute raised to claim an unwarranted refund is prohibited.',
            'Users must not use the platform for any unlawful purpose.',
            'Repeated no-shows or last-minute cancellations may result in booking restrictions.',
        ],
    },
    {
        id: 'changes',
        icon: 'document-text-outline',
        iconLib: 'ion',
        title: 'Changes to Terms',
        color: '#9E8E78',
        items: [
            'Repairo Moto may update these Terms & Conditions at any time.',
            'Significant changes will be notified via the app or registered email.',
            'Continued use of the app after changes constitutes acceptance of the updated terms.',
            'These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Patna, Bihar.',
        ],
    },
];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQS = [
    {
        q: 'How do I book a mechanic?',
        a: 'Open the app, tap "Book a Mechanic" on the Home screen, enter your location and vehicle details, select a service type, and confirm your booking. A nearby mechanic will be assigned and will reach you within the estimated time.',
    },
    {
        q: 'Can I cancel a booking after it is confirmed?',
        a: 'Yes, you can cancel a booking from the Orders screen. Cancellations made before mechanic dispatch are free. If the mechanic is already on the way, a nominal cancellation fee may apply.',
    },
    {
        q: 'What types of bikes are supported?',
        a: 'We currently support all major two-wheelers including motorcycles, scooters, and mopeds from brands like Hero, Honda, Bajaj, TVS, Royal Enfield, Yamaha, and Suzuki.',
    },
    {
        q: 'Is my payment secure?',
        a: 'Yes. All payments are processed via PCI-DSS compliant gateways. Repairo Moto does not store your card details on our servers.',
    },
    {
        q: 'What if the mechanic does not show up?',
        a: 'If a mechanic fails to arrive within 60 minutes of the estimated time without notice, you can cancel penalty-free and will receive a full refund. You can also raise a support ticket directly from the Orders screen.',
    },
    {
        q: 'How do I claim the service warranty?',
        a: 'If the same issue recurs within 7 days of service, open your completed order in the Orders screen and tap "Raise Warranty Claim". A mechanic will be dispatched at no extra charge.',
    },
    {
        q: 'How are mechanics verified?',
        a: 'Every mechanic undergoes a background check, identity verification (Aadhaar/PAN), and a skills assessment before being onboarded. Ratings below 3.5 result in automatic review and possible suspension.',
    },
    {
        q: 'Can I request a specific mechanic?',
        a: 'Currently, mechanics are assigned automatically based on proximity and availability. A "Preferred Mechanic" feature is coming soon for users who want to rebook a mechanic they liked.',
    },
];

// ─── Icon Helper ──────────────────────────────────────────────────────────────
function SectionIcon({ item, size = 18, color }) {
    if (item.iconLib === 'mci') {
        return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
    }
    return <Ionicons name={item.icon} size={size} color={color} />;
}

// ─── Accordion Section Card ───────────────────────────────────────────────────
function SectionCard({ section, theme, isDark, index }) {
    const [open, setOpen] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-8)).current;

    // Staggered entrance
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 320,
                delay: index * 60,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                speed: 18,
                bounciness: 4,
                delay: index * 60,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Animated.spring(rotateAnim, {
            toValue: open ? 0 : 1,
            speed: 22,
            bounciness: 4,
            useNativeDriver: true,
        }).start();
        setOpen((v) => !v);
    };

    const iconRotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const iconBg = isDark
        ? `${section.color}20`
        : `${section.color}18`;

    return (
        <Animated.View
            style={[
                styles.sectionCard,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: open ? `${section.color}40` : theme.colors.border,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            {/* Header row */}
            <TouchableOpacity
                onPress={toggle}
                activeOpacity={0.72}
                style={[
                    styles.sectionHeader,
                    open && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.colors.border,
                        backgroundColor: isDark ? theme.colors.surfaceLow : theme.colors.surfaceLow,
                    },
                ]}
            >
                <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
                    <SectionIcon item={section} size={17} color={section.color} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    {section.title}
                </Text>
                <Animated.View style={{ transform: [{ rotate: iconRotate }] }}>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
                </Animated.View>
            </TouchableOpacity>

            {/* Expandable content */}
            {open && (
                <View style={styles.sectionBody}>
                    {section.items.map((item, i) => (
                        <View key={i} style={styles.bulletRow}>
                            <View style={[styles.bulletDot, { backgroundColor: section.color }]} />
                            <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>
                                {item}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </Animated.View>
    );
}

// ─── FAQ Item ─────────────────────────────────────────────────────────────────
function FaqItem({ faq, theme, isDark, index }) {
    const [open, setOpen] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const toggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Animated.spring(rotateAnim, {
            toValue: open ? 0 : 1,
            speed: 22,
            bounciness: 4,
            useNativeDriver: true,
        }).start();
        setOpen((v) => !v);
    };

    const iconRotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    return (
        <View
            style={[
                styles.faqCard,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: open ? 'rgba(226,167,49,0.35)' : theme.colors.border,
                },
            ]}
        >
            <TouchableOpacity
                onPress={toggle}
                activeOpacity={0.72}
                style={[
                    styles.faqHeader,
                    open && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.colors.border,
                    },
                ]}
            >
                <View style={styles.faqQ}>
                    <View style={[styles.qBadge, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0' }]}>
                        <Text style={[styles.qBadgeText, { color: theme.colors.primary }]}>Q</Text>
                    </View>
                    <Text style={[styles.faqQuestion, { color: theme.colors.textPrimary }]}>
                        {faq.q}
                    </Text>
                </View>
                <Animated.View style={{ transform: [{ rotate: iconRotate }] }}>
                    <Ionicons name="chevron-down" size={15} color={theme.colors.textMuted} />
                </Animated.View>
            </TouchableOpacity>

            {open && (
                <View style={styles.faqBody}>
                    <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                        {faq.a}
                    </Text>
                </View>
            )}
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TermsConditionsScreen() {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const [activeTab, setActiveTab] = useState('terms'); // 'terms' | 'faq'

    const heroBgColor = isDark ? theme.colors.surfaceHigh : theme.colors.surfaceHigh;

    return (
        <ScreenWrapper title="Terms & Conditions" noPadding>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* ── Hero Banner ── */}
                <View style={[styles.heroBanner, { backgroundColor: heroBgColor, borderColor: theme.colors.border }]}>
                    <View style={[styles.heroIconWrap, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="document-text" size={26} color="#1a1a1a" />
                    </View>
                    <View style={styles.heroText}>
                        <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
                            Repairo Moto Legal
                        </Text>
                        <Text style={[styles.heroSub, { color: theme.colors.textMuted }]}>
                            Please read these terms carefully before using our mechanic booking service.
                        </Text>
                    </View>
                </View>

                {/* ── Meta Row ── */}
                <View style={styles.metaRow}>
                    <View style={styles.metaPill}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
                        <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                            Updated: 1 April 2026
                        </Text>
                    </View>
                    <View style={styles.metaPill}>
                        <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
                        <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
                            Jurisdiction: Patna, Bihar
                        </Text>
                    </View>
                </View>

                {/* ── Tab Switch ── */}
                <View style={[styles.tabBar, { backgroundColor: theme.colors.surfaceLow, borderColor: theme.colors.border }]}>
                    {[
                        { key: 'terms', label: 'Terms & Conditions', icon: 'document-text-outline' },
                        { key: 'faq', label: 'FAQs', icon: 'help-circle-outline' },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            activeOpacity={0.78}
                            style={[
                                styles.tabItem,
                                activeTab === tab.key && {
                                    backgroundColor: theme.colors.primary,
                                    borderRadius: 12,
                                },
                            ]}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={14}
                                color={activeTab === tab.key ? '#1a1a1a' : theme.colors.textMuted}
                            />
                            <Text
                                style={[
                                    styles.tabLabel,
                                    {
                                        color: activeTab === tab.key ? '#1a1a1a' : theme.colors.textMuted,
                                        fontWeight: activeTab === tab.key ? '700' : '500',
                                    },
                                ]}
                            >
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Terms Sections ── */}
                {activeTab === 'terms' && (
                    <View style={styles.sectionList}>
                        {SECTIONS.map((section, i) => (
                            <SectionCard
                                key={section.id}
                                section={section}
                                theme={theme}
                                isDark={isDark}
                                index={i}
                            />
                        ))}

                        {/* Agreement footer card */}
                        <View style={[styles.agreementCard, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0', borderColor: theme.colors.border }]}>
                            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                            <Text style={[styles.agreementText, { color: theme.colors.textSecondary }]}>
                                By using Repairo Moto, you confirm that you have read, understood, and agreed to all of the above terms and conditions.
                            </Text>
                        </View>

                        {/* Contact support */}
                        <View style={[styles.contactCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <Text style={[styles.contactTitle, { color: theme.colors.textPrimary }]}>
                                Questions about our terms?
                            </Text>
                            <Text style={[styles.contactSub, { color: theme.colors.textMuted }]}>
                                Reach us at
                            </Text>
                            <View style={styles.contactRow}>
                                <Ionicons name="mail-outline" size={14} color={theme.colors.primary} />
                                <Text style={[styles.contactEmail, { color: theme.colors.primary }]}>
                                    legal@repairomoto.in
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* ── FAQs ── */}
                {activeTab === 'faq' && (
                    <View style={styles.sectionList}>
                        <Text style={[styles.faqIntro, { color: theme.colors.textMuted }]}>
                            Answers to the most common questions from our riders.
                        </Text>
                        {FAQS.map((faq, i) => (
                            <FaqItem
                                key={i}
                                faq={faq}
                                theme={theme}
                                isDark={isDark}
                                index={i}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 40,
    },

    // Hero
    heroBanner: {
        margin: 16,
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    heroIconWrap: {
        width: 54,
        height: 54,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    heroText: { flex: 1 },
    heroTitle: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    heroSub: {
        fontSize: 12,
        lineHeight: 17,
        marginTop: 4,
    },

    // Meta
    metaRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    metaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        letterSpacing: 0.1,
    },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 14,
        borderWidth: 1,
        padding: 4,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 9,
        paddingHorizontal: 8,
    },
    tabLabel: {
        fontSize: 12,
        letterSpacing: 0.1,
    },

    // Section list
    sectionList: {
        paddingHorizontal: 16,
        gap: 10,
    },

    // Section card
    sectionCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 14,
        gap: 10,
    },
    sectionIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sectionTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.1,
    },
    sectionBody: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 10,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    bulletDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
        flexShrink: 0,
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 20,
    },

    // Agreement card
    agreementCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginTop: 4,
    },
    agreementText: {
        flex: 1,
        fontSize: 12.5,
        lineHeight: 19,
        fontStyle: 'italic',
    },

    // Contact card
    contactCard: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 16,
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    contactTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    contactSub: {
        fontSize: 12,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 4,
    },
    contactEmail: {
        fontSize: 13,
        fontWeight: '600',
    },

    // FAQ
    faqIntro: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 4,
    },
    faqCard: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 13,
        gap: 10,
    },
    faqQ: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    qBadge: {
        width: 22,
        height: 22,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    qBadgeText: {
        fontSize: 11,
        fontWeight: '900',
    },
    faqQuestion: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '600',
        lineHeight: 19,
    },
    faqBody: {
        paddingHorizontal: 13,
        paddingTop: 10,
        paddingBottom: 13,
    },
    faqAnswer: {
        fontSize: 13,
        lineHeight: 20,
    },
});