// navigation/AppNavigator.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSelector } from "react-redux";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import DrawerNavigator from "./DrawerNavigator";   // ← replaces BottomTabNavigator at root

const Stack = createNativeStackNavigator();

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}

function AppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {/*
             * DrawerNavigator is now the root of the logged-in flow.
             * It contains BottomTabNavigator as its "Home" screen,
             * so tabs + drawer both work together.
             */}
            <Stack.Screen name="Main" component={DrawerNavigator} />
        </Stack.Navigator>
    );
}

export default function AppNavigator() {
    const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
    return (
        <NavigationContainer>
            {isLoggedIn ? <AppStack /> : <AuthStack />}
        </NavigationContainer>
    );
}