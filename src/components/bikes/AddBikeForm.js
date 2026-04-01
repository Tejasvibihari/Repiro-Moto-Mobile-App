// components/bikes/AddBikeForm.js
// Reusable form for creating a new bike profile.
// Fetches brands and models dynamically from backend.
// Supports BS standard selection (BSI–BSVI).
//
// Props:
//   onSubmit(bikeData)  — called with validated form data; parent handles the API call
//   loading {boolean}   — disables submit and shows spinner while API is in-flight

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Platform,
    Keyboard,
    ActivityIndicator,
    Modal,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import axiosClient from '../../services/axiosClient';

// ─── BS Standard options (maps to 'bs' field) ───────────────────────────────
const BS_STANDARDS = [
    { label: 'BS I', value: 'bsI' },
    { label: 'BS II', value: 'bsII' },
    { label: 'BS III', value: 'bsIII' },
    { label: 'BS IV', value: 'bsIV' },
    { label: 'BS V', value: 'bsV' },
    { label: 'BS VI', value: 'bsVI' },
];

// ─── Field Shell (matches LoginForm InputShell design) ────────────────────────
function FieldShell({ focused, isDark, C, iconName, iconLib = 'ion', children, error }) {
    return (
        <View>
            <View
                style={[
                    shellStyles.shell,
                    {
                        backgroundColor: isDark ? '#1C1610' : '#FFF4E0',
                        borderColor: error
                            ? '#FF6B6B'
                            : focused
                                ? C.primary
                                : 'transparent',
                    },
                ]}
            >
                {iconLib === 'mci'
                    ? <MaterialCommunityIcons name={iconName} size={18} color={focused ? C.primary : C.textMuted} />
                    : <Ionicons name={iconName} size={18} color={focused ? C.primary : C.textMuted} />
                }
                {children}
            </View>
            {!!error && (
                <Text style={shellStyles.errorText}>{error}</Text>
            )}
        </View>
    );
}

const shellStyles = StyleSheet.create({
    shell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 11,
        borderWidth: 1.5,
    },
    errorText: {
        fontSize: 11,
        color: '#FF6B6B',
        marginTop: 4,
        marginLeft: 14,
    },
});

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ text, C }) {
    return (
        <Text style={[sectionStyles.label, { color: C.textMuted }]}>{text}</Text>
    );
}

const sectionStyles = StyleSheet.create({
    label: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.9,
        textTransform: 'uppercase',
        paddingHorizontal: 2,
        marginBottom: 2,
    },
});

// ─── Pill selector (used for BS standard) ────────────────────────────────────
function PillSelector({ options, value, onChange, C, isDark }) {
    return (
        <View style={pillStyles.row}>
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <TouchableOpacity
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        style={[
                            pillStyles.pill,
                            {
                                backgroundColor: active
                                    ? C.primary
                                    : isDark ? '#1C1610' : '#FFF4E0',
                                borderColor: active ? C.primary : 'transparent',
                            },
                        ]}
                        activeOpacity={0.75}
                    >
                        <Text
                            style={[
                                pillStyles.label,
                                { color: active ? '#1a1a1a' : C.textSecondary },
                            ]}
                        >
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const pillStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
});

// ─── Custom Dropdown Component (matches FieldShell style) ───────────────────
function Dropdown({
    label,
    value,
    onSelect,
    options,
    placeholder,
    loading,
    focused,
    onFocus,
    onBlur,
    error,
    isDark,
    C,
    iconName,
    iconLib = 'ion',
}) {
    const [modalVisible, setModalVisible] = useState(false);
    const displayValue = value ? (value.label || value.brandName || value.name || '') : '';

    const handleSelect = (item) => {
        onSelect(item);
        setModalVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                    setModalVisible(true);
                    onFocus?.();
                }}
            >
                <FieldShell focused={focused} isDark={isDark} C={C} iconName={iconName} iconLib={iconLib} error={error}>
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[dropdownStyles.text, { color: displayValue ? C.textPrimary : C.textMuted }]}>
                            {displayValue || placeholder}
                        </Text>
                        {loading ? (
                            <ActivityIndicator size="small" color={C.textMuted} />
                        ) : (
                            <MaterialCommunityIcons name="chevron-down" size={20} color={C.textMuted} />
                        )}
                    </View>
                </FieldShell>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={dropdownStyles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[dropdownStyles.modalContent, { backgroundColor: isDark ? '#1C1610' : '#FFF4E0' }]}>
                                <FlatList
                                    data={options}
                                    keyExtractor={(item) => item._id || item.value}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={dropdownStyles.modalItem}
                                            onPress={() => handleSelect(item)}
                                        >
                                            <Text style={[dropdownStyles.modalItemText, { color: C.textPrimary }]}>
                                                {item.label || item.brandName || item.name}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}

