import 'dotenv/config';

export default ({ config }) => {
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;

    if (!razorpayKeyId) {
        throw new Error(
            '[app.config.js] RAZORPAY_KEY_ID is missing from the environment. ' +
            'Set it locally in .env, and confirm it exists for this environment via ' +
            '`eas env:list --environment <development|preview|production>` before building.'
        );
    }

    return {
        ...config,

        plugins: [
            ...(config.plugins ?? []),
            'expo-asset',
        ],

        extra: {
            ...config.extra,
            razorpayKeyId,
        },
    };
};