// navigation/AppNavigator.js
import React from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";
import { usePushNotifications } from "../hooks/usePushNotifications";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import DrawerNavigator from "./DrawerNavigator";   // ← replaces BottomTabNavigator at root
import AddBikeScreen from "../screens/bikes/AddBikeScreen";
import EditBikeScreen from "../screens/bikes/EditBikeScreen";
import OrderDetailScreen from "../screens/order/OrderDetailScreen";
import QrCodeScreen from "../screens/qrcode/QrCodeScreen";
import NewOrderScreen from "../screens/order/NewOrderScreen";
import OrderScreen from "../screens/order/OrderScreen";
import NotificationScreen from "../screens/notification/NotificationScreen";
import CheckoutScreen from "../screens/payment/CheckoutScreen";
import ChatSupportScreen from "../screens/support/ChatSupportScreen";

const Stack = createNativeStackNavigator();

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
    );
}

function AppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>

            <Stack.Screen name="Main" component={DrawerNavigator} />
            {/* Bike Route  */}
            <Stack.Screen name="AddBike" component={AddBikeScreen} />
            <Stack.Screen name="EditBike" component={EditBikeScreen} />

            {/* Order Route  */}
            <Stack.Screen name="NewOrder" component={NewOrderScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Orders" component={OrderScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />


            <Stack.Screen name="QrCodeScreen" component={QrCodeScreen} />
            <Stack.Screen name="Notifications" component={NotificationScreen} />

            <Stack.Screen name="ChatSupport" component={ChatSupportScreen} />
        </Stack.Navigator>
    );
}

export default function AppNavigator() {
    const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
    const navigationRef = useNavigationContainerRef();

    usePushNotifications(navigationRef);

    return (
        <NavigationContainer ref={navigationRef}>
            {isLoggedIn ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}