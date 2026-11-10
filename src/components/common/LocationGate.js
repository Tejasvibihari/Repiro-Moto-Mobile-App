import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, AppState, Linking } from "react-native";
import * as Location from "expo-location";
import { useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "../../styles/Theme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocationCheck } from "../../hooks/useLocationCheck";
import Loader from "./Loader";
import NotServiceableScreen from "../../screens/location/NotServiceableScreen";

export default function LocationGate({ children }) {
    const { status, retry } = useLocationCheck();
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;
    const insets = useSafeAreaInsets();
    const waitingForSettings = useRef(false);

    // "Grant & Retry":
    //  - permission can still be asked  -> show the system dialog (via retry)
    //  - permission permanently denied  -> the OS will not show a dialog any
    //    more, so open the app's Settings page instead
    const handleGrantAndRetry = useCallback(async () => {
        try {
            const perm = await Location.getForegroundPermissionsAsync();
            if (perm.status !== "granted" && perm.canAskAgain === false) {
                waitingForSettings.current = true;
                await Linking.openSettings();
                return;
            }
        } catch (e) {
            // fall through to a normal retry
        }
        retry();
    }, [retry]);

    // When the user returns from Settings, re-check automatically.
    useEffect(() => {
        const sub = AppState.addEventListener("change", (next) => {
            if (next === "active" && waitingForSettings.current) {
                waitingForSettings.current = false;
                retry();
            }
        });
        return () => sub.remove();
    }, [retry]);

    if (status === "idle" || status === "checking") {
        return (
            <Loader
                visible={true}
                variant="overlay"
                message="Checking your area..."
            />
        );
    }

    if (status === "not_serviceable") {
        return <NotServiceableScreen onRetry={retry} />;
    }

    if (status === "error") {
        // Permission denied or network failure — show a friendly prompt
        return (
            <View
                style={[
                    styles.errorRoot,
                    {
                        backgroundColor: theme.colors.background,
                        paddingTop: insets.top + 20,
                        paddingBottom: insets.bottom + 20,
                    },
                ]}
            >
                <Ionicons name="location-outline" size={52} color={theme.colors.textMuted} />
                <Text style={[styles.errorHeading, { color: theme.colors.textPrimary }]}>
                    Location Access Needed
                </Text>
                <Text style={[styles.errorSub, { color: theme.colors.textSecondary }]}>
                    Please allow location permission so we can check if your area is serviceable. If the permission dialog doesn't appear, we'll open Settings so you can enable it.
                </Text>
                <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={handleGrantAndRetry}
                    activeOpacity={0.8}
                >
                    <Ionicons name="refresh-outline" size={18} color="#1a1a1a" />
                    <Text style={styles.retryLabel}>Grant & Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // status === "serviceable" → render the app
    return children;
}

const styles = StyleSheet.create({
    errorRoot: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        gap: 16,
    },
    errorHeading: { fontSize: 22, fontWeight: "800", textAlign: "center" },
    errorSub: { fontSize: 14, lineHeight: 22, textAlign: "center" },
    retryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 50,
        marginTop: 8,
    },
    retryLabel: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
});