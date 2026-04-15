import React, { useRef, useEffect, useState } from "react";
import {
    View, Text, StyleSheet, Animated, TouchableOpacity,
    TextInput, ScrollView, ActivityIndicator, Platform,
    KeyboardAvoidingView, Modal, StatusBar, Dimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { LightTheme, DarkTheme } from "../../styles/Theme";
import { setServiceable } from "../../store/slices/locationSlice"; // ← dispatch directly, no loop

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function NotServiceableScreen({ onRetry }) {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const mode = useSelector((s) => s.theme?.mode ?? "light");
    const city = useSelector((s) => s.location?.city ?? null);
    const isDark = mode === "dark";
    const theme = isDark ? DarkTheme : LightTheme;
    const colors = theme.colors;

    // ── Entrance animations ───────────────────────────────────────────────────
    const scale = useRef(new Animated.Value(0.94)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const iconBounce = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start(() => {
            Animated.sequence([
                Animated.timing(iconBounce, { toValue: -10, duration: 280, useNativeDriver: true }),
                Animated.spring(iconBounce, { toValue: 0, friction: 5, tension: 80, useNativeDriver: true }),
            ]).start();
        });
    }, []);

    // ── State ─────────────────────────────────────────────────────────────────
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [detectLoading, setDetectLoading] = useState(false);
    const [checking, setChecking] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);
    const [inputFocused, setInputFocused] = useState(false);

    // Map state
    const [mapVisible, setMapVisible] = useState(false);
    const [mapRegion, setMapRegion] = useState({
        latitude: 25.5941,
        longitude: 85.1376,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });
    const [pinCoords, setPinCoords] = useState(null);
    const [mapLocationText, setMapLocationText] = useState("");
    const [mapCityText, setMapCityText] = useState("");
    const [mapSearchQuery, setMapSearchQuery] = useState("");
    const [mapSearchResults, setMapSearchResults] = useState([]);
    const [mapSearchLoading, setMapSearchLoading] = useState(false);
    const [mapIsServiceable, setMapIsServiceable] = useState(null);
    const [mapChecking, setMapChecking] = useState(false);
    const [mapStatusMsg, setMapStatusMsg] = useState(null);
    const [mapSearchFocused, setMapSearchFocused] = useState(false);

    const searchTimeout = useRef(null);
    const mapSearchTimeout = useRef(null);
    const mapCheckTimeout = useRef(null);

    useEffect(() => {
        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            if (mapSearchTimeout.current) clearTimeout(mapSearchTimeout.current);
            if (mapCheckTimeout.current) clearTimeout(mapCheckTimeout.current);
        };
    }, []);

    // ── Shared: load axiosClient ──────────────────────────────────────────────
    const getAxios = async () => (await import("../../services/axiosClient")).default;

    // ── Geocode search (main card) ────────────────────────────────────────────
    const handleQueryChange = (text) => {
        setQuery(text);
        setStatusMsg(null);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (!text.trim()) { setResults([]); return; }
        searchTimeout.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const geocoded = await Location.geocodeAsync(text);
                const named = await Promise.all(
                    geocoded.slice(0, 5).map(async (r) => {
                        const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
                        const g = rev[0] || {};
                        const label = [g.name, g.street, g.district, g.city, g.region].filter(Boolean).join(", ");
                        return { label, latitude: r.latitude, longitude: r.longitude, city: g.city || g.region || null };
                    })
                );
                setResults(named);
            } catch { setResults([]); }
            finally { setSearchLoading(false); }
        }, 600);
    };

    // ── Auto-detect (main card) ───────────────────────────────────────────────
    const handleAutoDetect = async () => {
        setDetectLoading(true);
        setStatusMsg(null);
        setResults([]);
        setQuery("");
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setStatusMsg({ type: "error", text: "Location permission denied. Please search manually." });
                return;
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = loc.coords;
            const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
            let detectedCity = null;
            if (geo.length > 0) {
                const g = geo[0];
                setQuery([g.street, g.district, g.city, g.region].filter(Boolean).join(", "));
                detectedCity = g.city || g.region || null;
            }
            await checkAndDispatch(latitude, longitude, detectedCity);
        } catch {
            setStatusMsg({ type: "error", text: "Could not detect location. Try searching manually." });
        } finally { setDetectLoading(false); }
    };

    /**
     * checkAndDispatch — used by the main card (search + auto-detect).
     *
     * On success: dispatches setServiceable({ coords, city }) directly.
     *   → Redux status becomes "serviceable"
     *   → LocationGate re-renders and shows children
     *   → NO loop because useLocationCheck only fires on status === "idle"
     *
     * On failure: shows inline error banner. No Redux change.
     */
    const checkAndDispatch = async (latitude, longitude, detectedCity = null) => {
        setChecking(true);
        setStatusMsg(null);
        try {
            const axiosClient = await getAxios();
            const res = await axiosClient.post("/api/service-areas/check", { latitude, longitude });
            const ok = res.data?.serviceable ?? false;
            if (ok) {
                setStatusMsg({ type: "success", text: "Great news! We service this area. Loading…" });
                const resolvedCity = detectedCity || res.data?.area || null;
                dispatch(setServiceable({ coords: { latitude, longitude }, city: resolvedCity }));
            } else {
                setStatusMsg({ type: "error", text: res.data?.message || "Sorry, we don't service this area yet." });
            }
        } catch {
            setStatusMsg({ type: "error", text: "Could not check serviceability. Please try again." });
        } finally { setChecking(false); }
    };

    const handleSelectResult = async (result) => {
        setQuery(result.label);
        setResults([]);
        await checkAndDispatch(result.latitude, result.longitude, result.city);
    };

    // ── Open map ──────────────────────────────────────────────────────────────
    const handleOpenMap = async () => {
        setMapVisible(true);
        setMapStatusMsg(null);
        setMapIsServiceable(null);
        setMapSearchQuery("");
        setMapSearchResults([]);
        setMapLocationText("");
        setMapCityText("");

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const { latitude, longitude } = loc.coords;
                setMapRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
                setPinCoords({ latitude, longitude });
                const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (geo.length > 0) {
                    const g = geo[0];
                    setMapLocationText([g.street, g.district, g.city, g.region].filter(Boolean).join(", "));
                    setMapCityText(g.city || g.region || "");
                }
                checkMapArea(latitude, longitude);
            }
        } catch { /* fall through — user can drag manually */ }
    };

    // ── Map: check serviceability ─────────────────────────────────────────────
    const checkMapArea = async (lat, lng) => {
        setMapChecking(true);
        setMapStatusMsg(null);
        setMapIsServiceable(null);
        try {
            const axiosClient = await getAxios();
            const res = await axiosClient.post("/api/service-areas/check", { latitude: lat, longitude: lng });
            const ok = res.data?.serviceable ?? false;
            setMapIsServiceable(ok);
            if (!ok) {
                setMapStatusMsg({ type: "error", text: res.data?.message || "Sorry, we don't service this area yet." });
            } else {
                setMapStatusMsg({ type: "success", text: "Area is serviceable! Tap Confirm." });
            }
        } catch {
            setMapIsServiceable(false);
            setMapStatusMsg({ type: "error", text: "Could not verify serviceability." });
        } finally {
            setMapChecking(false);
        }
    };

    // ── Map: drag end ─────────────────────────────────────────────────────────
    const handleMapRegionChangeComplete = async (region) => {
        const { latitude, longitude } = region;
        setPinCoords({ latitude, longitude });
        try {
            const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geo.length > 0) {
                const g = geo[0];
                setMapLocationText([g.street, g.district, g.city, g.region].filter(Boolean).join(", "));
                setMapCityText(g.city || g.region || "");
            }
        } catch { /* silent */ }
        if (mapCheckTimeout.current) clearTimeout(mapCheckTimeout.current);
        setMapIsServiceable(null);
        setMapStatusMsg(null);
        mapCheckTimeout.current = setTimeout(() => checkMapArea(latitude, longitude), 800);
    };

    // ── Map: search ───────────────────────────────────────────────────────────
    const handleMapSearchChange = (text) => {
        setMapSearchQuery(text);
        if (mapSearchTimeout.current) clearTimeout(mapSearchTimeout.current);
        if (!text.trim()) { setMapSearchResults([]); return; }
        mapSearchTimeout.current = setTimeout(async () => {
            setMapSearchLoading(true);
            try {
                const geocoded = await Location.geocodeAsync(text);
                const named = await Promise.all(
                    geocoded.slice(0, 5).map(async (r) => {
                        const rev = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
                        const g = rev[0] || {};
                        const label = [g.name, g.street, g.district, g.city, g.region].filter(Boolean).join(", ");
                        return { label, latitude: r.latitude, longitude: r.longitude, city: g.city || g.region || null };
                    })
                );
                setMapSearchResults(named);
            } catch { setMapSearchResults([]); }
            finally { setMapSearchLoading(false); }
        }, 600);
    };

    const handleMapSearchSelect = (result) => {
        setMapSearchQuery("");
        setMapSearchResults([]);
        setPinCoords({ latitude: result.latitude, longitude: result.longitude });
        setMapRegion({ latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        setMapLocationText(result.label);
        setMapCityText(result.city || "");
        checkMapArea(result.latitude, result.longitude);
    };

    /**
     * handleConfirmMapLocation — THE FIX for the loop.
     *
     * OLD (caused the loop):
     *   dispatch(resetLocation())  → status = "idle"
     *   → useLocationCheck fires GPS check
     *   → GPS may return not_serviceable again
     *   → back to NotServiceableScreen → infinite loop
     *
     * NEW (no loop):
     *   dispatch(setServiceable(...))  → status = "serviceable"
     *   → LocationGate sees "serviceable" → renders children immediately
     *   → useLocationCheck will NOT re-run because status !== "idle"
     */
    const handleConfirmMapLocation = () => {
        if (!pinCoords || !mapIsServiceable) return;
        setMapVisible(false);
        dispatch(setServiceable({
            coords: { latitude: pinCoords.latitude, longitude: pinCoords.longitude },
            city: mapCityText || null,
        }));
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView
                style={{ flex: 1, backgroundColor: colors.background }}
                contentContainerStyle={[styles.root, { paddingTop: (insets?.top ?? 0) + 32, paddingBottom: (insets?.bottom ?? 0) + 32 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>

                    {/* Icon */}
                    <Animated.View style={[styles.iconBadge, { backgroundColor: isDark ? "#271F00" : "#FFFBEC", borderColor: colors.primary, transform: [{ translateY: iconBounce }] }]}>
                        <Ionicons name="location-outline" size={48} color={colors.primary} />
                    </Animated.View>

                    {/* Copy */}
                    <Text style={[styles.heading, { color: colors.textPrimary }]}>Not Available Yet</Text>
                    <Text style={[styles.sub, { color: isDark ? colors.textSecondary : colors.secondary }]}>
                        {city ? `Repairo Moto hasn't reached ${city} yet.` : "Repairo Moto isn't available in your area yet."}
                        {"\n"}Try a different location below!
                    </Text>

                    {/* ── Map Preview Card ──────────────────────────────────── */}
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleOpenMap}
                        style={[styles.mapPreviewCard, { borderColor: colors.border, shadowColor: colors.primary }]}
                    >
                        <View style={[styles.mapPreviewBg, { backgroundColor: isDark ? "#1a1a2e" : "#e8f4fd" }]}>
                            <View style={styles.mapGridH1} />
                            <View style={styles.mapGridH2} />
                            <View style={styles.mapGridV1} />
                            <View style={styles.mapGridV2} />
                            <View style={[styles.mapPinContainer, { backgroundColor: colors.primary + "20" }]}>
                                <View style={[styles.mapPinInner, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="location" size={22} color="#FFF" />
                                </View>
                                <View style={[styles.mapPinShadow, { backgroundColor: colors.primary + "30" }]} />
                            </View>
                        </View>
                        <View style={[styles.mapPreviewLabel, { backgroundColor: isDark ? colors.surface + "EE" : "#FFFFFFEE", borderColor: colors.border }]}>
                            <Ionicons name="map-outline" size={16} color={colors.primary} />
                            <Text style={[styles.mapPreviewLabelText, { color: colors.textPrimary }]}>
                                Tap to pick location on map
                            </Text>
                            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </View>
                    </TouchableOpacity>

                    {/* ── Search card ───────────────────────────────────────── */}
                    <View style={[styles.searchCard, { backgroundColor: isDark ? colors.surface : "#FFF", borderColor: colors.border, shadowColor: colors.primary }]}>
                        <Text style={[styles.searchLabel, { color: colors.textMuted }]}>Or search a location</Text>

                        <View style={[styles.inputRow, { backgroundColor: isDark ? colors.surfaceLow : "#FFF8F0", borderColor: inputFocused ? colors.primary : colors.border }]}>
                            <Ionicons name="search-outline" size={18} color={inputFocused ? colors.primary : colors.textMuted} style={{ marginRight: 10 }} />
                            <TextInput
                                value={query}
                                onChangeText={handleQueryChange}
                                placeholder="Search city, area or landmark…"
                                placeholderTextColor={colors.textMuted}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                style={[styles.input, { color: colors.textPrimary }]}
                                returnKeyType="search"
                            />
                            {searchLoading
                                ? <ActivityIndicator size="small" color={colors.primary} />
                                : query.length > 0
                                    ? <TouchableOpacity onPress={() => { setQuery(""); setResults([]); setStatusMsg(null); }} hitSlop={8}>
                                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                                    </TouchableOpacity>
                                    : null}
                        </View>

                        {results.length > 0 && (
                            <View style={[styles.resultsBox, { backgroundColor: isDark ? colors.surface : "#FFF", borderColor: colors.border }]}>
                                {results.map((r, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        onPress={() => handleSelectResult(r)}
                                        activeOpacity={0.75}
                                        disabled={checking}
                                        style={[styles.resultRow, i < results.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                                    >
                                        <View style={[styles.resultIcon, { backgroundColor: colors.primary + "18" }]}>
                                            <Ionicons name="location-outline" size={14} color={colors.primary} />
                                        </View>
                                        <Text style={[styles.resultText, { color: colors.textPrimary }]} numberOfLines={2}>{r.label}</Text>
                                        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {checking && (
                            <View style={styles.feedbackRow}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.feedbackText, { color: colors.textMuted }]}>Checking serviceability…</Text>
                            </View>
                        )}

                        {statusMsg && !checking && (
                            <View style={[styles.statusBanner, { backgroundColor: statusMsg.type === "success" ? colors.success + "18" : colors.error + "15", borderColor: statusMsg.type === "success" ? colors.success + "55" : colors.error + "55" }]}>
                                <Ionicons name={statusMsg.type === "success" ? "checkmark-circle" : "close-circle"} size={16} color={statusMsg.type === "success" ? colors.success : colors.error} />
                                <Text style={[styles.statusText, { color: statusMsg.type === "success" ? colors.success : colors.error }]}>{statusMsg.text}</Text>
                            </View>
                        )}

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity
                            style={[styles.detectBtn, { backgroundColor: isDark ? colors.surfaceLow : "#FFF8F0", borderColor: colors.border }]}
                            onPress={handleAutoDetect}
                            disabled={detectLoading || checking}
                            activeOpacity={0.75}
                        >
                            {detectLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="locate-outline" size={18} color={colors.primary} />}
                            <Text style={[styles.detectText, { color: colors.textPrimary }]}>{detectLoading ? "Detecting…" : "Use my current location"}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.hint, { color: isDark ? colors.textMuted : colors.textSecondary }]}>
                        We're expanding fast — new cities launch every month!
                    </Text>
                </Animated.View>
            </ScrollView>

            {/* ── Full-screen Map Modal ──────────────────────────────────────── */}
            <Modal
                visible={mapVisible}
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setMapVisible(false)}
            >
                <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? "light-content" : "dark-content"} />
                <View style={{ flex: 1, backgroundColor: colors.background }}>

                    {/* Map fills most of the screen */}
                    <View style={{ flex: 1, position: "relative" }}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={StyleSheet.absoluteFillObject}
                            region={mapRegion}
                            onRegionChangeComplete={handleMapRegionChangeComplete}
                            showsUserLocation
                            showsMyLocationButton={false}
                            showsCompass={false}
                        />

                        {/* Fixed center pin */}
                        <View pointerEvents="none" style={styles.centerPinWrapper}>
                            <Ionicons name="location" size={42} color={colors.primary} style={{ marginBottom: -4 }} />
                            <View style={[styles.centerPinDot, { backgroundColor: colors.primary + "40" }]} />
                        </View>

                        {/* Top overlay: back + title + search */}
                        <View style={[styles.mapTopOverlay, { paddingTop: (insets?.top ?? 0) + 8 }]}>
                            <View style={styles.mapHeaderRow}>
                                <TouchableOpacity
                                    onPress={() => setMapVisible(false)}
                                    style={[styles.mapBackBtn, { backgroundColor: isDark ? colors.surface + "EE" : "#FFFFFFEE", borderColor: colors.border }]}
                                    hitSlop={8}
                                >
                                    <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
                                </TouchableOpacity>
                                <View style={[styles.mapTitleBox, { backgroundColor: isDark ? colors.surface + "EE" : "#FFFFFFEE", borderColor: colors.border }]}>
                                    <Text style={[styles.mapTitle, { color: colors.textPrimary }]}>Pick your location</Text>
                                    <Text style={[styles.mapSubtitle, { color: colors.textMuted }]}>Drag map to adjust pin</Text>
                                </View>
                            </View>

                            <View style={[styles.mapSearchRow, { backgroundColor: isDark ? colors.surface + "F5" : "#FFFFFFF5", borderColor: mapSearchFocused ? colors.primary : colors.border }]}>
                                <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                                <TextInput
                                    value={mapSearchQuery}
                                    onChangeText={handleMapSearchChange}
                                    placeholder="Search city or area…"
                                    placeholderTextColor={colors.textMuted}
                                    onFocus={() => setMapSearchFocused(true)}
                                    onBlur={() => setMapSearchFocused(false)}
                                    style={[styles.mapSearchInput, { color: colors.textPrimary }]}
                                    returnKeyType="search"
                                />
                                {mapSearchLoading
                                    ? <ActivityIndicator size="small" color={colors.primary} />
                                    : mapSearchQuery.length > 0
                                        ? <TouchableOpacity onPress={() => { setMapSearchQuery(""); setMapSearchResults([]); }} hitSlop={8}>
                                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                                        </TouchableOpacity>
                                        : null}
                            </View>

                            {mapSearchResults.length > 0 && (
                                <View style={[styles.mapSearchResultsBox, { backgroundColor: isDark ? colors.surface : "#FFF", borderColor: colors.border }]}>
                                    {mapSearchResults.map((r, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            onPress={() => handleMapSearchSelect(r)}
                                            activeOpacity={0.75}
                                            style={[styles.resultRow, i < mapSearchResults.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                                        >
                                            <View style={[styles.resultIcon, { backgroundColor: colors.primary + "18" }]}>
                                                <Ionicons name="location-outline" size={13} color={colors.primary} />
                                            </View>
                                            <Text style={[styles.resultText, { color: colors.textPrimary }]} numberOfLines={2}>{r.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Bottom sheet */}
                    <View style={[styles.mapBottomSheet, { backgroundColor: isDark ? colors.surface : "#FFF", borderColor: colors.border, paddingBottom: (insets?.bottom ?? 0) + 16 }]}>
                        <View style={[styles.mapLocationRow, { backgroundColor: isDark ? colors.surfaceLow : "#FFF8F0", borderColor: colors.border }]}>
                            <View style={[styles.resultIcon, { backgroundColor: colors.primary + "18" }]}>
                                <Ionicons name="location-outline" size={14} color={colors.primary} />
                            </View>
                            <Text style={[styles.mapLocationText, { color: mapLocationText ? colors.textPrimary : colors.textMuted }]} numberOfLines={2}>
                                {mapLocationText || "Move the map to select a location"}
                            </Text>
                        </View>

                        {mapChecking && (
                            <View style={styles.feedbackRow}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.feedbackText, { color: colors.textMuted }]}>Checking serviceability…</Text>
                            </View>
                        )}

                        {mapStatusMsg && !mapChecking && (
                            <View style={[styles.statusBanner, { marginTop: 10, backgroundColor: mapStatusMsg.type === "success" ? colors.success + "18" : colors.error + "15", borderColor: mapStatusMsg.type === "success" ? colors.success + "55" : colors.error + "55" }]}>
                                <Ionicons name={mapStatusMsg.type === "success" ? "checkmark-circle" : "close-circle"} size={16} color={mapStatusMsg.type === "success" ? colors.success : colors.error} />
                                <Text style={[styles.statusText, { color: mapStatusMsg.type === "success" ? colors.success : colors.error }]}>{mapStatusMsg.text}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.confirmBtn, {
                                backgroundColor: mapIsServiceable ? colors.primary : colors.border,
                                opacity: mapIsServiceable && !mapChecking ? 1 : 0.5,
                            }]}
                            onPress={handleConfirmMapLocation}
                            disabled={!mapIsServiceable || mapChecking}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="checkmark-circle-outline" size={20} color={mapIsServiceable ? "#1a1a1a" : colors.textMuted} />
                            <Text style={[styles.confirmBtnText, { color: mapIsServiceable ? "#1a1a1a" : colors.textMuted }]}>
                                Confirm this location
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
    content: { width: "100%", alignItems: "center" },
    iconBadge: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 22 },
    heading: { fontSize: 26, fontWeight: "800", letterSpacing: 0.2, textAlign: "center", marginBottom: 10 },
    sub: { fontSize: 15, lineHeight: 24, textAlign: "center", letterSpacing: 0.1, marginBottom: 22, paddingHorizontal: 4 },

    mapPreviewCard: {
        width: "100%", height: 180, borderRadius: 22, borderWidth: 1.5,
        overflow: "hidden", marginBottom: 16,
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6,
    },
    mapPreviewBg: { flex: 1, alignItems: "center", justifyContent: "center", position: "relative" },
    mapGridH1: { position: "absolute", top: "33%", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "#00000015" },
    mapGridH2: { position: "absolute", top: "66%", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "#00000015" },
    mapGridV1: { position: "absolute", left: "33%", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: "#00000015" },
    mapGridV2: { position: "absolute", left: "66%", top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: "#00000015" },
    mapPinContainer: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
    mapPinInner: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    mapPinShadow: { width: 20, height: 8, borderRadius: 10, marginTop: 2 },
    mapPreviewLabel: {
        position: "absolute", bottom: 12, left: 12, right: 12,
        flexDirection: "row", alignItems: "center", gap: 8,
        borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    },
    mapPreviewLabelText: { flex: 1, fontSize: 13, fontWeight: "600" },

    searchCard: { width: "100%", borderRadius: 22, borderWidth: 1, padding: 18, marginBottom: 20, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },
    searchLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 12 },
    inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 13 : 10, minHeight: 50 },
    input: { flex: 1, fontSize: 14, fontWeight: "500" },
    resultsBox: { marginTop: 8, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
    resultRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    resultIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    resultText: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },
    feedbackRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingHorizontal: 4 },
    feedbackText: { fontSize: 13, fontWeight: "500" },
    statusBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
    statusText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
    detectBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
    detectText: { fontSize: 14, fontWeight: "600" },
    hint: { fontSize: 12, textAlign: "center", letterSpacing: 0.1, lineHeight: 18 },

    centerPinWrapper: {
        position: "absolute", top: "50%", left: "50%",
        marginLeft: -21, marginTop: -50,
        alignItems: "center",
    },
    centerPinDot: { width: 12, height: 6, borderRadius: 6 },

    mapTopOverlay: {
        position: "absolute", top: 0, left: 0, right: 0,
        paddingHorizontal: 12, paddingBottom: 8,
    },
    mapHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    mapBackBtn: {
        width: 40, height: 40, borderRadius: 12, borderWidth: 1,
        alignItems: "center", justifyContent: "center",
    },
    mapTitleBox: {
        flex: 1, borderRadius: 14, borderWidth: 1,
        paddingHorizontal: 14, paddingVertical: 8,
    },
    mapTitle: { fontSize: 14, fontWeight: "700" },
    mapSubtitle: { fontSize: 11, fontWeight: "500", marginTop: 1 },
    mapSearchRow: {
        flexDirection: "row", alignItems: "center",
        borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    },
    mapSearchInput: { flex: 1, fontSize: 14, fontWeight: "500" },
    mapSearchResultsBox: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginTop: 6 },

    mapBottomSheet: {
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
        paddingHorizontal: 18, paddingTop: 18,
    },
    mapLocationRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
        marginBottom: 4,
    },
    mapLocationText: { flex: 1, fontSize: 13, fontWeight: "500", lineHeight: 18 },
    confirmBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
        borderRadius: 16, paddingVertical: 15, marginTop: 14,
    },
    confirmBtnText: { fontSize: 15, fontWeight: "700" },
});