// screens/order/NewOrderForm.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Animated,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    Dimensions,
    Modal,
    StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import axiosClient from '../../services/axiosClient';
import Alert from '../../components/common/Alert';
import useBike from '../../hooks/useBikes';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Static data ──────────────────────────────────────────────────────────────
const SERVICE_TYPES = [
    { id: 'servicing', label: 'General\nServicing', icon: 'construct-outline', color: '#4CAF8A' },
    { id: 'inspection', label: 'Inspection', icon: 'search-outline', color: '#5B9BD5' },
    { id: 'full_engine', label: 'Engine\nOverhaul', icon: 'settings-outline', color: '#E07B54' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#9B8EA8' },
];

const TIME_SLOTS = [
    { label: '8 AM', value: '08:00 AM' },
    { label: '9 AM', value: '09:00 AM' },
    { label: '10 AM', value: '10:00 AM' },
    { label: '11 AM', value: '11:00 AM' },
    { label: '12 PM', value: '12:00 PM' },
    { label: '1 PM', value: '01:00 PM' },
    { label: '2 PM', value: '02:00 PM' },
    { label: '3 PM', value: '03:00 PM' },
    { label: '4 PM', value: '04:00 PM' },
    { label: '5 PM', value: '05:00 PM' },
    { label: '6 PM', value: '06:00 PM' },
    { label: '7 PM', value: '07:00 PM' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STEPS = [
    { id: 'location', title: 'Where are you?', subtitle: "We'll check if your area is covered" },
    { id: 'contact', title: 'Who are we helping?', subtitle: 'Your name and contact number' },
    { id: 'bike', title: 'Which bike?', subtitle: 'Tell us about your motorcycle' },
    { id: 'service', title: 'What do you need?', subtitle: 'Choose a service type' },
    { id: 'schedule', title: 'When to come?', subtitle: 'Pick a date and time slot' },
    { id: 'notes', title: 'Anything else?', subtitle: 'Optional notes for the mechanic' },
];
const BS_STANDARDS = [
    { label: 'BS1', value: 'BS1' },
    { label: 'BS2', value: 'BS2' },
    { label: 'BS3', value: 'BS3' },
    { label: 'BS4', value: 'BS4' },
    { label: 'BS5', value: 'BS5' },
    { label: 'BS6', value: 'BS6' },
    { label: 'BSVI', value: 'BSVI' },
];
// Helper to get readable service label
const getServiceLabel = (type) => {
    const found = SERVICE_TYPES.find(s => s.id === type);
    return found ? found.label.replace('\n', ' ') : type;
};

// ─── Style helper (moved here so it's available to all components) ───────────
function labelStyle(theme) {
    return { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: theme.colors.textMuted, textTransform: 'uppercase' };
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total, theme }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: (step + 1) / total, useNativeDriver: false, tension: 60, friction: 10 }).start();
    }, [step]);
    const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={{ marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    Step {step + 1} of {total}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}>
                    {Math.round(((step + 1) / total) * 100)}%
                </Text>
            </View>
            <View style={{ height: 5, backgroundColor: theme.colors.border, borderRadius: 10, overflow: 'hidden' }}>
                <Animated.View style={{ height: '100%', width: barWidth, backgroundColor: theme.colors.primary, borderRadius: 10 }} />
            </View>
        </View>
    );
}

// ─── Pill chip ────────────────────────────────────────────────────────────────
function Pill({ label, selected, onPress, theme, isDark, loading }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            disabled={loading}
            style={{
                paddingHorizontal: 18, paddingVertical: 10, borderRadius: 50,
                borderWidth: 1.5,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: selected
                    ? theme.colors.primary + (isDark ? '28' : '18')
                    : isDark ? theme.colors.surfaceLow : '#FFF',
                marginRight: 8, marginBottom: 8,
                opacity: loading ? 0.5 : 1,
            }}
        >
            <Text style={{
                fontSize: 13.5, fontWeight: selected ? '700' : '500',
                color: selected ? theme.colors.primary : theme.colors.textSecondary,
            }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// ─── Styled input ─────────────────────────────────────────────────────────────
function StyledInput({ value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, theme, isDark, icon, prefix }) {
    const [focused, setFocused] = useState(false);
    return (
        <View style={{
            flexDirection: 'row',
            alignItems: multiline ? 'flex-start' : 'center',
            backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF',
            borderWidth: 1.5,
            borderColor: focused ? theme.colors.primary : theme.colors.border,
            borderRadius: 16, paddingHorizontal: 16,
            paddingVertical: multiline ? 14 : 0,
            minHeight: multiline ? 100 : 54,
        }}>
            {icon && <Ionicons name={icon} size={18} color={focused ? theme.colors.primary : theme.colors.textMuted} style={{ marginRight: 10, marginTop: multiline ? 2 : 0 }} />}
            {prefix && <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.textMuted, marginRight: 6 }}>{prefix}</Text>}
            <TextInput
                value={value} onChangeText={onChangeText} placeholder={placeholder}
                placeholderTextColor={theme.colors.textMuted} keyboardType={keyboardType}
                multiline={multiline} numberOfLines={numberOfLines}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                style={{
                    flex: 1, fontSize: 15, color: theme.colors.textPrimary, fontWeight: '500',
                    textAlignVertical: multiline ? 'top' : 'center',
                    paddingVertical: multiline ? 0 : Platform.OS === 'ios' ? 16 : 0,
                }}
            />
        </View>
    );
}

