import React from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import TabScreenWrapper from '../../components/common/TabScreenWrapper';
import { getImageUrl } from '../../utils/imageUtils';
import Loader from '../../components/common/Loader';

export default function DashboardScreen({ navigation }) {
    const user = useSelector((state) => state.auth.user);
    const dispatch = useDispatch();

    const imageUri = user?.profileImage ? getImageUrl(user.profileImage) : null;
    const isLoading = true;
    return (
        <TabScreenWrapper navigation={navigation}>
            <View style={styles.content}>
                <Loader variant="inline" message="Loading orders..." />
                <Button title="Logout" onPress={() => dispatch(logout())} />
            </View>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
        backgroundColor: '#ccc',
    },
    welcomeText: {
        fontSize: 16,
        marginBottom: 12,
    },
});