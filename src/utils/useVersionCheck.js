import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Application from "expo-application";
import axiosClient from "../services/axiosClient";

// Simple semver-ish compare: returns true if a < b
function isOlder(a, b) {
    const pa = String(a).split(".").map(Number);
    const pb = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x < y) return true;
        if (x > y) return false;
    }
    return false;
}

// Checks the running app's version against the config the admin publishes
// on the backend (see server/Models/appVersion.js). appKey identifies THIS
// app ("mobile") since Console has its own independent version numbers.
export default function useVersionCheck(appKey = "mobile") {
    const [updateInfo, setUpdateInfo] = useState({ visible: false, force: false, message: "", storeUrl: "" });

    useEffect(() => {
        const check = async () => {
            try {
                const currentVersion = Application.nativeApplicationVersion; // from app.json "version"
                if (!currentVersion) return; // can't compare safely, don't risk a false prompt

                const platform = Platform.OS === "ios" ? "ios" : "android";

                const { data } = await axiosClient.get("/api/app-version", {
                    params: { app: appKey, platform },
                });

                const force = !!data.forceUpdate || isOlder(currentVersion, data.minRequiredVersion);

                // Exact-version-match rule: the running app must match the version
                // currently live on the Play Store / App Store. Any mismatch (not
                // just being behind) triggers the update prompt; dropping strictly
                // below minRequiredVersion (or the manual forceUpdate flag) makes
                // the prompt non-dismissable.
                const isExactMatch = currentVersion === data.latestVersion;
                const shouldPrompt = force || !isExactMatch;

                if (shouldPrompt) {
                    setUpdateInfo({
                        visible: true,
                        force,
                        message: data.updateMessage,
                        storeUrl: data.storeUrl,
                    });
                }
            } catch (err) {
                // Fail silently — a network hiccup or missing config should never
                // block the app from opening.
                console.log("Version check failed:", err?.message);
            }
        };
        check();
    }, []);

    return [updateInfo, setUpdateInfo];
}
