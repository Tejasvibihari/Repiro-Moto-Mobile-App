// components/common/TabScreenWrapper.js
//
// USE ONLY on the 4 bottom-tab screens: Home, Orders, Wallet, Profile
// For every other screen use ScreenWrapper instead.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import TopBar from './TopBar';
import { getImageUrl } from '../../utils/imageUtils';

const TabScreenWrapper = ({ children, showMenuIcon = true, greeting }) => {
    const navigation = useNavigation();
    const user = useSelector((state) => state.auth.user);

    const getAvatarSource = () => {
        if (user?.profileImage) return { uri: getImageUrl(user.profileImage) };
        return require('../../assets/logo/logo72.png');
    };

    const userName = user?.firstName ? String(user.firstName) : 'User';

    return (
        <View style={styles.container}>
            <TopBar
                userName={userName}
                greeting={greeting}
                avatarSource={getAvatarSource()}
                onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                onAvatarPress={() => navigation.navigate('Profile')}
                onBookingPress={() => navigation.navigate('NewOrder')}
                showMenuIcon={showMenuIcon}
                showBookingIcon={true}
            />
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
});

export default TabScreenWrapper;