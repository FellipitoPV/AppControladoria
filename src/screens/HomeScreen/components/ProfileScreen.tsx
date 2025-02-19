import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Text, Dialog, Portal, TextInput } from 'react-native-paper';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import * as ImagePicker from 'react-native-image-picker';
import { useUser } from '../../../contexts/userContext';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { customTheme } from '../../../theme/theme';
import { launchImageLibrary } from 'react-native-image-picker';

// Componente para itens de informação
interface InfoItemProps {
    icon: string;
    label: string;
    value: string;
    onEdit?: () => void;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value, onEdit }) => {
    return (
        <View style={styles.infoItem}>
            <View style={styles.infoIconLabel}>
                <MaterialIcons
                    name={icon}
                    size={22}
                    color={customTheme.colors.primary}
                />
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoValue}>
                    {value || 'Não informado'}
                </Text>
                {onEdit && (
                    <TouchableOpacity
                        onPress={onEdit}
                        style={styles.editButton}
                    >
                        <MaterialIcons
                            name="edit"
                            size={20}
                            color={customTheme.colors.primary}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function ProfileScreen() {
    const { userInfo, updateUserInfo, updateUserPhoto } = useUser();
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [phoneDialogVisible, setPhoneDialogVisible] = useState(false);
    const [newRamal, setNewRamal] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        updateUserInfo();
    }, []);

    const handlePhotoSelect = async () => {
        const options: any = {
            mediaType: 'photo',
            quality: 1,
        };

        try {
            launchImageLibrary(options, async (response: any) => {
                if (response.didCancel) {
                    console.log('Seleção de imagem cancelada');
                    return;
                }

                if (response.error) {
                    console.log('Erro ImagePicker:', response.error);
                    showGlobalToast(
                        'error',
                        'Erro',
                        'Não foi possível selecionar a imagem',
                        3000
                    );
                    return;
                }

                if (response.assets && response.assets[0]) {
                    setUploadingPhoto(true);
                    const imageUri = response.assets[0].uri;
                    const filename = imageUri.substring(imageUri.lastIndexOf('/') + 1);
                    const storageRef = storage().ref(`profile-photos/${userInfo?.id}/${filename}`);

                    try {
                        // Upload da imagem
                        await storageRef.putFile(imageUri);
                        const downloadUrl = await storageRef.getDownloadURL();

                        // Atualizar foto no perfil
                        await updateUserPhoto(downloadUrl);

                        showGlobalToast(
                            'success',
                            'Sucesso',
                            'Foto de perfil atualizada!',
                            3000
                        );
                    } catch (uploadError) {
                        console.error('Erro ao fazer upload:', uploadError);
                        showGlobalToast(
                            'error',
                            'Erro',
                            'Não foi possível fazer upload da imagem',
                            3000
                        );
                    } finally {
                        setUploadingPhoto(false);
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao abrir seletor de imagem:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível abrir o seletor de imagens',
                3000
            );
            setUploadingPhoto(false);
        }
    };

    const updateRamal = async () => {
        if (!newRamal.trim()) {
            showGlobalToast(
                'info',
                'Atenção',
                'Digite um ramal válido',
                3000
            );
            return;
        }

        setLoading(true);
        try {
            await firestore()
                .collection('users')
                .doc(userInfo?.id)
                .update({
                    ramal: newRamal.trim()
                });

            await updateUserInfo();
            setDialogVisible(false);
            setNewRamal('');

            showGlobalToast(
                'success',
                'Sucesso',
                'Ramal atualizado!',
                3000
            );
        } catch (error) {
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível atualizar o ramal',
                3000
            );
        } finally {
            setLoading(false);
        }
    };

    const updatePhone = async () => {
        if (!newPhone.trim()) {
            showGlobalToast(
                'info',
                'Atenção',
                'Digite um telefone válido',
                3000
            );
            return;
        }

        setLoading(true);
        try {
            await firestore()
                .collection('users')
                .doc(userInfo?.id)
                .update({
                    telefone: formatPhoneNumber(newPhone.trim())
                });

            await updateUserInfo();
            setPhoneDialogVisible(false);
            setNewPhone('');

            showGlobalToast(
                'success',
                'Sucesso',
                'Telefone atualizado!',
                3000
            );
        } catch (error) {
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível atualizar o telefone',
                3000
            );
        } finally {
            setLoading(false);
        }
    };

    const formatPhoneNumber = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
        return phone;
    };

    if (!userInfo) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={customTheme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialIcons
                    name="person"
                    size={32}
                    color={customTheme.colors.primary}
                />
                <Text style={styles.headerTitle}>Meu Perfil</Text>
            </View>

            {/* Foto do Perfil */}
            <View style={styles.photoContainer}>
                <TouchableOpacity
                    onPress={handlePhotoSelect}
                    disabled={uploadingPhoto}
                    style={styles.photoWrapper}
                >
                    {uploadingPhoto ? (
                        <ActivityIndicator
                            size="large"
                            color={customTheme.colors.primary}
                        />
                    ) : (
                        <>
                            {userInfo.photoURL ? (
                                <Image
                                    source={{ uri: userInfo.photoURL }}
                                    style={styles.profilePhoto}
                                />
                            ) : (
                                <View style={styles.photoPlaceholder}>
                                    <Text style={styles.photoPlaceholderText}>
                                        {userInfo.user.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.photoOverlay}>
                                <MaterialIcons
                                    name="photo-camera"
                                    size={24}
                                    color="white"
                                />
                            </View>
                        </>
                    )}
                </TouchableOpacity>
                <Text style={styles.userName}>{userInfo.user}</Text>
                <View style={styles.cargoChip}>
                    <Text style={styles.cargoText}>{userInfo.cargo}</Text>
                </View>
            </View>

            {/* Informações do Usuário */}
            <View style={styles.infoContainer}>
                <InfoItem
                    icon="email"
                    label="Email"
                    value={userInfo.email}
                />
                <InfoItem
                    icon="work"
                    label="Cargo"
                    value={userInfo.cargo}
                />
                <InfoItem
                    icon="phone"
                    label="Telefone"
                    value={userInfo.telefone ?? 'Não informado'}
                    onEdit={() => setPhoneDialogVisible(true)}
                />
                <InfoItem
                    icon="dialpad"
                    label="Ramal"
                    value={userInfo.ramal ?? 'Não informado'}
                    onEdit={() => setDialogVisible(true)}
                />
            </View>

            {/* Dialog de Ramal */}
            <Portal>
                <Dialog
                    visible={dialogVisible}
                    onDismiss={() => setDialogVisible(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title>Atualizar Ramal</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Novo Ramal"
                            value={newRamal}
                            onChangeText={setNewRamal}
                            keyboardType="number-pad"
                            maxLength={5}
                            style={styles.dialogInput}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity
                            onPress={() => setDialogVisible(false)}
                            style={styles.dialogCancelButton}
                        >
                            <Text style={styles.dialogCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={updateRamal}
                            style={styles.dialogConfirmButton}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.dialogConfirmText}>Salvar</Text>
                            )}
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Dialog de Telefone */}
            <Portal>
                <Dialog
                    visible={phoneDialogVisible}
                    onDismiss={() => setPhoneDialogVisible(false)}
                    style={styles.dialog}
                >
                    <Dialog.Title>Atualizar Telefone</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Novo Telefone"
                            value={newPhone}
                            onChangeText={setNewPhone}
                            keyboardType="number-pad"
                            maxLength={11}
                            style={styles.dialogInput}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity
                            onPress={() => setPhoneDialogVisible(false)}
                            style={styles.dialogCancelButton}
                        >
                            <Text style={styles.dialogCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={updatePhone}
                            style={styles.dialogConfirmButton}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.dialogConfirmText}>Salvar</Text>
                            )}
                        </TouchableOpacity>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: customTheme.colors.primary,
    },
    photoContainer: {
        alignItems: 'center',
        padding: 24,
    },
    photoWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    profilePhoto: {
        width: '100%',
        height: '100%',
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: customTheme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoPlaceholderText: {
        fontSize: 40,
        color: 'white',
        fontWeight: 'bold',
    },
    photoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        alignItems: 'center',
    },
    userName: {
        fontSize: 24,
        fontWeight: '600',
        marginTop: 16,
        color: '#333',
    },
    cargoChip: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: `${customTheme.colors.primary}20`,
        borderRadius: 16,
    },
    cargoText: {
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    infoContainer: {
        padding: 20,
        gap: 16,
    },
    infoItem: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    infoIconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    infoLabel: {
        color: '#666',
        fontSize: 13,
    },
    infoContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginLeft: 30,
    },
    infoValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },
    editButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: `${customTheme.colors.primary}15`,
    },
    dialog: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 8,
    },
    dialogInput: {
        marginTop: 12,
        backgroundColor: 'transparent',
    },
    dialogCancelButton: {
        padding: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    dialogConfirmButton: {
        padding: 8,
        minWidth: 80,
        alignItems: 'center',
        backgroundColor: customTheme.colors.primary,
        borderRadius: 8,
        marginLeft: 8,
    },
    dialogCancelText: {
        color: customTheme.colors.error,
        fontWeight: '500',
    },
    dialogConfirmText: {
        color: 'white',
        fontWeight: '500',
    },
});