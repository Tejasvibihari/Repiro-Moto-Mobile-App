// app.config.js  (replace your existing app.json or app.config.js with this)
// Install: npx expo install expo-constants
// .env file must have:  RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXX

import 'dotenv/config'; // requires `dotenv` installed: npm i dotenv

export default ({ config }) => ({
    ...config,
    // Keep all your existing app.json fields here via spread,
    // then add / override the extra block:
    extra: {
        ...config.extra,
        // Pulled from .env at build time — never embedded raw in source code
        razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
        // Add other env vars here as needed
    },
});

// ─── Usage in any screen ──────────────────────────────────────────────────────
// import Constants from 'expo-constants';
// const RAZORPAY_KEY_ID = Constants.expoConfig?.extra?.razorpayKeyId ?? '';