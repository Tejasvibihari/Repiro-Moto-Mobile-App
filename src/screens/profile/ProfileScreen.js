import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Animated,
    Platform,
    Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import { logout } from '../../store/slices/authSlice';
import TabScreenWrapper from '../../components/common/TabScreenWrapper';
import { getImageUrl } from '../../utils/imageUtils';
import StatCard from '../../components/profile/StatCard';
import MenuItem from '../../components/profile/MenuItem';
import Loader from '../../components/common/Loader';
import { useFetchUserProfile } from '../../hooks/useFetchUserProfile'; // import custom hook

// ─── Menu items config ────────────────────────────────────────────────────────
const MENU_ITEMS = [
    {
        id: 'bikes',
        label: 'My Bikes',
        icon: 'bicycle',
        iconLib: 'material',
        route: 'MyBikes',
    },
    {
        id: 'orders',
        label: 'My Orders',
        icon: 'tools',
        iconLib: 'material',
        route: 'Orders',
    },
    {
        id: 'address',
        label: 'Address',
        icon: 'map-marker',
        iconLib: 'material',
        route: 'Address',
    },
    {
        id: 'settings',
        label: 'Settings',
        icon: 'cog',
        iconLib: 'material',
        route: 'Settings',
    },
];

// ─── Main ProfileScreen ───────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
    const dispatch = useDispatch();
    const userId = useSelector((state) => state.auth.user?._id);
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const user = useSelector((state) => state.user.user);
    const totalBikes = useSelector((state) => state.user.totalBikes);
    const totalOrders = useSelector((state) => state.user.totalOrders);
    console.log('User data in ProfileScreen:', { user, totalBikes, totalOrders });
    // Use the custom hook to fetch profile data
    const { loading, error } = useFetchUserProfile(userId);

    // Header animations
    const avatarScale = useRef(new Animated.Value(0.6)).current;
    const avatarOpacity = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const headerTransY = useRef(new Animated.Value(16)).current;
    const ctaScale = useRef(new Animated.Value(0.95)).current;

    // Start animations when user data is loaded
    useEffect(() => {
        if (!loading && user) {
            Animated.parallel([
                Animated.spring(avatarScale, { toValue: 1, friction: 6, tension: 65, useNativeDriver: true }),
                Animated.timing(avatarOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(headerOpacity, { toValue: 1, duration: 450, delay: 100, useNativeDriver: true }),
                Animated.spring(headerTransY, { toValue: 0, friction: 8, tension: 60, delay: 100, useNativeDriver: true }),
                Animated.spring(ctaScale, { toValue: 1, friction: 7, tension: 60, delay: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [loading, user]);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: () => dispatch(logout()),
                },
            ]
        );
    };

    const handleNavigate = (route) => {
        navigation?.navigate?.(route);
    };

    const handleEditProfile = () => {
        navigation?.navigate?.('EditProfile');
    };

    const avatarSource = user?.profileImage
        ? { uri: getImageUrl(user.profileImage) }
        : null;

    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Rider One';
    const email = user?.email || 'rider@repairomoto.com';
    const phone = user?.phone || '';

    const s = makeStyles(theme, isDark);

    // Show loader while fetching
    if (loading) {
        return (
            <TabScreenWrapper navigation={navigation} showMenuIcon={true}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Loader variant="inline" message="Loading profile..." />
                </View>
            </TabScreenWrapper>
        );
    }

    // Optionally show an error screen if error occurred
    if (error) {
        return (
            <TabScreenWrapper navigation={navigation} showMenuIcon={true}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.error, marginBottom: 12 }}>
                        Failed to load profile. Please try again.
                    </Text>
                    <TouchableOpacity
                        onPress={() => refetch()}
                        style={{ backgroundColor: theme.colors.primary, padding: 10, borderRadius: 8 }}
                    >
                        <Text style={{ color: '#fff' }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </TabScreenWrapper>
        );
    }

    return (
        <TabScreenWrapper navigation={navigation} showMenuIcon={true}>
            <ScrollView
                style={s.root}
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
                bounces={Platform.OS === 'ios'}
            >
                {/* ── Avatar + Name ─────────────────────────────────────── */}
                <View style={s.heroSection}>
                    {/* Avatar */}
                    <Animated.View
                        style={[
                            s.avatarWrap,
                            { transform: [{ scale: avatarScale }], opacity: avatarOpacity },
                        ]}
                    >
                        {avatarSource ? (
                            <Image source={avatarSource} style={s.avatarImg} />
                        ) : (
                            <View style={[s.avatarFallback, { backgroundColor: isDark ? '#2E2618' : '#FDECC8' }]}>
                                <Ionicons name="person" size={46} color={theme.colors.primary} />
                            </View>
                        )}
                        {/* Edit badge */}
                        <TouchableOpacity
                            style={[s.editBadge, { backgroundColor: theme.colors.primary }]}
                            onPress={handleEditProfile}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="pencil" size={11} color="#1a1a1a" />
                        </TouchableOpacity>
                        {/* Ring */}
                        <View style={[s.avatarRing, { borderColor: theme.colors.primary }]} />
                    </Animated.View>

                    {/* Name / email / phone */}
                    <Animated.View
                        style={[
                            s.nameBlock,
                            { opacity: headerOpacity, transform: [{ translateY: headerTransY }] },
                        ]}
                    >
                        <Text style={[s.name, { color: theme.colors.textPrimary }]}>{fullName}</Text>
                        <Text style={[s.email, { color: theme.colors.textMuted }]}>{email}</Text>
                        {!!phone && (
                            <Text style={[s.phone, { color: theme.colors.textMuted }]}>{phone}</Text>
                        )}
                    </Animated.View>

                    {/* Edit Profile CTA */}
                    <Animated.View style={[s.ctaWrap, { transform: [{ scale: ctaScale }] }]}>
                        <TouchableOpacity
                            style={[s.ctaBtn, { backgroundColor: theme.colors.primary }]}
                            onPress={handleEditProfile}
                            activeOpacity={0.85}
                        >
                            <Text style={s.ctaText}>EDIT PROFILE</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* ── Stats ─────────────────────────────────────────────── */}
                <View style={s.statsRow}>
                    <StatCard
                        icon="bicycle"
                        label="Active Bikes"
                        value={String(totalBikes ?? '0')}
                        theme={theme}
                        isDark={isDark}
                        delay={200}
                    />
                    <StatCard
                        icon="tools"
                        label="Total Services"
                        value={String(totalOrders ?? '0')}
                        theme={theme}
                        isDark={isDark}
                        delay={280}
                    />
                </View>

                {/* ── Menu Items ────────────────────────────────────────── */}
                <View style={s.menuSection}>
                    {MENU_ITEMS.map((item, index) => (
                        <MenuItem
                            key={item.id}
                            item={item}
                            theme={theme}
                            isDark={isDark}
                            onPress={handleNavigate}
                            delay={300 + index * 60}
                        />
                    ))}
                </View>

                {/* ── Logout ────────────────────────────────────────────── */}
                <View style={s.logoutSection}>
                    <TouchableOpacity
                        style={[s.logoutRow, { borderColor: 'rgba(255,107,107,0.25)', backgroundColor: isDark ? '#1E1A12' : '#FFF5F5' }]}
                        onPress={handleLogout}
                        activeOpacity={0.75}
                    >
                        <View style={[s.logoutIconWrap, { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
                            <Ionicons name="log-out-outline" size={19} color="#FF6B6B" />
                        </View>
                        <Text style={s.logoutLabel}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Footer ───────────────────────────────────────────── */}
                <View style={s.footer}>
                    <Text style={[s.footerTagline, { color: theme.colors.textMuted }]}>
                        PRECISION CRAFTED EXPERIENCE
                    </Text>
                    <Text style={[s.footerVersion, { color: theme.colors.textMuted }]}>
                        v1.0.0 · Repairo Moto
                    </Text>
                </View>
            </ScrollView>
        </TabScreenWrapper>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const AVATAR_SIZE = 100;
const RING_OFFSET = 7;

function makeStyles(theme, isDark) {
    return StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        scroll: {
            paddingHorizontal: 20,
            paddingBottom: 40,
            gap: 20,
        },

        // Hero
        heroSection: {
            alignItems: 'center',
            paddingTop: 28,
            gap: 14,
        },
        avatarWrap: {
            position: 'relative',
            width: AVATAR_SIZE + RING_OFFSET * 2,
            height: AVATAR_SIZE + RING_OFFSET * 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarImg: {
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
        },
        avatarFallback: {
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarRing: {
            position: 'absolute',
            top: 0, left: 0,
            width: AVATAR_SIZE + RING_OFFSET * 2,
            height: AVATAR_SIZE + RING_OFFSET * 2,
            borderRadius: (AVATAR_SIZE + RING_OFFSET * 2) / 2,
            borderWidth: 2.5,
        },
        editBadge: {
            position: 'absolute',
            bottom: RING_OFFSET + 2,
            right: RING_OFFSET + 2,
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: isDark ? '#1C1610' : '#FFF8EC',
            zIndex: 10,
        },
        nameBlock: {
            alignItems: 'center',
            gap: 4,
        },
        name: {
            fontSize: 22,
            fontWeight: '800',
            letterSpacing: 0.2,
        },
        email: {
            fontSize: 13,
            letterSpacing: 0.1,
        },
        phone: {
            fontSize: 13,
            letterSpacing: 0.5,
        },

        // CTA
        ctaWrap: {
            width: '100%',
            marginTop: 4,
        },
        ctaBtn: {
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        ctaText: {
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: 2.2,
            color: '#1a1a1a',
        },

        // Stats
        statsRow: {
            flexDirection: 'row',
            gap: 14,
        },

        // Menu
        menuSection: {
            gap: 10,
        },

        // Logout
        logoutSection: {
            marginTop: 4,
            marginBottom: 12,
        },
        logoutRow: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 16,
            borderWidth: 1,
            paddingHorizontal: 16,
            paddingVertical: 15,
            gap: 14,
        },
        logoutIconWrap: {
            width: 38,
            height: 38,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
        },
        logoutLabel: {
            flex: 1,
            fontSize: 15,
            fontWeight: '600',
            color: '#FF6B6B',
            letterSpacing: 0.1,
        },

        // Footer
        footer: {
            alignItems: 'center',
            gap: 4,
            paddingTop: 8,
            paddingBottom: 12,
        },
        footerTagline: {
            fontSize: 9,
            fontWeight: '700',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
            opacity: 0.5,
        },
        footerVersion: {
            fontSize: 11,
            letterSpacing: 0.3,
            opacity: 0.4,
        },
    });
}