// ─── Service step with multi‑select + "Other" exclusive ──────────────────────
function ServiceStep({ theme, isDark, selectedServices, setSelectedServices, otherServiceText, setOtherServiceText }) {
    const toggleService = (serviceId) => {
        if (serviceId === 'other') {
            setSelectedServices(['other']);
            setOtherServiceText('');
        } else {
            setSelectedServices(prev => {
                let newSelection = prev.filter(id => id !== 'other');
                if (newSelection.includes(serviceId)) {
                    return newSelection.filter(id => id !== serviceId);
                } else {
                    return [...newSelection, serviceId];
                }
            });
        }
    };

    const isOtherSelected = selectedServices.includes('other');
    const displayServices = SERVICE_TYPES;

    return (
        <View>
            <Text style={[labelStyle(theme), { marginBottom: 12 }]}>
                What services do you need? <Text style={{ color: theme.colors.textMuted, fontWeight: 'normal' }}>(select one or more)</Text>
            </Text>
            <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {displayServices.slice(0, 2).map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.8}
                            onPress={() => toggleService(item.id)}
                            style={{
                                flex: 1,
                                borderWidth: 1.5,
                                borderColor: selectedServices.includes(item.id) ? item.color : theme.colors.border,
                                borderRadius: 18,
                                padding: 18,
                                alignItems: 'center',
                                gap: 10,
                                backgroundColor: selectedServices.includes(item.id)
                                    ? item.color + (isDark ? '22' : '15')
                                    : isDark ? theme.colors.surfaceLow : '#FFF',
                                opacity: isOtherSelected && item.id !== 'other' ? 0.5 : 1,
                            }}
                            disabled={isOtherSelected && item.id !== 'other'}
                        >
                            <View style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: item.color + (selectedServices.includes(item.id) ? '25' : '15'),
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Ionicons name={item.icon} size={22} color={selectedServices.includes(item.id) ? item.color : theme.colors.textMuted} />
                            </View>
                            <Text style={{
                                fontSize: 12.5,
                                fontWeight: selectedServices.includes(item.id) ? '800' : '600',
                                color: selectedServices.includes(item.id) ? item.color : theme.colors.textSecondary,
                                textAlign: 'center', lineHeight: 17
                            }}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    {displayServices.slice(2, 4).map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.8}
                            onPress={() => toggleService(item.id)}
                            style={{
                                flex: 1,
                                borderWidth: 1.5,
                                borderColor: selectedServices.includes(item.id) ? item.color : theme.colors.border,
                                borderRadius: 18,
                                padding: 18,
                                alignItems: 'center',
                                gap: 10,
                                backgroundColor: selectedServices.includes(item.id)
                                    ? item.color + (isDark ? '22' : '15')
                                    : isDark ? theme.colors.surfaceLow : '#FFF',
                                opacity: isOtherSelected && item.id !== 'other' ? 0.5 : 1,
                            }}
                            disabled={isOtherSelected && item.id !== 'other'}
                        >
                            <View style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: item.color + (selectedServices.includes(item.id) ? '25' : '15'),
                                alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Ionicons name={item.icon} size={22} color={selectedServices.includes(item.id) ? item.color : theme.colors.textMuted} />
                            </View>
                            <Text style={{
                                fontSize: 12.5,
                                fontWeight: selectedServices.includes(item.id) ? '800' : '600',
                                color: selectedServices.includes(item.id) ? item.color : theme.colors.textSecondary,
                                textAlign: 'center', lineHeight: 17
                            }}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            {isOtherSelected && (
                <View style={{ marginTop: 16, padding: 16, borderRadius: 18, borderWidth: 1.5, borderColor: '#9B8EA8' + '66', backgroundColor: isDark ? theme.colors.surfaceLow : '#FAF8FF' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Ionicons name="create-outline" size={16} color="#9B8EA8" />
                        <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: '#9B8EA8', textTransform: 'uppercase' }}>Describe your service</Text>
                    </View>
                    <StyledInput
                        value={otherServiceText}
                        onChangeText={setOtherServiceText}
                        placeholder="e.g. Chain replacement, tyre change, clutch repair…"
                        multiline
                        numberOfLines={3}
                        theme={theme}
                        isDark={isDark}
                    />
                </View>
            )}
        </View>
    );
}

// ─── Date row ─────────────────────────────────────────────────────────────────
function DateRow({ selectedDate, onSelect, theme, isDark }) {
    const today = new Date();
    const CARD_WIDTH = 56;
    const CARD_GAP = 8;

    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i + 1);
        return d;
    });

    const monthGroups = [];
    days.forEach((d) => {
        const key = `${d.getMonth()}-${d.getFullYear()}`;
        const last = monthGroups[monthGroups.length - 1];
        if (!last || last.key !== key) {
            monthGroups.push({ key, month: d.getMonth(), year: d.getFullYear(), days: [d] });
        } else {
            last.days.push(d);
        }
    });

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-start', paddingRight: 8 }}
        >
            {monthGroups.map((group, gi) => (
                <View key={group.key} style={{ flexDirection: 'column', marginRight: gi < monthGroups.length - 1 ? 4 : 0 }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        marginBottom: 10,
                        paddingLeft: 4,
                    }}>
                        <View style={{
                            width: 5, height: 5, borderRadius: 3,
                            backgroundColor: theme.colors.primary,
                        }} />
                        <Text style={{
                            fontSize: 10,
                            fontWeight: '800',
                            color: theme.colors.primary,
                            letterSpacing: 1,
                            textTransform: 'uppercase',
                        }}>
                            {MONTH_LABELS[group.month]} {group.year}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
                        {group.days.map((d) => {
                            const key = d.toDateString();
                            const isSelected = selectedDate === key;
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => onSelect(key)}
                                    activeOpacity={0.8}
                                    style={{
                                        width: CARD_WIDTH,
                                        paddingVertical: 12,
                                        borderRadius: 16,
                                        borderWidth: 1.5,
                                        borderColor: isSelected
                                            ? theme.colors.primary
                                            : isWeekend
                                                ? theme.colors.warning + '55'
                                                : theme.colors.border,
                                        backgroundColor: isSelected
                                            ? theme.colors.primary
                                            : isDark ? theme.colors.surfaceLow : '#FFF',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 9,
                                        fontWeight: '700',
                                        letterSpacing: 0.6,
                                        textTransform: 'uppercase',
                                        color: isSelected ? '#1a1a1a' : isWeekend ? theme.colors.warning : theme.colors.textMuted,
                                    }}>
                                        {DAY_LABELS[d.getDay()]}
                                    </Text>
                                    <Text style={{
                                        fontSize: 20,
                                        fontWeight: '900',
                                        lineHeight: 24,
                                        color: isSelected ? '#1a1a1a' : theme.colors.textPrimary,
                                    }}>
                                        {d.getDate()}
                                    </Text>
                                    <View style={{
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        borderRadius: 6,
                                        backgroundColor: isSelected
                                            ? '#1a1a1a18'
                                            : isWeekend
                                                ? theme.colors.warning + '20'
                                                : theme.colors.border + '80',
                                    }}>
                                        <Text style={{
                                            fontSize: 9,
                                            fontWeight: '700',
                                            letterSpacing: 0.3,
                                            color: isSelected ? '#1a1a1a99' : isWeekend ? theme.colors.warning : theme.colors.textMuted,
                                        }}>
                                            {MONTH_LABELS[d.getMonth()]}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
}

// ─── Saved bike card ──────────────────────────────────────────────────────────
function SavedBikeCard({ bike, selected, onPress, theme, isDark }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{
            width: 140, padding: 14, borderRadius: 16, borderWidth: 1.5,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            backgroundColor: selected ? theme.colors.primary + '18' : isDark ? theme.colors.surfaceLow : '#FFF',
            marginRight: 10,
        }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: selected ? theme.colors.primary + '25' : theme.colors.border + '88', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <MaterialCommunityIcons name="motorbike" size={20} color={selected ? theme.colors.primary : theme.colors.textMuted} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: selected ? theme.colors.primary : theme.colors.textPrimary }} numberOfLines={1}>{bike.brand}</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 2 }} numberOfLines={1}>{bike.model}</Text>
            {bike.cc && <Text style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 4 }}>{bike.cc} CC</Text>}
            {selected && <View style={{ position: 'absolute', top: 10, right: 10 }}><Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} /></View>}
        </TouchableOpacity>
    );
}

