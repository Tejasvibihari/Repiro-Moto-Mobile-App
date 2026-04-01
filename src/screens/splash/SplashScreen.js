import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    Image,
    StyleSheet,
    Animated,
    StatusBar,
    useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "../../styles/Theme";

export default function SplashScreen({ onFinish }) {
    const { width, height } = useWindowDimensions();

    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;
    const isDark = mode === "dark";

    // Responsive scaling (reference width = 375)
    const scale = width / 375;
    const scaled = (size) => Math.min(size * scale, size * 1.5); // Cap at 150% to avoid huge sizes on tablets
    const fontScale = (size) => Math.min(size * scale, size * 1.3);

    // Dimensions based on screen width
    const logoSize = Math.min(width * 0.28, 140);
    const logoImageSize = logoSize * 0.83;
    const blobSize = width * 1.1;
    const progressWidth = Math.min(width * 0.5, 280);
    const titleFont = fontScale(42);
    const subtitleFont = fontScale(10);
    const loadingFont = fontScale(9);
    const footerFont = fontScale(10);

    // Animated values
    const blobScale1 = useRef(new Animated.Value(0.8)).current;
    const blobScale2 = useRef(new Animated.Value(0.8)).current;
    const blobOpacity1 = useRef(new Animated.Value(0)).current;
    const blobOpacity2 = useRef(new Animated.Value(0)).current;

    const logoScale = useRef(new Animated.Value(0.6)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoRotate = useRef(new Animated.Value(-8)).current;

    const titleOpacity = useRef(new Animated.Value(0)).current;
    const titleTranslateY = useRef(new Animated.Value(24)).current;

    const subtitleOpacity = useRef(new Animated.Value(0)).current;

    const barWidth = useRef(new Animated.Value(0)).current;
    const loadingTextOpacity = useRef(new Animated.Value(0)).current;

    const footerOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(blobOpacity1, {
                toValue: isDark ? 0.18 : 0.12,
                duration: 900,
                useNativeDriver: true,
            }),
            Animated.timing(blobScale1, {
                toValue: 1,
                duration: 900,
                useNativeDriver: true,
            }),
            Animated.timing(blobOpacity2, {
                toValue: isDark ? 0.13 : 0.1,
                duration: 900,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.timing(blobScale2, {
                toValue: 1,
                duration: 900,
                delay: 200,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.sequence([
            Animated.delay(300),
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 70,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(logoRotate, {
                    toValue: 0,
                    tension: 70,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        Animated.sequence([
            Animated.delay(650),
            Animated.parallel([
                Animated.timing(titleOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(titleTranslateY, {
                    toValue: 0,
                    tension: 80,
                    friction: 9,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        Animated.sequence([
            Animated.delay(900),
            Animated.timing(subtitleOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();

        Animated.sequence([
            Animated.delay(1100),
            Animated.parallel([
                Animated.timing(loadingTextOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(barWidth, {
                    toValue: 1,
                    duration: 1800,
                    useNativeDriver: false,
                }),
            ]),
        ]).start(() => {
            Animated.timing(footerOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();

            if (onFinish) {
                setTimeout(onFinish, 600);
            }
        });
    }, []);

    const logoRotateInterpolate = logoRotate.interpolate({
        inputRange: [-8, 0],
        outputRange: ["-8deg", "0deg"],
    });

    const barWidthInterpolate = barWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    // Dynamic styles using computed dimensions
    const dynamicStyles = {
        blob: {
            width: blobSize,
            height: blobSize,
            borderRadius: blobSize / 2,
        },
        blobTopLeft: {
            top: -blobSize * 0.35,
            left: -blobSize * 0.35,
        },
        blobBottomRight: {
            bottom: -blobSize * 0.35,
            right: -blobSize * 0.35,
        },
        logoTile: {
            width: logoSize,
            height: logoSize,
            borderRadius: logoSize * 0.22, // ~24px at reference
        },
        logoImage: {
            width: logoImageSize,
            height: logoImageSize,
        },
        title: {
            fontSize: titleFont,
        },
        subtitle: {
            fontSize: subtitleFont,
        },
        loadingLabel: {
            fontSize: loadingFont,
        },
        footerText: {
            fontSize: footerFont,
        },
        progressTrack: {
            width: progressWidth,
        },
    };

    return (
        <View style={[styles.root, { backgroundColor: theme.colors.background }]}>

            {/* Ambient Blob 1 (top-left) */}
            <Animated.View
                style={[
                    styles.blob,
                    dynamicStyles.blob,
                    dynamicStyles.blobTopLeft,
                    {
                        opacity: blobOpacity1,
                        transform: [{ scale: blobScale1 }],
                    },
                ]}
                pointerEvents="none"
            >
                <LinearGradient
                    colors={[theme.colors.primary, "transparent"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </Animated.View>

            {/* Ambient Blob 2 (bottom-right) */}
            <Animated.View
                style={[
                    styles.blob,
                    dynamicStyles.blob,
                    dynamicStyles.blobBottomRight,
                    {
                        opacity: blobOpacity2,
                        transform: [{ scale: blobScale2 }],
                    },
                ]}
                pointerEvents="none"
            >
                <LinearGradient
                    colors={[theme.colors.secondary, "transparent"]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 1, y: 1 }}
                    end={{ x: 0, y: 0 }}
                />
            </Animated.View>

            {/* Main Content */}
            <View style={styles.content}>
                {/* Logo */}
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        {
                            opacity: logoOpacity,
                            transform: [
                                { scale: logoScale },
                                { rotate: logoRotateInterpolate },
                            ],
                        },
                    ]}
                >
                    <View style={styles.logoGlow} pointerEvents="none">
                        <LinearGradient
                            colors={[theme.colors.primary, theme.colors.secondary]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    </View>

                    <View style={[styles.logoTile, dynamicStyles.logoTile, { shadowColor: theme.colors.primary }]}>
                        <Image
                            source={require("../../assets/logo/logo300.png")}
                            style={dynamicStyles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                </Animated.View>

                {/* Title */}
                <Animated.View
                    style={[
                        styles.titleWrapper,
                        {
                            opacity: titleOpacity,
                            transform: [{ translateY: titleTranslateY }],
                        },
                    ]}
                >
                    <Text
                        style={[dynamicStyles.title, { color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                    >
                        {"Repairo Moto"}
                    </Text>
                </Animated.View>

                {/* Subtitle */}
                <Animated.View style={[styles.subtitleWrapper, { opacity: subtitleOpacity }]}>
                    <Text style={[dynamicStyles.subtitle, { color: theme.colors.primary }]}>
                        {"AFFORDABLE, RELIABLE"}
                    </Text>
                    <Text style={[dynamicStyles.subtitle, { color: theme.colors.primary }]}>
                        {"FAST MOTORCYCLE REPAIR SERVICES"}
                    </Text>
                </Animated.View>

                {/* Progress bar */}
                <View style={styles.loadingArea}>
                    <View
                        style={[
                            styles.progressTrack,
                            dynamicStyles.progressTrack,
                            { backgroundColor: theme.colors.surfaceHighest },
                        ]}
                    >
                        <Animated.View style={{ width: barWidthInterpolate, height: "100%" }}>
                            <LinearGradient
                                colors={[theme.colors.primary, theme.colors.secondary]}
                                style={[StyleSheet.absoluteFill, styles.progressFill]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </Animated.View>
                    </View>

                    <Animated.Text
                        style={[
                            dynamicStyles.loadingLabel,
                            styles.loadingLabel,
                            {
                                opacity: loadingTextOpacity,
                                color: theme.colors.textMuted,
                            },
                        ]}
                    >
                        {"ONE STEP AHEAD..."}
                    </Animated.Text>
                </View>
            </View>

            {/* Footer – fixed bottom position (no safe area dependency) */}
            <Animated.View
                style={[
                    styles.footer,
                    {
                        opacity: footerOpacity,
                        bottom: 28,
                    },
                ]}
                pointerEvents="none"
            >
                <View
                    style={[styles.footerDot, { backgroundColor: theme.colors.secondary }]}
                />
                <Text style={[dynamicStyles.footerText, styles.footerText, { color: theme.colors.textMuted }]}>
                    {"EST. 2024"}
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    blob: {
        position: "absolute",
    },
    content: {
        alignItems: "center",
        paddingHorizontal: 32,
        gap: 20,
    },
    logoWrapper: {
        position: "relative",
        marginBottom: 4,
    },
    logoGlow: {
        position: "absolute",
        top: -16,
        left: -16,
        right: -16,
        bottom: -16,
        borderRadius: 28,
        opacity: 0.35,
        overflow: "hidden",
    },
    logoTile: {
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.45,
        shadowRadius: 32,
        elevation: 18,
    },
    titleWrapper: {
        marginTop: 8,
    },
    subtitleWrapper: {
        alignItems: "center",
        gap: 2,
    },
    loadingArea: {
        marginTop: 40,
        alignItems: "center",
        gap: 12,
    },
    progressTrack: {
        height: 2,
        borderRadius: 999,
        overflow: "hidden",
    },
    progressFill: {
        borderRadius: 999,
    },
    loadingLabel: {
        fontWeight: "600",
        letterSpacing: 2.8,
        textTransform: "uppercase",
        opacity: 0.55,
        textAlign: "center",
    },
    footer: {
        position: "absolute",
        alignItems: "center",
        gap: 4,
    },
    footerDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    footerText: {
        letterSpacing: 1.5,
        fontWeight: "500",
    },
});