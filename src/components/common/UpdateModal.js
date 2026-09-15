import React from "react";
import { Linking, BackHandler, Platform } from "react-native";
import PopUp from "./PopUp";

/**
 * UpdateModal — shown when the running app's version doesn't match what's
 * currently live on the store (see useVersionCheck). Reuses the app's own
 * PopUp component so it looks native to the rest of the UI.
 *
 * force=true  -> non-dismissable: no close icon, no backdrop dismiss, and on
 *                Android an "Exit" button that closes the app. (iOS apps
 *                can't self-terminate, so on iOS the prompt simply stays up
 *                with only "Update Now" available.)
 * force=false -> dismissable "Later" option alongside "Update Now".
 */
export default function UpdateModal({ visible, force, message, storeUrl, onLater }) {
    const handleUpdate = () => {
        if (storeUrl) Linking.openURL(storeUrl);
    };

    const handleExit = () => {
        if (Platform.OS === "android") BackHandler.exitApp();
    };

    const showExitOnAndroid = force && Platform.OS === "android";

    return (
        <PopUp
            visible={visible}
            type="warning"
            title="Update Available"
            message={message || "A new version of Repairo Moto is available."}
            primaryLabel="Update Now"
            secondaryLabel={showExitOnAndroid ? "Exit" : force ? undefined : "Later"}
            onPrimary={handleUpdate}
            onSecondary={showExitOnAndroid ? handleExit : force ? undefined : onLater}
            onClose={force ? undefined : onLater}
            dismissOnBackdrop={!force}
            showCloseIcon={!force}
        />
    );
}
