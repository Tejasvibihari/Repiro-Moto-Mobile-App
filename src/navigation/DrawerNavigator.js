// navigation/DrawerNavigator.js
// Wraps BottomTabNavigator inside a Drawer so the hamburger menu in TopBar works.
//
// Usage in AppNavigator — replace AppStack with this:
//   import DrawerNavigator from './DrawerNavigator';
//   function AppStack() {
//     return (
//       <Stack.Navigator screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="Main" component={DrawerNavigator} />
//       </Stack.Navigator>
//     );
//   }
//
// Dependencies:
//   npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Platform,
    Alert,
} from 'react-native';
import {
    createDrawerNavigator,
    DrawerContentScrollView,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../styles/Theme';
import { logout } from '../store/slices/authSlice';
import { getImageUrl } from '../utils/imageUtils';

// Screens
import BottomTabNavigator from '../components/common/BottomTabNavigator';
import MyOrdersScreen from '../screens/order/OrderScreen';
import WalletScreen from '../screens/wallet/WalletScreen';

import ReferEarnScreen from '../screens/refer/ReferEarnScreen';
import SupportScreen from '../screens/support/SupportScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import MyBikeScreen from '../screens/bikes/MyBikeScreen';

const Drawer = createDrawerNavigator();

// ─── Nav item config ──────────────────────────────────────────────────────────
const GROUP_1 = [
    { name: 'Home', label: 'Home', icon: 'home-outline', iconActive: 'home', lib: 'ion' },
    { name: 'MyOrders', label: 'My Orders', icon: 'construct-outline', iconActive: 'construct', lib: 'ion' },
    { name: 'Wallet', label: 'Wallet', icon: 'wallet-outline', iconActive: 'wallet', lib: 'ion' },
    { name: 'MyBikes', label: 'My Bikes', icon: 'bicycle', iconActive: 'bicycle', lib: 'mci' },
];

const GROUP_2 = [
    { name: 'ReferEarn', label: 'Refer & Earn', icon: 'gift-outline', iconActive: 'gift', lib: 'ion' },
    { name: 'Support', label: 'Support', icon: 'help-circle-outline', iconActive: 'help-circle', lib: 'ion' },
    { name: 'Settings', label: 'Settings', icon: 'settings-outline', iconActive: 'settings', lib: 'ion' },
];

// ─── Icon helper ──────────────────────────────────────────────────────────────
function NavIcon({ item, isActive, color, size = 20 }) {
    const name = isActive ? item.iconActive : item.icon;
    if (item.lib === 'mci') return <MaterialCommunityIcons name={name} size={size} color={color} />;
    return <Ionicons name={name} size={size} color={color} />;
}

// ─── Single nav row ───────────────────────────────────────────────────────────
function NavItem({ item, isActive, theme, isDark, onPress, delay }) {
    const translateX = useRef(new Animated.Value(-20)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, friction: 8, tension: 65, delay, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 280, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    const iconColor = isActive ? '#1a1a1a' : theme.colors.textSecondary;
    const labelColor = isActive ? '#1a1a1a' : theme.colors.textPrimary;

    return (
        <Animated.View style={{ transform: [{ translateX }], opacity }}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.75}
                style={[
                    navStyles.row,
                    isActive && { backgroundColor: theme.colors.primary, borderRadius: 14 },
                ]}
            >
                <View style={navStyles.iconSlot}>
                    <NavIcon item={item} isActive={isActive} color={iconColor} size={20} />
                </View>
                <Text style={[navStyles.label, { color: labelColor, fontWeight: isActive ? '700' : '500' }]}>
                    {item.label}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const navStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 14,
        gap: 14,
        marginBottom: 2,
    },
    iconSlot: {
        width: 24,
        alignItems: 'center',
    },
    label: {
        fontSize: 15,
        letterSpacing: 0.1,
    },
});

