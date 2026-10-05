import axiosClient from './axiosClient';

export const BOOKING_POLICY_CODES = ['STORE_CLOSED', 'DAILY_LIMIT_REACHED', 'INVALID_DATE'];

export const isBookingPolicyError = (error) =>
    BOOKING_POLICY_CODES.includes(error?.response?.data?.code);

export const checkBookingAvailability = async (date) => {
    const response = await axiosClient.get('/api/admin-settings/booking-availability', {
        params: { date },
    });
    return response.data;
};

export const availabilityErrorFromResult = (result) => {
    const error = new Error(result?.message || 'This date is not available.');
    error.response = { data: result };
    return error;
};

export const getBookingPolicyMessage = (error) =>
    error?.response?.data?.message || error?.message || 'This date is not available.';
