// src/hooks/useBookingSlots.js
//
// Loads the admin-managed time slots for one booking date.
//
//   const { slots, loading, error, reload } = useBookingSlots(ymd, { refreshKey });
//
// - Refetches whenever `ymd` or `refreshKey` changes (e.g. when the screen regains focus).
// - A slower, older response can never overwrite a newer one (fast date switching).
// - On a refresh for the SAME date the previous slots stay on screen while loading,
//   so the grid does not flicker.
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBookingSlots, normalizeSlotResponse } from '../services/bookingTimeSlots';

const EMPTY = { enforced: true, slots: [], dateAvailability: null };

export default function useBookingSlots(ymd, { refreshKey = 0 } = {}) {
    const [data, setData] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const requestId = useRef(0);
    const loadedFor = useRef(null);

    const load = useCallback(async () => {
        const id = ++requestId.current;
        if (!ymd) {
            loadedFor.current = null;
            setData(EMPTY);
            setError(null);
            setLoading(false);
            return;
        }
        if (loadedFor.current !== ymd) setData(EMPTY);   // new date → drop the old date's slots
        setLoading(true);
        setError(null);
        try {
            const response = await fetchBookingSlots(ymd);
            if (id !== requestId.current) return;           // a newer request is in flight
            loadedFor.current = ymd;
            setData(normalizeSlotResponse(response, ymd));
        } catch (err) {
            if (id !== requestId.current) return;
            setData(EMPTY);
            setError(err?.response?.data?.message || 'Could not load time slots. Check your connection and try again.');
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, [ymd]);

    useEffect(() => {
        load();
        return () => { requestId.current += 1; };          // ignore results after unmount / date change
    }, [load, refreshKey]);

    return { ...data, loading, error, reload: load };
}
