// screens/bikes/EditBikeScreen.js
// Reuses AddBikeForm with initialData for editing an existing bike profile.
// Navigate here: navigation.navigate('EditBike', { bike })

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import AddBikeForm from '../../components/bikes/AddBikeForm';
import PopUp from '../../components/common/PopUp';
import useBike from '../../hooks/useBikes';

// ─── Decorative header strip ──────────────────────────────────────────────────
function HeaderStrip({ theme, isDark }) {
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideY = useRef(new Animated.Value(12)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideY, { toValue: 0, friction: 8, tension: 55, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                stripStyles.wrap,
                {
                    backgroundColor: isDark ? '#2E2618' : '#FFF4E0',
                    borderColor: theme.colors.border,
                    opacity: fadeIn,
                    transform: [{ translateY: slideY }],
                },
            ]}
        >
            <View style={[stripStyles.iconWrap, { backgroundColor: theme.colors.primary }]}>
                <MaterialCommunityIcons name="pencil-outline" size={26} color="#1a1a1a" />
            </View>
            <View style={stripStyles.textBlock}>
                <Text style={[stripStyles.heading, { color: theme.colors.textPrimary }]}>
                    Edit Bike
                </Text>
                <Text style={[stripStyles.sub, { color: theme.colors.textMuted }]}>
                    Update your bike details below
                </Text>
            </View>
        </Animated.View>
    );
}

const stripStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 4,
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textBlock: { flex: 1, gap: 3 },
    heading: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    sub: {
        fontSize: 12,
        letterSpacing: 0.2,
    },
});

// ─── EditBikeScreen ───────────────────────────────────────────────────────────
export default function EditBikeScreen({ navigation, route }) {
    const bike = route.params?.bike;
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const { updateBike } = useBike();
    const [submitting, setSubmitting] = useState(false);
    const [lastBikeData, setLastBikeData] = useState(null);
    const [popup, setPopup] = useState({ visible: false, type: 'info', title: '', message: '' });

    const closePopup = () => setPopup(p => ({ ...p, visible: false }));

    const handleSubmit = async (bikeData) => {
        setSubmitting(true);
        setLastBikeData(bikeData);
        try {
            await updateBike(bike._id, bikeData);
            setPopup({
                visible: true,
                type: 'success',
                title: 'Bike Updated 🏍️',
                message: `${bikeData.brand} ${bikeData.model} has been updated successfully!`,
            });
        } catch (err) {
            setPopup({
                visible: true,
                type: 'error',
                title: 'Error',
                message: err.message || 'Failed to update bike. Please try again.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handlePopupPrimary = () => {
        closePopup();
        if (popup.type === 'success') {
            if (navigation.canGoBack()) navigation.goBack();
        } else {
            if (lastBikeData) handleSubmit(lastBikeData);
        }
    };

    return (
        <ScreenWrapper title="Edit Bike">
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
            >
                <ScrollView
                    contentContainerStyle={[
                        screenStyles.scroll,
                        { backgroundColor: theme.colors.background },
                    ]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <HeaderStrip theme={theme} isDark={isDark} />

                    <AddBikeForm
                        onSubmit={handleSubmit}
                        loading={submitting}
                        initialData={bike}
                    />

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <PopUp
                visible={popup.visible}
                type={popup.type}
                title={popup.title}
                message={popup.message}
                primaryLabel={popup.type === 'success' ? 'OK' : 'Retry'}
                secondaryLabel={popup.type === 'error' ? 'Cancel' : undefined}
                onPrimary={handlePopupPrimary}
                onSecondary={closePopup}
                onClose={closePopup}
                dismissOnBackdrop={popup.type === 'success'}
                showCloseIcon={popup.type !== 'success'}
            />
        </ScreenWrapper>
    );
}

const screenStyles = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        gap: 16,
        paddingTop: 16,
        paddingBottom: 32,
    },
});
