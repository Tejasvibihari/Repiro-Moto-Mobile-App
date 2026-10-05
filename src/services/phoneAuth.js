// src/services/phoneAuth.js
// Phone login for customers. Three ways in, one account per number:
//   1) WhatsApp OTP        — primary   (server sends the code through the WhatsApp Cloud API)
//   2) Firebase SMS OTP    — secondary (Firebase Phone Number Verification, used when WhatsApp can't deliver)
//   3) Email + password    — handled by the existing login form
// If the number already has an account (even an email one) the server logs into it, otherwise it creates it.
import axiosClient from './axiosClient';

// Firebase is optional at runtime: it needs a development / production build (not Expo Go).
let fb = null;
try { fb = require('@react-native-firebase/auth'); } catch (_) { }

export const isFirebaseAvailable = () => !!fb;

/** Keep only the 10 digits of an Indian mobile number (accepts pasted +91 / 0 prefixes). */
export const cleanPhone = (value) => {
    let d = String(value ?? '').replace(/\D/g, '');
    if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
    if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
    return d.slice(0, 10);
};

export const isValidPhone = (value) => /^[6-9]\d{9}$/.test(cleanPhone(value));

/** True for "9876543210", "+91 98765 43210"; false for emails. */
export const looksLikePhone = (value) =>
    !!value && !String(value).includes('@') && /^[\d+\-\s()]+$/.test(String(value).trim()) && cleanPhone(value).length >= 10;

// ── WhatsApp (primary) ───────────────────────────────────────────────────────
export const sendWhatsAppOtp = async (phone) =>
    (await axiosClient.post('/api/user/auth/phone/send-otp', { phone: cleanPhone(phone) })).data;

export const verifyWhatsAppOtp = async (phone, otp) =>
    (await axiosClient.post('/api/user/auth/phone/verify-otp', { phone: cleanPhone(phone), otp })).data;

// ── Firebase (secondary) ─────────────────────────────────────────────────────
/** Sends the SMS. Returns the confirmation object needed by confirmFirebaseOtp(). */
export const sendFirebaseOtp = async (phone) => {
    if (!fb) throw new Error('SMS verification is not available in this build.');
    const auth = fb.getAuth();
    return fb.signInWithPhoneNumber(auth, `+91${cleanPhone(phone)}`);
};

/** Exchange a verified Firebase user for our own session. Signs out of Firebase afterwards (we use our JWT). */
export const loginWithFirebaseUser = async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken();
    try {
        return (await axiosClient.post('/api/user/auth/phone/firebase', { idToken })).data;
    } finally {
        fb?.signOut(fb.getAuth()).catch(() => { });
    }
};

export const confirmFirebaseOtp = async (confirmation, code) => {
    const cred = await confirmation.confirm(code);
    return loginWithFirebaseUser(cred.user);
};

/** Android can verify the SMS by itself (instant verification) — call back when that happens. */
export const onFirebaseAutoVerified = (cb) => {
    if (!fb) return () => { };
    return fb.onAuthStateChanged(fb.getAuth(), (u) => { if (u) cb(u); });
};

export const firebaseErrorMessage = (e) => {
    switch (e?.code) {
        case 'auth/invalid-phone-number': return 'That phone number is not valid.';
        case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
        case 'auth/invalid-verification-code': return 'Incorrect code. Please check and try again.';
        case 'auth/code-expired':
        case 'auth/session-expired': return 'This code has expired. Please request a new one.';
        case 'auth/network-request-failed': return 'No internet connection.';
        default: return e?.response?.data?.message || e?.message || 'Verification failed. Please try again.';
    }
};
