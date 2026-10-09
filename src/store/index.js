// src/store/index.js
import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authReducer from "./slices/authSlice";
import themeReducer from "./slices/themeSlice";
import userReducer from "./slices/userSlice";
import locationReducer from "./slices/locationSlice";

import notificationReducer from "./slices/notificationSlice";

const authPersistConfig = {
    key: "auth",
    storage: AsyncStorage,
    whitelist: ["token", "user", "isLoggedIn"],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

// Persist only the last serviceability result (NOT `status`), so a cold start
// can render immediately from cache while the check re-runs in the background.
const locationPersistConfig = {
    key: "location",
    storage: AsyncStorage,
    whitelist: ["coords", "city", "lastServiceable", "checkedAt", "address", "distance", "source"],
};

const persistedLocationReducer = persistReducer(locationPersistConfig, locationReducer);

export const store = configureStore({
    reducer: {
        auth: persistedAuthReducer,
        theme: themeReducer,
        user: userReducer,
        location: persistedLocationReducer,
        notification: notificationReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
            },
        }),
});

export const persistor = persistStore(store);