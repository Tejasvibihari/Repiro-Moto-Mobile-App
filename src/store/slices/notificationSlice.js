// src/store/slices/notificationSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    notifications: [],
    unreadCount: 0,
    expoPushToken: null,
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        setNotifications: (state, action) => {
            state.notifications = action.payload;
            state.unreadCount = action.payload.filter(n => !n.isRead).length;
        },
        addNotification: (state, action) => {
            // Unshift to put at top
            state.notifications.unshift(action.payload);
            state.unreadCount += 1;
        },
        markNotificationRead: (state, action) => {
            const index = state.notifications.findIndex(n => n.id === action.payload);
            if (index !== -1 && !state.notifications[index].isRead) {
                state.notifications[index].isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        markAllNotificationsRead: (state) => {
            state.notifications.forEach(n => {
                n.isRead = true;
            });
            state.unreadCount = 0;
        },
        setUnreadCount: (state, action) => {
            state.unreadCount = action.payload;
        },
        setExpoPushToken: (state, action) => {
            state.expoPushToken = action.payload;
        },
        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
            state.expoPushToken = null;
        }
    }
});

export const {
    setNotifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    setUnreadCount,
    setExpoPushToken,
    clearNotifications
} = notificationSlice.actions;

export default notificationSlice.reducer;
