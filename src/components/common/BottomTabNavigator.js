import React, { useRef, useEffect } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { LightTheme, DarkTheme } from "../../styles/Theme";

// ── Screens (replace with your actual screens) ───────────────────────────────
import DashboardScreen from "../../screens/dashboard/DashboardScreen";
import OrdersScreen from "../../screens/order/OrderScreen";
import WalletScreen from "../../screens/wallet/WalletScreen";
import ProfileScreen from "../../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────────────────────
//  TAB CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
    {
        name: "Home",
        label: "HOME",
        screen: DashboardScreen,
        icon: "home",
        iconActive: "home",
    },
    {
        name: "Orders",
        label: "ORDERS",
        screen: OrdersScreen,
        icon: "construct-outline",
        iconActive: "construct",
    },
    {
        name: "Wallet",
        label: "WALLET",
        screen: WalletScreen,
        icon: "wallet-outline",
        iconActive: "wallet",
    },
    {
        name: "Profile",
        label: "PROFILE",
        screen: ProfileScreen,
        icon: "person-outline",
        iconActive: "person",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
//  SINGLE TAB ITEM
// ─────────────────────────────────────────────────────────────────────────────
const TabItem = ({ tab, isActive, onPress, theme }) => {
    const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.9)).current;
    const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.45)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: isActive ? 1 : 0.9,
                speed: 28,
                bounciness: 6,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: isActive ? 1 : 0.45,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isActive]);

    const iconColor = isActive ? theme.colors.primary : theme.colors.textMuted;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={tabStyles.item}
        >
            <Animated.View
                style={[
                    tabStyles.iconWrap,
                    { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
                ]}
            >
                <Ionicons
                    name={isActive ? tab.iconActive : tab.icon}
                    size={22}
                    color={iconColor}
                />
            </Animated.View>

            <Text
                style={[
                    tabStyles.label,
                    {
                        color: isActive ? theme.colors.primary : theme.colors.textMuted,
                        fontWeight: isActive ? "700" : "500",
                    },
                ]}
            >
                {tab.label}
            </Text>
        </TouchableOpacity>
    );
};

const tabStyles = StyleSheet.create({
    item: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 5,
    },
    iconWrap: {
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontSize: 9.5,
        letterSpacing: 0.8,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
//  CUSTOM TAB BAR (fully dynamic theme)
// ─────────────────────────────────────────────────────────────────────────────
const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;

    // Use theme colors for bar background, border, and shadow
    const barBackgroundColor = theme.colors.surfaceLow;   // Light: #FFF4E0, Dark: #231E14
    const barBorderColor = theme.colors.border;
    const barShadowColor = theme.colors.primary;          // amber glow

    return (
        <View
            style={[
                barStyles.wrapper,
                { paddingBottom: insets.bottom  > 0 ? insets.bottom + 12 : 12 },
            ]}
        >
            <View
                style={[
                    barStyles.bar,
                    {
                        backgroundColor: barBackgroundColor,
                        borderColor: barBorderColor,
                        shadowColor: barShadowColor,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: mode === "dark" ? 0.22 : 0.18,
                        shadowRadius: 24,
                        elevation: 18,
                    },
                ]}
            >
                {state.routes.map((route, index) => {
                    const isActive = state.index === index;
                    const tab = TABS[index];

                    return (
                        <TabItem
                            key={route.key}
                            tab={tab}
                            isActive={isActive}
                            theme={theme}
                            onPress={() => {
                                const event = navigation.emit({
                                    type: "tabPress",
                                    target: route.key,
                                    canPreventDefault: true,
                                });
                                if (!isActive && !event.defaultPrevented) {
                                    navigation.navigate(route.name);
                                }
                            }}
                        />
                    );
                })}
            </View>
        </View>
    );
};

const barStyles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 0,
        backgroundColor: "transparent",
    },
    bar: {
        flexDirection: "row",
        borderRadius: 24,
        borderWidth: 1,
        overflow: "hidden",
        paddingTop: 4,
    },
});

// ─────────────────────────────────────────────────────────────────────────────
//  BOTTOM TAB NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────
export default function BottomTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            {TABS.map((tab) => (
                <Tab.Screen
                    key={tab.name}
                    name={tab.name}
                    component={tab.screen}
                />
            ))}
        </Tab.Navigator>
    );
}