// screens/order/NewOrderScreen.js
import React, { useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';  // ← add useRoute
import { useSelector } from 'react-redux';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NewOrderForm from '../../components/orders/NewOrderForm';
import PopUp from '../../components/common/PopUp';
import Loader from '../../components/common/Loader';
import axiosClient from '../../services/axiosClient';
import { LightTheme, DarkTheme } from '../../styles/Theme';

export default function NewOrderScreen() {
    const navigation = useNavigation();
    const route = useRoute();                                          // ← add this
    const mode = useSelector((s) => s.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;

    // Pull serviceType from nav params, default to 'Schedule Repair'
    const initialServiceType = route.params?.serviceType ?? 'Schedule Repair';  // ← add this

    const [loading, setLoading] = useState(false);
    const [successPopup, setSuccessPopup] = useState(false);
    const [errorPopup, setErrorPopup] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (payload) => {
        setLoading(true);
        try {
            await axiosClient.post('/api/admin/order/userorder', payload);
            setSuccessPopup(true);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || err.message || 'Failed to place order.');
            setErrorPopup(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScreenWrapper title="New Service Request">
                <NewOrderForm
                    onSubmit={handleSubmit}
                    onCancel={() => navigation.goBack()}
                    initialServiceType={initialServiceType}   // ← pass it down
                />
            </ScreenWrapper>

            <Loader visible={loading} message="Booking your service..." />

            <PopUp
                visible={successPopup}
                type="success"
                title="Booking Confirmed!"
                message="Your service request has been placed. Our team will contact you shortly."
                primaryLabel="View Order"
                secondaryLabel="Go Home"
                onPrimary={() => {
                    setSuccessPopup(false);
                    // Navigate to the Orders tab inside the bottom navigator
                    navigation.navigate('Main', {
                        screen: 'Home',
                        params: { screen: 'Orders' },
                    });
                }}
                onSecondary={() => {
                    setSuccessPopup(false);
                    // Navigate to the Home tab (default tab)
                    navigation.navigate('Main', {
                        screen: 'Home',
                    });
                }}
                onClose={() => setSuccessPopup(false)}
                showCloseIcon={false}
                dismissOnBackdrop={false}
            />

            <PopUp
                visible={errorPopup}
                type="error"
                title="Booking Failed"
                message={errorMsg}
                primaryLabel="Try Again"
                onPrimary={() => setErrorPopup(false)}
                onClose={() => setErrorPopup(false)}
            />
        </View>
    );
}