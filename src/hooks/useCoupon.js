// hooks/useCoupon.js
import { useState, useCallback } from 'react';
import axiosClient from '../services/axiosClient';

/**
 * Thin wrapper around the three user-facing coupon endpoints.
 * Mirrors the shape of useOrder.js — each action manages its own loading
 * flag so a screen can disable just the button it needs to.
 */
const useCoupon = () => {
    const [verifying, setVerifying] = useState(false);
    const [applying, setApplying] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [error, setError] = useState(null);

    /**
     * POST /api/coupons/verify — no side effects, just a validity + discount preview.
     * @param {{ code: string, orderAmount?: number, serviceType?: string }} params
     */
    const verifyCoupon = useCallback(async ({ code, orderAmount, serviceType }) => {
        setVerifying(true);
        setError(null);
        try {
            const res = await axiosClient.post('/api/coupons/verify', {
                code,
                ...(orderAmount != null ? { orderAmount } : {}),
                ...(serviceType ? { serviceType } : {}),
            });
            return res.data; // { success, valid, coupon, discountAmount, payableAmount }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Could not verify coupon.';
            setError(message);
            throw new Error(message);
        } finally {
            setVerifying(false);
        }
    }, []);

    /**
     * POST /api/coupons/apply — attaches coupon intent to a pre-invoice order.
     * @param {{ orderId: string, code: string }} params
     */
    const applyCoupon = useCallback(async ({ orderId, code }) => {
        setApplying(true);
        setError(null);
        try {
            const res = await axiosClient.post('/api/coupons/apply', { orderId, code });
            return res.data; // { success, message, coupon }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Could not apply coupon.';
            setError(message);
            throw new Error(message);
        } finally {
            setApplying(false);
        }
    }, []);

    /**
     * POST /api/coupons/remove — detaches a not-yet-finalized coupon.
     * @param {{ orderId: string }} params
     */
    const removeCoupon = useCallback(async ({ orderId }) => {
        setRemoving(true);
        setError(null);
        try {
            const res = await axiosClient.post('/api/coupons/remove', { orderId });
            return res.data; // { success, message }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Could not remove coupon.';
            setError(message);
            throw new Error(message);
        } finally {
            setRemoving(false);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return {
        verifying,
        applying,
        removing,
        error,
        verifyCoupon,
        applyCoupon,
        removeCoupon,
        clearError,
    };
};

export default useCoupon;