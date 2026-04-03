import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import BikeCard from '../../components/bikes/BikeCard';
import PopUp from '../../components/common/PopUp';
import Loader from '../../components/common/Loader';
import useBikes from '../../hooks/useBikes';
import TabScreenWrapper from '../../components/common/TabScreenWrapper';

export default function MyBikeScreen({ navigation }) {
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const { bikes, loading, error, deleteBike, refetch } = useBikes();

    const [deletePopupVisible, setDeletePopupVisible] = useState(false);
    const [bikeToDelete, setBikeToDelete] = useState(null);
    const [resultPopup, setResultPopup] = useState({ visible: false, type: 'info', title: '', message: '' });
    const [deleting, setDeleting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const s = makeStyles(theme, isDark);
    const hasFetchedOnFocus = useRef(false);

    useFocusEffect(
        useCallback(() => {
            if (!hasFetchedOnFocus.current) {
                hasFetchedOnFocus.current = true;
                refetch();
            }
            return () => {
                hasFetchedOnFocus.current = false; // reset on blur
            };
        }, [refetch]) // only refetch in deps — which must be stable in the hook
    );

    const handleBikePress = (bike) => navigation?.navigate?.('BikeDetail', { bikeId: bike._id });
    const handleEdit = (bike) => navigation?.navigate?.('EditBike', { bike });
    const handleDeletePress = (bike) => { setBikeToDelete(bike); setDeletePopupVisible(true); };
    const handleAddBike = () => navigation?.navigate?.('AddBike');
    const closeResultPopup = () => setResultPopup({ visible: false, type: 'info', title: '', message: '' });

    const confirmDelete = async () => {
        if (!bikeToDelete) return;
        setDeleting(true);
        setDeletePopupVisible(false);
        try {
            await deleteBike(bikeToDelete._id);
            setResultPopup({
                visible: true, type: 'success', title: 'Deleted',
                message: `${bikeToDelete.brand} ${bikeToDelete.model} has been removed from your garage.`,
            });
        } catch (err) {
            setResultPopup({
                visible: true, type: 'error', title: 'Error',
                message: err.message || 'Failed to delete bike. Please try again.',
            });
        } finally {
            setDeleting(false);
            setBikeToDelete(null);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refetch(); } catch (err) { console.error('Refresh failed:', err); }
        finally { setRefreshing(false); }
    }, [refetch]);

    if (loading && !bikes.length) {
        return (
            <ScreenWrapper title="My Bikes" noPadding>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Loader variant="inline" message="Loading your garage..." />
                </View>
            </ScreenWrapper>
        );
    }

    if (error && !bikes.length) {
        return (
            <ScreenWrapper title="My Bikes" noPadding>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                    <Text style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 16 }}>
                        {error.message || 'Failed to load bikes. Please try again.'}
                    </Text>
                    <TouchableOpacity onPress={refetch} style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
                        <Text style={{ color: '#1a1a1a', fontWeight: '600' }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const isEmpty = bikes.length === 0 && !loading;

    return (
        <TabScreenWrapper navigation={navigation} greeting="My Bikes">
            <ScrollView
                style={s.root}
                contentContainerStyle={[s.scroll, isEmpty && s.scrollCentered]}
                showsVerticalScrollIndicator={false}
                bounces={Platform.OS === 'ios'}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                        colors={[theme.colors.primary]}
                        progressBackgroundColor={isDark ? '#1C1610' : '#FFF8EC'}
                    />
                }
            >
                {isEmpty ? (
                    /* ── Empty state ─────────────────────────────────────────── */
                    <View style={s.emptyWrapper}>
                        {/* Illustrated icon cluster */}
                        <View style={s.illustrationWrap}>
                            <View style={[s.ringOuter, { borderColor: theme.colors.primary + '18' }]} />
                            <View style={[s.ringInner, { borderColor: theme.colors.primary + '35' }]} />
                            <View style={[s.iconCircle, { backgroundColor: theme.colors.primary + '1A' }]}>
                                <MaterialCommunityIcons name="motorbike" size={52} color={theme.colors.primary} />
                            </View>
                            {/* + badge */}
                            <View style={[s.floatBadge, s.floatBadgeTopRight, { backgroundColor: theme.colors.primary }]}>
                                <Ionicons name="add" size={14} color="#1a1a1a" />
                            </View>
                            {/* wrench badge */}
                            <View style={[s.floatBadge, s.floatBadgeBottomLeft, {
                                backgroundColor: isDark ? theme.colors.surfaceHigh : '#FFF',
                                borderWidth: 1.5, borderColor: theme.colors.border,
                            }]}>
                                <Ionicons name="construct-outline" size={13} color={theme.colors.textMuted} />
                            </View>
                        </View>

                        {/* Copy */}
                        <Text style={[s.emptyTitle, { color: theme.colors.textPrimary }]}>
                            Your Garage is Empty
                        </Text>
                        <Text style={[s.emptySubtitle, { color: theme.colors.textMuted }]}>
                            Add your bike to book mechanics, track services, and keep your ride in top shape.
                        </Text>

                        {/* Primary CTA */}
                        <TouchableOpacity
                            style={[s.emptyBtn, { backgroundColor: theme.colors.primary }]}
                            activeOpacity={0.85}
                            onPress={handleAddBike}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#1a1a1a" />
                            <Text style={s.emptyBtnText}>Add Your First Bike</Text>
                        </TouchableOpacity>

                        <Text style={[s.emptyHint, { color: theme.colors.textMuted }]}>
                            Takes less than a minute ✦
                        </Text>
                    </View>
                ) : (
                    /* ── Populated state ─────────────────────────────────────── */
                    <>
                        {/* Header */}
                        <View style={s.headerSection}>
                            <Text style={[s.garageTitle, { color: theme.colors.textPrimary }]}>Garage</Text>
                            <Text style={[s.garageSubtitle, { color: theme.colors.textSecondary }]}>
                                Manage your fleet with precision.
                            </Text>
                        </View>

                        {/* Add button */}
                        <TouchableOpacity
                            style={[s.addBtn, { backgroundColor: theme.colors.primary }]}
                            activeOpacity={0.85}
                            onPress={handleAddBike}
                        >
                            <Ionicons name="add" size={18} color="#1a1a1a" />
                            <Text style={s.addBtnText}>Add New Bike</Text>
                        </TouchableOpacity>

                        {/* Bike cards */}
                        {bikes.map((bike, index) => (
                            <BikeCard
                                key={bike._id}
                                bike={bike}
                                theme={theme}
                                isDark={isDark}
                                onPress={handleBikePress}
                                onEdit={handleEdit}
                                onDelete={handleDeletePress}
                                delay={index * 100}
                            />
                        ))}
                    </>
                )}

                {deleting && (
                    <View style={s.loadingOverlay}>
                        <Loader variant="inline" message="Deleting..." />
                    </View>
                )}
            </ScrollView>

            {/* Delete confirmation */}
            <PopUp
                visible={deletePopupVisible}
                type="confirm"
                title="Delete Bike"
                message={`Are you sure you want to delete ${bikeToDelete?.brand} ${bikeToDelete?.model}? This action cannot be undone.`}
                primaryLabel="Delete"
                secondaryLabel="Cancel"
                onPrimary={confirmDelete}
                onSecondary={() => { setDeletePopupVisible(false); setBikeToDelete(null); }}
                onClose={() => { setDeletePopupVisible(false); setBikeToDelete(null); }}
                dismissOnBackdrop={false}
                showCloseIcon={false}
            />

            {/* Result popup */}
            <PopUp
                visible={resultPopup.visible}
                type={resultPopup.type}
                title={resultPopup.title}
                message={resultPopup.message}
                primaryLabel="OK"
                onPrimary={closeResultPopup}
                onClose={closeResultPopup}
                dismissOnBackdrop={true}
                showCloseIcon={true}
            />
        </TabScreenWrapper>
    );
}

