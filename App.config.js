
import 'dotenv/config';

export default ({ config }) => ({
    ...config,


    extra: {
        ...config.extra,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',

    },
});
