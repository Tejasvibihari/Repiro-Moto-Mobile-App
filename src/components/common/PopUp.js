import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
    Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "../../styles/Theme";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";

const { width: SCREEN_W } = Dimensions.get("window");

/**
 * PopUp — animated modal dialog / confirmation sheet
 *
 * Props:
 *   visible         : boolean                    — controls modal visibility
 *   type            : "success"|"error"|"warning"|"info"|"confirm"  (default "info")
 *   title           : string                     — dialog heading
 *   message         : string                     — body text
 *   primaryLabel    : string                     — primary button text  (default "OK")
 *   secondaryLabel  : string                     — secondary button text (optional)
 *   onPrimary       : () => void                 — primary button callback
 *   onSecondary     : () => void                 — secondary button callback
 *   onClose         : () => void                 — backdrop / X close callback
 *   dismissOnBackdrop: boolean                   — tap backdrop to close (default true)
 *   showCloseIcon   : boolean                    — show X icon (default true)
 *   customIcon      : string (Ionicons name)     — override default icon
 *   primaryVariant  : Button variant             — (default derived from type)
 *   secondaryVariant: Button variant             — (default "outline")
 */

const POPUP_CONFIG = {
    success: {
        icon: "checkmark-circle",
        color: "#2ECC9A",
        lightIconBg: "#E9FBF4",
        darkIconBg: "#0E2A1F",
    },
    error: {
        icon: "close-circle",
        color: "#FF6B6B",
        lightIconBg: "#FFF0F0",
        darkIconBg: "#2A0E0E",
    },
    warning: {
        icon: "warning",
        color: "#e2a731",
        lightIconBg: "#FFFBEC",
        darkIconBg: "#271F00",
    },
    info: {
        icon: "information-circle",
        color: "#5B9CF6",
        lightIconBg: "#EFF6FF",
        darkIconBg: "#0A1929",
    },
    confirm: {
        icon: "help-circle",
        color: "#e2a731",
        lightIconBg: "#FFFBEC",
        darkIconBg: "#271F00",
    },
};

const PRIMARY_VARIANT_MAP = {
    success: "success",
    error: "danger",
    warning: "primary",
    info: "primary",
    confirm: "primary",
};

const PopUp = ({
    visible = false,
    type = "info",
    title,
    message,
    primaryLabel = "OK",
    secondaryLabel,
    onPrimary,
    onSecondary,
    onClose,
    dismissOnBackdrop = true,
    showCloseIcon = true,
    customIcon,
    primaryVariant,
    secondaryVariant = "outline",
}) => {
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;
    const isDark = mode === "dark";

    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const cfg = POPUP_CONFIG[type] || POPUP_CONFIG.info;
    const iconName = customIcon || cfg.icon;
    const iconBg = isDark ? cfg.darkIconBg : cfg.lightIconBg;
    const resolvedPrimaryVariant = primaryVariant || PRIMARY_VARIANT_MAP[type] || "primary";

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, speed: 22, bounciness: 7, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 0.92, duration: 160, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleBackdrop = () => {
        if (dismissOnBackdrop && onClose) onClose();
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleBackdrop}>
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropOpacity, backgroundColor: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.45)" },
                    ]}
                />
            </TouchableWithoutFeedback>

            {/* Dialog Card */}
            <View style={styles.centeredWrapper} pointerEvents="box-none">
                <Animated.View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                            ...Platform.select({
                                ios: {
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: isDark ? 0.3 : 0.2,
                                    shadowRadius: 24,
                                },
                                android: {
                                    elevation: 16,
                                },
                            }),
                        },
                    ]}
                >
                    {/* Close Icon */}
                    {showCloseIcon && onClose && (
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    )}

                    {/* Icon Badge */}
                    <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={42} color={cfg.color} />
                    </View>

                    {/* Title */}
                    {title && (
                        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                            {title}
                        </Text>
                    )}

                    {/* Message */}
                    {message && (
                        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
                            {message}
                        </Text>
                    )}

                    {/* Buttons */}
                    <View style={[styles.buttonRow, !secondaryLabel && styles.singleBtn]}>
                        {secondaryLabel && (
                            <View style={styles.btnWrap}>
                                <Button
                                    label={secondaryLabel}
                                    onPress={onSecondary || onClose}
                                    variant={secondaryVariant}
                                    size="md"
                                    fullWidth
                                />
                            </View>
                        )}
                        <View style={secondaryLabel ? styles.btnWrap : styles.singleBtnWrap}>
                            <Button
                                label={primaryLabel}
                                onPress={onPrimary || onClose}
                                variant={resolvedPrimaryVariant}
                                size="md"
                                fullWidth
                            />
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    centeredWrapper: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16, // Reduced from 24 to give more space
    },
    card: {
        width: "100%",
        maxWidth: 360,          // Increased from 340 to accommodate buttons
        borderRadius: 28,
        borderWidth: 1,
        paddingTop: 28,
        paddingBottom: 24,      // Increased bottom padding
        paddingHorizontal: 20,
        alignItems: "center",
    },
    closeBtn: {
        position: "absolute",
        top: 12,
        right: 12,
        padding: 6,
        zIndex: 1,
    },
    iconBadge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        letterSpacing: 0.2,
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
        letterSpacing: 0.1,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    singleBtn: {
        justifyContent: "center",
    },
    btnWrap: {
        flex: 1,
    },
    singleBtnWrap: {
        width: "100%",
    },
});

export default PopUp;