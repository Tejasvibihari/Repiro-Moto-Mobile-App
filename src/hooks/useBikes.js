import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import axiosClient from "../services/axiosClient";

export default function useBike() {
    const [bikes, setBikes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const token = useSelector((state) => state.auth.token);

    // Fetch bikes
    const fetchBikes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosClient.get("/api/bike-profiles/get-bike-profile");
            setBikes(response.data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to fetch bikes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchBikes();
        } else {
            setBikes([]);
            setLoading(false);
        }
    }, [token, fetchBikes]);

    // Create bike
    const createBike = useCallback(async (bikeData) => {
        try {
            const response = await axiosClient.post("/api/bike-profiles/create", bikeData);
            // Add new bike to local state
            setBikes(prev => [response.data.savedProfile, ...prev]);
            return response.data;
        } catch (err) {
            throw new Error(err.response?.data?.message || err.message || "Failed to create bike");
        }
    }, []);

    // Update bike
    const updateBike = useCallback(async (id, bikeData) => {
        try {
            const response = await axiosClient.put(`/api/bike-profiles/${id}`, bikeData);
            // Update local state
            setBikes(prev => prev.map(bike => bike._id === id ? response.data : bike));
            return response.data;
        } catch (err) {
            throw new Error(err.response?.data?.message || err.message || "Failed to update bike");
        }
    }, []);

    // Delete bike
    const deleteBike = useCallback(async (id) => {
        try {
            await axiosClient.delete(`/api/bike-profiles/${id}`);
            // Remove from local state
            setBikes(prev => prev.filter(bike => bike._id !== id));
            return true;
        } catch (err) {
            throw new Error(err.response?.data?.message || err.message || "Failed to delete bike");
        }
    }, []);

    // Refetch bikes
    const refetch = useCallback(async () => {
        await fetchBikes();
    }, [fetchBikes]);

    return {
        bikes,
        loading,
        error,
        createBike,
        updateBike,
        deleteBike,
        refetch,
    };
}