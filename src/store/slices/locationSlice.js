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
    // ── details of that check, so booking never has to re-fetch them ────────
    address: null,         // formatted address of `coords`
    distance: null,        // distance from the service-area centre (km)
    source: "device",      // "device" = real GPS fix, "manual" = user picked a spot
};

const sameSpot = (a, b) =>
    !!a && !!b &&
    a.latitude.toFixed(4) === b.latitude.toFixed(4) &&
    a.longitude.toFixed(4) === b.longitude.toFixed(4);

const locationSlice = createSlice({
    name: "location",
    initialState,
    reducers: {
        setChecking: (state) => {
            state.status = "checking";
            state.errorMessage = null;
        },
        setServiceable: (state, action) => {
            const p = action.payload;
            // Keep an already-known address if the position did not really change.
            state.address = p.address ?? (sameSpot(state.coords, p.coords) ? state.address : null);
            state.distance = p.distance ?? null;
            state.source = p.source ?? "device";
            state.status = "serviceable";
            state.coords = action.payload.coords;
            state.city = action.payload.city ?? null;
            state.lastServiceable = true;
            state.checkedAt = Date.now();
            state.errorMessage = null;
        },
        setNotServiceable: (state, action) => {
            const p = action.payload;
            state.address = p.address ?? (sameSpot(state.coords, p.coords) ? state.address : null);
            state.distance = p.distance ?? null;
            state.source = p.source ?? "device";
            state.status = "not_serviceable";
            state.coords = action.payload.coords;
            state.city = action.payload.city ?? null;
            state.lastServiceable = false;
            state.checkedAt = Date.now();
        },
        // Background reverse-geocode finished: attach the address to the stored
        // position (ignored if the position has changed in the meantime).
        setLocationAddress: (state, action) => {
            const { coords, address, city } = action.payload;
            if (!sameSpot(state.coords, coords)) return;
            state.address = address ?? state.address;
            if (city) state.city = city;
        },
        // User tapped "Update location" while booking: move the stored position
        // WITHOUT touching `status` (so the app gate never flips mid-booking).
        updateLocationAnchor: (state, action) => {
            const { coords, city, address, distance, serviceable } = action.payload;
            state.coords = coords;
            state.city = city ?? state.city;
            state.address = address ?? null;
            state.distance = distance ?? null;
            state.source = "device";
            state.lastServiceable = !!serviceable;
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
    setLocationAddress,
    updateLocationAnchor,
    setLocationError,
    resetLocation,
} = locationSlice.actions;

export default locationSlice.reducer;
