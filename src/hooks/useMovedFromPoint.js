import { useState, useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import { peekPosition, distanceMeters, MOVED_THRESHOLD_M } from "../services/locationService";

/**
 * Tells you whether the device has moved away from `point`.
 *
 * Silent and cheap: no loading state, no server call, no geocoding. It peeks at
 * the OS position once when `point` changes and again whenever the app returns
 * to the foreground. Pass `point = null` to disable.
 *
 * Returns { moved, clear }.
 */
export function useMovedFromPoint(point) {
    const [moved, setMoved] = useState(false);
    const pointRef = useRef(point);
    const seq = useRef(0);
    pointRef.current = point;

    const check = useCallback(async () => {
        const p = pointRef.current;
        if (!p) { setMoved(false); return; }
        const id = ++seq.current;
        const now = await peekPosition();
        if (id !== seq.current || !now) return;       // superseded / position unknown
        const limit = Math.max(MOVED_THRESHOLD_M, now.accuracy || 0);
        setMoved(distanceMeters(p, now) > limit);
    }, []);

    const lat = point?.latitude;
    const lng = point?.longitude;

    useEffect(() => {
        if (lat == null || lng == null) { setMoved(false); return; }
        check();
        const sub = AppState.addEventListener("change", (s) => { if (s === "active") check(); });
        return () => { seq.current++; sub.remove(); };
    }, [lat, lng, check]);

    const clear = useCallback(() => { seq.current++; setMoved(false); }, []);
    return { moved, clear };
}
