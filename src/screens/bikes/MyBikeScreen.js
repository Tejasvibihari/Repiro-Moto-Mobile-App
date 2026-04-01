import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import TabScreenWrapper from '../../components/common/TabScreenWrapper';

export default function MyBikeScreen({ navigation }) {
    return (
        <TabScreenWrapper navigation={navigation}>
            <View style={styles.content}>
                <Text>My Bike Screen</Text>
            </View>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});