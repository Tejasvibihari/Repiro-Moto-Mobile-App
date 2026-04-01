import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
} from "react-native";
import { useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "../../styles/Theme";
import { Ionicons } from "@expo/vector-icons";

/**
 * Alert — inline dismissable banner
 *
 * Props:
 *   type        : "success" | "error" | "warning" | "info"  (default "info")
 *   title       : string  (optional bold heading)
 *   message     : string  (required body text)
 *   visible     : boolean  (controls show/hide)
 *   onDismiss   : () => void  (optional close callback)
 *   autoDismiss : number ms   (optional — auto-hides after N ms)
 *   showIcon    : boolean  (default true)
 *   style       : ViewStyle override
 */
const ALERT_CONFIG = {
    success: {
        icon: "checkmark-circle",
        lightBg: "#E9FBF4",
        darkBg: "#0E2A1F",
        lightBorder: "#2ECC9A",
        darkBorder: "#2ECC9A",
        lightText: "#0D6B4A",
        darkText: "#2ECC9A",
        lightTitle: "#0A4A34",
        darkTitle: "#7EEFD1",
    },
    error: {
        icon: "close-circle",
        lightBg: "#FFF0F0",
        darkBg: "#2A0E0E",
        lightBorder: "#FF6B6B",
        darkBorder: "#FF6B6B",
        lightText: "#9B2020",
        darkText: "#FF9999",
        lightTitle: "#6B1515",
        darkTitle: "#FFB8B8",
    },
    warning: {
        icon: "warning",
        lightBg: "#FFFBEC",
        darkBg: "#271F00",
        lightBorder: "#e2a731",
        darkBorder: "#e2a731",
        lightText: "#7A5500",
        darkText: "#F0C060",
        lightTitle: "#543B00",
        darkTitle: "#F9D97A",
    },
    info: {
        icon: "information-circle",
        lightBg: "#EFF6FF",
        darkBg: "#0A1929",
        lightBorder: "#5B9CF6",
        darkBorder: "#5B9CF6",
        lightText: "#1E4D91",
        darkText: "#90BFFF",
        lightTitle: "#153470",
        darkTitle: "#BBDAFF",
    },
};

const Alert = ({
    type = "info",
    title,
    message,
    visible = true,
    onDismiss,
    autoDismiss,
    showIcon = true,
    style,
}) => {
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;
    const isDark = mode === "dark";

    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-8)).current;
    const timerRef = useRef(null);

    const cfg = ALERT_CONFIG[type] || ALERT_CONFIG.info;

    const bgColor = isDark ? cfg.darkBg : cfg.lightBg;
    const borderColor = isDark ? cfg.darkBorder : cfg.lightBorder;
    const textColor = isDark ? cfg.darkText : cfg.lightText;
    const titleColor = isDark ? cfg.darkTitle : cfg.lightTitle;

    const animateIn = () => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, speed: 20, bounciness: 5, useNativeDriver: true }),
        ]).start();
    };

    const animateOut = (cb) => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: -8, duration: 200, useNativeDriver: true }),
        ]).start(() => cb && cb());
    };

    useEffect(() => {
        if (visible) {
            animateIn();
            if (autoDismiss) {
                timerRef.current = setTimeout(() => {
                    animateOut(() => onDismiss && onDismiss());
                }, autoDismiss);
            }
        } else {
            animateOut();
        }
        return () => timerRef.current && clearTimeout(timerRef.current);
    }, [visible]);

    if (!visible && opacity._value === 0) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    transform: [{ translateY }],
                    opacity,
                },
                style,
            ]}
        >
            {showIcon && (
                <Ionicons
                    name={cfg.icon}
                    size={22}
                    color={borderColor}
                    style={styles.icon}
                />
            )}

            <View style={styles.textBlock}>
                {title ? (
                    <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
                ) : null}
                <Text style={[styles.message, { color: textColor }]}>{message}</Text>
            </View>

            {onDismiss && (
                <TouchableOpacity
                    onPress={() => animateOut(() => onDismiss())}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="close" size={18} color={textColor} />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-start",
        borderWidth: 1.5,
        borderRadius: 14,
        paddingVertical: 13,
        paddingHorizontal: 15,
        marginVertical: 6,
    },
    icon: {
        marginRight: 11,
        marginTop: 1,
    },
    textBlock: {
        flex: 1,
    },
    title: {
        fontWeight: "700",
        fontSize: 14,
        marginBottom: 3,
        letterSpacing: 0.1,
    },
    message: {
        fontSize: 13.5,
        lineHeight: 20,
        fontWeight: "400",
    },
});

export default Alert;