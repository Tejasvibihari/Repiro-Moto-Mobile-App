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
                            ...theme.shadow.soft,
                        },
                    ]}
                >
                    {/* Close Icon */}
                    {showCloseIcon && onClose && (
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={20} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    )}

                    {/* Icon Badge */}
                    <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
                        <Ionicons name={iconName} size={38} color={cfg.color} />
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

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    {/* Buttons */}
                    <View style={[styles.buttonRow, !secondaryLabel && styles.singleBtn]}>
                        {secondaryLabel && (
                            <Button
                                label={secondaryLabel}
                                onPress={onSecondary || onClose}
                                variant={secondaryVariant}
                                size="md"
                                fullWidth
                                style={styles.btnFlex}
                            />
                        )}
                        <Button
                            label={primaryLabel}
                            onPress={onPrimary || onClose}
                            variant={resolvedPrimaryVariant}
                            size="md"
                            fullWidth
                            style={styles.btnFlex}
                        />
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
        paddingHorizontal: 28,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        borderRadius: 24,
        borderWidth: 1.5,
        paddingTop: 32,
        paddingBottom: 24,
        paddingHorizontal: 24,
        alignItems: "center",
    },
    closeBtn: {
        position: "absolute",
        top: 16,
        right: 16,
        padding: 4,
    },
    iconBadge: {
        width: 76,
        height: 76,
        borderRadius: 38,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
        letterSpacing: 0.15,
        marginBottom: 10,
    },
    message: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
        letterSpacing: 0.05,
        marginBottom: 6,
    },
    divider: {
        width: "100%",
        height: 1,
        marginVertical: 20,
    },
    buttonRow: {
        flexDirection: "row",
        gap: 10,
        width: "100%",
    },
    singleBtn: {
        justifyContent: "center",
    },
    btnFlex: {
        flex: 1,
    },
});

export default PopUp;