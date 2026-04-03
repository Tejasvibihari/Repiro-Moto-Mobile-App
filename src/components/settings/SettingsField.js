import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Platform, // <-- make sure Platform is imported
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Section header ───────────────────────────────────────────────────────────
export function SettingsSectionHeader({ eyebrow, title, C }) {
    return (
        <View style={sh.wrap}>
            <Text style={[sh.eyebrow, { color: C.primary }]}>{eyebrow}</Text>
            <Text style={[sh.title, { color: C.textPrimary }]}>{title}</Text>
        </View>
    );
}

const sh = StyleSheet.create({
    wrap: { gap: 1, marginBottom: 4 },
    eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.2 },
});

// ─── Field label ──────────────────────────────────────────────────────────────
function FieldLabel({ label, C }) {
    return (
        <Text style={[fl.label, { color: C.textMuted }]}>{label}</Text>
    );
}

const fl = StyleSheet.create({
    label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', marginLeft: 2 },
});

// ─── SettingsField ────────────────────────────────────────────────────────────
export function SettingsField({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    editable = true,
    rightSlot,
    error,
    C,
    isDark,
    returnKeyType,
    onSubmitEditing,
    inputRef,
}) {
    const [focused, setFocused] = useState(false);

    return (
        <View style={sf.group}>
            {!!label && <FieldLabel label={label} C={C} />}
            <View style={[
                sf.shell,
                {
                    backgroundColor: isDark ? '#1C1610' : '#F5F2EC',
                    borderColor: error
                        ? '#FF6B6B'
                        : focused
                            ? C.primary
                            : 'transparent',
                },
            ]}>
                <TextInput
                    ref={inputRef}
                    style={[sf.input, {
                        color: editable ? C.textPrimary : C.textMuted,
                    }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder ?? label}
                    placeholderTextColor={C.textMuted}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    editable={editable}
                    returnKeyType={returnKeyType}
                    onSubmitEditing={onSubmitEditing}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    selectionColor={C.primary}
                />
                {rightSlot}
            </View>
            {!!error && <Text style={sf.err}>{error}</Text>}
        </View>
    );
}

const sf = StyleSheet.create({
    group: { gap: 6 },
    shell: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10, // reduced from 14/11
    },
    input: { flex: 1, fontSize: 14, paddingVertical: 0 },
    err: { fontSize: 10, color: '#FF6B6B', marginLeft: 4 },
});

// ─── Password field ───────────────────────────────────────────────────────────
export function PasswordField({ label = 'PASSWORD', onChangeTap, C, isDark }) {
    const [show, setShow] = useState(false);

    return (
        <View style={pf.group}>
            <FieldLabel label={label} C={C} />
            <View style={[pf.shell, { backgroundColor: isDark ? '#1C1610' : '#F5F2EC' }]}>
                <TextInput
                    style={[pf.input, { color: C.textPrimary }]}
                    value="••••••••••"
                    secureTextEntry={!show}
                    editable={false}
                    selectionColor={C.primary}
                />
                <TouchableOpacity
                    onPress={() => setShow((v) => !v)}
                    hitSlop={10}
                    style={pf.eyeBtn}
                >
                    <Ionicons
                        name={show ? 'eye-off-outline' : 'eye-outline'}
                        size={17}
                        color={C.textMuted}
                    />
                </TouchableOpacity>
                <View style={[pf.divider, { backgroundColor: C.border }]} />
                <TouchableOpacity onPress={onChangeTap} hitSlop={8} activeOpacity={0.75}>
                    <Text style={[pf.changeLabel, { color: C.primary }]}>CHANGE</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const pf = StyleSheet.create({
    group: { gap: 7 },
    shell: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10, // also reduced here
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
        includeFontPadding: false,
        letterSpacing: 2,
    },
    eyeBtn: { padding: 2 },
    divider: { width: 1, height: 18 },
    changeLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
});