// src/components/auth/RegistrationForm.js
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Platform,
    useColorScheme,
    ScrollView,
} from 'react-native';
import { LightTheme, DarkTheme } from '../../styles/Theme';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) { }

const { width: W } = require('react-native').Dimensions.get('window');
const isSmall = W <= 375;

export default function RegisterForm({ onSubmit, onLogin, loading = false }) {
    const scheme = useColorScheme();
    const theme = scheme === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = scheme === 'dark';

    // Base fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [accountType, setAccountType] = useState('personal');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    // Business fields
    const [businessName, setBusinessName] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [businessType, setBusinessType] = useState('');

    const [errors, setErrors] = useState({});

    // Refs
    const lastNameRef = useRef(null);
    const phoneRef = useRef(null);
    const emailRef = useRef(null);
    const referralRef = useRef(null);
    const passRef = useRef(null);
    const confirmRef = useRef(null);
    const businessNameRef = useRef(null);
    const addressRef = useRef(null);
    const cityRef = useRef(null);
    const stateRef = useRef(null);
    const pincodeRef = useRef(null);
    const businessTypeRef = useRef(null);

    const ctaScale = useRef(new Animated.Value(1)).current;

    const pressIn = () => Animated.spring(ctaScale, { toValue: 0.96, useNativeDriver: true, speed: 50 }).start();
    const pressOut = () => Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, speed: 18 }).start();

    const validate = () => {
        const newErrors = {};
        if (!firstName.trim()) newErrors.firstName = 'First name is required';
        if (!lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!phone.trim()) newErrors.phone = 'Phone number is required';
        else if (!/^[0-9+\-\s()]{8,20}$/.test(phone)) newErrors.phone = 'Invalid phone number';
        if (!email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
        if (!password) newErrors.password = 'Password is required';
        else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        // Business validations
        if (accountType === 'business') {
            if (!businessName.trim()) newErrors.businessName = 'Business name is required';
            if (!address.trim()) newErrors.address = 'Address is required';
            if (!city.trim()) newErrors.city = 'City is required';
            if (!state.trim()) newErrors.state = 'State is required';
            if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
            else if (!/^\d{6}$/.test(pincode)) newErrors.pincode = 'Invalid pincode (6 digits)';
            if (!businessType.trim()) newErrors.businessType = 'Business type is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            const formData = {
                firstName,
                lastName,
                phone,
                email,
                referralCode,
                accountType,
                password,
                ...(accountType === 'business' && {
                    businessName,
                    address,
                    city,
                    state,
                    pincode,
                    businessType,
                }),
            };
            onSubmit(formData);
        }
    };

    const s = formStyles(C, isDark);

    const RadioButton = ({ label, value, selected, onPress }) => (
        <TouchableOpacity style={s.radioItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[s.radioCircle, selected && s.radioSelected]} />
            <Text style={s.radioLabel}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={s.card}>
            {/* First & Last Name row */}
            <View style={s.row}>
                <View style={[s.halfField, { marginRight: 8 }]}>
                    <Text style={s.fieldLabel}>First Name</Text>
                    <View style={s.inputContainer}>
                        <TextInput
                            style={s.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Tejasvi"
                            placeholderTextColor={C.textMuted}
                            returnKeyType="next"
                            onSubmitEditing={() => lastNameRef.current?.focus()}
                        />
                    </View>
                    {errors.firstName && <Text style={s.errorText}>{errors.firstName}</Text>}
                </View>
                <View style={s.halfField}>
                    <Text style={s.fieldLabel}>Last Name</Text>
                    <View style={s.inputContainer}>
                        <TextInput
                            ref={lastNameRef}
                            style={s.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Bihari"
                            placeholderTextColor={C.textMuted}
                            returnKeyType="next"
                            onSubmitEditing={() => phoneRef.current?.focus()}
                        />
                    </View>
                    {errors.lastName && <Text style={s.errorText}>{errors.lastName}</Text>}
                </View>
            </View>

            {/* Phone */}
            <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Phone Number</Text>
                <View style={s.inputContainer}>
                    <TextInput
                        ref={phoneRef}
                        style={s.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+91 234 567 8900"
                        placeholderTextColor={C.textMuted}
                        keyboardType="phone-pad"
                        returnKeyType="next"
                        onSubmitEditing={() => emailRef.current?.focus()}
                    />
                </View>
                {errors.phone && <Text style={s.errorText}>{errors.phone}</Text>}
            </View>

            {/* Email */}
            <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Email</Text>
                <View style={s.inputContainer}>
                    <TextInput
                        ref={emailRef}
                        style={s.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="rider@repairomoto.com"
                        placeholderTextColor={C.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={() => referralRef.current?.focus()}
                    />
                </View>
                {errors.email && <Text style={s.errorText}>{errors.email}</Text>}
            </View>

            {/* Referral Code (optional) */}
            <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Referral Code (optional)</Text>
                <View style={s.inputContainer}>
                    <TextInput
                        ref={referralRef}
                        style={s.input}
                        value={referralCode}
                        onChangeText={setReferralCode}
                        placeholder="REF123"
                        placeholderTextColor={C.textMuted}
                        autoCapitalize="characters"
                        returnKeyType="next"
                        onSubmitEditing={() => passRef.current?.focus()}
                    />
                </View>
            </View>

            {/* Account Type - Radio Buttons */}
            <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Account Type</Text>
                <View style={s.radioGroup}>
                    <RadioButton
                        label="Personal"
                        value="personal"
                        selected={accountType === 'personal'}
                        onPress={() => setAccountType('personal')}
                    />
                    <RadioButton
                        label="Business"
                        value="business"
                        selected={accountType === 'business'}
                        onPress={() => setAccountType('business')}
                    />
                </View>
            </View>

            {/* Conditional Business Fields */}
            {accountType === 'business' && (
                <View style={s.businessSection}>
                    <Text style={s.sectionTitle}>Business Details</Text>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>Business Name</Text>
                        <View style={s.inputContainer}>
                            <TextInput
                                ref={businessNameRef}
                                style={s.input}
                                value={businessName}
                                onChangeText={setBusinessName}
                                placeholder="Elite Auto Works"
                                placeholderTextColor={C.textMuted}
                                returnKeyType="next"
                                onSubmitEditing={() => addressRef.current?.focus()}
                            />
                        </View>
                        {errors.businessName && <Text style={s.errorText}>{errors.businessName}</Text>}
                    </View>

                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>Address</Text>
                        <View style={s.inputContainer}>
                            <TextInput
                                ref={addressRef}
                                style={s.input}
                                value={address}
                                onChangeText={setAddress}
                                placeholder="Street, building, etc."
                                placeholderTextColor={C.textMuted}
                                returnKeyType="next"
                                onSubmitEditing={() => cityRef.current?.focus()}
                            />
                        </View>
                        {errors.address && <Text style={s.errorText}>{errors.address}</Text>}
                    </View>

                    <View style={s.row}>
                        <View style={[s.halfField, { marginRight: 8 }]}>
                            <Text style={s.fieldLabel}>City</Text>
                            <View style={s.inputContainer}>
                                <TextInput
                                    ref={cityRef}
                                    style={s.input}
                                    value={city}
                                    onChangeText={setCity}
                                    placeholder="Mumbai"
                                    placeholderTextColor={C.textMuted}
                                    returnKeyType="next"
                                    onSubmitEditing={() => stateRef.current?.focus()}
                                />
                            </View>
                            {errors.city && <Text style={s.errorText}>{errors.city}</Text>}
                        </View>
                        <View style={s.halfField}>
                            <Text style={s.fieldLabel}>State</Text>
                            <View style={s.inputContainer}>
                                <TextInput
                                    ref={stateRef}
                                    style={s.input}
                                    value={state}
                                    onChangeText={setState}
                                    placeholder="Maharashtra"
                                    placeholderTextColor={C.textMuted}
                                    returnKeyType="next"
                                    onSubmitEditing={() => pincodeRef.current?.focus()}
                                />
                            </View>
                            {errors.state && <Text style={s.errorText}>{errors.state}</Text>}
                        </View>
                    </View>

                    <View style={s.row}>
                        <View style={[s.halfField, { marginRight: 8 }]}>
                            <Text style={s.fieldLabel}>Pincode</Text>
                            <View style={s.inputContainer}>
                                <TextInput
                                    ref={pincodeRef}
                                    style={s.input}
                                    value={pincode}
                                    onChangeText={setPincode}
                                    placeholder="400001"
                                    placeholderTextColor={C.textMuted}
                                    keyboardType="numeric"
                                    returnKeyType="next"
                                    onSubmitEditing={() => businessTypeRef.current?.focus()}
                                />
                            </View>
                            {errors.pincode && <Text style={s.errorText}>{errors.pincode}</Text>}
                        </View>
                        <View style={s.halfField}>
                            <Text style={s.fieldLabel}>Business Type</Text>
                            <View style={s.inputContainer}>
                                <TextInput
                                    ref={businessTypeRef}
                                    style={s.input}
                                    value={businessType}
                                    onChangeText={setBusinessType}
                                    placeholder="Workshop, Spares, etc."
                                    placeholderTextColor={C.textMuted}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit}
                                />
                            </View>
                            {errors.businessType && <Text style={s.errorText}>{errors.businessType}</Text>}
                        </View>
                    </View>
                </View>
            )}

            {/* Password */}
            <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Password</Text>
                <View style={s.inputContainer}>
                    <TextInput
                        ref={passRef}
                        style={s.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor={C.textMuted}
                        secureTextEntry={!showPass}
                        returnKeyType="next"
                        onSubmitEditing={() => confirmRef.current?.focus()}
                    />
                    <TouchableOpacity onPress={() => setShowPass(!showPass)} hitSlop={12}>
                        <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
                    </TouchableOpacity>
                </View>
                {errors.password && <Text style={s.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Confirm Password</Text>
                <View style={s.inputContainer}>
                    <TextInput
                        ref={confirmRef}
                        style={s.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="••••••••"
                        placeholderTextColor={C.textMuted}
                        secureTextEntry={!showConfirmPass}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                    />
                    <TouchableOpacity onPress={() => setShowConfirmPass(!showConfirmPass)} hitSlop={12}>
                        <Text style={s.eyeIcon}>{showConfirmPass ? '🙈' : '👁'}</Text>
                    </TouchableOpacity>
                </View>
                {errors.confirmPassword && <Text style={s.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* CTA Button */}
            <Animated.View style={[{ transform: [{ scale: ctaScale }] }, s.ctaWrap]}>
                <TouchableOpacity
                    style={[s.ctaButton, { backgroundColor: C.primary }]}
                    onPress={handleSubmit}
                    onPressIn={pressIn}
                    onPressOut={pressOut}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    {loading ? (
                        <ActivityIndicator color="#1a1a1a" size="small" />
                    ) : (
                        <View style={s.ctaInner}>
                            <Text style={s.ctaText}>Create Account</Text>
                            <Text style={s.ctaIcon}>→</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>

            {/* Login Link */}
            <View style={s.loginLink}>
                <Text style={s.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={onLogin}>
                    <Text style={s.loginButtonText}>Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function formStyles(C, isDark) {
    return StyleSheet.create({
        card: {
            backgroundColor: isDark ? 'rgba(28,22,16,0.90)' : 'rgba(255,255,255,0.94)',
            borderRadius: 28,
            padding: 24,
            gap: 16,
            borderWidth: 1,
            borderColor: C.border,
        },
        row: { flexDirection: 'row', justifyContent: 'space-between' },
        halfField: { flex: 1 },
        fieldGroup: { gap: 4 },
        fieldLabel: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.0,
            textTransform: 'uppercase',
            color: C.textMuted,
            marginLeft: 4,
        },
        inputContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#1C1610' : '#FFF8EE',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 12 : 10,
            borderWidth: 1,
            borderColor: 'transparent',
        },
        input: {
            flex: 1,
            fontSize: 14,
            color: C.textPrimary,
            paddingVertical: 0,
        },
        eyeIcon: { fontSize: 16, color: C.textMuted, marginLeft: 8 },
        errorText: { fontSize: 11, color: '#ff4d4d', marginLeft: 12, marginTop: 2 },
        radioGroup: { flexDirection: 'row', gap: 20, marginTop: 4 },
        radioItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        radioCircle: {
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: C.primary,
            backgroundColor: 'transparent',
        },
        radioSelected: { backgroundColor: C.primary },
        radioLabel: { fontSize: 13, color: C.textPrimary },
        ctaWrap: { marginTop: 8 },
        ctaButton: {
            borderRadius: 40,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: C.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 6,
        },
        ctaInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        ctaText: {
            fontSize: 14,
            fontWeight: '800',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: '#1a1a1a',
        },
        ctaIcon: { fontSize: 16, color: '#1a1a1a', fontWeight: 'bold' },
        loginLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
        loginText: { fontSize: 12, color: C.textSecondary },
        loginButtonText: { fontSize: 12, fontWeight: '700', color: C.primary, textDecorationLine: 'underline' },
        businessSection: { gap: 12, marginTop: 4 },
        sectionTitle: { fontSize: 12, fontWeight: '600', color: C.primary, marginBottom: 4, letterSpacing: 0.5 },
    });
}