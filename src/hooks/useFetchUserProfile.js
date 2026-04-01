import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import axiosClient from '../services/axiosClient';
import { setBike, setOrders, setUser } from '../store/slices/userSlice';

export const useFetchUserProfile = (userId) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const dispatch = useDispatch();

    const fetchProfile = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await axiosClient.get(`/api/user/get-user-by-id/${userId}`);
            if (response?.data?.user) {
                dispatch(setUser(response.data.user));
                dispatch(setBike(response.data.totalBikes));
                dispatch(setOrders(response.data.totalOrders));
            } else {
                throw new Error('User data not found in response');
            }
        } catch (err) {
            setError(err);
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    return { loading, error, refetch: fetchProfile };
};