const dropdownStyles = StyleSheet.create({
    text: {
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        maxHeight: '70%',
        borderRadius: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    modalItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalItemText: {
        fontSize: 16,
    },
});

// ─── Main form ────────────────────────────────────────────────────────────────
export default function AddBikeForm({ onSubmit, loading = false, initialData = null }) {
    const isEdit = !!initialData;
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const C = theme.colors;
    const isDark = mode === 'dark';

    // ── Form state ──────────────────────────────────────────────────────────
    const [selectedBrand, setSelectedBrand] = useState(
        initialData ? { brandName: initialData.brand } : null
    );
    const [selectedModel, setSelectedModel] = useState(
        initialData ? { name: initialData.model } : null
    );
    const [cc, setCc] = useState(initialData?.cc ? String(initialData.cc) : '');
    const [bsStandard, setBsStandard] = useState(initialData?.bs || '');
    const [initialBrandSet, setInitialBrandSet] = useState(isEdit);

    // ── Dropdown data ───────────────────────────────────────────────────────
    const [brands, setBrands] = useState([]);
    const [loadingBrands, setLoadingBrands] = useState(true);
    const [models, setModels] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);

    // ── Focus state ─────────────────────────────────────────────────────────
    const [focus, setFocus] = useState({});
    const setF = (field, val) => setFocus(f => ({ ...f, [field]: val }));

    // ── Errors ────────────────────────────────────────────────────────────────
    const [errors, setErrors] = useState({});

    // ── Refs for keyboard navigation ─────────────────────────────────────────
    const modelRef = useRef(null);
    const ccRef = useRef(null);
    const bsRef = useRef(null);

    // ── CTA animation ─────────────────────────────────────────────────────────
    const ctaScale = useRef(new Animated.Value(1)).current;
    const pressIn = () => Animated.spring(ctaScale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
    const pressOut = () => Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 9 }).start();

    // ── Fetch brands on mount ────────────────────────────────────────────────
    useEffect(() => {
        const fetchBrands = async () => {
            try {
                setLoadingBrands(true);
                const response = await axiosClient.get('/api/admin/brands/getbrands');
                const brandList = response.data;
                setBrands(brandList);
                // In edit mode, match the initial brand from the fetched list
                if (isEdit && initialData.brand) {
                    const match = brandList.find(b => b.brandName === initialData.brand);
                    if (match) setSelectedBrand(match);
                }
            } catch (error) {
                console.error('Failed to fetch brands:', error);
            } finally {
                setLoadingBrands(false);
            }
        };
        fetchBrands();
    }, []);

    // ── Fetch models when brand changes ──────────────────────────────────────
    useEffect(() => {
        // Don't reset model on initial mount in edit mode
        if (initialBrandSet) {
            setInitialBrandSet(false);
        } else {
            setSelectedModel(null);
        }
        if (!selectedBrand || !selectedBrand._id) {
            setModels([]);
            return;
        }

        const fetchModels = async () => {
            try {
                setLoadingModels(true);
                const response = await axiosClient.get('/api/admin/brands/getmodels', {
                    params: { brandId: selectedBrand._id },
                });
                const modelList = response.data;
                setModels(modelList);
                // In edit mode, match the initial model
                if (isEdit && initialData.model) {
                    const match = modelList.find(m => m.name === initialData.model);
                    if (match) setSelectedModel(match);
                }
            } catch (error) {
                console.error('Failed to fetch models:', error);
                setModels([]);
            } finally {
                setLoadingModels(false);
            }
        };
        fetchModels();
    }, [selectedBrand]);

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = () => {
        const e = {};
        if (!selectedBrand) e.brand = 'Please select a brand';
        if (!selectedModel) e.model = 'Please select a model';
        if (!cc) e.cc = 'Please enter CC';
        else if (isNaN(Number(cc))) e.cc = 'CC must be a number';
        if (!bsStandard) e.bsStandard = 'Please select a BS standard';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = () => {
        Keyboard.dismiss();
        if (!validate()) return;

        const payload = {
            brand: selectedBrand.brandName,
            model: selectedModel.name,
            cc: Number(cc),
            bs: bsStandard,
        };

        onSubmit?.(payload);
    };

    const s = makeStyles(C, isDark);

    return (
        <View style={s.card}>

            {/* ── Brand & Model ─────────────────────────────────────── */}
            <View style={s.section}>
                <SectionLabel text="Bike Identity" C={C} />

                {/* Brand Dropdown */}
                <View style={s.fieldGroup}>
                    <Dropdown
                        label="Brand"
                        value={selectedBrand}
                        onSelect={setSelectedBrand}
                        options={brands}
                        placeholder="Select Brand"
                        loading={loadingBrands}
                        focused={focus.brand}
                        onFocus={() => setF('brand', true)}
                        onBlur={() => setF('brand', false)}
                        error={errors.brand}
                        isDark={isDark}
                        C={C}
                        iconName="motorbike"
                        iconLib="mci"
                    />
                </View>

                {/* Model Dropdown */}
                <View style={s.fieldGroup}>
                    <Dropdown
                        label="Model"
                        value={selectedModel}
                        onSelect={setSelectedModel}
                        options={models}
                        placeholder="Select Model"
                        loading={loadingModels}
                        focused={focus.model}
                        onFocus={() => setF('model', true)}
                        onBlur={() => setF('model', false)}
                        error={errors.model}
                        isDark={isDark}
                        C={C}
                        iconName="pricetag-outline"
                        disabled={!selectedBrand}
                    />
                </View>
            </View>

            {/* ── Engine (CC) ───────────────────────────────────────── */}
            <View style={s.section}>
                <SectionLabel text="Engine" C={C} />

                <View style={s.fieldGroup}>
                    <FieldShell focused={focus.cc} isDark={isDark} C={C} iconName="engine-outline" iconLib="mci" error={errors.cc}>
                        <TextInput
                            ref={ccRef}
                            style={[s.input, { color: C.textPrimary }]}
                            value={cc}
                            onChangeText={setCc}
                            placeholder="CC  e.g. 150, 600"
                            placeholderTextColor={C.textMuted}
                            keyboardType="number-pad"
                            returnKeyType="next"
                            onFocus={() => setF('cc', true)}
                            onBlur={() => setF('cc', false)}
                            onSubmitEditing={() => handleSubmit()}
                            selectionColor={C.primary}
                        />
                    </FieldShell>
                </View>
            </View>

            {/* ── BS Standard ───────────────────────────────────────── */}
            <View style={s.section}>
                <SectionLabel text="BS Standard" C={C} />
                <PillSelector
                    options={BS_STANDARDS}
                    value={bsStandard}
                    onChange={setBsStandard}
                    C={C}
                    isDark={isDark}
                />
                {!!errors.bsStandard && (
                    <Text style={[shellStyles.errorText, { marginLeft: 2, marginTop: 6 }]}>
                        {errors.bsStandard}
                    </Text>
                )}
            </View>

            {/* ── Submit CTA ────────────────────────────────────────── */}
            <View style={s.ctaWrap}>
                <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
                    <TouchableOpacity
                        style={[s.ctaBtn, { backgroundColor: C.primary }]}
                        onPress={handleSubmit}
                        onPressIn={pressIn}
                        onPressOut={pressOut}
                        activeOpacity={0.92}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#1a1a1a" size="small" />
                        ) : (
                            <View style={s.ctaInner}>
                                <MaterialCommunityIcons name="motorbike" size={18} color="#1a1a1a" />
                                <Text style={s.ctaText}>{isEdit ? 'Update Bike' : 'Create Bike'}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>

        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(C, isDark) {
    return StyleSheet.create({
        card: {
            backgroundColor: isDark ? 'rgba(28,22,16,0.90)' : 'rgba(255,255,255,0.94)',
            borderRadius: 28,
            padding: 22,
            gap: 20,
            borderWidth: 1,
            borderColor: C.border,
        },

        section: {
            gap: 10,
        },

        fieldGroup: {
            gap: 0,
        },

        row: {
            flexDirection: 'row',
            gap: 10,
        },

        input: {
            flex: 1,
            fontSize: 14,
            paddingVertical: 0,
            includeFontPadding: false,
        },

        // CTA
        ctaWrap: {
            marginTop: 4,
            shadowColor: C.primary,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.32,
            shadowRadius: 18,
            elevation: 10,
        },
        ctaBtn: {
            paddingVertical: 17,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 15,
        },
        ctaInner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        ctaText: {
            fontSize: 15,
            fontWeight: '800',
            letterSpacing: 1.8,
            textTransform: 'capitalize',
            color: '#1A1A1A',
        },
    });
}