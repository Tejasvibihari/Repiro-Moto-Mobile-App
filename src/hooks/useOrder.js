// hooks/useOrder.js
import { useState, useCallback, useEffect } from 'react';
import axiosClient from '../services/axiosClient'; // adjust the path to your axiosClient

const useOrder = () => {
    const [orders, setOrders] = useState([]);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Fetch all orders for the logged-in user.
     * @returns {Promise<Array>} - The list of orders.
     */
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosClient.get('/api/admin/order/all');
            setOrders(response.data.orders);
            return response.data.orders;
        } catch (err) {
            const message = err.response?.data?.message || err.message;
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch on mount
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    /**
     * Fetch a single order by its ID.
     * @param {string} id - The order ID.
     * @returns {Promise<Object>} - The order details.
     */
    const fetchOrderById = useCallback(async (id) => {
        if (!id) {
            setError('Order ID is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await axiosClient.get(`/api/admin/order/getorderbyid/${id}`);
            setCurrentOrder(response.data);
            return response.data;
        } catch (err) {
            const message = err.response?.data?.message || err.message;
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Clear any stored error.
     */
    const clearError = useCallback(() => setError(null), []);

    return {
        orders,
        currentOrder,
        loading,
        error,
        fetchOrders,
        fetchOrderById,
        refetch: fetchOrders,
        clearError,
    };
};

export default useOrder;