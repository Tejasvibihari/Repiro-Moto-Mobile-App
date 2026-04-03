import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Animated,
    Platform,
} from "react-native";
import { useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "../../styles/Theme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SelectionPopUp = ({
    visible = false,
    title = "Select Option",
    options = [],
    onClose,
    dismissOnBackdrop = true,
}) => {
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;
    const isDark = mode === "dark";
    const insets = useSafeAreaInsets();

    const slideAnim = useRef(new Animated.Value(450)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, speed: 20, bounciness: 6, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleBackdrop = () => {
        if (dismissOnBackdrop && onClose) onClose();
    };

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={handleBackdrop}>
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropOpacity, backgroundColor: isDark ? "rgba(0,0,0,0.72)" : "rgba(0,0,0,0.45)" },
                    ]}
                />
            </TouchableWithoutFeedback>

            {/* Bottom Sheet */}
            <View style={styles.bottomWrapper} pointerEvents="box-none">
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: theme.colors.surface,
                            transform: [{ translateY: slideAnim }],
                            paddingBottom: Math.max(insets.bottom + 16, 24),
                            ...Platform.select({
                                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: isDark ? 0.3 : 0.1, shadowRadius: 16 },
                                android: { elevation: 16 },
                            }),
                        },
                    ]}
                >
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.optionsList}>
                        {options.map((option, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.optionBtn,
                                    { borderBottomColor: theme.colors.border },
                                    index === options.length - 1 && { borderBottomWidth: 0 }
                                ]}
                                onPress={() => {
                                    onClose();
                                    setTimeout(() => option.onPress(), 200); // Wait for modal to partially close before triggering native picker
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}>
                                    <Ionicons name={option.icon} size={20} color={option.color || theme.colors.primary} />
                                </View>
                                <Text style={[styles.optionLabel, { color: option.color || theme.colors.textPrimary }]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
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
    bottomWrapper: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheet: {
        width: "100%",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingHorizontal: 20,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: "#E0E0E0",
        alignSelf: "center",
        marginBottom: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        letterSpacing: 0.3,
    },
    closeBtn: {
        padding: 4,
    },
    optionsList: {
        width: "100%",
    },
    optionBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: "600",
        flex: 1,
    },
});

export default SelectionPopUp;
