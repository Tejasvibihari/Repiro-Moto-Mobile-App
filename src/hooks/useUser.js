// hooks/useUser.js
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import axiosClient from '../services/axiosClient';
import { updateUser as updateAuthUser } from '../store/slices/authSlice'; // assume you have this action

export const useUser = () => {
    const dispatch = useDispatch();
    const { user, token } = useSelector((state) => state.auth);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Update user profile
     * @param {Object} userData - Profile fields (firstName, lastName, phone, accountType, etc.)
     * @param {File} [profileImage] - Optional image file
     * @param {string} [userId] - Optional userId (defaults to logged-in user's id)
     */
    const updateProfile = useCallback(
        async (userData, profileImage = null) => {


            setLoading(true);
            setError(null);

            try {
                const formData = new FormData();

                // Append all text fields
                Object.keys(userData).forEach((key) => {
                    if (userData[key] !== undefined && userData[key] !== null) {
                        formData.append(key, userData[key]);
                    }
                });

                // Append image if provided
                if (profileImage) {
                    formData.append('profileImage', {
                        uri: Platform.OS === 'ios' ? profileImage.uri.replace('file://', '') : profileImage.uri,
                        name: profileImage.fileName || 'profile.jpg',
                        type: profileImage.type || 'image/jpeg',
                    });
                }

                const response = await axiosClient.put(
                    `/api/user/update-profile`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );

                // Update Redux store with fresh user data
                if (response.data.user) {
                    dispatch(updateAuthUser(response.data.user));
                }

                return response.data;
            } catch (err) {
                console.log(err);
                const message =
                    err.response?.data?.message || err.message || 'Profile update failed';
                setError(message);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [dispatch, user?._id]
    );

    return {
        updateProfile,
        loading,
        error,
    };
};