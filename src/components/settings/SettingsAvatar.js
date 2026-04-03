import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated, Alert, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import SelectionPopUp from '../common/SelectionPopUp';

const AVATAR_SIZE = 76;

export default function SettingsAvatar({ avatarSource, name, memberTag, memberSince, onAvatarChange, C, isDark }) {
    const scale = useRef(new Animated.Value(0.9)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [isSelectionVisible, setIsSelectionVisible] = useState(false);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 360, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleCamera = async () => {
        try {
            const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
            
            if (status !== 'granted') {
                if (canAskAgain) {
                    Alert.alert(
                        'Permission needed',
                        'Please allow camera access to take a photo.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Try Again', onPress: () => ImagePicker.requestCameraPermissionsAsync() }
                        ]
                    );
                } else {
                    Alert.alert('Permission denied', 'Please enable camera access in device settings.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]);
                }
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            processImageResult(result);
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Failed to open camera. Please try again.');
        }
    };

    const handleGallery = async () => {
        try {
            const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                if (canAskAgain) {
                    Alert.alert(
                        'Permission needed',
                        'Please allow access to your photos to change your avatar.',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Try Again', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
                        ]
                    );
                } else {
                    Alert.alert('Permission denied', 'Please enable photo access in device settings.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]);
                }
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            processImageResult(result);
        } catch (error) {
            console.error('Gallery error:', error);
            Alert.alert('Error', 'Failed to open gallery. Please try again.');
        }
    };

    const processImageResult = (result) => {
        if (!result.canceled && result.assets?.length) {
            const asset = result.assets[0];
            const normalizedAsset = {
                uri: asset.uri,
                type: asset.mimeType || 'image/jpeg',
                fileName: asset.fileName || asset.uri.split('/').pop() || 'profile.jpg',
            };
            onAvatarChange?.(normalizedAsset);
        }
    };

    const handlePickImage = () => {
        setIsSelectionVisible(true);
    };

    const imageOptions = [
        {
            label: "Take Photo",
            icon: "camera-outline",
            onPress: handleCamera,
        },
        {
            label: "Choose from Gallery",
            icon: "images-outline",
            onPress: handleGallery,
        }
    ];

    const initials = (name ?? '').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
    const year = memberSince ? new Date(memberSince).getFullYear() : new Date().getFullYear();

    return (
        <>
            <Animated.View style={[s.wrap, { opacity, transform: [{ scale }] }]}>
                <View style={[s.ring, { borderColor: C.primary }]}>
                    {avatarSource ? (
                        <Image source={avatarSource} style={s.avatar} />
                    ) : (
                        <View style={[s.fallback, { backgroundColor: isDark ? '#2E2618' : '#FFF4E0' }]}>
                            <Text style={[s.initials, { color: C.primary }]}>{initials || '?'}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity style={[s.badge, { backgroundColor: C.primary, borderColor: isDark ? '#1C1610' : '#FFF8EC' }]} onPress={handlePickImage} activeOpacity={0.8} hitSlop={8}>
                    <Ionicons name="pencil" size={10} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={[s.name, { color: C.textPrimary }]}>{name || 'User'}</Text>
                <View style={s.tagRow}>
                    <MaterialCommunityIcons name="crown" size={11} color={C.primary} />
                    <Text style={[s.tag, { color: C.primary }]}>{memberTag} since {year}</Text>
                </View>
            </Animated.View>

            <SelectionPopUp
                visible={isSelectionVisible}
                title="Profile Photo"
                options={imageOptions}
                onClose={() => setIsSelectionVisible(false)}
            />
        </>
    );
}

const s = StyleSheet.create({
    wrap: { alignItems: 'center', gap: 6, paddingVertical: 6 },
    ring: { width: AVATAR_SIZE + 5, height: AVATAR_SIZE + 5, borderRadius: (AVATAR_SIZE + 5) / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
    fallback: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
    initials: { fontSize: 28, fontWeight: '800' },
    badge: { position: 'absolute', bottom: 22, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, zIndex: 10 },
    name: { fontSize: 18, fontWeight: '800', letterSpacing: 0, marginTop: 2 },
    tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
});