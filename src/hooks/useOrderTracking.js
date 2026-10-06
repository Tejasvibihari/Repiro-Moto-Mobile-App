// src/hooks/useOrderTracking.js
// Live "your mechanic is on the way" data for ONE order.
//
//   • Polls GET /api/user/order-tracking/:id about every 10 s — only while `enabled` (the order is
//     "Mechanic Start"), the screen is focused AND the app is in the foreground. Background / locked
//     phone = zero requests, so the customer's battery and data are untouched.
//   • Every poll is also the "somebody is watching" signal for the server, which is what makes the
//     mechanic's phone use the fast GPS mode — and only for as long as this screen is open.
//   • Network errors back off (10 s → 20 s → … → 60 s) instead of hammering a dead connection.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import axiosClient from '../services/axiosClient';

const MIN_MS = 5000;
const MAX_MS = 60000;

export default function useOrderTracking(orderId, enabled, onStatusChange) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const focused = useIsFocused();
    const timer = useRef(null);
    const failures = useRef(0);
    const lastStatus = useRef(null);
    const cb = useRef(onStatusChange);
    cb.current = onStatusChange;

    const active = !!orderId && enabled && focused;

    const poll = useCallback(async () => {
        let next = 10000;
        try {
            const { data: d } = await axiosClient.get(`/api/user/order-tracking/${orderId}`);
            failures.current = 0;
            setError(false);
            setData(d);
            next = Math.min(MAX_MS, Math.max(MIN_MS, d?.pollAfterMs || 10000));
            // order moved on (mechanic arrived, cancelled…) → let the screen reload the order
            if (d?.orderStatus && lastStatus.current && d.orderStatus !== lastStatus.current) cb.current?.(d.orderStatus);
            if (d?.orderStatus) lastStatus.current = d.orderStatus;
        } catch {
            failures.current += 1;
            setError(true);
            next = Math.min(MAX_MS, 10000 * 2 ** Math.min(failures.current, 3));
        }
        return next;
    }, [orderId]);

    useEffect(() => {
        if (!active) return undefined;
        let stopped = false;

        const loop = async () => {
            if (stopped) return;
            const next = await poll();
            if (!stopped && AppState.currentState === 'active') timer.current = setTimeout(loop, next);
        };
        const stop = () => { clearTimeout(timer.current); timer.current = null; };
        const sub = AppState.addEventListener('change', (st) => {
            if (st === 'active') { if (!timer.current) loop(); }       // back to the app → refresh right away
            else stop();                                               // background → stop polling
        });

        loop();
        return () => { stopped = true; stop(); sub.remove(); };
    }, [active, poll]);

    return { data, error, tracking: !!data?.trackable };
}
