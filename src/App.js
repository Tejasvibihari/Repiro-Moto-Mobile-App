// src/App.js
import { useEffect, useState } from "react";
import { Appearance, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "./styles/Theme";
import { syncSystemTheme } from "./store/slices/themeSlice";
import SplashScreen from "./screens/splash/SplashScreen";
import AppNavigator from "./navigation/AppNavigator";
import DynamicStatusBar from "./components/common/DynamicStatusBar";

export default function AppEntry() {
    const dispatch = useDispatch();
    const [splashVisible, setSplashVisible] = useState(true);

    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;

    useEffect(() => {
        const current = Appearance.getColorScheme();
        if (current) dispatch(syncSystemTheme(current));
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            if (colorScheme) dispatch(syncSystemTheme(colorScheme));
        });
        return () => subscription.remove();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* ✅ Single mount point for StatusBar — applies to ALL screens */}
            <DynamicStatusBar />

            {splashVisible ? (
                <SplashScreen onFinish={() => setSplashVisible(false)} />
            ) : (
                <AppNavigator />
            )}
        </View>
    );
}