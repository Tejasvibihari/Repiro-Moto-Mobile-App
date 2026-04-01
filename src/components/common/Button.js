import React, { useRef } from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    Animated,
    View,
} from "react-native";
import { useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "../../styles/Theme";

// Using @expo/vector-icons / react-native-vector-icons (Ionicons) — works on both iOS & Android
// Install: expo install @expo/vector-icons  OR  npm install react-native-vector-icons
import { Ionicons } from "@expo/vector-icons";

/**
 * Button variants: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success"
 * sizes:          "sm" | "md" | "lg"
 * iconPosition:   "left" | "right"
 */
const Button = ({
    label,
    onPress,
    variant = "primary",
    size = "md",
    iconName,          // Ionicons name e.g. "checkmark-circle", "arrow-forward"
    iconPosition = "left",
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
    labelStyle,
}) => {
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.96,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 30,
            bounciness: 6,
        }).start();
    };

    const sizeMap = {
        sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, iconSize: 15, borderRadius: 10 },
        md: { paddingVertical: 13, paddingHorizontal: 22, fontSize: 15, iconSize: 18, borderRadius: 14 },
        lg: { paddingVertical: 17, paddingHorizontal: 28, fontSize: 17, iconSize: 21, borderRadius: 16 },
    };

    const s = sizeMap[size] || sizeMap.md;

    const variantStyles = {
        primary: {
            background: theme.colors.primary,
            border: theme.colors.primary,
            text: "#1a1a1a",
            iconColor: "#1a1a1a",
        },
        secondary: {
            background: theme.colors.surface,
            border: theme.colors.border,
            text: theme.colors.textPrimary,
            iconColor: theme.colors.primary,
        },
        outline: {
            background: "transparent",
            border: theme.colors.primary,
            text: theme.colors.primary,
            iconColor: theme.colors.primary,
        },
        ghost: {
            background: "transparent",
            border: "transparent",
            text: theme.colors.primary,
            iconColor: theme.colors.primary,
        },
        danger: {
            background: theme.colors.error,
            border: theme.colors.error,
            text: "#fff",
            iconColor: "#fff",
        },
        success: {
            background: theme.colors.success,
            border: theme.colors.success,
            text: "#fff",
            iconColor: "#fff",
        },
    };

    const v = variantStyles[variant] || variantStyles.primary;
    const isDisabled = disabled || loading;

    return (
        <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { width: "100%" }]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
                activeOpacity={1}
                style={[
                    styles.base,
                    {
                        backgroundColor: v.background,
                        borderColor: v.border,
                        borderRadius: s.borderRadius,
                        paddingVertical: s.paddingVertical,
                        paddingHorizontal: s.paddingHorizontal,
                        opacity: isDisabled ? 0.48 : 1,
                    },
                    fullWidth && { width: "100%" },
                    style,
                ]}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={v.text} />
                ) : (
                    <View style={styles.content}>
                        {iconName && iconPosition === "left" && (
                            <Ionicons
                                name={iconName}
                                size={s.iconSize}
                                color={v.iconColor}
                                style={{ marginRight: label ? 7 : 0 }}
                            />
                        )}
                        {label ? (
                            <Text
                                style={[
                                    styles.label,
                                    { color: v.text, fontSize: s.fontSize },
                                    labelStyle,
                                ]}
                            >
                                {label}
                            </Text>
                        ) : null}
                        {iconName && iconPosition === "right" && (
                            <Ionicons
                                name={iconName}
                                size={s.iconSize}
                                color={v.iconColor}
                                style={{ marginLeft: label ? 7 : 0 }}
                            />
                        )}
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    base: {
        borderWidth: 1.5,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontWeight: "600",
        letterSpacing: 0.2,
    },
});

export default Button;