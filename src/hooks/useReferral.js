// hooks/useReferral.js
// Handles all referral-related API calls matching the backend routes:
//   GET  /api/user/getalluser/:referalcode        → referred users
//   GET  /api/user/get-user-by-id/:userId         → full user (balance, withdrawalRequests)
//   POST /api/user/withdrawal-request/:userId     → submit withdrawal { amount, upiid }
//   GET  /api/user/withdrawal-history/:userId     → withdrawal history

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import axiosClient from '../services/axiosClient';

export default function useReferral() {
    const user = useSelector((s) => s.auth.user);

    const [referredUsers, setReferredUsers] = useState([]);
    const [withdrawalHistory, setWithdrawalHistory] = useState([]);
    const [fullUser, setFullUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // ── Fetch all data ────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        if (!user?._id || !user?.referralCode) {
            setLoading(false);
            return;
        }
        try {
            setError(null);
            const [referralRes, userRes] = await Promise.all([
                axiosClient.get(`/api/user/getalluser/${user.referralCode}`),
                axiosClient.get(`/api/user/get-user-by-id/${user._id}`),
            ]);
            setReferredUsers(referralRes.data?.data ?? []);
            const u = userRes.data?.user ?? {};
            setFullUser(u);
            setWithdrawalHistory(u.withdrawalRequests ?? []);
        } catch (err) {
            setError(err.response?.data?.message ?? err.message ?? 'Failed to load referral data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?._id, user?.referralCode]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const refetch = useCallback(async () => {
        setRefreshing(true);
        await fetchAll();
    }, [fetchAll]);

    // ── Submit withdrawal ─────────────────────────────────────────────────────
    const submitWithdrawal = useCallback(async ({ amount, upiid }) => {
        const res = await axiosClient.post(`/api/user/withdrawal-request/${user._id}`, {
            amount: parseFloat(amount),
            upiid,
        });
        // Optimistically update balance
        setFullUser((prev) => ({
            ...prev,
            referralAmount: res.data?.availableAmount ?? (prev?.referralAmount ?? 0) - amount,
            withdrawalRequests: [
                res.data?.withdrawalRequest,
                ...(prev?.withdrawalRequests ?? []),
            ],
        }));
        setWithdrawalHistory((prev) => [res.data?.withdrawalRequest, ...prev]);
        return res.data;
    }, [user?._id]);

    // ── Derived stats (mirrors web MyReferral userStats) ─────────────────────
    const stats = {
        totalReferrals: referredUsers.length,
        activeReferrals: referredUsers.filter((u) => u.status === 'approved').length,
        pendingAmount: fullUser?.pendingReferralAmount ?? 0,
        availableAmount: fullUser?.referralAmount ?? 0,
        totalWithdrawn: fullUser?.totalWithdrawn ?? 0,
        totalEarnings: (fullUser?.referralAmount ?? 0) + (fullUser?.totalWithdrawn ?? 0),
        conversionRate: referredUsers.length > 0
            ? ((referredUsers.filter((u) => u.status === 'approved').length / referredUsers.length) * 100).toFixed(1)
            : '0.0',
    };

    // personal = credit only, business = can withdraw cash
    const canWithdraw = user?.accountType === 'business';

    return {
        referredUsers,
        withdrawalHistory,
        fullUser,
        stats,
        loading,
        refreshing,
        error,
        canWithdraw,
        refetch,
        submitWithdrawal,
    };
}