import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../theme/theme';
import { useNavigation } from '@react-navigation/native';

interface ProfileMenuItem {
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
}

interface UserModalProps {
    visible: boolean;
    onClose: () => void;
    userInfo: {
        id: string;
        user: string;
        email: string;
        telefone?: string | null;
        cargo: string;
        ramal?: string | null;
        area?: string | null;
        acesso?: string[];
        photoURL?: string;
    };
    onLogout: () => void;
}

const UserProfileModal = ({ visible, onClose, userInfo, onLogout }: UserModalProps) => {
    const navigation = useNavigation<any>();

    const menuItems: ProfileMenuItem[] = [
        {
            icon: 'account-edit',
            label: 'Editar Perfil',
            onPress: () => handleNavigate("Profile"),
        },
    ];

    const handleNavigate = (screen: string) => {
        onClose()
        navigation.navigate(screen)
    }

    const renderMenuItem = ({ icon, label, onPress, color }: ProfileMenuItem) => (
        <TouchableOpacity
            key={label}
            style={styles.menuItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons
                    name={icon}
                    size={24}
                    color={color || customTheme.colors.onSurfaceVariant}
                />
                <Text style={styles.menuItemText}>{label}</Text>
            </View>
            <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={customTheme.colors.onSurfaceVariant}
            />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalBackground}>
                <Surface style={styles.modalContent}>
                    {/* Header com botão voltar */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.backButton}>
                            <MaterialCommunityIcons
                                name="arrow-left"
                                size={24}
                                color={customTheme.colors.onSurface}
                            />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Meu Perfil</Text>
                    </View>

                    <ScrollView style={styles.scrollContent}>

                        {/* Seção do perfil */}
                        <View style={styles.profileSection}>
                            <View style={styles.avatarContainer}>
                                {userInfo.photoURL ? (
                                    <Image
                                        source={{ uri: userInfo.photoURL }}
                                        style={styles.avatar}
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name="account"
                                        size={40}
                                        color={customTheme.colors.primary}
                                    />
                                )}
                            </View>
                            <Text style={styles.userName}>{userInfo.user}</Text>
                            <Text style={styles.userCargo}>{userInfo.cargo}</Text>
                        </View>

                        {/* Lista de menus */}
                        <View style={styles.menuSection}>
                            {menuItems.map(item => renderMenuItem(item))}
                        </View>

                        {/* Botão de Logout */}
                        <TouchableOpacity
                            style={styles.logoutButton}
                            onPress={onLogout}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="logout"
                                size={24}
                                color={customTheme.colors.error}
                            />
                            <Text style={styles.logoutText}>Sair</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Surface>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        flex: 1,
        backgroundColor: customTheme.colors.surface,
        marginTop: 40, // Deixa um espaço no topo
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.surfaceVariant,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    scrollContent: {
        flex: 1,
    },
    profileSection: {
        alignItems: 'center',
        padding: 24,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: customTheme.colors.primaryContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    userName: {
        fontSize: 24,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 4,
    },
    userCargo: {
        fontSize: 16,
        color: customTheme.colors.onSurfaceVariant,
    },
    menuSection: {
        paddingHorizontal: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.surfaceVariant,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemText: {
        marginLeft: 16,
        fontSize: 16,
        color: customTheme.colors.onSurface,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginTop: 24,
        marginHorizontal: 16,
        marginBottom: 32,
    },
    logoutText: {
        marginLeft: 16,
        fontSize: 16,
        color: customTheme.colors.error,
        fontWeight: '500',
    },
});

export default UserProfileModal;