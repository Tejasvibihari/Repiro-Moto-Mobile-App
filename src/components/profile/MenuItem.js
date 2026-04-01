import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Local helper component for the icon
function MenuIcon({ name, lib, color, size = 20 }) {
    if (lib === 'material') {
        return <MaterialCommunityIcons name={name} size={size} color={color} />;
    }
    return <Ionicons name={name} size={size} color={color} />;
}

export default function MenuItem({ item, theme, isDark, onPress, delay }) {
    const translateX = useRef(new Animated.Value(30)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const bgAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateX, { toValue: 0, friction: 8, tension: 60, delay, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    const pressIn = () =>
        Animated.timing(bgAnim, { toValue: 1, duration: 80, useNativeDriver: false }).start();
    const pressOut = () =>
        Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();

    const bgColor = bgAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
            isDark ? '#1E1A12' : '#F5F0E8',
            isDark ? '#2A2318' : '#EDE8DE',
        ],
    });

    return (
        <Animated.View style={{ transform: [{ translateX }], opacity }}>
            <TouchableOpacity
                onPress={() => onPress(item.route)}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={1}
            >
                <Animated.View
                    style={[
                        styles.row,
                        {
                            backgroundColor: bgColor,
                            borderColor: theme.colors.border,
                        },
                    ]}
                >
                    <View style={[styles.iconWrap, { backgroundColor: isDark ? '#2A2318' : '#EDE8DE' }]}>
                        <MenuIcon
                            name={item.icon}
                            lib={item.iconLib}
                            color={theme.colors.primary}
                            size={19}
                        />
                    </View>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                        {item.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 15,
        gap: 14,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.1,
    },
});