// ─── Location step with city & distance callbacks ────────────────────────────

function LocationStep({
    theme,
    isDark,
    locationText,
    setLocationText,
    setCoords,
    isServiceable,
    setIsServiceable,
    onCityChange,
    onDistanceChange,
    onNext,
}) {
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [alert, setAlert] = useState(null);
    const [mapVisible, setMapVisible] = useState(false);
    const [locationUnavailable, setLocationUnavailable] = useState(false); // NEW
    const [showManualSearch, setShowManualSearch] = useState(false);       // NEW
    const [manualQuery, setManualQuery] = useState('');                    // NEW
    const [manualResults, setManualResults] = useState([]);                // NEW
    const [manualSearchLoading, setManualSearchLoading] = useState(false); // NEW

    const [mapRegion, setMapRegion] = useState({
        latitude: 25.5941,
        longitude: 85.1376,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });
    const [pinCoords, setPinCoords] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const searchTimeout = useRef(null);
    const manualSearchTimeout = useRef(null);
    const checkTimeout = useRef(null);

    useEffect(() => { autoDetect(); }, []);
    useEffect(() => {
        return () => {
            if (checkTimeout.current) clearTimeout(checkTimeout.current);
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            if (manualSearchTimeout.current) clearTimeout(manualSearchTimeout.current);
        };
    }, []);

    const extractCityFromGeocode = async (lat, lng) => {
        try {
            const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (geo.length > 0 && geo[0].city) onCityChange(geo[0].city);
            else if (geo.length > 0 && geo[0].region) onCityChange(geo[0].region);
            else onCityChange('');
        } catch {
            onCityChange('');
        }
    };

    const checkArea = async (lat, lng) => {
        setChecking(true);
        try {
            const res = await axiosClient.post('/api/service-areas/check', { latitude: lat, longitude: lng });
            const ok = res.data?.serviceable ?? false;
            setIsServiceable(ok);
            if (res.data?.distance !== undefined) onDistanceChange(res.data.distance);
            if (!ok) setAlert({ type: 'error', message: res.data?.message || "Sorry, we don't service this area yet." });
        } catch {
            setIsServiceable(false);
            setAlert({ type: 'error', message: 'Could not verify serviceability.' });
        } finally {
            setChecking(false);
        }
    };

    const autoDetect = async () => {
        setLoading(true);
        setIsServiceable(null);
        setLocationUnavailable(false);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationUnavailable(true);
                setLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = loc.coords;
            setCoords({ latitude, longitude });
            setPinCoords({ latitude, longitude });
            setMapRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
            const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geo.length > 0) {
                const g = geo[0];
                setLocationText([g.name, g.streetNumber, g.street, g.district, g.subregion, g.city, g.region, g.postalCode].filter(Boolean).join(', '));
                if (g.city) onCityChange(g.city);
                else if (g.region) onCityChange(g.region);
            }
            await checkArea(latitude, longitude);
        } catch {
            setLocationUnavailable(true);
            setAlert({ type: 'error', message: 'Could not detect location. Please enter it manually.' });
        } finally {
            setLoading(false);
        }
    };

    // ── Manual search ─────────────────────────────────────────────────────────
    const handleManualQueryChange = (text) => {
        setManualQuery(text);
        if (manualSearchTimeout.current) clearTimeout(manualSearchTimeout.current);
        if (!text.trim()) { setManualResults([]); return; }
        manualSearchTimeout.current = setTimeout(async () => {
            setManualSearchLoading(true);
            try {
                const results = await Location.geocodeAsync(text);
                const named = await Promise.all(
                    results.slice(0, 5).map(async (r) => {
                        const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
                        const g = rev[0] || {};
                        const label = [g.name, g.streetNumber, g.street, g.district, g.subregion, g.city, g.region, g.postalCode].filter(Boolean).join(', ');
                        return { label, latitude: r.latitude, longitude: r.longitude };
                    })
                );
                setManualResults(named);
            } catch {
                setManualResults([]);
            } finally {
                setManualSearchLoading(false);
            }
        }, 600);
    };

    const handleManualSelect = async (result) => {
        setManualQuery('');
        setManualResults([]);
        setShowManualSearch(false);
        setLocationUnavailable(false);
        setCoords({ latitude: result.latitude, longitude: result.longitude });
        setPinCoords({ latitude: result.latitude, longitude: result.longitude });
        setMapRegion({ latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        setLocationText(result.label);
        await extractCityFromGeocode(result.latitude, result.longitude);
        await checkArea(result.latitude, result.longitude);
    };

    // ── In-map search (existing) ──────────────────────────────────────────────
    const handleSearchChange = (text) => {
        setSearchQuery(text);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!text.trim()) { setSearchResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const results = await Location.geocodeAsync(text);
                const named = await Promise.all(
                    results.slice(0, 5).map(async (r) => {
                        const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
                        const g = rev[0] || {};
                        const label = [g.name, g.streetNumber, g.street, g.district, g.subregion, g.city, g.region, g.postalCode].filter(Boolean).join(', ');
                        return { label, latitude: r.latitude, longitude: r.longitude };
                    })
                );
                setSearchResults(named);
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 600);
    };

    const handleSearchSelect = (result) => {
        setSearchQuery('');
        setSearchResults([]);
        setPinCoords({ latitude: result.latitude, longitude: result.longitude });
        setMapRegion({ latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        setLocationText(result.label);
        extractCityFromGeocode(result.latitude, result.longitude);
        checkArea(result.latitude, result.longitude);
    };

    const handleRegionChangeComplete = async (region) => {
        const { latitude, longitude } = region;
        setPinCoords({ latitude, longitude });
        try {
            const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geo.length > 0) {
                const g = geo[0];
                setLocationText([g.name, g.streetNumber, g.street, g.district, g.subregion, g.city, g.region, g.postalCode].filter(Boolean).join(', '));
                if (g.city) onCityChange(g.city);
                else if (g.region) onCityChange(g.region);
            }
        } catch { /* silent */ }
        if (checkTimeout.current) clearTimeout(checkTimeout.current);
        setIsServiceable(null);
        checkTimeout.current = setTimeout(() => { checkArea(latitude, longitude); }, 800);
    };

    const handleConfirmMapLocation = () => {
        if (!pinCoords || !isServiceable) return;
        setCoords(pinCoords);
        setMapVisible(false);
        setLocationUnavailable(false);
        setSearchResults([]);
        setSearchQuery('');
    };

    const handleCloseMap = () => {
        setMapVisible(false);
        setSearchResults([]);
        setSearchQuery('');
    };

    const statusColor =
        isServiceable === true ? theme.colors.success :
            isServiceable === false ? theme.colors.error :
                theme.colors.primary;
    const statusIcon =
        isServiceable === true ? 'checkmark-circle' :
            isServiceable === false ? 'close-circle' :
                'location';

    // ────────────────────────────────────────────────────────────────────────
    return (
        <View>
            {alert && (
                <Alert
                    type={alert.type}
                    message={alert.message}
                    visible
                    onDismiss={() => setAlert(null)}
                    autoDismiss={4000}
                    style={{ marginBottom: 14 }}
                />
            )}

            {/* ── Location status card ───────────────────────────── */}
            <View style={{
                borderRadius: 20,
                overflow: 'hidden',
                borderWidth: 1.5,
                borderColor:
                    locationUnavailable ? theme.colors.warning + '55' :
                        isServiceable === true ? theme.colors.success + '55' :
                            isServiceable === false ? theme.colors.error + '55' :
                                theme.colors.border,
                backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF',
                marginBottom: 16,
            }}>
                <View style={{
                    height: 4,
                    backgroundColor:
                        locationUnavailable ? theme.colors.warning :
                            statusColor + (isServiceable === null ? '60' : 'CC'),
                }} />
                <View style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    {loading ? (
                        <>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, color: theme.colors.textMuted, fontWeight: '500' }}>
                                    Detecting your location…
                                </Text>
                            </View>
                        </>
                    ) : locationUnavailable ? (
                        /* ── Location unavailable state ── */
                        <>
                            <View style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: theme.colors.warning + '20',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Ionicons name="location-outline" size={24} color={theme.colors.warning} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, lineHeight: 20 }}>
                                    Location unavailable
                                </Text>
                                <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontWeight: '500', marginTop: 3 }}>
                                    Permission denied or GPS off
                                </Text>
                            </View>
                            <TouchableOpacity onPress={autoDetect} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        /* ── Normal detected state ── */
                        <>
                            <View style={{
                                width: 44, height: 44, borderRadius: 22,
                                backgroundColor: statusColor + '20',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Ionicons name={statusIcon} size={24} color={statusColor} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, lineHeight: 20 }} numberOfLines={2}>
                                    {locationText || 'No location detected'}
                                </Text>
                                {isServiceable === true && (
                                    <Text style={{ fontSize: 12, color: theme.colors.success, fontWeight: '700', marginTop: 3 }}>✓ Area is serviceable</Text>
                                )}
                                {isServiceable === false && (
                                    <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: '700', marginTop: 3 }}>✗ Not serviceable yet</Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={autoDetect} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* ── Fallback CTAs — shown when location is unavailable ─ */}
            {locationUnavailable && (
                <View style={{ gap: 10, marginBottom: 20 }}>
                    {/* Divider with label */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: theme.colors.textMuted, textTransform: 'uppercase' }}>
                            Select location manually
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                    </View>

                    {/* Option A: Type to search */}
                    <TouchableOpacity
                        onPress={() => { setShowManualSearch(true); }}
                        activeOpacity={0.8}
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                            borderWidth: 1.5, borderColor: theme.colors.primary,
                            borderRadius: 16, paddingVertical: 15, paddingHorizontal: 18,
                            backgroundColor: theme.colors.primary + (isDark ? '18' : '0D'),
                        }}
                    >
                        <View style={{
                            width: 38, height: 38, borderRadius: 19,
                            backgroundColor: theme.colors.primary + '25',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Ionicons name="search-outline" size={18} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.primary }}>
                                Search by name
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontWeight: '500', marginTop: 2 }}>
                                Type area, street or landmark
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
                    </TouchableOpacity>

                    {/* Option B: Pick on map */}
                    <TouchableOpacity
                        onPress={() => setMapVisible(true)}
                        activeOpacity={0.8}
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                            borderWidth: 1.5, borderColor: theme.colors.border,
                            borderRadius: 16, paddingVertical: 15, paddingHorizontal: 18,
                            backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF',
                        }}
                    >
                        <View style={{
                            width: 38, height: 38, borderRadius: 19,
                            backgroundColor: theme.colors.border + '88',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Ionicons name="map-outline" size={18} color={theme.colors.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>
                                Choose on Map
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontWeight: '500', marginTop: 2 }}>
                                Drag and pin your exact spot
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Manual search panel (inline, shown on demand) ───── */}
            {showManualSearch && (
                <View style={{
                    borderRadius: 20, borderWidth: 1.5,
                    borderColor: theme.colors.primary + '44',
                    backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF',
                    marginBottom: 16, overflow: 'hidden',
                }}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
                        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
                    }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: 0.2 }}>
                            Search Location
                        </Text>
                        <TouchableOpacity
                            onPress={() => { setShowManualSearch(false); setManualQuery(''); setManualResults([]); }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={18} color={theme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Search input */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingHorizontal: 14, paddingVertical: 12,
                        borderBottomWidth: manualResults.length > 0 ? 1 : 0,
                        borderBottomColor: theme.colors.border,
                    }}>
                        <Ionicons name="search" size={16} color={theme.colors.textMuted} />
                        <TextInput
                            value={manualQuery}
                            onChangeText={handleManualQueryChange}
                            placeholder="Type area, street or landmark…"
                            placeholderTextColor={theme.colors.textMuted}
                            autoFocus
                            style={{
                                flex: 1, fontSize: 14, color: theme.colors.textPrimary,
                                fontWeight: '500', paddingVertical: Platform.OS === 'ios' ? 4 : 0,
                            }}
                        />
                        {manualSearchLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
                        {manualQuery.length > 0 && !manualSearchLoading && (
                            <TouchableOpacity onPress={() => { setManualQuery(''); setManualResults([]); }}>
                                <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Results */}
                    {manualResults.length > 0 && (
                        <View>
                            {manualResults.map((r, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => handleManualSelect(r)}
                                    activeOpacity={0.75}
                                    style={{
                                        flexDirection: 'row', alignItems: 'center', gap: 10,
                                        paddingHorizontal: 14, paddingVertical: 13,
                                        borderBottomWidth: i < manualResults.length - 1 ? 1 : 0,
                                        borderBottomColor: theme.colors.border,
                                    }}
                                >
                                    <View style={{
                                        width: 32, height: 32, borderRadius: 16,
                                        backgroundColor: theme.colors.primary + '18',
                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Ionicons name="location-outline" size={15} color={theme.colors.primary} />
                                    </View>
                                    <Text style={{ flex: 1, fontSize: 13, color: theme.colors.textPrimary, fontWeight: '500', lineHeight: 18 }} numberOfLines={2}>
                                        {r.label}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Empty state */}
                    {manualQuery.length > 2 && manualResults.length === 0 && !manualSearchLoading && (
                        <View style={{ alignItems: 'center', paddingVertical: 20, gap: 6 }}>
                            <Ionicons name="search-outline" size={28} color={theme.colors.textMuted} />
                            <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' }}>
                                No results found
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
                                Try a different area or landmark
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── "Change on Map" button — shown when location IS detected ─ */}
            {!locationUnavailable && (
                <TouchableOpacity
                    onPress={() => setMapVisible(true)}
                    activeOpacity={0.8}
                    style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        borderWidth: 1.5, borderColor: theme.colors.primary,
                        borderRadius: 16, paddingVertical: 14, marginBottom: 24,
                        backgroundColor: theme.colors.primary + (isDark ? '18' : '0D'),
                    }}
                >
                    <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.primary }}>
                        {locationText ? 'Change on Map' : 'Select on Map'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* ── Confirm button ─────────────────────────────────────── */}
            {!locationUnavailable && (
                <TouchableOpacity
                    onPress={onNext}
                    disabled={!isServiceable}
                    activeOpacity={0.85}
                    style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                        backgroundColor: theme.colors.primary,
                        paddingVertical: 17, borderRadius: 18,
                        opacity: isServiceable ? 1 : 0.35,
                    }}
                >
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#1a1a1a' }}>Confirm Location</Text>
                    <Ionicons name="arrow-forward" size={18} color="#1a1a1a" />
                </TouchableOpacity>
            )}

            {/* ── Map Modal (unchanged from original) ────────────────── */}
            <Modal
                visible={mapVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={handleCloseMap}
                statusBarTranslucent
            >
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
                <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
                    {/* Map header */}
                    <View style={{
                        paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 0) + 12,
                        paddingHorizontal: 16, paddingBottom: 12,
                        backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF',
                        borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 10,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <TouchableOpacity onPress={handleCloseMap} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>Select Location</Text>
                        </View>
                        <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.background,
                            borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
                            borderWidth: 1.5, borderColor: theme.colors.border, gap: 8,
                        }}>
                            <Ionicons name="search" size={16} color={theme.colors.textMuted} />
                            <TextInput
                                value={searchQuery}
                                onChangeText={handleSearchChange}
                                placeholder="Search area, street, landmark…"
                                placeholderTextColor={theme.colors.textMuted}
                                style={{ flex: 1, fontSize: 14, color: theme.colors.textPrimary, fontWeight: '500' }}
                                autoCorrect={false}
                                returnKeyType="search"
                            />
                            {searchLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
                            {searchQuery.length > 0 && !searchLoading && (
                                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                                    <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                        {searchResults.length > 0 && (
                            <View style={{
                                position: 'absolute',
                                top: Platform.OS === 'ios' ? 130 : (StatusBar.currentHeight || 0) + 96,
                                left: 16, right: 16,
                                backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF',
                                borderRadius: 14, borderWidth: 1.5, borderColor: theme.colors.border,
                                zIndex: 20, overflow: 'hidden',
                                shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
                            }}>
                                {searchResults.map((r, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => handleSearchSelect(r)}
                                        activeOpacity={0.75}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', gap: 10,
                                            paddingHorizontal: 14, paddingVertical: 12,
                                            borderBottomWidth: i < searchResults.length - 1 ? 1 : 0,
                                            borderBottomColor: theme.colors.border,
                                        }}
                                    >
                                        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                                            <Ionicons name="location-outline" size={14} color={theme.colors.primary} />
                                        </View>
                                        <Text style={{ flex: 1, fontSize: 13, color: theme.colors.textPrimary, fontWeight: '500' }} numberOfLines={2}>{r.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Map */}
                    <View style={{ flex: 1 }}>
                        <MapView
                            style={{ flex: 1 }}
                            provider={PROVIDER_GOOGLE}
                            region={mapRegion}
                            onRegionChangeComplete={handleRegionChangeComplete}
                            showsUserLocation
                            showsMyLocationButton={false}
                            zoomControlEnabled zoomEnabled scrollEnabled rotateEnabled pitchEnabled
                        />
                        {/* Pin overlay */}
                        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ alignItems: 'center', marginBottom: 48 }}>
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 }}>
                                    <Ionicons name="location" size={22} color="#1a1a1a" />
                                </View>
                                <View style={{ width: 2, height: 10, backgroundColor: theme.colors.primary }} />
                                <View style={{ width: 8, height: 4, borderRadius: 4, backgroundColor: '#00000030' }} />
                            </View>
                        </View>
                        {/* Re-centre button */}
                        <TouchableOpacity
                            onPress={autoDetect}
                            style={{
                                position: 'absolute', bottom: 160, right: 16,
                                width: 46, height: 46, borderRadius: 23,
                                backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF',
                                alignItems: 'center', justifyContent: 'center',
                                borderWidth: 1.5, borderColor: theme.colors.border,
                                shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, elevation: 4,
                            }}
                        >
                            <Ionicons name="navigate" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Bottom sheet */}
                    <View style={{
                        backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF',
                        borderTopLeftRadius: 24, borderTopRightRadius: 24,
                        borderTopWidth: 1, borderTopColor: theme.colors.border,
                        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
                        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
                    }}>
                        {checking ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' }}>Checking serviceability…</Text>
                            </View>
                        ) : isServiceable === null ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <ActivityIndicator size="small" color={theme.colors.textMuted} />
                                <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontWeight: '500' }}>Move the map to select location…</Text>
                            </View>
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                                <Ionicons name={isServiceable ? 'checkmark-circle' : 'close-circle'} size={18} color={isServiceable ? theme.colors.success : theme.colors.error} style={{ marginTop: 1 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3, textTransform: 'uppercase', color: isServiceable ? theme.colors.success : theme.colors.error }}>
                                        {isServiceable ? '✓ Area is serviceable' : '✗ Not serviceable yet'}
                                    </Text>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary, lineHeight: 20 }} numberOfLines={2}>
                                        {locationText || 'Move the map to select a location'}
                                    </Text>
                                </View>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={handleConfirmMapLocation}
                            disabled={checking || !pinCoords || isServiceable === null || isServiceable === false}
                            activeOpacity={0.85}
                            style={{
                                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                                backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 16,
                                opacity: (checking || !pinCoords || isServiceable === null || isServiceable === false) ? 0.4 : 1,
                            }}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#1a1a1a' }}>Confirm This Location</Text>
                            <Ionicons name="checkmark-circle" size={18} color="#1a1a1a" />
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
// ─── Bike step ────────────────────────────────────────────────────────────────
function BikeStep({ theme, isDark, bikes, selectedBikeId, onSavedBikeSelect, brand, setBrand, model, setModel, customModel, setCustomModel, cc, setCc, selectedBrand, setSelectedBrand, setSelectedBikeId, bsStandard, setBsStandard }) {
    const [brandList, setBrandList] = useState([]);
    const [modelList, setModelList] = useState([]);
    const [loadingBrands, setLoadingBrands] = useState(false);
    const [loadingModels, setLoadingModels] = useState(false);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                setLoadingBrands(true);
                const response = await axiosClient.get('/api/admin/brands/getbrands');
                setBrandList(response.data || []);
            } catch (error) {
                console.error('Failed to fetch brands:', error);
            } finally {
                setLoadingBrands(false);
            }
        };
        fetchBrands();
    }, []);

    useEffect(() => {
        if (!selectedBrand?._id) { setModelList([]); return; }
        const fetchModels = async () => {
            try {
                setLoadingModels(true);
                const response = await axiosClient.get('/api/admin/brands/getmodels', { params: { brandId: selectedBrand._id } });
                setModelList(response.data || []);
            } catch (error) {
                console.error('Failed to fetch models:', error);
                setModelList([]);
            } finally {
                setLoadingModels(false);
            }
        };
        fetchModels();
    }, [selectedBrand]);

    const handleBrandSelect = (b) => {
        if (selectedBrand?._id === b._id) return;
        setSelectedBrand(b);
        setBrand(b.brandName);
        setModel('');
        setCustomModel('');
        setSelectedBikeId(null);
    };

    const handleModelSelect = (m) => {
        setModel(m.name);
        setCustomModel('');
        setSelectedBikeId(null);
    };

    const isOtherModel = model === 'Other';

    return (
        <View>
            {bikes.length > 0 && (
                <View style={{ marginBottom: 22 }}>
                    <Text style={[labelStyle(theme), { marginBottom: 12 }]}>Quick Select</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {bikes.map((bike) => (
                            <SavedBikeCard key={bike._id} bike={bike} selected={selectedBikeId === bike._id} onPress={() => onSavedBikeSelect(bike, brandList)} theme={theme} isDark={isDark} />
                        ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 4 }}>
                        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                        <Text style={{ fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' }}>OR SELECT MANUALLY</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
                    </View>
                </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Text style={labelStyle(theme)}>Brand</Text>
                {loadingBrands && <ActivityIndicator size="small" color={theme.colors.primary} />}
            </View>
            {loadingBrands ? (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                    {[80, 60, 100, 70].map((w, i) => (<View key={i} style={{ width: w, height: 38, borderRadius: 50, backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow }} />))}
                </View>
            ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                    {brandList.map((b) => (<Pill key={b._id} label={b.brandName} selected={selectedBrand?._id === b._id} onPress={() => handleBrandSelect(b)} theme={theme} isDark={isDark} />))}
                    {brandList.length === 0 && !loadingBrands && (<Text style={{ fontSize: 13, color: theme.colors.textMuted }}>No brands available.</Text>)}
                </View>
            )}
            {selectedBrand && (
                <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <Text style={labelStyle(theme)}>Model</Text>
                        {loadingModels && <ActivityIndicator size="small" color={theme.colors.primary} />}
                    </View>
                    {loadingModels ? (
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                            {[90, 70, 110, 65].map((w, i) => (<View key={i} style={{ width: w, height: 38, borderRadius: 50, backgroundColor: isDark ? theme.colors.surfaceHigh : theme.colors.surfaceLow }} />))}
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
                            {modelList.map((m) => (<Pill key={m._id || m.name} label={m.name} selected={model === m.name} onPress={() => handleModelSelect(m)} theme={theme} isDark={isDark} />))}
                            <Pill label="Other" selected={model === 'Other'} onPress={() => { setModel('Other'); setCustomModel(''); setSelectedBikeId(null); }} theme={theme} isDark={isDark} />
                            {modelList.length === 0 && !loadingModels && (<Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 8 }}>No models found for this brand.</Text>)}
                        </View>
                    )}
                </>
            )}
            {isOtherModel && (
                <View style={{ marginBottom: 16 }}>
                    <Text style={[labelStyle(theme), { marginBottom: 8 }]}>Specify Model <Text style={{ color: theme.colors.error }}>*</Text></Text>
                    <StyledInput value={customModel} onChangeText={setCustomModel} placeholder="Enter model name" theme={theme} isDark={isDark} />
                </View>
            )}
            <Text style={[labelStyle(theme), { marginBottom: 8 }]}>Engine CC <Text style={{ color: theme.colors.textMuted, fontWeight: '500', textTransform: 'none' }}>(optional)</Text></Text>
            <StyledInput value={cc} onChangeText={setCc} placeholder="e.g. 150, 200, 350" keyboardType="numeric" theme={theme} isDark={isDark} icon="speedometer-outline" />
            <Text style={[labelStyle(theme), { marginBottom: 8, marginTop: 16 }]}>BS Standard <Text style={{ color: theme.colors.textMuted, fontWeight: '500', textTransform: 'none' }}>(optional)</Text></Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {BS_STANDARDS.map((item) => (
                    <Pill
                        key={item.value}
                        label={item.label}
                        selected={bsStandard === item.value}
                        onPress={() => setBsStandard(item.value)}
                        theme={theme}
                        isDark={isDark}
                    />
                ))}
            </View>
        </View>
    );
}

// ─── Summary row ──────────────────────────────────────────────────────────────
function SummaryRow({ icon, label, value, theme, isMCI }) {
    if (!value) return null;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {isMCI ? <MaterialCommunityIcons name={icon} size={14} color={theme.colors.primary} /> : <Ionicons name={icon} size={14} color={theme.colors.primary} />}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary, marginTop: 2 }} numberOfLines={2}>{value}</Text>
            </View>
        </View>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function NewOrderForm({ onSubmit, onCancel, initialServiceType = 'Schedule Repair' }) {
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const user = useSelector((s) => s.auth.user);
    const { bikes } = useBike();

    const [step, setStep] = useState(0);
    const [alert, setAlert] = useState(null);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const [selectedBrand, setSelectedBrand] = useState(null);

    // Location
    const [locationText, setLocationText] = useState('');
    const [coords, setCoords] = useState(null);
    const [isServiceable, setIsServiceable] = useState(null);
    const [city, setCity] = useState('');
    const [distanceFromCenter, setDistanceFromCenter] = useState(null);

    // Contact
    const [name, setName] = useState(user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '');
    const [contact, setContact] = useState(user?.phone || '');

    // Bike
    const [selectedBikeId, setSelectedBikeId] = useState(null);
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [customModel, setCustomModel] = useState('');
    const [cc, setCc] = useState('');
    const [bsStandard, setBsStandard] = useState('');
    // Service
    const [selectedServices, setSelectedServices] = useState([]);
    const [otherServiceText, setOtherServiceText] = useState('');
    const [preferredDate, setPreferredDate] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [issue, setIssue] = useState('');
    const [serviceType, setServiceType] = useState(initialServiceType);

    const animateToNext = useCallback(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
            slideAnim.setValue(40);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, speed: 20, bounciness: 5, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        });
    }, []);

    const animateToPrev = useCallback(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
            slideAnim.setValue(-40);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, speed: 20, bounciness: 5, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        });
    }, []);

    const goNext = useCallback(() => { animateToNext(); setStep((s) => Math.min(s + 1, STEPS.length - 1)); }, [animateToNext]);
    const goPrev = useCallback(() => { animateToPrev(); setStep((s) => Math.max(s - 1, 0)); }, [animateToPrev]);

    const handleSavedBikeSelect = (bike, brandList) => {
        console.log(bike, "bs selection");
        if (selectedBikeId === bike._id) {
            setSelectedBikeId(null);
            setBrand('');
            setModel('');
            setCc('');
            setBsStandard('');
            setSelectedBrand(null);
        } else {
            setSelectedBikeId(bike._id);
            setBrand(bike.brand || '');
            setModel(bike.model || '');
            setCc(bike.cc ? String(bike.cc) : '');
            // Normalize BS value to uppercase for consistency
            const bsValue = bike.bs ? bike.bs.toUpperCase() : '';
            setBsStandard(bsValue);
            const matched = brandList.find((b) => b.brandName.toLowerCase() === (bike.brand || '').toLowerCase());
            setSelectedBrand(matched || null);
        }
    };
    const validateStep = () => {
        if (step === 1) {
            if (!name.trim()) return 'Please enter your name.';
            if (!contact.trim() || contact.replace(/\D/g, '').length < 10) return 'Please enter a valid 10-digit number.';
        }
        if (step === 2) {
            if (!brand) return 'Please select a bike brand.';
            if (!model) return 'Please select a bike model.';
            if (model === 'Other' && !customModel.trim()) return 'Please specify the model name.';
        }
        if (step === 3) {
            if (selectedServices.length === 0) return 'Please select at least one service.';
            if (selectedServices.includes('other') && !otherServiceText.trim()) {
                return 'Please describe the service you need.';
            }
        }
        if (step === 4) {
            if (!preferredDate) return 'Please select a date.';
            if (!preferredTime) return 'Please select a time slot.';
        }
        if (step === 0 && !city) {
            if (!coords) return 'Please select your location.';
        }
        return null;
    };

    const handleNext = () => {
        const err = validateStep();
        if (err) { setAlert({ type: 'error', message: err }); return; }
        if (step === STEPS.length - 1) { handleSubmit(); return; }
        goNext();
    };

    const handleSubmit = () => {
        if (!coords) {
            setAlert({ type: 'error', message: 'Location is required.' });
            return;
        }
        if (!city) {
            setAlert({ type: 'error', message: 'Could not determine city from location. Please try again.' });
            return;
        }

        const finalModel = model === 'Other' ? customModel.trim() : model;

        // Build services array for backend
        const finalServices = selectedServices.map(id => {
            if (id === 'other') return otherServiceText.trim();
            return getServiceLabel(id);
        }).filter(Boolean);
        const localDateStr = new Date(preferredDate).toLocaleDateString('en-CA');
        const payload = {
            name: name.trim(),
            email: user?.email || '',
            contactNo: contact.trim(),
            city: city.toUpperCase(),
            address: locationText,
            userLocation: {
                type: "Point",
                coordinates: [coords.longitude, coords.latitude]
            },
            location: {
                latitude: coords.latitude,
                longitude: coords.longitude
            },
            isWithinServiceArea: isServiceable || false,
            distanceFromCenter: distanceFromCenter,
            selectedBrand: brand,
            selectedModel: finalModel,
            modelName: finalModel,
            cc: cc,
            bs: bsStandard,
            services: finalServices,
            serviceType: serviceType,
            otherService: selectedServices.includes('other') ? otherServiceText.trim() : '',
            preferredDate: localDateStr,
            preferredTime: preferredTime,
            issues: issue.trim(),
            userId: user?._id,
            status: 'Pending',
            referralProcessed: false,
        };
        console.log(payload, "Payload from the new order form ")
        onSubmit(payload);
    };

    const currentStep = STEPS[step];
    const isLastStep = step === STEPS.length - 1;

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.colors.background }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <ProgressBar step={step} total={STEPS.length} theme={theme} />
                {/* ── Service Type Toggle ─────────────────────────────── */}
                <View style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? theme.colors.surfaceLow : '#F5F0E8',
                    borderRadius: 16,
                    padding: 4,
                    marginBottom: 24,
                    borderWidth: 1.5,
                    borderColor: serviceType === 'Emergency Repair'
                        ? '#FF6B6B44'
                        : theme.colors.border,
                }}>
                    {['Schedule Repair', 'Emergency Repair'].map((type) => {
                        const isActive = serviceType === type;
                        const isEmergency = type === 'Emergency Repair';
                        const activeColor = isEmergency ? '#FF6B6B' : theme.colors.primary;
                        return (
                            <TouchableOpacity
                                key={type}
                                onPress={() => setServiceType(type)}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    paddingVertical: 11,
                                    borderRadius: 12,
                                    backgroundColor: isActive
                                        ? (isDark ? activeColor + '22' : activeColor + '18')
                                        : 'transparent',
                                    borderWidth: isActive ? 1.5 : 0,
                                    borderColor: isActive ? activeColor : 'transparent',
                                }}
                            >
                                <MaterialCommunityIcons
                                    name={isEmergency ? 'alert-octagon' : 'calendar-clock'}
                                    size={15}
                                    color={isActive ? activeColor : theme.colors.textMuted}
                                />
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: isActive ? '800' : '600',
                                    color: isActive ? activeColor : theme.colors.textMuted,
                                    letterSpacing: 0.3,
                                }}>
                                    {isEmergency ? 'Emergency' : 'Schedule'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 26, fontWeight: '900', color: theme.colors.textPrimary, letterSpacing: -0.3, lineHeight: 32 }}>{currentStep.title}</Text>
                    <Text style={{ fontSize: 14, color: theme.colors.textMuted, marginTop: 6, fontWeight: '500' }}>{currentStep.subtitle}</Text>
                </View>
                {alert && <Alert type={alert.type} message={alert.message} visible onDismiss={() => setAlert(null)} autoDismiss={3500} style={{ marginBottom: 16 }} />}
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    {step === 0 && (
                        <LocationStep
                            theme={theme} isDark={isDark}
                            locationText={locationText} setLocationText={setLocationText}
                            setCoords={setCoords}
                            isServiceable={isServiceable} setIsServiceable={setIsServiceable}
                            onCityChange={setCity}
                            onDistanceChange={setDistanceFromCenter}
                            onNext={goNext}
                        />
                    )}
                    {step === 1 && (
                        <View style={{ gap: 16 }}>
                            <View><Text style={[labelStyle(theme), { marginBottom: 8 }]}>Your Name</Text><StyledInput value={name} onChangeText={setName} placeholder="Full name" theme={theme} isDark={isDark} icon="person-outline" /></View>
                            <View><Text style={[labelStyle(theme), { marginBottom: 8 }]}>Mobile Number</Text><StyledInput value={contact} onChangeText={setContact} placeholder="10-digit number" keyboardType="phone-pad" theme={theme} isDark={isDark} icon="call-outline" prefix="+91" /></View>
                        </View>
                    )}
                    {step === 2 && (
                        <BikeStep
                            theme={theme} isDark={isDark}
                            bikes={bikes}
                            selectedBikeId={selectedBikeId}
                            onSavedBikeSelect={handleSavedBikeSelect}
                            brand={brand} setBrand={setBrand}
                            model={model} setModel={setModel}
                            customModel={customModel} setCustomModel={setCustomModel}
                            cc={cc} setCc={setCc}
                            selectedBrand={selectedBrand}
                            setSelectedBrand={setSelectedBrand}
                            setSelectedBikeId={setSelectedBikeId}
                            bsStandard={bsStandard}
                            setBsStandard={setBsStandard}
                        />
                    )}
                    {step === 3 && (
                        <ServiceStep
                            theme={theme}
                            isDark={isDark}
                            selectedServices={selectedServices}
                            setSelectedServices={setSelectedServices}
                            otherServiceText={otherServiceText}
                            setOtherServiceText={setOtherServiceText}
                        />
                    )}
                    {step === 4 && (
                        <View>
                            <Text style={[labelStyle(theme), { marginBottom: 14 }]}>Choose a Date</Text>
                            <DateRow selectedDate={preferredDate} onSelect={setPreferredDate} theme={theme} isDark={isDark} />
                            <Text style={[labelStyle(theme), { marginTop: 24, marginBottom: 14 }]}>Choose a Time Slot</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {TIME_SLOTS.map((slot) => {
                                    const isSelected = preferredTime === slot.value;
                                    return (
                                        <TouchableOpacity key={slot.value} onPress={() => setPreferredTime(slot.value)} activeOpacity={0.8} style={{ width: '30%', paddingVertical: 11, borderRadius: 14, borderWidth: 1.5, borderColor: isSelected ? theme.colors.primary : theme.colors.border, backgroundColor: isSelected ? theme.colors.primary : isDark ? theme.colors.surfaceLow : '#FFF', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ fontSize: 12.5, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#1a1a1a' : theme.colors.textSecondary, letterSpacing: 0.2 }}>{slot.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {preferredDate && preferredTime && (
                                <View style={{ marginTop: 20, padding: 16, borderRadius: 16, backgroundColor: theme.colors.primary + '18', borderWidth: 1, borderColor: theme.colors.primary + '44', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                                    <View><Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.primary }}>Scheduled for</Text><Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '500' }}>{preferredDate} at {preferredTime}</Text></View>
                                </View>
                            )}
                        </View>
                    )}
                    {step === 5 && (
                        <View>
                            <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF', marginBottom: 24 }}>
                                <View style={{ height: 4, backgroundColor: theme.colors.primary }} />
                                <View style={{ padding: 18, gap: 10 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', letterSpacing: 0.8, color: theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>Summary</Text>
                                    <SummaryRow icon="location-outline" label="Location" value={locationText} theme={theme} />
                                    <SummaryRow icon="person-outline" label="Name" value={name} theme={theme} />
                                    <SummaryRow icon="motorbike" label="Bike" value={`${brand} ${model === 'Other' ? customModel : model}${cc ? ` · ${cc}cc` : ''}`} theme={theme} isMCI />
                                    <SummaryRow
                                        icon="car-sport-outline"  // or any suitable icon
                                        label="BS Standard"
                                        value={bsStandard || 'Not specified'}
                                        theme={theme}
                                    />
                                    {/* FIXED: Display selected services correctly */}
                                    <SummaryRow
                                        icon="construct-outline"
                                        label="Service"
                                        value={selectedServices.map(id => {
                                            if (id === 'other') return otherServiceText.trim() || 'Other';
                                            const found = SERVICE_TYPES.find(s => s.id === id);
                                            return found ? found.label.replace('\n', ' ') : id;
                                        }).join(', ')}
                                        theme={theme}
                                    />
                                    <SummaryRow icon="calendar-outline" label="Schedule" value={`${preferredDate} · ${preferredTime}`} theme={theme} />
                                </View>
                            </View>
                            <Text style={[labelStyle(theme), { marginBottom: 10 }]}>Any specific issue? <Text style={{ color: theme.colors.textMuted, fontWeight: '500', textTransform: 'none' }}>(optional)</Text></Text>
                            <StyledInput value={issue} onChangeText={setIssue} placeholder="e.g. Engine makes a weird noise, brakes are loose…" multiline numberOfLines={4} theme={theme} isDark={isDark} />
                        </View>
                    )}
                </Animated.View>
                {step > 0 && (
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
                        <TouchableOpacity onPress={goPrev} activeOpacity={0.8} style={{ width: 54, height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: theme.colors.border, backgroundColor: isDark ? theme.colors.surfaceLow : '#FFF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-back" size={20} color={theme.colors.primary} /></TouchableOpacity>
                        <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Text style={{ fontSize: 15, fontWeight: '900', color: '#1a1a1a', letterSpacing: 0.2 }}>{isLastStep ? 'Book Service' : 'Continue'}</Text><Ionicons name={isLastStep ? 'checkmark-circle' : 'arrow-forward'} size={18} color="#1a1a1a" /></TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}