// ─── Custom Drawer Content ────────────────────────────────────────────────────
function CustomDrawerContent(props) {
    const { state, navigation } = props;
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const mode = useSelector((s) => s.theme.mode);
    const user = useSelector((s) => s.auth.user);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const activeRouteName = state.routes[state.index]?.name ?? 'Home';

    // Entrance animations
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const headerTransY = useRef(new Animated.Value(-12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.spring(headerTransY, { toValue: 0, friction: 8, tension: 55, delay: 60, useNativeDriver: true }),
        ]).start();
    }, []);

    const avatarSource = user?.profileImage ? { uri: getImageUrl(user.profileImage) } : null;
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Alex Sterling';
    const memberTag = user?.memberTag ?? 'Gold Member';
    const tagline = user?.tagline ?? 'Precision Atelier Enthusiast';

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
        ]);
    };

    const navigate = (name) => {
        navigation.closeDrawer();
        // 'Home' routes to the BottomTab root
        if (name === 'Home') {
            navigation.navigate('Home');
        } else {
            navigation.navigate(name);
        }
    };

    const s = drawerStyles(theme, isDark, insets);

    return (
        <View style={s.root}>
            {/* ── Brand ───────────────────────────────────────── */}
            <Animated.View style={[s.brand, { opacity: logoOpacity }]}>
                <Text style={[s.brandText, { color: theme.colors.textPrimary }]}>REPAIRO MOTO</Text>
            </Animated.View>

            {/* ── User card ────────────────────────────────────── */}
            <Animated.View
                style={[
                    s.userCard,
                    { borderColor: theme.colors.border, transform: [{ translateY: headerTransY }], opacity: logoOpacity },
                ]}
            >
                {/* Avatar */}
                <View style={s.avatarWrap}>
                    {avatarSource ? (
                        <Image source={avatarSource} style={s.avatarImg} />
                    ) : (
                        <View style={[s.avatarFallback, { backgroundColor: isDark ? '#2E2618' : '#FDECC8' }]}>
                            <Ionicons name="person" size={22} color={theme.colors.primary} />
                        </View>
                    )}
                    {/* Gold badge dot */}
                    <View style={[s.badgeDot, { backgroundColor: theme.colors.primary }]}>
                        <Ionicons name="checkmark" size={8} color="#1a1a1a" />
                    </View>
                </View>

                {/* Info */}
                <View style={s.userInfo}>
                    <Text style={[s.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {fullName}
                    </Text>
                    <Text style={[s.memberTag, { color: theme.colors.primary }]}>{memberTag}</Text>
                    <Text style={[s.tagline, { color: theme.colors.textMuted }]} numberOfLines={1}>
                        {tagline}
                    </Text>
                </View>
            </Animated.View>

            {/* ── Scrollable nav ───────────────────────────────── */}
            <DrawerContentScrollView
                {...props}
                scrollEnabled={false}
                contentContainerStyle={s.navContainer}
            >
                {/* Group 1 */}
                <View style={s.navGroup}>
                    {GROUP_1.map((item, i) => (
                        <NavItem
                            key={item.name}
                            item={item}
                            isActive={activeRouteName === item.name}
                            theme={theme}
                            isDark={isDark}
                            onPress={() => navigate(item.name)}
                            delay={100 + i * 50}
                        />
                    ))}
                </View>

                {/* Divider */}
                <View style={[s.divider, { backgroundColor: theme.colors.border }]} />

                {/* Group 2 */}
                <View style={s.navGroup}>
                    {GROUP_2.map((item, i) => (
                        <NavItem
                            key={item.name}
                            item={item}
                            isActive={activeRouteName === item.name}
                            theme={theme}
                            isDark={isDark}
                            onPress={() => navigate(item.name)}
                            delay={320 + i * 50}
                        />
                    ))}
                </View>
            </DrawerContentScrollView>

            {/* ── Logout ──────────────────────────────────────── */}
            <TouchableOpacity
                style={[s.logoutRow, { borderTopColor: theme.colors.border }]}
                onPress={handleLogout}
                activeOpacity={0.75}
            >
                <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                <Text style={s.logoutLabel}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── Drawer styles ────────────────────────────────────────────────────────────
const AVATAR_SIZE = 46;

function drawerStyles(theme, isDark, insets) {
    return StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: theme.colors.background,
            paddingTop: insets.top > 0 ? insets.top : Platform.OS === 'ios' ? 50 : 28,
        },

        // Brand
        brand: {
            paddingHorizontal: 20,
            paddingBottom: 16,
        },
        brandText: {
            fontSize: 13,
            fontWeight: '900',
            letterSpacing: 3,
        },

        // User card
        userCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginHorizontal: 14,
            marginBottom: 22,
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
        },
        avatarWrap: {
            position: 'relative',
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
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
        badgeDot: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 16,
            height: 16,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: theme.colors.background,
        },
        userInfo: {
            flex: 1,
            gap: 2,
        },
        userName: {
            fontSize: 15,
            fontWeight: '800',
            letterSpacing: 0.1,
        },
        memberTag: {
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 0.2,
        },
        tagline: {
            fontSize: 11,
            letterSpacing: 0.1,
        },

        // Nav
        navContainer: {
            paddingHorizontal: 10,
            paddingTop: 0,
            gap: 0,
        },
        navGroup: {
            gap: 0,
        },
        divider: {
            height: StyleSheet.hairlineWidth,
            marginHorizontal: 14,
            marginVertical: 14,
        },

        // Logout
        logoutRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 24,
            paddingVertical: 20,
            borderTopWidth: StyleSheet.hairlineWidth,
            marginBottom: insets.bottom > 0 ? insets.bottom : 12,
        },
        logoutLabel: {
            fontSize: 15,
            fontWeight: '700',
            color: '#FF6B6B',
            letterSpacing: 0.1,
        },
    });
}

// ─── Drawer Navigator ─────────────────────────────────────────────────────────
export default function DrawerNavigator() {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerType: 'slide',           // pushes content — feels premium
                drawerPosition: 'left',
                drawerStyle: {
                    width: '78%',
                    backgroundColor: theme.colors.background,
                    borderRightWidth: 0,
                    // Subtle shadow on the drawer panel
                    ...Platform.select({
                        ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: 4, height: 0 },
                            shadowOpacity: isDark ? 0.45 : 0.18,
                            shadowRadius: 24,
                        },
                        android: { elevation: 16 },
                    }),
                },
                overlayColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)',
                swipeEdgeWidth: 60,
            }}
        >
            {/* Root tab screen */}
            <Drawer.Screen name="Home" component={BottomTabNavigator} />

            {/* Full-screen drawer destinations */}
            <Drawer.Screen name="MyOrders" component={MyOrdersScreen} />
            <Drawer.Screen name="Wallet" component={WalletScreen} />
            <Drawer.Screen name="MyBikes" component={MyBikeScreen} />
            <Drawer.Screen name="ReferEarn" component={ReferEarnScreen} />
            <Drawer.Screen name="Support" component={SupportScreen} />
            <Drawer.Screen name="Settings" component={SettingsScreen} />
        </Drawer.Navigator>
    );
}