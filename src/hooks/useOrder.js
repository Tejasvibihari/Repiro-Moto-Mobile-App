// hooks/useOrder.js
import { useState, useCallback, useEffect } from 'react';
import axiosClient from '../services/axiosClient'; // adjust the path to your axiosClient

const useOrder = () => {
    const [orders, setOrders] = useState([]);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [canceling, setCanceling] = useState(false); // new state for cancellation loading
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
            console.log(response.data);
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
     * Cancel an order by ID with a reason.
     * @param {string} id - The order ID.
     * @param {string} reason - The cancellation reason.
     * @returns {Promise<Object>} - The updated order.
     */
    const cancelOrder = useCallback(async (id, reason) => {
        console.log(id, reason)
        if (!id) {
            setError('Order ID is required');
            return;
        }
        if (!reason) {
            setError('Reason is required');
            return;
        }

        setCanceling(true);
        setError(null);
        try {
            const response = await axiosClient.put(`/api/admin/order/cancel/${id}`, { reason });
            const updatedOrder = response.data.order;
            console.log(response.data)
            // Update orders list by replacing the cancelled order
            setOrders(prevOrders =>
                prevOrders.map(order => order._id === id ? updatedOrder : order)
            );

            // Update currentOrder if it matches the cancelled order
            if (currentOrder && currentOrder._id === id) {
                setCurrentOrder(updatedOrder);
            }

            return updatedOrder;
        } catch (err) {
            console.log(err)
            const message = err.response?.data?.message || err.message;
            setError(message);
            throw err;
        } finally {
            setCanceling(false);
        }
    }, [currentOrder]);

    /**
     * Clear any stored error.
     */
    const clearError = useCallback(() => setError(null), []);

    return {
        orders,
        currentOrder,
        loading,
        canceling,           // new loading state for cancellation
        error,
        fetchOrders,
        fetchOrderById,
        cancelOrder,         // new cancellation function
        refetch: fetchOrders,
        clearError,
    };
};

export default useOrder;