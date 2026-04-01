// src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isLoggedIn: false,
    user: null,
    totalBikes: 0,
    totalOrders: 0,

};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
        },
        setBike: (state, action) => {
            state.totalBikes = action.payload;
        },
        setOrders: (state, action) => {
            state.totalOrders = action.payload;
        }
    },
});

export const { setUser, setBike, setOrders } = userSlice.actions;
export default userSlice.reducer;