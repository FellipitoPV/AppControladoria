// PhotoViewerModal.tsx
import React from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Portal, Text, TextInput } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../theme/theme';

interface PhotoViewerModalProps {
    visible: boolean;
    photo: { img: string; imgName: string } | null;
    onClose: () => void;
    onDelete: () => void;
    onEdit: () => void;
}

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
    visible,
    photo,
    onClose,
    onDelete,
    onEdit,
}) => {
    if (!photo) return null;

    return (
        <Portal>
            <Modal
                visible={visible}
                transparent={true}
                onRequestClose={onClose}
                animationType="fade"
            >
                <View style={styles.modalContainer}>
                    {/* Header com título e botões */}
                    <View style={styles.modalHeader}>
                        <View style={styles.headerLeft}>
                            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
                                <MaterialIcons name="arrow-back" size={24} color={customTheme.colors.onPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{photo.imgName}</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity onPress={onEdit} style={styles.headerButton}>
                                <MaterialIcons name="edit" size={24} color={customTheme.colors.onPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onDelete} style={[styles.headerButton, styles.deleteButton]}>
                                <MaterialIcons name="delete" size={24} color={customTheme.colors.error} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Conteúdo da Imagem */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: photo.img }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    </View>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 40, // Espaço extra para dispositivos iOS
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    deleteButton: {
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
    },
    headerTitle: {
        marginLeft: 16,
        color: customTheme.colors.onPrimary,
        fontSize: 16,
        flex: 1,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height - 120, // Ajuste para o header
    },
});

export default PhotoViewerModal;