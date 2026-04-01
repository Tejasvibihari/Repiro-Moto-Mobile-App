import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function StatCard({ icon, label, value, theme, isDark, delay }) {
    const scale = useRef(new Animated.Value(0.85)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, delay, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? '#1E1A12' : '#F5F0E8',
                    borderColor: theme.colors.border,
                    transform: [{ scale }],
                    opacity,
                },
            ]}
        >
            <MaterialCommunityIcons name={icon} size={22} color={theme.colors.primary} />
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
            <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 6,
        minHeight: 100,
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    value: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
});