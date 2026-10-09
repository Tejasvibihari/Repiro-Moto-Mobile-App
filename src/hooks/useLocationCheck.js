import { useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import {
    setChecking,
    setServiceable,
    setNotServiceable,
    setLocationError,
} from "../store/slices/locationSlice";
import { getFastPosition, checkServiceability } from "../services/locationService";

// A cached "serviceable" result younger than this opens the app instantly;
// the check still re-runs silently in the background.
const CACHE_FRESH_MS = 12 * 60 * 60 * 1000;

/**
 * Serviceability gate logic.
 *
 * Cold start with a fresh cached "serviceable" verdict:
 *   status → "serviceable" immediately (no spinner), then a silent background
 *   re-check corrects it if the user has moved out of the service area.
 * No cache (first launch / after logout / stale): normal flow, but GPS now
 * uses the last-known fix + timeout so it no longer blocks on a cold GPS lock.
 */
export function useLocationCheck() {
    const dispatch = useDispatch();
    const store = useStore();
    const status = useSelector((s) => s.location.status);
    const running = useRef(false);

    const checkLocation = useCallback(
        async ({ silent = false } = {}) => {
            if (running.current) return;
            running.current = true;
            if (!silent) dispatch(setChecking());

            try {
                // 1. Position (last-known first, then fresh with timeout)
                const pos = await getFastPosition();
                const { latitude, longitude } = pos;

                // 2. Serviceability (cached + de-duplicated in the service)
                const result = await checkServiceability(latitude, longitude);
                const payload = { coords: { latitude, longitude }, city: result.area || null };
                dispatch(result.serviceable ? setServiceable(payload) : setNotServiceable(payload));
            } catch (err) {
                if (silent) {
                    // Background re-check failed: keep the cached verdict, don't
                    // kick a working user out because of a flaky network / GPS.
                    return;
                }
                console.error("Location check error:", err);
                if (err.message === "permission_denied") {
                    dispatch(setLocationError("permission_denied"));
                } else if (err.response?.status === 401) {
                    dispatch(setLocationError("unauthorized"));
                } else if (err.response?.status === 400) {
                    dispatch(setLocationError("invalid_request"));
                } else {
                    dispatch(setLocationError("fetch_failed"));
                }
            } finally {
                running.current = false;
            }
        },
        [dispatch, store]
    );

    // Public retry always shows the spinner.
    const retry = useCallback(() => checkLocation({ silent: false }), [checkLocation]);

    useEffect(() => {
        if (status !== "idle") return;

        const { lastServiceable, checkedAt, coords, city } = store.getState().location;
        const cacheFresh = checkedAt && Date.now() - checkedAt < CACHE_FRESH_MS;

        if (cacheFresh && lastServiceable === true && coords) {
            // Open instantly from cache, verify in the background.
            dispatch(setServiceable({ coords, city }));
            checkLocation({ silent: true });
        } else {
            checkLocation({ silent: false });
        }
    }, [status, checkLocation, dispatch, store]);

    return { status, retry };
}