function makeStyles(theme, isDark) {
    return StyleSheet.create({
        root: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        scroll: {
            paddingHorizontal: 20,
            paddingBottom: 40,
            paddingTop: 8,
        },
        scrollCentered: {
            flexGrow: 1,
            justifyContent: 'center',
        },

        // ── Populated ──────────────────────────────────────────────
        headerSection: {
            marginBottom: 16,
            gap: 4,
        },
        garageTitle: {
            fontSize: 32,
            fontWeight: '900',
            letterSpacing: -0.5,
        },
        garageSubtitle: {
            fontSize: 14,
            lineHeight: 20,
        },
        addBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 16,
            borderRadius: 14,
            marginBottom: 24,
        },
        addBtnText: {
            fontSize: 13,
            fontWeight: '800',
            letterSpacing: 1.2,
            color: '#1a1a1a',
            textTransform: 'uppercase',
        },

        // ── Empty state ────────────────────────────────────────────
        emptyWrapper: {
            alignItems: 'center',
            paddingVertical: 32,
            paddingHorizontal: 8,
        },
        illustrationWrap: {
            width: 160,
            height: 160,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            position: 'relative',
        },
        ringOuter: {
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            borderWidth: 1.5,
        },
        ringInner: {
            position: 'absolute',
            width: 124,
            height: 124,
            borderRadius: 62,
            borderWidth: 1.5,
        },
        iconCircle: {
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: 'center',
            justifyContent: 'center',
        },
        floatBadge: {
            position: 'absolute',
            width: 28,
            height: 28,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },
        floatBadgeTopRight: {
            top: 16,
            right: 10,
        },
        floatBadgeBottomLeft: {
            bottom: 16,
            left: 10,
        },
        emptyTitle: {
            fontSize: 22,
            fontWeight: '900',
            letterSpacing: -0.2,
            textAlign: 'center',
            marginBottom: 10,
        },
        emptySubtitle: {
            fontSize: 14,
            lineHeight: 22,
            textAlign: 'center',
            paddingHorizontal: 16,
            marginBottom: 32,
        },
        emptyBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 28,
            paddingVertical: 16,
            borderRadius: 16,
            marginBottom: 16,
        },
        emptyBtnText: {
            fontSize: 15,
            fontWeight: '800',
            color: '#1a1a1a',
            letterSpacing: 0.2,
        },
        emptyHint: {
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 0.3,
        },

        // ── Overlay ────────────────────────────────────────────────
        loadingOverlay: {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        },
    });
}