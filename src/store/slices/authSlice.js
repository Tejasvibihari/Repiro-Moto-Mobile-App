// src/store/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isLoggedIn: false,
    user: null,
    token: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action) => {
            state.isLoggedIn = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
        },
        logout: (state) => {
            state.isLoggedIn = false;
            state.user = null;
            state.token = null;
        },
        updateUser: (state, action) => {
            state.user = action.payload;
        },
        restoreSession: (state, action) => {
            if (action.payload) {
                state.isLoggedIn = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            }
        },
    },
});

export const { login, logout, restoreSession, updateUser } = authSlice.actions;
export default authSlice.reducer;