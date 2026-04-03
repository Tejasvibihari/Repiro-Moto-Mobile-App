// components/settings/ChangePasswordModal.js
// Bottom sheet modal for changing password.
// Calls POST /api/user/auth/change-password (adjust endpoint to yours)

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    Animated,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axiosClient from '../../services/axiosClient';

function PasswordInput({ label, value, onChange, placeholder, C, isDark, inputRef, returnKeyType, onSubmitEditing }) {
    const [show, setShow] = useState(false);
    const [focused, setFocused] = useState(false);

    return (
        <View style={pi.group}>
            <Text style={[pi.label, { color: C.textMuted }]}>{label}</Text>
            <View style={[pi.shell, {
                backgroundColor: isDark ? '#141210' : '#F5F2EC',
                borderColor: focused ? C.primary : 'transparent',
            }]}>
                <TextInput
                    ref={inputRef}
                    style={[pi.input, { color: C.textPrimary }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={C.textMuted}
                    secureTextEntry={!show}
                    returnKeyType={returnKeyType ?? 'next'}
                    onSubmitEditing={onSubmitEditing}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    selectionColor={C.primary}
                />
                <TouchableOpacity onPress={() => setShow((v) => !v)} hitSlop={10}>
                    <Ionicons
                        name={show ? 'eye-off-outline' : 'eye-outline'}
                        size={17}
                        color={C.textMuted}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const pi = StyleSheet.create({
    group: { gap: 7 },
    label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', marginLeft: 2 },
    shell: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 13 : 10,
        gap: 10,
    },
    input: { flex: 1, fontSize: 15, paddingVertical: 0, includeFontPadding: false },
});

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function ChangePasswordModal({ visible, onClose, C, isDark }) {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('idle'); // idle | loading | success | error

    const slideY = useRef(new Animated.Value(500)).current;

    const nextRef = useRef(null);
    const confirmRef = useRef(null);

    useEffect(() => {
        if (visible) {
            setCurrent(''); setNext(''); setConfirm(''); setError(''); setStatus('idle');
            Animated.spring(slideY, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }).start();
        } else {
            Animated.timing(slideY, { toValue: 500, duration: 260, useNativeDriver: true }).start();
        }
    }, [visible]);

    const validate = () => {
        if (!current.trim()) return 'Current password is required';
        if (next.length < 6) return 'New password must be at least 6 characters';
        if (next !== confirm) return 'Passwords do not match';
        if (next === current) return 'New password must differ from current';
        return null;
    };

    const handleSubmit = async () => {
        const err = validate();
        if (err) { setError(err); return; }

        setStatus('loading'); setError('');
        try {
            await axiosClient.post('/api/user/auth/change-password', {
                currentPassword: current,
                newPassword: next,
            });
            setStatus('success');
            setTimeout(() => onClose(), 1400);
        } catch (e) {
            setStatus('error');
            setError(e.response?.data?.message ?? 'Failed to change password. Try again.');
        }
    };

    const canSubmit = current && next.length >= 6 && confirm && status !== 'loading';

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {/* Backdrop */}
                <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />

                {/* Sheet */}
                <Animated.View style={[m.sheet, {
                    backgroundColor: isDark ? '#1C1A14' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                    transform: [{ translateY: slideY }],
                }]}>
                    <View style={[m.handle, { backgroundColor: isDark ? '#3A3020' : '#DDD8D0' }]} />

                    <View style={m.header}>
                        <View>
                            <Text style={[m.title, { color: C.textPrimary }]}>Change Password</Text>
                            <Text style={[m.sub, { color: C.textMuted }]}>Choose a strong password</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={12} activeOpacity={0.7}>
                            <Ionicons name="close" size={22} color={C.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <View style={m.fields}>
                            <PasswordInput
                                label="Current Password"
                                value={current}
                                onChange={(v) => { setCurrent(v); setError(''); setStatus('idle'); }}
                                placeholder="Enter current password"
                                C={C} isDark={isDark}
                                returnKeyType="next"
                                onSubmitEditing={() => nextRef.current?.focus()}
                            />
                            <PasswordInput
                                label="New Password"
                                value={next}
                                onChange={(v) => { setNext(v); setError(''); setStatus('idle'); }}
                                placeholder="Min. 6 characters"
                                C={C} isDark={isDark}
                                inputRef={nextRef}
                                returnKeyType="next"
                                onSubmitEditing={() => confirmRef.current?.focus()}
                            />
                            <PasswordInput
                                label="Confirm New Password"
                                value={confirm}
                                onChange={(v) => { setConfirm(v); setError(''); setStatus('idle'); }}
                                placeholder="Repeat new password"
                                C={C} isDark={isDark}
                                inputRef={confirmRef}
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />

                            {/* Strength note */}
                            <View style={[m.strengthNote, { backgroundColor: isDark ? '#2A2318' : '#FFF8EC', borderColor: C.border }]}>
                                <MaterialCommunityIcons name="shield-check-outline" size={13} color={C.primary} />
                                <Text style={[m.strengthText, { color: C.textMuted }]}>
                                    Use 8+ characters with a mix of letters, numbers, and symbols for a stronger password.
                                </Text>
                            </View>

                            {/* Error */}
                            {!!error && (
                                <View style={m.errBanner}>
                                    <Ionicons name="alert-circle-outline" size={14} color="#FF6B6B" />
                                    <Text style={m.errText}>{error}</Text>
                                </View>
                            )}
                        </View>

                        {/* Submit */}
                        <TouchableOpacity
                            style={[m.submitBtn, {
                                backgroundColor: status === 'success' ? '#2ECC9A' : C.primary,
                                opacity: canSubmit ? 1 : 0.5,
                            }]}
                            onPress={handleSubmit}
                            disabled={!canSubmit}
                            activeOpacity={0.85}
                        >
                            {status === 'loading' ? (
                                <ActivityIndicator color="#1a1a1a" size="small" />
                            ) : status === 'success' ? (
                                <View style={m.btnInner}>
                                    <MaterialCommunityIcons name="check" size={18} color="#fff" />
                                    <Text style={[m.btnLabel, { color: '#fff' }]}>Password Updated!</Text>
                                </View>
                            ) : (
                                <View style={m.btnInner}>
                                    <MaterialCommunityIcons name="lock-reset" size={18} color="#1a1a1a" />
                                    <Text style={[m.btnLabel, { color: '#1a1a1a' }]}>Update Password</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const m = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderWidth: 1, borderBottomWidth: 0,
        paddingHorizontal: 22, paddingTop: 10, paddingBottom: 40,
    },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: '900' },
    sub: { fontSize: 12, marginTop: 3 },
    fields: { gap: 16, marginBottom: 20 },
    strengthNote: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        borderRadius: 10, borderWidth: 1, padding: 10,
    },
    strengthText: { fontSize: 11, flex: 1, lineHeight: 17 },
    errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    errText: { fontSize: 12, color: '#FF6B6B', flex: 1 },
    submitBtn: {
        borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btnLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
});