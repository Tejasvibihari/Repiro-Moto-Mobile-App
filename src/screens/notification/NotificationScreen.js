import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LightTheme, DarkTheme } from '../../styles/Theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import TopBar from '../../components/common/TopBar';
import { notificationService } from '../../services/notificationService';
import {
    setNotifications,
    setUnreadCount,
    markNotificationRead,
    markAllNotificationsRead
} from '../../store/slices/notificationSlice';

export default function NotificationScreen() {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const mode = useSelector((state) => state.theme.mode);
    const theme = mode === 'dark' ? DarkTheme : LightTheme;
    const isDark = mode === 'dark';

    const notifications = useSelector((state) => state.notification.notifications);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const data = await notificationService.getAll();
            if (data?.notifications) {
                dispatch(setNotifications(data.notifications));
            }
            const countData = await notificationService.getUnreadCount();
            if (countData?.count !== undefined) {
                dispatch(setUnreadCount(countData.count));
            }
        } catch (error) {
            console.error('Fetch formatting error', error);
        } finally {
            if (showLoader) setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications(true);
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications(false);
    };

    const handlePress = async (item) => {
        if (!item.isRead) {
            try {
                await notificationService.markRead(item.id);
                dispatch(markNotificationRead(item.id));
            } catch (error) {
                console.error('Mark read failed', error);
            }
        }
        if (item.orderId) {
            navigation.navigate('OrderDetail', { orderId: item.orderId });
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllRead();
            dispatch(markAllNotificationsRead());
        } catch (error) {
            console.log("Failed", error)
        }
    };

    // Helper to format date
    const timeAgo = (dateString) => {
        if (!dateString) return '';
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + 'y ago';
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + 'mo ago';
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + 'd ago';
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + 'h ago';
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + 'm ago';
        return 'Just now';
    };

    const renderItem = ({ item }) => {
        const isUnread = !item.isRead;
        return (
            <TouchableOpacity
                onPress={() => handlePress(item)}
                style={[
                    styles.card,
                    {
                        backgroundColor: isUnread
                            ? (isDark ? '#2E2E2E' : '#F9FBFF')
                            : theme.colors.surface,
                        borderColor: isUnread ? theme.colors.primary : theme.colors.border,
                        borderWidth: isUnread ? 1 : 0
                    }
                ]}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                        {item.title}
                    </Text>
                    {isUnread && <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />}
                </View>
                <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                    {item.body}
                </Text>
                <Text style={[styles.time, { color: theme.colors.textMuted }]}>
                    {timeAgo(item.createdAt)}
                </Text>
            </TouchableOpacity>
        );
    };

    const s = dynamicStyles(theme);

    return (
        <ScreenWrapper title='Notifications' noPadding={true}>
            <View style={{ flex: 1, backgroundColor: theme.colors.background }}>


                {loading ? (
                    <View style={s.center}>
                        <ActivityIndicator color={theme.colors.primary} size="large" />
                    </View>
                ) : notifications?.length === 0 ? (
                    <View style={s.center}>
                        <Ionicons name="notifications-off-outline" size={60} color={theme.colors.textMuted} />
                        <Text style={[s.emptyTitle, { color: theme.colors.textPrimary }]}>All Caught Up!</Text>
                        <Text style={[s.emptySub, { color: theme.colors.textSecondary }]}>No new notifications.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={s.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                        }
                    />
                )}
            </View>
        </ScreenWrapper>
    );
}

const dynamicStyles = (theme) => StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        alignItems: 'center'
    },
    markReadText: {
        fontWeight: '600',
        fontSize: 14,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10
    },
    emptySub: {
        fontSize: 14,
        marginTop: 5
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 30
    }
});

const styles = StyleSheet.create({
    card: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 10
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8
    },
    time: {
        fontSize: 12,
        fontWeight: '500'
    }
});
