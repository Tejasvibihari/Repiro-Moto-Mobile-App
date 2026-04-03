import React, { useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LightTheme, DarkTheme } from "../../styles/Theme";
import { resetLocation } from "../../store/slices/locationSlice";

export default function NotServiceableScreen({ onRetry }) {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();

    // ── Safely read from Redux — default to "light" if slice doesn't exist yet
    const mode = useSelector((s) => s.theme?.mode ?? "light");
    const city = useSelector((s) => s.location?.city ?? null);

    const isDark = mode === "dark";
    const colors = isDark ? DarkTheme.colors : LightTheme.colors;

    // ── Contrast-safe text colors
    const subTextColor = isDark ? colors.textSecondary : colors.secondary;
    const cardTextColor = isDark ? colors.textSecondary : colors.textPrimary;
    const hintTextColor = isDark ? colors.textMuted : colors.textSecondary;

    // ── Animation refs — opacity starts at 1 as a safe fallback
    //    If the animation somehow doesn't fire, content is still visible.
    const scale = useRef(new Animated.Value(0.92)).current;
    const opacity = useRef(new Animated.Value(1)).current;   // ← changed from 0 → 1
    const iconBounce = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance: just scale up (opacity already 1, so content never hidden)
        Animated.spring(scale, {
            toValue: 1,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
        }).start(() => {
            // Icon bounce after entrance
            Animated.sequence([
                Animated.timing(iconBounce, { toValue: -12, duration: 300, useNativeDriver: true }),
                Animated.spring(iconBounce, { toValue: 0, friction: 5, tension: 80, useNativeDriver: true }),
            ]).start();
        });
    }, []);

    const handleRetry = () => {
        dispatch(resetLocation());
        onRetry?.();
    };

    return (
        <View
            style={[
                styles.root,
                {
                    backgroundColor: colors.background,
                    paddingTop: (insets?.top ?? 0) + 20,
                    paddingBottom: (insets?.bottom ?? 0) + 20,
                },
            ]}
        >
            <Animated.View
                style={[
                    styles.content,
                    { opacity, transform: [{ scale }] },
                ]}
            >
                {/* Icon badge */}
                <Animated.View
                    style={[
                        styles.iconBadge,
                        {
                            backgroundColor: isDark ? "#271F00" : "#FFFBEC",
                            borderColor: colors.primary,
                            transform: [{ translateY: iconBounce }],
                        },
                    ]}
                >
                    <Ionicons name="location-outline" size={52} color={colors.primary} />
                </Animated.View>

                {/* Heading */}
                <Text style={[styles.heading, { color: colors.textPrimary }]}>
                    Not Available Yet
                </Text>

                {/* Sub */}
                <Text style={[styles.sub, { color: subTextColor }]}>
                    {city
                        ? `Repairo Moto is not yet available in ${city}.`
                        : "Repairo Moto is not yet available in your area."}
                    {"\n"}We're expanding fast — stay tuned!
                </Text>

                {/* Info card */}
                {/* <View
                    style={[
                        styles.infoCard,
                        {
                            backgroundColor: isDark ? colors.surfaceLow : colors.surfaceHigh,
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <InfoRow
                        icon="construct-outline"
                        text="Expert doorstep bike service"
                        primaryColor={colors.primary}
                        textColor={cardTextColor}
                    />
                    <InfoRow
                        icon="shield-checkmark-outline"
                        text="Certified mechanics, genuine parts"
                        primaryColor={colors.primary}
                        textColor={cardTextColor}
                    />
                    <InfoRow
                        icon="location-outline"
                        text="Launching in new cities soon"
                        primaryColor={colors.primary}
                        textColor={cardTextColor}
                    />
                </View> */}

                {/* Retry button */}
                <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                    onPress={handleRetry}
                    activeOpacity={0.8}
                >
                    <Ionicons name="refresh-outline" size={18} color="#1a1a1a" />
                    <Text style={styles.retryLabel}>Try Again</Text>
                </TouchableOpacity>

                {/* Hint */}
                <Text style={[styles.hint, { color: hintTextColor }]}>
                    Moved? Tap "Try Again" to recheck your location.
                </Text>
            </Animated.View>
        </View>
    );
}

function InfoRow({ icon, text, primaryColor, textColor }) {
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon} size={16} color={primaryColor} />
            <Text style={[styles.infoText, { color: textColor }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, alignItems: "center", justifyContent: "center" },
    content: { alignItems: "center", paddingHorizontal: 28 },
    iconBadge: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 28,
    },
    heading: {
        fontSize: 26,
        fontWeight: "800",
        letterSpacing: 0.2,
        textAlign: "center",
        marginBottom: 12,
    },
    sub: {
        fontSize: 15,
        lineHeight: 24,
        textAlign: "center",
        letterSpacing: 0.1,
        marginBottom: 28,
    },
    infoCard: {
        width: "100%",
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        gap: 14,
        marginBottom: 28,
    },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    infoText: { fontSize: 14, fontWeight: "500", flex: 1 },
    retryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 50,
        marginBottom: 14,
    },
    retryLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", letterSpacing: 0.2 },
    hint: { fontSize: 12, textAlign: "center", letterSpacing: 0.1 },
});