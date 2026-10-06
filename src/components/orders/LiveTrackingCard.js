// src/components/orders/LiveTrackingCard.js
// "Your mechanic is on the way" — big ETA, distance left and a small live map.
// The map is only mounted once there is a location, and the camera only moves when the mechanic
// has moved noticeably, so it stays smooth and cheap.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const fmtClock = (iso) =>
    iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${Number(km).toFixed(1)} km`);

export default function LiveTrackingCard({ tracking, error, C, isDark }) {
    const mapRef = useRef(null);
    const lastFit = useRef(null);

    const t = tracking?.trackers?.find((x) => x.role === 'mechanic') || tracking?.trackers?.[0] || null;
    const eta = tracking?.eta || t?.eta || null;
    const loc = t?.location || null;
    const dest = tracking?.destination || null;

    const coords = useMemo(() => {
        const c = [];
        if (loc) c.push({ latitude: loc.lat, longitude: loc.lng });
        if (dest) c.push({ latitude: dest.lat, longitude: dest.lng });
        return c;
    }, [loc?.lat, loc?.lng, dest?.lat, dest?.lng]);

    // fit both pins — but only when the mechanic moved ~100 m since the last fit
    useEffect(() => {
        if (!mapRef.current || coords.length < 2 || !loc) return;
        const prev = lastFit.current;
        if (prev && Math.abs(prev.lat - loc.lat) < 0.001 && Math.abs(prev.lng - loc.lng) < 0.001) return;
        lastFit.current = { lat: loc.lat, lng: loc.lng };
        mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 50, right: 50, bottom: 50, left: 50 }, animated: true });
    }, [coords, loc?.lat, loc?.lng]);

    const name = t?.name || 'Your mechanic';
    const arriving = !!eta?.arriving;
    const card = isDark ? '#1C1A14' : '#FFFFFF';
    const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';

    return (
        <View style={[s.card, { backgroundColor: card, borderColor: border }]}>
            <Text style={[s.heading, { color: C.textMuted }]}>LIVE TRACKING</Text>

            <View style={s.top}>
                <View style={[s.iconWrap, { backgroundColor: 'rgba(91,140,255,0.14)' }]}>
                    <MaterialCommunityIcons name="motorbike" size={26} color="#5B8CFF" />
                </View>
                <View style={{ flex: 1 }}>
                    {eta ? (
                        <>
                            <Text style={[s.big, { color: C.textPrimary }]}>
                                {arriving ? 'Arriving now' : `Arriving in ~${eta.minutes} min`}
                            </Text>
                            <Text style={[s.sub, { color: C.textMuted }]}>
                                {name} is {fmtKm(eta.distanceKm)} away{!arriving && eta.arrivalAt ? ` · around ${fmtClock(eta.arrivalAt)}` : ''}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={[s.big, { color: C.textPrimary }]}>{name} is on the way</Text>
                            <View style={s.waitRow}>
                                <ActivityIndicator size="small" color={C.primary} />
                                <Text style={[s.sub, { color: C.textMuted }]}>Getting the live location…</Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {loc && dest && (
                <MapView
                    ref={mapRef}
                    style={s.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{ latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    toolbarEnabled={false}
                >
                    <Marker coordinate={{ latitude: loc.lat, longitude: loc.lng }} title={name} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                        <View style={s.bikePin}><MaterialCommunityIcons name="motorbike" size={18} color="#fff" /></View>
                    </Marker>
                    <Marker coordinate={{ latitude: dest.lat, longitude: dest.lng }} title="Your location" pinColor="red" />
                </MapView>
            )}

            {(error || (t && !t.online)) && (
                <Text style={[s.warn, { color: '#E67E22' }]}>
                    {error ? 'Connection lost — retrying…' : "Mechanic's phone is offline. The last known location is shown."}
                </Text>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
    heading: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.3, marginBottom: 12 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    big: { fontSize: 19, fontWeight: '900' },
    sub: { fontSize: 12.5, fontWeight: '600', marginTop: 3 },
    waitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    map: { height: 200, borderRadius: 14, marginTop: 14, overflow: 'hidden' },
    bikePin: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#5B8CFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    warn: { fontSize: 11.5, fontWeight: '700', marginTop: 10 },
});
