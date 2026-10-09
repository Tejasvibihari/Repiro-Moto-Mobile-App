// src/App.js
import { useEffect, useState } from "react";
import { Appearance, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { LightTheme, DarkTheme } from "./styles/Theme";
import { syncSystemTheme } from "./store/slices/themeSlice";
import SplashScreen from "./screens/splash/SplashScreen";
import AppNavigator from "./navigation/AppNavigator";
import DynamicStatusBar from "./components/common/DynamicStatusBar";
import LocationGate from "./components/common/LocationGate";
import UpdateModal from "./components/common/UpdateModal";
import useVersionCheck from "./utils/useVersionCheck";
import ShopClosedScreen from "./screens/closed/ShopClosedScreen";
import { useShopStatus } from "./context/ShopStatusContext";

export default function AppEntry() {
    const dispatch = useDispatch();
    const [splashVisible, setSplashVisible] = useState(true);
    const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === "dark" ? DarkTheme : LightTheme;
    const { status: shopStatus, refresh: refreshShopStatus, refreshing: checkingShop } = useShopStatus();

    // Force-update check — runs once on launch regardless of login state,
    // so even logged-out users on a stale build get prompted.
    const [updateInfo, setUpdateInfo] = useVersionCheck("mobile");

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
            <DynamicStatusBar />
            {splashVisible ? (
                <SplashScreen onFinish={() => setSplashVisible(false)} />
            ) : isLoggedIn ? (           // ← check login here
                <LocationGate>
                    <AppNavigator />
                </LocationGate>
            ) : (
                <AppNavigator />         // ← auth screens skip the gate
            )}

            {/* Admin closed the shop (festival / event / holiday): block everything.
                Rendered on top so the navigator stays mounted and nothing is lost on reopen. */}
            {!splashVisible && shopStatus?.isClosed && (
                <ShopClosedScreen status={shopStatus} onRetry={refreshShopStatus} checking={checkingShop} />
            )}

            <UpdateModal
                visible={updateInfo.visible}
                force={updateInfo.force}
                message={updateInfo.message}
                storeUrl={updateInfo.storeUrl}
                onLater={() => setUpdateInfo((prev) => ({ ...prev, visible: false }))}
            />
        </View>
    );
}