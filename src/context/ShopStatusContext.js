// src/context/ShopStatusContext.js
//
// Keeps the customer app in sync with the admin's "Shop Status" settings:
//   status.isClosed            -> whole app is blocked behind ShopClosedScreen
//   status.emergencyAvailable  -> false outside the admin's service hours (Schedule only)
//
// Refreshes on launch, whenever the app returns to the foreground, and every
// minute while it is open (so an admin closing the shop takes effect quickly,
// and Emergency turns on/off as the service window opens/closes).
//
// Fails OPEN: if the request fails we keep the last known status (or "open") so a
// flaky network never locks customers out. The API enforces the same rules
// server-side, so nothing can be booked while closed anyway.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import axiosClient from '../services/axiosClient';

const POLL_MS = 60 * 1000;

const ShopStatusContext = createContext({
    status: null,
    loaded: false,
    refreshing: false,
    refresh: async () => { },
});

export function ShopStatusProvider({ children }) {
    const [status, setStatus] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const inFlight = useRef(false);

    const refresh = useCallback(async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        setRefreshing(true);
        try {
            const res = await axiosClient.get('/api/admin-settings/shop-status', { timeout: 8000 });
            if (res.data?.status) setStatus(res.data.status);
        } catch (e) {
            // keep last known status (fail open)
        } finally {
            inFlight.current = false;
            setRefreshing(false);
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        refresh();

        let timer = setInterval(refresh, POLL_MS);
        const sub = AppState.addEventListener('change', (next) => {
            if (next === 'active') {
                refresh();
                if (!timer) timer = setInterval(refresh, POLL_MS);
            } else if (timer) {
                clearInterval(timer);
                timer = null;
            }
        });

        return () => {
            if (timer) clearInterval(timer);
            sub.remove();
        };
    }, [refresh]);

    return (
        <ShopStatusContext.Provider value={{ status, loaded, refreshing, refresh }}>
            {children}
        </ShopStatusContext.Provider>
    );
}

export const useShopStatus = () => useContext(ShopStatusContext);
