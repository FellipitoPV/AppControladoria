// QuickActionsGrid.js
import React, { useCallback, useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../../theme/theme';
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';

const QuickActionsGrid = () => {
    const [currentPage, setCurrentPage] = useState(0);
    const navigation = useNavigation<NavigationProp<ParamListBase>>();

    const quickActions = [
        { id: '1', title: 'Lavagem', icon: 'local-car-wash', color: '#6B7AFF', route: 'LavagemForm' },
        { id: '2', title: 'The Movie', icon: 'movie', color: '#FF6B6B', route: 'TheMovie' },
        { id: '3', title: 'Professional', icon: 'work', color: '#6BCB77', route: 'Professional' },
        { id: '4', title: 'All Rent', icon: 'home', color: '#4CACBC', route: 'AllRent' },
        { id: '5', title: 'Seriously', icon: 'sentiment-satisfied', color: '#9D65C9', route: 'Seriously' },
        { id: '6', title: 'Brand', icon: 'star', color: '#F4A261', route: 'Brand' },
        { id: '7', title: 'Nearby', icon: 'location-on', color: '#2A9D8F', route: 'Nearby' },
        { id: '8', title: 'Refresh', icon: 'refresh', color: '#E76F51', route: 'Refresh' },
        { id: '9', title: 'Settings', icon: 'settings', color: '#457B9D', route: 'Settings' },
        { id: '10', title: 'Help', icon: 'help', color: '#E9C46A', route: 'Help' },
        { id: '11', title: 'Profile', icon: 'person', color: '#2A9D8F', route: 'Profile' },
        { id: '12', title: 'Messages', icon: 'message', color: '#E76F51', route: 'Messages' },
    ];

    // Divide os quickActions em grupos de 4
    const pages = quickActions.reduce((acc, item, index) => {
        const pageIndex = Math.floor(index / 4);
        if (!acc[pageIndex]) {
            acc[pageIndex] = [];
        }
        acc[pageIndex].push(item);
        return acc;
    }, [] as typeof quickActions[]);

    const { width } = Dimensions.get('window');

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / width);
        setCurrentPage(page);
    };

    const handleNavigation = useCallback((route: string) => {
        try {
            navigation.navigate(route as never);
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }, [navigation]);


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Text style={styles.pageIndicator}>
                    {currentPage + 1}/{pages.length}
                </Text>
            </View>

            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                decelerationRate="fast"
                snapToInterval={width}
            >
                {pages.map((page, pageIndex) => (
                    <View
                        key={`page-${pageIndex}`}
                        style={[styles.page, { width }]}
                    >
                        <View style={styles.gridContainer}>
                            {page.map((action) => (
                                <TouchableOpacity
                                    key={action.id}
                                    style={styles.actionButton}
                                    onPress={() => handleNavigation(action.route)}
                                >
                                    <View
                                        style={[
                                            styles.iconContainer,
                                            { backgroundColor: `${action.color}20` }
                                        ]}
                                    >
                                        <Icon
                                            name={action.icon}
                                            size={24}
                                            color={action.color}
                                        />
                                    </View>
                                    <Text
                                        style={styles.actionText}
                                        numberOfLines={1}
                                    >
                                        {action.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.paginationDots}>
                {pages.map((_, index) => (
                    <View
                        key={`dot-${index}`}
                        style={[
                            styles.dot,
                            {
                                backgroundColor: currentPage === index
                                    ? customTheme.colors.primary
                                    : customTheme.colors.surfaceVariant
                            }
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onBackground,
    },
    pageIndicator: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    page: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        paddingHorizontal: 16,
    },
    actionButton: {
        width: 72,
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        color: customTheme.colors.onSurface,
        textAlign: 'center',
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});

export default QuickActionsGrid;