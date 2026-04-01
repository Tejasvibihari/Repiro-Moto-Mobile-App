import React, { useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import BikeCard from '../../components/bikes/BikeCard';
import PopUp from '../../components/common/PopUp';
import Loader from '../../components/common/Loader';
import useBikes from '../../hooks/useBikes';

export default function MyBikeScreen({ navigation }) {
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';
    const { bikes, loading, error, deleteBike, refetch } = useBikes();

    // UI state
    const [deletePopupVisible, setDeletePopupVisible] = useState(false);
    const [bikeToDelete, setBikeToDelete] = useState(null);
    const [resultPopup, setResultPopup] = useState({ visible: false, type: 'info', title: '', message: '' });
    const [deleting, setDeleting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const s = makeStyles(theme, isDark);
    useFocusEffect(
        useCallback(() => {
            // Avoid refetching if there’s already an ongoing fetch
            if (!loading && !refreshing) {
                refetch();
            }
        }, [refetch, loading, refreshing])
    );
    // Navigation handlers
    const handleBikePress = (bike) => {
        navigation?.navigate?.('BikeDetail', { bikeId: bike._id });
    };

    const handleEdit = (bike) => {
        navigation?.navigate?.('EditBike', { bike });
    };

    const handleDeletePress = (bike) => {
        setBikeToDelete(bike);
        setDeletePopupVisible(true);
    };

    const confirmDelete = async () => {
        if (!bikeToDelete) return;
        setDeleting(true);
        setDeletePopupVisible(false);
        try {
            await deleteBike(bikeToDelete._id);
            setResultPopup({
                visible: true,
                type: 'success',
                title: 'Deleted',
                message: `${bikeToDelete.brand} ${bikeToDelete.model} has been removed from your garage.`,
            });
        } catch (err) {
            setResultPopup({
                visible: true,
                type: 'error',
                title: 'Error',
                message: err.message || 'Failed to delete bike. Please try again.',
            });
        } finally {
            setDeleting(false);
            setBikeToDelete(null);
        }
    };

    const handleAddBike = () => {
        navigation?.navigate?.('AddBike');
    };

    const closeResultPopup = () => {
        setResultPopup({ visible: false, type: 'info', title: '', message: '' });
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } catch (err) {
            // Optionally handle refresh error
            console.error('Refresh failed:', err);
        } finally {
            setRefreshing(false);
        }
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

    return (
        <ScreenWrapper title="My Bikes" noPadding>
            <ScrollView
                style={s.root}
                contentContainerStyle={s.scroll}
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
                {/* Header */}
                <View style={s.headerSection}>
                    <Text style={[s.garageTitle, { color: theme.colors.textPrimary }]}>
                        {isDark ? 'My Garage' : 'Garage'}
                    </Text>
                    <Text style={[s.garageSubtitle, { color: theme.colors.textSecondary }]}>
                        {isDark
                            ? 'Your collection of precision machinery.'
                            : 'Manage your high-performance fleet\nwith surgical precision.'}
                    </Text>
                </View>

                {/* Add New Bike CTA */}
                <TouchableOpacity
                    style={[s.addBtn, { backgroundColor: theme.colors.primary }]}
                    activeOpacity={0.85}
                    onPress={handleAddBike}
                >
                    <Ionicons name="add" size={18} color="#1a1a1a" />
                    <Text style={s.addBtnText}>Add New Bike</Text>
                </TouchableOpacity>

                {/* Bike Cards */}
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

                {/* Empty state */}
                {bikes.length === 0 && !loading && (
                    <View style={s.emptyState}>
                        <Ionicons
                            name="bicycle-outline"
                            size={60}
                            color={theme.colors.textMuted}
                        />
                        <Text style={[s.emptyTitle, { color: theme.colors.textPrimary }]}>
                            No Bikes Yet
                        </Text>
                        <Text style={[s.emptySubtitle, { color: theme.colors.textMuted }]}>
                            Add your first bike to get started with precision maintenance tracking.
                        </Text>
                    </View>
                )}

                {/* Loading indicator for delete operation (overlay) */}
                {deleting && (
                    <View style={s.loadingOverlay}>
                        <Loader variant="inline" message="Deleting..." />
                    </View>
                )}
            </ScrollView>

            {/* Delete Confirmation Popup */}
            <PopUp
                visible={deletePopupVisible}
                type="confirm"
                title="Delete Bike"
                message={`Are you sure you want to delete ${bikeToDelete?.brand} ${bikeToDelete?.model}? This action cannot be undone.`}
                primaryLabel="Delete"
                secondaryLabel="Cancel"
                onPrimary={confirmDelete}
                onSecondary={() => {
                    setDeletePopupVisible(false);
                    setBikeToDelete(null);
                }}
                onClose={() => {
                    setDeletePopupVisible(false);
                    setBikeToDelete(null);
                }}
                dismissOnBackdrop={false}
                showCloseIcon={false}
            />

            {/* Result Popup (success / error after delete) */}
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
        </ScreenWrapper>
    );
}

// Styles (unchanged)
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
        headerSection: {
            marginBottom: 16,
            gap: 6,
        },
        garageTitle: {
            fontSize: 32,
            fontWeight: '900',
            letterSpacing: -0.5,
        },
        garageSubtitle: {
            fontSize: 14,
            lineHeight: 20,
            letterSpacing: 0.1,
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
        emptyState: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            gap: 12,
        },
        emptyTitle: {
            fontSize: 20,
            fontWeight: '800',
        },
        emptySubtitle: {
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
            paddingHorizontal: 20,
        },
        loadingOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        },
    });
}