import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import SettingsAvatar from '../../components/settings/SettingsAvatar';
import { SettingsSectionHeader, SettingsField, PasswordField } from '../../components/settings/SettingsField';
import SettingsPreferences from '../../components/settings/SettingsPreferences';
import ChangePasswordModal from '../../components/settings/ChangePasswordModal';
import { useUser } from '../../hooks/useUser';
import { getImageUrl } from '../../utils/imageUtils'; // <-- import helper

function Toast({ message, type, visible }) {
    const translateY = useRef(new Animated.Value(-70)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, { toValue: -70, duration: 260, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);
    const bg = type === 'success' ? '#2ECC9A' : '#FF6B6B';
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    return (
        <Animated.View style={[toastStyles.wrap, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
            <View style={[toastStyles.inner, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={icon} size={16} color="#fff" />
                <Text style={toastStyles.msg}>{message}</Text>
            </View>
        </Animated.View>
    );
}
const toastStyles = StyleSheet.create({
    wrap: { position: 'absolute', top: 10, left: 20, right: 20, zIndex: 999 },
    inner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
    msg: { fontSize: 12, fontWeight: '700', color: '#fff', flex: 1 },
});

export default function SettingsScreen({ navigation }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';
    const user = useSelector((s) => s.auth.user);

    const { updateProfile, loading: updateLoading } = useUser();

    const [form, setForm] = useState({
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        phone: user?.phone ?? '',
        email: user?.email ?? '',
        accountType: user?.accountType ?? 'personal',
        businessName: user?.businessName ?? '',
        address: user?.address ?? '',
        city: user?.city ?? '',
        state: user?.state ?? '',
        gstin: user?.gstin ?? '',
        pincode: user?.pincode ?? '',
    });

    const [avatarAsset, setAvatarAsset] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [toastType, setToastType] = useState('success');
    const [showToast, setShowToast] = useState(false);

    const phoneRef = useRef(null);

    const showToastMsg = (msg, type = 'success') => {
        setToastMsg(msg); setToastType(type); setShowToast(true);
        setTimeout(() => setShowToast(false), 3200);
    };

    const isDirty = JSON.stringify({
        firstName: form.firstName, lastName: form.lastName,
        phone: form.phone, accountType: form.accountType,
        businessName: form.businessName, address: form.address,
        city: form.city, state: form.state, gstin: form.gstin, pincode: form.pincode,
    }) !== JSON.stringify({
        firstName: user?.firstName ?? '', lastName: user?.lastName ?? '',
        phone: user?.phone ?? '', accountType: user?.accountType ?? 'personal',
        businessName: user?.businessName ?? '', address: user?.address ?? '',
        city: user?.city ?? '', state: user?.state ?? '',
        gstin: user?.gstin ?? '', pincode: user?.pincode ?? '',
    });

    const validate = () => {
        if (!form.firstName.trim()) { showToastMsg('First name is required', 'error'); return false; }
        if (!form.phone.trim()) { showToastMsg('Phone number is required', 'error'); return false; }
        if (form.accountType === 'business' && !form.businessName.trim()) {
            showToastMsg('Company name is required for business accounts', 'error'); return false;
        }
        return true;
    };

    const handleSave = useCallback(async () => {
        if (!validate()) return;
        try {
            const userData = {
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                phone: form.phone.trim(),
                accountType: form.accountType,
            };
            if (form.accountType === 'business') {
                userData.businessName = form.businessName.trim();
                userData.address = form.address?.trim();
                userData.city = form.city?.trim();
                userData.state = form.state?.trim();
                userData.gstin = form.gstin.trim();
                userData.pincode = form.pincode.trim();
            }
            await updateProfile(userData, avatarAsset);
            showToastMsg('Settings saved successfully!', 'success');
            setAvatarAsset(null);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Update failed';
            showToastMsg(msg, 'error');
        }
    }, [form, avatarAsset, updateProfile, validate]);

    // Build avatar source – for existing profile image, convert relative path to full URL
    const avatarSource = avatarAsset
        ? { uri: avatarAsset.uri }
        : user?.profileImage
            ? { uri: getImageUrl(user.profileImage) }  // <-- fixed here
            : null;

    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const memberSince = user?.createdAt;

    const s = makeStyles(C, isDark);

    return (
        <ScreenWrapper
            title="Settings"
            rightSlot={
                <TouchableOpacity onPress={() => Alert.alert('Settings', 'More options coming soon.')} hitSlop={10}>
                    <Ionicons name="ellipsis-vertical" size={20} color={C.textSecondary} />
                </TouchableOpacity>
            }
        >
            <Toast message={toastMsg} type={toastType} visible={showToast} />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
                <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <SettingsAvatar
                        avatarSource={avatarSource}
                        name={fullName || user?.firstName}
                        memberTag={user?.accountType === 'business' ? 'BUSINESS' : 'PREMIUM'}
                        memberSince={memberSince}
                        onAvatarChange={setAvatarAsset}
                        C={C}
                        isDark={isDark}
                    />

                    <View style={s.section}>
                        <SettingsSectionHeader eyebrow="IDENTITY" title="Personal Details" C={C} />
                        <View style={[s.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                            <View style={s.nameRow}>
                                <View style={{ flex: 1 }}>
                                    <SettingsField
                                        label="FIRST NAME"
                                        value={form.firstName}
                                        onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
                                        placeholder="First name"
                                        autoCapitalize="words"
                                        C={C} isDark={isDark}
                                        returnKeyType="next"
                                        onSubmitEditing={() => phoneRef.current?.focus()}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <SettingsField
                                        label="LAST NAME"
                                        value={form.lastName}
                                        onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
                                        placeholder="Last name"
                                        autoCapitalize="words"
                                        C={C} isDark={isDark}
                                    />
                                </View>
                            </View>
                            <SettingsField
                                label="PHONE NUMBER"
                                value={form.phone}
                                onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                                placeholder="+91 000 000 0000"
                                keyboardType="phone-pad"
                                C={C} isDark={isDark}
                                inputRef={phoneRef}
                            />
                            <SettingsField
                                label="EMAIL"
                                value={form.email}
                                editable={false}
                                placeholder="email@example.com"
                                C={C} isDark={isDark}
                                rightSlot={
                                    <View style={[s.verifiedBadge, { backgroundColor: 'rgba(46,204,154,0.12)' }]}>
                                        <MaterialCommunityIcons name="check-circle" size={12} color="#2ECC9A" />
                                        <Text style={s.verifiedText}>Verified</Text>
                                    </View>
                                }
                            />
                            <PasswordField label="PASSWORD" onChangeTap={() => setShowPasswordModal(true)} C={C} isDark={isDark} />
                        </View>
                    </View>

                    <SettingsPreferences form={form} setForm={setForm} C={C} isDark={isDark} />

                    <View style={s.ctaWrap}>
                        <TouchableOpacity
                            style={[s.ctaBtn, { backgroundColor: isDirty ? C.primary : isDark ? '#2A2318' : '#EDE8DC', opacity: updateLoading ? 0.8 : 1 }]}
                            onPress={handleSave}
                            disabled={updateLoading}
                            activeOpacity={0.85}
                        >
                            {updateLoading ? (
                                <ActivityIndicator color="#1a1a1a" size="small" />
                            ) : (
                                <View style={s.ctaInner}>
                                    <MaterialCommunityIcons name="content-save-outline" size={16} color={isDirty ? '#1a1a1a' : C.textMuted} />
                                    <Text style={[s.ctaLabel, { color: isDirty ? '#1a1a1a' : C.textMuted }]}>SAVE CHANGES</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        {!isDirty && <Text style={[s.noChanges, { color: C.textMuted }]}>No changes to save</Text>}
                    </View>
                    <View style={{ height: 30 }} />
                </ScrollView>
            </KeyboardAvoidingView>
            <ChangePasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} C={C} isDark={isDark} />
        </ScreenWrapper>
    );
}

function makeStyles(C, isDark) {
    return StyleSheet.create({
        scroll: { flexGrow: 1, gap: 20, paddingTop: 4, paddingBottom: 24 },
        section: { gap: 12 },
        card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
        nameRow: { flexDirection: 'row', gap: 10 },
        verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
        verifiedText: { fontSize: 9, fontWeight: '700', color: '#2ECC9A' },
        ctaWrap: { gap: 6, marginTop: 4 },
        ctaBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
        ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        ctaLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
        noChanges: { fontSize: 10, textAlign: 'center', letterSpacing: 0.2 },
    });
}