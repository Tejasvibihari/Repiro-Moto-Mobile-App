// components/common/TabScreenWrapper.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import TopBar from './TopBar';
import { getImageUrl } from '../../utils/imageUtils';

// DynamicStatusBar lives in AppEntry — not here.

const TabScreenWrapper = ({ children, showMenuIcon = true }) => {
    // useNavigation() reaches the nearest navigator — which is the Drawer.
    // DrawerActions.openDrawer() / toggleDrawer() works regardless of nesting depth.
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
                avatarSource={getAvatarSource()}
                onMenuPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                onAvatarPress={() => navigation.navigate('Profile')}
                showMenuIcon={showMenuIcon}
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