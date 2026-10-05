// src/components/auth/PhoneLoginForm.js
// "Continue with phone number": number → code → signed in (account is created on first use).
// Code goes out on WhatsApp first; if that is unavailable (or the user asks) it is sent as an SMS via Firebase.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard, useColorScheme,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import {
    cleanPhone, isValidPhone, isFirebaseAvailable,
    sendWhatsAppOtp, verifyWhatsAppOtp,
    sendFirebaseOtp, confirmFirebaseOtp, loginWithFirebaseUser, onFirebaseAutoVerified, firebaseErrorMessage,
} from '../../services/phoneAuth';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) { }

const OTP_LENGTH = 6;

/**
 * Props:
 *  onAuthenticated(data)  — called with { token, user, isNewUser } after a successful login / sign-up
 *  initialPhone           — pre-filled number (e.g. typed into the email box)
 *  autoSend               — send the code immediately when initialPhone is valid
 *  onError(message)       — optional, to surface errors in the screen's alert banner
 */
export default function PhoneLoginForm({ onAuthenticated, initialPhone = '', autoSend = false, onError }) {
    const scheme = useColorScheme();
    const theme = scheme === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = scheme === 'dark';
    const s = makeStyles(C, isDark);

    const [step, setStep] = useState('phone');            // 'phone' | 'otp'
    const [channel, setChannel] = useState('whatsapp');   // 'whatsapp' | 'firebase'
    const [phone, setPhone] = useState(cleanPhone(initialPhone));
    const [otp, setOtp] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [focus, setFocus] = useState(false);

    const confirmationRef = useRef(null);
    const otpRef = useRef(null);
    const doneRef = useRef(false);
    const autoSentRef = useRef(false);

    const fail = useCallback((msg) => { setError(msg); onError?.(msg); }, [onError]);

    // resend countdown
    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const finish = useCallback((data) => {
        if (doneRef.current) return;
        doneRef.current = true;
        onAuthenticated?.(data);
    }, [onAuthenticated]);

    // Android may verify the SMS by itself → sign in without typing the code
    useEffect(() => {
        if (channel !== 'firebase' || step !== 'otp') return undefined;
        return onFirebaseAutoVerified(async (user) => {
            if (doneRef.current) return;
            try { setBusy(true); finish(await loginWithFirebaseUser(user)); }
            catch (e) { setBusy(false); fail(firebaseErrorMessage(e)); }
        });
    }, [channel, step, finish, fail]);

    // ── send ────────────────────────────────────────────────────────────────
    const goOtp = (ch, seconds) => {
        setChannel(ch); setOtp(''); setError(''); setCooldown(seconds); setStep('otp');
        setTimeout(() => otpRef.current?.focus(), 250);
    };

    const sendViaFirebase = useCallback(async () => {
        if (!isFirebaseAvailable()) { fail('SMS verification is not available. Please try again later or use email & password.'); return; }
        try {
            confirmationRef.current = await sendFirebaseOtp(phone);
            goOtp('firebase', 60);
        } catch (e) { fail(firebaseErrorMessage(e)); }
    }, [phone, fail]);

    const sendCode = useCallback(async () => {
        Keyboard.dismiss();
        setError('');
        if (!isValidPhone(phone)) { fail('Enter a valid 10-digit mobile number.'); return; }
        setBusy(true);
        try {
            const d = await sendWhatsAppOtp(phone);
            goOtp('whatsapp', d?.resendIn || 30);
        } catch (e) {
            const r = e?.response;
            if (r?.status === 429 && r.data?.retryAfter) goOtp('whatsapp', r.data.retryAfter);   // a code was just sent
            else if (r?.data?.fallback === 'firebase') await sendViaFirebase();                    // WhatsApp unavailable → SMS
            else fail(r?.data?.message || 'Could not send the code. Please try again.');
        } finally { setBusy(false); }
    }, [phone, fail, sendViaFirebase]);

    const useSmsInstead = async () => { setBusy(true); setError(''); try { await sendViaFirebase(); } finally { setBusy(false); } };

    useEffect(() => {
        if (autoSend && !autoSentRef.current && isValidPhone(initialPhone)) { autoSentRef.current = true; sendCode(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── verify ──────────────────────────────────────────────────────────────
    const verify = useCallback(async (code) => {
        if (busy || doneRef.current) return;
        if (code.length !== OTP_LENGTH) { fail(`Enter the ${OTP_LENGTH}-digit code.`); return; }
        Keyboard.dismiss();
        setBusy(true); setError('');
        try {
            const data = channel === 'firebase'
                ? await confirmFirebaseOtp(confirmationRef.current, code)
                : await verifyWhatsAppOtp(phone, code);
            finish(data);
        } catch (e) {
            fail(channel === 'firebase' ? firebaseErrorMessage(e) : (e?.response?.data?.message || 'Verification failed. Please try again.'));
            setOtp('');
        } finally { setBusy(false); }
    }, [busy, channel, phone, finish, fail]);

    const onOtpChange = (t) => {
        const v = t.replace(/\D/g, '').slice(0, OTP_LENGTH);
        setOtp(v);
        if (v.length === OTP_LENGTH) verify(v);        // submit as soon as the 6th digit is in
    };

    const pasteCode = async () => {
        const text = await Clipboard.getStringAsync();
        const m = /\d{6}/.exec(text || '');
        if (m) onOtpChange(m[0]); else fail('No 6-digit code found on the clipboard.');
    };

    const cta = (label, onPress, disabled) => {
        const inner = busy ? <ActivityIndicator color="#1a1a1a" size="small" /> : <Text style={s.ctaText}>{label}</Text>;
        const btn = (
            <TouchableOpacity style={[s.ctaButton, !LinearGradient && { backgroundColor: C.primary }]} onPress={onPress} disabled={busy || disabled} activeOpacity={0.9}>
                {inner}
            </TouchableOpacity>
        );
        return LinearGradient
            ? <LinearGradient colors={['#E2A731', '#B87D1A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.ctaWrap, disabled && { opacity: 0.5 }]}>{btn}</LinearGradient>
            : <View style={[s.ctaWrap, disabled && { opacity: 0.5 }]}>{btn}</View>;
    };

    // ── UI ──────────────────────────────────────────────────────────────────
    if (step === 'phone') {
        return (
            <View style={[s.card, theme.shadow.soft]}>
                <View style={s.fieldGroup}>
                    <Text style={s.fieldLabel}>Mobile number</Text>
                    <View style={[s.shell, { borderColor: focus ? C.primary : 'transparent' }]}>
                        <Text style={[s.prefix, { color: C.textPrimary }]}>+91</Text>
                        <View style={s.sep} />
                        <TextInput
                            style={[s.textInput, { color: C.textPrimary }]}
                            value={phone}
                            onChangeText={(t) => { setPhone(cleanPhone(t)); setError(''); }}
                            placeholder="98765 43210"
                            placeholderTextColor={C.textMuted}
                            keyboardType="phone-pad"
                            maxLength={14}
                            autoComplete="tel"
                            textContentType="telephoneNumber"
                            onFocus={() => setFocus(true)}
                            onBlur={() => setFocus(false)}
                            onSubmitEditing={sendCode}
                            selectionColor={C.primary}
                        />
                    </View>
                    {!!error && <Text style={s.errorText}>{error}</Text>}
                </View>
                {cta('Get code on WhatsApp', sendCode, phone.length < 10)}
                <Text style={s.hint}>New here? We'll create your account automatically.</Text>
            </View>
        );
    }

    return (
        <View style={[s.card, theme.shadow.soft]}>
            <Text style={[s.title, { color: C.textPrimary }]}>Enter the 6-digit code</Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>
                Sent {channel === 'firebase' ? 'by SMS' : 'on WhatsApp'} to +91 {phone}{'  '}
                <Text style={{ color: C.primary, fontWeight: '700' }} onPress={() => { setStep('phone'); setOtp(''); setError(''); }}>Change</Text>
            </Text>

            <TouchableOpacity activeOpacity={1} onPress={() => otpRef.current?.focus()} style={s.boxRow}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <View key={i} style={[s.box, { borderColor: i === otp.length ? C.primary : 'transparent' }]}>
                        <Text style={[s.boxText, { color: C.textPrimary }]}>{otp[i] || ''}</Text>
                    </View>
                ))}
                <TextInput
                    ref={otpRef}
                    value={otp}
                    onChangeText={onOtpChange}
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                    caretHidden
                    style={s.hiddenInput}
                />
            </TouchableOpacity>
            {!!error && <Text style={[s.errorText, { textAlign: 'center' }]}>{error}</Text>}

            {cta('Verify & Continue', () => verify(otp), otp.length < OTP_LENGTH)}

            <View style={s.linksRow}>
                {channel === 'whatsapp' && (
                    <TouchableOpacity onPress={pasteCode} hitSlop={8}><Text style={[s.link, { color: C.primary }]}>Paste code</Text></TouchableOpacity>
                )}
                <TouchableOpacity onPress={sendCode} disabled={cooldown > 0 || busy || channel === 'firebase'} hitSlop={8} style={channel === 'firebase' ? { display: 'none' } : undefined}>
                    <Text style={[s.link, { color: cooldown > 0 ? C.textMuted : C.primary }]}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend on WhatsApp'}</Text>
                </TouchableOpacity>
                {channel === 'firebase' && (
                    <TouchableOpacity onPress={useSmsInstead} disabled={cooldown > 0 || busy} hitSlop={8}>
                        <Text style={[s.link, { color: cooldown > 0 ? C.textMuted : C.primary }]}>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend SMS'}</Text>
                    </TouchableOpacity>
                )}
            </View>
            {channel === 'whatsapp' && (
                <TouchableOpacity onPress={useSmsInstead} disabled={busy} hitSlop={8} style={{ alignSelf: 'center' }}>
                    <Text style={[s.link, { color: C.textSecondary }]}>Didn't get it? Send as SMS instead</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

function makeStyles(C, isDark) {
    return StyleSheet.create({
        card: {
            backgroundColor: isDark ? 'rgba(28,22,16,0.90)' : 'rgba(255,255,255,0.94)',
            borderRadius: 28, padding: 22, gap: 16, borderWidth: 1, borderColor: C.border,
        },
        fieldGroup: { gap: 7 },
        fieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.9, textTransform: 'uppercase', color: C.textMuted, paddingHorizontal: 2 },
        shell: {
            flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14,
            paddingVertical: 11, borderWidth: 1.5, backgroundColor: isDark ? '#1C1610' : '#FFF4E0',
        },
        prefix: { fontSize: 15, fontWeight: '700' },
        sep: { width: 1, height: 18, backgroundColor: C.border },
        textInput: { flex: 1, fontSize: 16, letterSpacing: 1, paddingVertical: 0, includeFontPadding: false },
        errorText: { color: C.error, fontSize: 12, paddingHorizontal: 2 },
        hint: { color: C.textMuted, fontSize: 12, textAlign: 'center' },
        title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
        sub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
        boxRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
        box: {
            width: 44, height: 52, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
            backgroundColor: isDark ? '#1C1610' : '#FFF4E0',
        },
        boxText: { fontSize: 22, fontWeight: '800' },
        hiddenInput: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
        ctaWrap: { borderRadius: 15, overflow: 'hidden', marginTop: 4 },
        ctaButton: { paddingVertical: 17, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
        ctaText: { fontSize: 15, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', color: '#1A1A1A' },
        linksRow: { flexDirection: 'row', justifyContent: 'center', gap: 22 },
        link: { fontSize: 12, fontWeight: '700' },
    });
}
