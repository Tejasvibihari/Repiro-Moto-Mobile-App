// hooks/useServicePricing.js
// Fetches the admin-managed service price list for ONE bike (brand + model) while booking.
//
//   const pricing = useServicePricing({ brand: 'Hero', model: 'Splendor' });
//   pricing.services   [{ _id, name, description, price, estimatedMinutes, priority }]
//   pricing.loading    true while the list for the current bike is being fetched
//   pricing.ready      true once the list for the CURRENT brand/model has been resolved
//                      (false for the render right after the bike changes)
//   pricing.error      message when the request failed (services is [] then)
//   pricing.reload()   retry
//
// No brand/model, or the "Other" model, means there is nothing to price: services is [] and
// ready is true, so the caller falls back to its generic service list.
import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../services/axiosClient';

const NO_SERVICES = [];

export default function useServicePricing({ brand, model }) {
    const key = brand && model && model !== 'Other'
        ? `${brand.trim().toLowerCase()}|${model.trim().toLowerCase()}`
        : null;

    const [data, setData] = useState({ key: null, services: NO_SERVICES, error: null });
    const [reloadCount, setReloadCount] = useState(0);

    useEffect(() => {
        if (!key) return undefined;
        let cancelled = false;

        (async () => {
            try {
                const res = await axiosClient.get('/api/services/pricing', { params: { brand, model } });
                if (!cancelled) setData({ key, services: res.data?.services || [], error: null });
            } catch (err) {
                if (!cancelled) {
                    setData({
                        key,
                        services: [],
                        error: err.response?.data?.message || err.message || 'Failed to load service prices',
                    });
                }
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, reloadCount]);

    const reload = useCallback(() => {
        setData((prev) => ({ ...prev, key: null }));
        setReloadCount((c) => c + 1);
    }, []);

    const ready = !key || data.key === key;

    return {
        services: key && ready ? data.services : NO_SERVICES,
        loading: !!key && !ready,
        ready,
        error: key && ready ? data.error : null,
        reload,
    };
}
