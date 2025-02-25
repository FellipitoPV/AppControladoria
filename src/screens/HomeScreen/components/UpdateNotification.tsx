// components/UpdateNotification.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Modal,
    ScrollView,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { customTheme } from '../../../theme/theme';

interface UpdateNotificationProps {
    updateInfo: {
        versao: string;
        apk_url: string;
        mudancas: string[];
        obrigatoria: boolean;
        data_lancamento: string;
        tamanho_mb: number;
    } | null;
    onUpdate: () => void;
    onDismiss?: () => void;
}

const UpdateNotification = ({ updateInfo, onUpdate, onDismiss }: UpdateNotificationProps) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [notificationVisible, setNotificationVisible] = useState(false);
    const notificationAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (updateInfo) {
            setNotificationVisible(true);
            Animated.timing(notificationAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true
            }).start();
        } else {
            Animated.timing(notificationAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }).start(() => {
                setNotificationVisible(false);
            });
        }
    }, [updateInfo]);

    if (!updateInfo || !notificationVisible) {
        return null;
    }

    const handleDismiss = () => {
        if (!updateInfo.obrigatoria && onDismiss) {
            Animated.timing(notificationAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }).start(() => {
                setNotificationVisible(false);
                onDismiss();
            });
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    const renderChanges = () => {
        return updateInfo.mudancas.map((change, index) => (
            <View key={index} style={styles.changeItem}>
                <Icon name="check-circle" size={18} color={customTheme.colors.primary} />
                <Text style={styles.changeText}>{change}</Text>
            </View>
        ));
    };

    return (
        <>
            <Animated.View
                style={[
                    styles.notificationBanner,
                    { 
                        opacity: notificationAnim,
                        transform: [
                            { 
                                translateY: notificationAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [50, 0]
                                })
                            }
                        ]
                    }
                ]}
            >
                <View style={styles.notificationContent}>
                    <View style={styles.iconContainer}>
                        <Icon 
                            name={updateInfo.obrigatoria ? "alert-decagram" : "update"} 
                            size={24} 
                            color={updateInfo.obrigatoria ? customTheme.colors.error : customTheme.colors.primary} 
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.updateTitle}>
                            {updateInfo.obrigatoria ? 'Atualização Obrigatória' : 'Nova Atualização Disponível'}
                        </Text>
                        <Text style={styles.updateVersion}>
                            Versão {updateInfo.versao} ({updateInfo.tamanho_mb.toFixed(1)} MB)
                        </Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.detailsButton} 
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.detailsText}>Ver</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    if (!updateInfo.obrigatoria) {
                        setModalVisible(false);
                    }
                }}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <View style={styles.modalHeader}>
                            <Icon 
                                name={updateInfo.obrigatoria ? "alert-decagram" : "update"} 
                                size={28} 
                                color={updateInfo.obrigatoria ? customTheme.colors.error : customTheme.colors.primary} 
                            />
                            <Text style={styles.modalTitle}>
                                {updateInfo.obrigatoria ? 'Atualização Obrigatória' : 'Nova Atualização Disponível'}
                            </Text>
                            {!updateInfo.obrigatoria && (
                                <TouchableOpacity 
                                    style={styles.closeButton} 
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Icon name="close" size={24} color={customTheme.colors.onSurface} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.versionInfo}>
                            <Text style={styles.versionText}>Versão {updateInfo.versao}</Text>
                            <Text style={styles.dateText}>
                                Lançado em {formatDate(updateInfo.data_lancamento)}
                            </Text>
                            <Text style={styles.sizeText}>
                                Tamanho: {updateInfo.tamanho_mb.toFixed(1)} MB
                            </Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.changesTitle}>O que há de novo:</Text>
                        <ScrollView style={styles.changesContainer}>
                            {renderChanges()}
                        </ScrollView>

                        <View style={styles.actionsContainer}>
                            <Button 
                                mode="contained"
                                style={styles.updateButton}
                                onPress={() => {
                                    setModalVisible(false);
                                    onUpdate();
                                }}
                            >
                                Atualizar Agora
                            </Button>
                            
                            {!updateInfo.obrigatoria && (
                                <Button 
                                    mode="outlined"
                                    style={styles.laterButton}
                                    onPress={() => {
                                        setModalVisible(false);
                                        handleDismiss();
                                    }}
                                >
                                    Mais Tarde
                                </Button>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    notificationBanner: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        backgroundColor: customTheme.colors.surface,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        overflow: 'hidden',
    },
    notificationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: customTheme.colors.surfaceVariant,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    updateTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    updateVersion: {
        fontSize: 12,
        color: customTheme.colors.onSurfaceVariant,
    },
    detailsButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: customTheme.colors.primaryContainer,
        borderRadius: 16,
    },
    detailsText: {
        fontSize: 14,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: customTheme.colors.surfaceVariant,
        padding: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        flex: 1,
        marginLeft: 12,
    },
    closeButton: {
        padding: 4,
    },
    versionInfo: {
        padding: 16,
    },
    versionText: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        marginBottom: 4,
    },
    dateText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
        marginBottom: 2,
    },
    sizeText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
    divider: {
        height: 1,
        backgroundColor: customTheme.colors.outlineVariant,
        marginHorizontal: 16,
    },
    changesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        margin: 16,
        marginBottom: 8,
    },
    changesContainer: {
        paddingHorizontal: 16,
        maxHeight: 200,
    },
    changeItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    changeText: {
        fontSize: 14,
        color: customTheme.colors.onSurface,
        flex: 1,
        marginLeft: 8,
        lineHeight: 20,
    },
    actionsContainer: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    updateButton: {
        flex: 1,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: customTheme.colors.primary,
    },
    laterButton: {
        flex: 1,
        borderRadius: 8,
        marginLeft: 8,
        borderColor: customTheme.colors.primary,
    },
});

export default UpdateNotification;