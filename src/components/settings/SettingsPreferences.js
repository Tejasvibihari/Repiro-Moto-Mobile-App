import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { SettingsSectionHeader, SettingsField } from './SettingsField';

let toggleTheme;
try { toggleTheme = require('../../store/slices/themeSlice').toggleTheme; } catch (_) { }

function PrefRow({ icon, label, right, C, isDark }) {
    return (
        <View style={[pr.row, { borderColor: C.border }]}>
            <View style={[pr.iconWrap, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                <MaterialCommunityIcons name={icon} size={16} color={C.primary} />
            </View>
            <Text style={[pr.label, { color: C.textPrimary }]}>{label}</Text>
            <View>{right}</View>
        </View>
    );
}
const pr = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
    iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    label: { flex: 1, fontSize: 14, fontWeight: '600' },
});

// Compact Account Type Switcher (now placed on its own row)
function AccountTypeSwitcher({ value, onChange, C, isDark }) {
    const types = [
        { id: 'personal', label: 'PERSONAL', icon: 'account-outline' },
        { id: 'business', label: 'BUSINESS', icon: 'office-building-outline' }
    ];

    return (
        <View style={[ats.container, { backgroundColor: isDark ? '#2A2318' : '#F0EDE6' }]}>
            {types.map((type) => {
                const isActive = value === type.id;
                return (
                    <TouchableOpacity
                        key={type.id}
                        onPress={() => onChange(type.id)}
                        style={[
                            ats.option,
                            isActive && { backgroundColor: C.primary }
                        ]}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name={type.icon}
                            size={12}
                            color={isActive ? '#1a1a1a' : C.textMuted}
                        />
                        <Text style={[
                            ats.label,
                            { color: isActive ? '#1a1a1a' : C.textMuted }
                        ]}>
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}
const ats = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 3,
        gap: 3,
        alignSelf: 'flex-start', // let it size naturally
        minWidth: 120,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 21,
    },
    label: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

// Business fields remain the same
function BusinessFields({ visible, form, setForm, C, isDark }) {
    const height = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(height, { toValue: visible ? 1 : 0, duration: 240, useNativeDriver: false }).start();
    }, [visible]);
    const animatedHeight = height.interpolate({ inputRange: [0, 1], outputRange: [0, 380] });

    return (
        <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
            <View style={bf.wrap}>
                <Text style={[bf.hint, { color: C.textMuted }]}>Business details for invoicing</Text>

                <SettingsField
                    label="Company Name"
                    value={form.businessName}
                    onChangeText={(v) => setForm((f) => ({ ...f, businessName: v }))}
                    placeholder="Company name"
                    C={C} isDark={isDark}
                />

                <SettingsField
                    label="Street Address"
                    value={form.address}
                    onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                    placeholder="Building, street, area"
                    C={C} isDark={isDark}
                />

                <View style={bf.row}>
                    <View style={{ flex: 1 }}>
                        <SettingsField
                            label="City"
                            value={form.city}
                            onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                            placeholder="City"
                            C={C} isDark={isDark}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <SettingsField
                            label="State"
                            value={form.state}
                            onChangeText={(v) => setForm((f) => ({ ...f, state: v }))}
                            placeholder="State"
                            C={C} isDark={isDark}
                        />
                    </View>
                </View>

                <View style={bf.row}>
                    <View style={{ flex: 1 }}>
                        <SettingsField
                            label="GSTIN"
                            value={form.gstin}
                            onChangeText={(v) => setForm((f) => ({ ...f, gstin: v.toUpperCase() }))}
                            placeholder="22AAAAA0000A1Z5"
                            autoCapitalize="characters"
                            C={C} isDark={isDark}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <SettingsField
                            label="ZIP Code"
                            value={form.pincode}
                            onChangeText={(v) => setForm((f) => ({ ...f, pincode: v }))}
                            placeholder="000000"
                            keyboardType="number-pad"
                            C={C} isDark={isDark}
                        />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}
const bf = StyleSheet.create({
    wrap: { gap: 14, paddingTop: 12 },
    hint: { fontSize: 10, lineHeight: 15, fontStyle: 'italic', marginBottom: 4 },
    row: { flexDirection: 'row', gap: 12 },
});

export default function SettingsPreferences({ form, setForm, C, isDark }) {
    const dispatch = useDispatch();
    const mode = useSelector((s) => s.theme.mode);
    const isDarkMode = mode === 'dark';
    const handleThemeToggle = () => { if (toggleTheme) dispatch(toggleTheme()); };
    const isBusiness = form.accountType === 'business';

    // Smaller switch component
    const SmallSwitch = ({ value, onValueChange, ...props }) => (
        <View style={{ transform: [{ scale: 0.7 }], marginHorizontal: -6 }}>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: isDark ? '#3A3020' : '#D6D0C8', true: C.primary }}
                thumbColor={value ? '#1a1a1a' : '#FFFFFF'}
                ios_backgroundColor={isDark ? '#3A3020' : '#D6D0C8'}
                {...props}
            />
        </View>
    );

    return (
        <View style={sp.section}>
            <SettingsSectionHeader eyebrow="SYSTEM" title="Preferences" C={C} />
            <View style={[sp.card, { backgroundColor: isDark ? '#1C1A14' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)' }]}>
                {/* Dark Mode row */}
                <PrefRow
                    icon="theme-light-dark"
                    label="Dark Mode"
                    C={C}
                    isDark={isDark}
                    right={<SmallSwitch value={isDarkMode} onValueChange={handleThemeToggle} />}
                />

                {/* Account Type section - separate row with label above */}
                <View style={sp.accountTypeSection}>
                    <View style={sp.accountTypeLabel}>
                        <View style={[pr.iconWrap, { backgroundColor: isDark ? '#2A2318' : '#FFF4E0' }]}>
                            <MaterialCommunityIcons name="account-cog-outline" size={16} color={C.primary} />
                        </View>
                        <Text style={[sp.accountTypeText, { color: C.textPrimary }]}>Account Type</Text>
                    </View>
                    <View style={sp.switcherWrapper}>
                        <AccountTypeSwitcher
                            value={form.accountType}
                            onChange={(t) => setForm((f) => ({ ...f, accountType: t }))}
                            C={C}
                            isDark={isDark}
                        />
                    </View>
                </View>

                <BusinessFields visible={isBusiness} form={form} setForm={setForm} C={C} isDark={isDark} />
            </View>
        </View>
    );
}
const sp = StyleSheet.create({
    section: { gap: 12 },
    card: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    accountTypeSection: {
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        gap: 10,
    },
    accountTypeLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    accountTypeText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    switcherWrapper: {
        paddingLeft: 44, // align with the label text (icon width 32 + gap 12)
    },
});