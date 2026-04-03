import { useEffect, useCallback } from "react";
import * as Location from "expo-location";
import { useDispatch, useSelector } from "react-redux";
import {
    setChecking,
    setServiceable,
    setNotServiceable,
    setLocationError,
} from "../store/slices/locationSlice";
import axiosClient from "../services/axiosClient";

/**
 * Serviceability check using axiosClient (POST with body)
 * Expects backend response:
 * {
 *   success: boolean,
 *   serviceable: boolean,
 *   area?: string,
 *   distance?: number,
 *   radius?: number,
 *   message?: string
 * }
 */
async function checkServiceability(latitude, longitude) {
    const response = await axiosClient.post("/api/service-areas/check", {
        latitude,
        longitude,
    });

    // Backend may return 200 with success: false (e.g., missing lat/lng)
    if (!response.data.success) {
        throw new Error(response.data.message || "Serviceability check failed");
    }

    return response.data; // { serviceable, area, distance, radius, ... }
}

export function useLocationCheck() {
    const dispatch = useDispatch();
    const status = useSelector((s) => s.location.status);

    const checkLocation = useCallback(async () => {
        dispatch(setChecking());

        try {
            // 1. Ask for permission
            const { status: permStatus } =
                await Location.requestForegroundPermissionsAsync();

            if (permStatus !== "granted") {
                dispatch(setLocationError("permission_denied"));
                return;
            }

            // 2. Get coords
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const { latitude, longitude } = location.coords;

            // 3. Call serviceability API
            const result = await checkServiceability(latitude, longitude);

            // Map backend "area" to "city" for Redux compatibility
            const city = result.area || null;

            if (result.serviceable) {
                dispatch(setServiceable({ coords: { latitude, longitude }, city }));
            } else {
                dispatch(setNotServiceable({ coords: { latitude, longitude }, city }));
            }
        } catch (err) {
            console.error("Location check error:", err);
            // Handle specific HTTP status codes
            if (err.response?.status === 401) {
                dispatch(setLocationError("unauthorized"));
            } else if (err.response?.status === 400) {
                dispatch(setLocationError("invalid_request"));
            } else {
                dispatch(setLocationError("fetch_failed"));
            }
        }
    }, [dispatch]);

    useEffect(() => {
        if (status === "idle") {
            checkLocation();
        }
    }, [status, checkLocation]);

    return { status, retry: checkLocation };
}