import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    status: "idle",        // "idle" | "checking" | "serviceable" | "not_serviceable" | "error"
    coords: null,          // { latitude, longitude }
    city: null,
    errorMessage: null,
    // ── persisted cache of the last successful serviceability check ──────────
    // Lets the app open instantly and re-verify in the background.
    lastServiceable: null, // boolean | null
    checkedAt: null,       // epoch ms of the last successful check
};

const locationSlice = createSlice({
    name: "location",
    initialState,
    reducers: {
        setChecking: (state) => {
            state.status = "checking";
            state.errorMessage = null;
        },
        setServiceable: (state, action) => {
            state.status = "serviceable";
            state.coords = action.payload.coords;
            state.city = action.payload.city ?? null;
            state.lastServiceable = true;
            state.checkedAt = Date.now();
            state.errorMessage = null;
        },
        setNotServiceable: (state, action) => {
            state.status = "not_serviceable";
            state.coords = action.payload.coords;
            state.city = action.payload.city ?? null;
            state.lastServiceable = false;
            state.checkedAt = Date.now();
        },
        setLocationError: (state, action) => {
            state.status = "error";
            state.errorMessage = action.payload;
        },
        resetLocation: (state) => {
            Object.assign(state, initialState);
        },
    },
});

export const {
    setChecking,
    setServiceable,
    setNotServiceable,
    setLocationError,
    resetLocation,
} = locationSlice.actions;

export default locationSlice.reducer;
