import * as ImagePicker from 'react-native-image-picker';

import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput as RNTextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { PERMISSIONS, request } from 'react-native-permissions';
import React, { useEffect, useState } from 'react';
import { ecoApi, ecoStorage } from '../../../api/ecoApi';

import Contacts from 'react-native-contacts';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../../theme/theme';
import { launchImageLibrary } from 'react-native-image-picker';
import { showGlobalToast } from '../../../helpers/GlobalApi';
import { useUser } from '../../../contexts/userContext';

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
                            color={customTheme.colors.onPrimary}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// Componente para item de contato de emergência
interface EmergencyContactItemProps {
    contact: {
        id: string;
        nome: string;
        parentesco: string;
        telefone: string;
    };
}

const EmergencyContactItem: React.FC<EmergencyContactItemProps> = ({ contact }) => {
    return (
        <View style={styles.emergencyContactItem}>
            <View style={styles.emergencyContactInfo}>
                <Text style={styles.emergencyContactName}>{contact.nome}</Text>
                <Text style={styles.emergencyContactDetail}>
                    Parentesco: {contact.parentesco || 'Não informado'}
                </Text>
                <Text style={styles.emergencyContactDetail}>
                    Telefone: {contact.telefone}
                </Text>
            </View>
        </View>
    );
};

export default function ProfileScreen() {
    const { userInfo, updateUserInfo, updateUserPhoto } = useUser();
    const [loading, setLoading] = useState(false);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [phoneDialogVisible, setPhoneDialogVisible] = useState(false);
    const [emergencyDialogVisible, setEmergencyDialogVisible] = useState(false);
    const [emergencyMode, setEmergencyMode] = useState<'manual' | 'import' | null>(null);
    const [newRamal, setNewRamal] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [emergencyParentesco, setEmergencyParentesco] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [contactPickerVisible, setContactPickerVisible] = useState(false);
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [contactSearch, setContactSearch] = useState('');
    const [loadingContacts, setLoadingContacts] = useState(false);

    useEffect(() => {
        updateUserInfo();
    }, []);

    // Atualizar handlePhotoSelect
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
                    const filename = `profile-photos/${userInfo?.id}/${imageUri.substring(imageUri.lastIndexOf('/') + 1)}`;

                    try {
                        const result = await ecoStorage.upload({ uri: imageUri, type: 'image/jpeg', name: filename });
                        await updateUserPhoto(result.url);

                        showGlobalToast('success', 'Sucesso', 'Foto de perfil atualizada!', 3000);
                    } catch (uploadError) {
                        console.error('Erro ao fazer upload:', uploadError);
                        showGlobalToast('error', 'Erro', 'Não foi possível fazer upload da imagem', 3000);
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

    // Atualizar updateRamal
    const updateRamal = async () => {
        if (!newRamal.trim()) {
            showGlobalToast('info', 'Atenção', 'Digite um ramal válido', 3000);
            return;
        }

        setLoading(true);
        try {
            if (userInfo?.id) {
                await ecoApi.update('users', userInfo.id, { ramal: newRamal.trim() });
            } else {
                showGlobalToast('error', 'Erro', 'Usuário não encontrado', 3000);
            }

            await updateUserInfo();
            setDialogVisible(false);
            setNewRamal('');
            showGlobalToast('success', 'Sucesso', 'Ramal atualizado!', 3000);
        } catch (error) {
            showGlobalToast('error', 'Erro', 'Não foi possível atualizar o ramal', 3000);
        } finally {
            setLoading(false);
        }
    };

    // Atualizar updatePhone
    const updatePhone = async () => {
        if (!newPhone.trim()) {
            showGlobalToast('info', 'Atenção', 'Digite um telefone válido', 3000);
            return;
        }

        setLoading(true);
        try {
            if (userInfo?.id) {
                await ecoApi.update('users', userInfo.id, { telefone: formatPhoneNumber(newPhone.trim()) });
            } else {
                showGlobalToast('error', 'Erro', 'Usuário não encontrado', 3000);
            }

            await updateUserInfo();
            setPhoneDialogVisible(false);
            setNewPhone('');
            showGlobalToast('success', 'Sucesso', 'Telefone atualizado!', 3000);
        } catch (error) {
            showGlobalToast('error', 'Erro', 'Não foi possível atualizar o telefone', 3000);
        } finally {
            setLoading(false);
        }
    };

    // Atualizar updateEmergencyContact
    const updateEmergencyContact = async () => {
        if (!emergencyName.trim() || !emergencyPhone.trim()) {
            showGlobalToast('info', 'Atenção', 'Preencha nome e telefone do contato.', 3000);
            return;
        }

        setLoading(true);
        try {
            const newContact = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                nome: emergencyName.trim(),
                parentesco: emergencyParentesco.trim() || 'Não informado',
                telefone: formatPhoneNumber(emergencyPhone.trim()),
            };

            if (userInfo?.id) {
                const currentContacts = userInfo.emergency_contacts ?? [];
                await ecoApi.update('users', userInfo.id, {
                    emergency_contacts: [...currentContacts, newContact],
                });
            } else {
                showGlobalToast('error', 'Erro', 'Usuário não encontrado', 3000);
            }

            await updateUserInfo();
            setEmergencyDialogVisible(false);
            setEmergencyName('');
            setEmergencyPhone('');
            setEmergencyParentesco('');
            setEmergencyMode(null);
            showGlobalToast('success', 'Sucesso', 'Contato de emergência adicionado!', 3000);
        } catch (error) {
            console.error('Erro ao adicionar contato de emergência:', error);
            showGlobalToast(
                'error',
                'Erro',
                'Não foi possível adicionar o contato de emergência.',
                3000
            );
        } finally {
            setLoading(false);
        }
    };
    //

    const openContactPicker = async () => {
        setLoadingContacts(true);
        try {
            const contacts = await Contacts.getAll();
            // Filtrar apenas contatos com pelo menos um telefone
            const withPhone = contacts
                .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
                .sort((a, b) => {
                    const nameA = (a.displayName || a.givenName || '').toLowerCase();
                    const nameB = (b.displayName || b.givenName || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            setAllContacts(withPhone);
            setContactSearch('');
            setContactPickerVisible(true);
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível carregar os contatos.', 3000);
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleSelectContact = (contact: any) => {
        const name = contact.displayName || `${contact.givenName || ''} ${contact.familyName || ''}`.trim();
        const phone = (contact.phoneNumbers[0]?.number || '').replace(/\D/g, '');
        setEmergencyName(name);
        setEmergencyPhone(phone);
        setContactPickerVisible(false);
        setContactSearch('');
        setEmergencyMode('manual');
    };

    const requestContactsPermission = async () => {
        try {
            const permission =
                Platform.OS === 'ios'
                    ? PERMISSIONS.IOS.CONTACTS
                    : PERMISSIONS.ANDROID.READ_CONTACTS;

            const result = await request(permission);
            if (result === 'granted') {
                openContactPicker();
            } else {
                showGlobalToast('error', 'Permissão negada', 'Você precisa permitir o acesso aos contatos.', 3000);
            }
        } catch (error) {
            console.error('Erro ao solicitar permissão:', error);
            showGlobalToast('error', 'Erro', 'Não foi possível solicitar permissão.', 3000);
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

    const filteredContacts = allContacts.filter(c => {
        const name = (c.displayName || `${c.givenName || ''} ${c.familyName || ''}`).toLowerCase();
        return name.includes(contactSearch.toLowerCase());
    });

    return (
        <ScrollView style={styles.container}>
            {/* Header de Meu Perfil */}
            <View style={styles.header}>
                <MaterialIcons
                    name="person"
                    size={32}
                    color={customTheme.colors.primary}
                />
                <Text style={styles.headerTitle}>Meu Perfil</Text>
            </View>
            <View style={styles.profileHeader}>
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
                <View style={styles.profileInfo}>
                    <Text style={styles.userName}>{userInfo.user}</Text>
                    <Text style={styles.userEmail}>{userInfo.email}</Text>
                    <View style={styles.cargoChip}>
                        <Text style={styles.cargoText}>{userInfo.cargo}</Text>
                    </View>
                </View>
            </View>

            {/* Informações de Contato */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Informações de Contato</Text>
                <View style={styles.infoContainer}>
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
            </View>

            {/* Contatos de Emergência */}
            <View style={styles.sectionContainer}>
                <View style={styles.emergencyHeader}>
                    <Text style={styles.sectionTitle}>Contatos de Emergência</Text>
                    <TouchableOpacity
                        onPress={() => setEmergencyDialogVisible(true)}
                        style={styles.addButton}
                    >
                        <MaterialIcons
                            name="add"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    </TouchableOpacity>
                </View>
                {(userInfo.emergency_contacts ?? []).length > 0 ? (
                    <FlatList
                        data={userInfo.emergency_contacts}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <EmergencyContactItem contact={item} />}
                        scrollEnabled={false}
                    />
                ) : (
                    <Text style={styles.noContactsText}>
                        Nenhum contato de emergência cadastrado.
                    </Text>
                )}
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

            {/* Modal de seleção de contato */}
            <Modal
                visible={contactPickerVisible}
                animationType="slide"
                onRequestClose={() => setContactPickerVisible(false)}
            >
                <View style={styles.pickerContainer}>
                    {/* Header */}
                    <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>Selecionar Contato</Text>
                        <TouchableOpacity
                            onPress={() => { setContactPickerVisible(false); setContactSearch(''); }}
                            style={styles.pickerCloseBtn}
                        >
                            <MaterialIcons name="close" size={24} color={customTheme.colors.onSurface} />
                        </TouchableOpacity>
                    </View>

                    {/* Busca */}
                    <View style={styles.pickerSearchBox}>
                        <MaterialIcons name="search" size={20} color={customTheme.colors.onSurfaceVariant} />
                        <RNTextInput
                            style={styles.pickerSearchInput}
                            placeholder="Buscar contato..."
                            placeholderTextColor={customTheme.colors.onSurfaceVariant}
                            value={contactSearch}
                            onChangeText={setContactSearch}
                            autoFocus
                        />
                        {contactSearch.length > 0 && (
                            <TouchableOpacity onPress={() => setContactSearch('')}>
                                <MaterialIcons name="clear" size={18} color={customTheme.colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Lista */}
                    {loadingContacts ? (
                        <View style={styles.pickerLoading}>
                            <ActivityIndicator size="large" color={customTheme.colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredContacts}
                            keyExtractor={(_, i) => String(i)}
                            renderItem={({ item }) => {
                                const name = item.displayName || `${item.givenName || ''} ${item.familyName || ''}`.trim();
                                const phone = item.phoneNumbers[0]?.number || '';
                                return (
                                    <TouchableOpacity
                                        style={styles.pickerItem}
                                        onPress={() => handleSelectContact(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.pickerItemAvatar}>
                                            <Text style={styles.pickerItemAvatarText}>
                                                {name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.pickerItemInfo}>
                                            <Text style={styles.pickerItemName}>{name}</Text>
                                            <Text style={styles.pickerItemPhone}>{phone}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            ItemSeparatorComponent={() => <View style={styles.pickerSeparator} />}
                            ListEmptyComponent={
                                <View style={styles.pickerEmpty}>
                                    <Text style={styles.pickerEmptyText}>Nenhum contato encontrado</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </Modal>

            {/* Dialog de Contato de Emergência */}
            <Portal>
                <Dialog
                    visible={emergencyDialogVisible}
                    onDismiss={() => {
                        setEmergencyDialogVisible(false);
                        setEmergencyMode(null);
                        setEmergencyName('');
                        setEmergencyPhone('');
                        setEmergencyParentesco('');
                    }}
                    style={styles.dialog}
                >
                    <Dialog.Title>Adicionar Contato de Emergência</Dialog.Title>
                    <Dialog.Content>
                        {emergencyMode === null ? (
                            <View style={styles.emergencyModeContainer}>
                                <Button
                                    mode="contained"
                                    onPress={() => setEmergencyMode('manual')}
                                    style={styles.emergencyModeButton}
                                    labelStyle={styles.emergencyModeButtonText}
                                >
                                    Inserir Manualmente
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={requestContactsPermission}
                                    style={styles.emergencyModeButton}
                                    labelStyle={styles.emergencyModeButtonText}
                                >
                                    Importar da Agenda
                                </Button>
                            </View>
                        ) : (
                            <>
                                <TextInput
                                    label="Nome do Contato"
                                    value={emergencyName}
                                    onChangeText={setEmergencyName}
                                    style={styles.dialogInput}
                                />
                                <TextInput
                                    label="Parentesco"
                                    value={emergencyParentesco}
                                    onChangeText={setEmergencyParentesco}
                                    style={styles.dialogInput}
                                />
                                <TextInput
                                    label="Telefone do Contato"
                                    value={emergencyPhone}
                                    onChangeText={setEmergencyPhone}
                                    keyboardType="number-pad"
                                    maxLength={11}
                                    style={styles.dialogInput}
                                />
                            </>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <TouchableOpacity
                            onPress={() => {
                                setEmergencyDialogVisible(false);
                                setEmergencyMode(null);
                                setEmergencyName('');
                                setEmergencyPhone('');
                                setEmergencyParentesco('');
                            }}
                            style={styles.dialogCancelButton}
                        >
                            <Text style={styles.dialogCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        {emergencyMode !== null && (
                            <TouchableOpacity
                                onPress={updateEmergencyContact}
                                style={styles.dialogConfirmButton}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.dialogConfirmText}>Salvar</Text>
                                )}
                            </TouchableOpacity>
                        )}
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
    profileHeader: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
        gap: 16,
    },
    photoWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
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
    profileInfo: {
        flex: 1,
        gap: 4,
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    userEmail: {
        fontSize: 16,
        color: '#666',
    },
    cargoChip: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: `${customTheme.colors.primary}20`,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    cargoText: {
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    sectionContainer: {
        padding: 20,
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    infoContainer: {
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
        backgroundColor: customTheme.colors.primary,
    },
    emergencyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    addButton: {
        padding: 8,
        backgroundColor: `${customTheme.colors.primary}20`,
        borderRadius: 20,
    },
    emergencyContactItem: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        marginBottom: 8,
    },
    emergencyContactInfo: {
        gap: 4,
    },
    emergencyContactName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    emergencyContactDetail: {
        fontSize: 14,
        color: '#666',
    },
    noContactsText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 16,
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
    emergencyModeContainer: {
        flexDirection: 'column',
        gap: 12,
        marginTop: 12,
    },
    emergencyModeButton: {
        backgroundColor: customTheme.colors.primary,
    },
    emergencyModeButtonText: {
        color: 'white',
        fontWeight: '500',
    },

    // ── Contact Picker Modal ─────────────────────────────────────────────────
    pickerContainer: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    pickerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: customTheme.colors.surfaceVariant,
        backgroundColor: customTheme.colors.surface,
    },
    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
    },
    pickerCloseBtn: {
        padding: 4,
    },
    pickerSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: customTheme.colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
        gap: 8,
    },
    pickerSearchInput: {
        flex: 1,
        fontSize: 15,
        color: customTheme.colors.onSurface,
        padding: 0,
    },
    pickerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    pickerItemAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: `${customTheme.colors.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerItemAvatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    pickerItemInfo: {
        flex: 1,
    },
    pickerItemName: {
        fontSize: 15,
        fontWeight: '500',
        color: customTheme.colors.onSurface,
    },
    pickerItemPhone: {
        fontSize: 13,
        color: customTheme.colors.onSurfaceVariant,
        marginTop: 2,
    },
    pickerSeparator: {
        height: 1,
        backgroundColor: customTheme.colors.surfaceVariant,
        marginLeft: 70,
    },
    pickerEmpty: {
        padding: 32,
        alignItems: 'center',
    },
    pickerEmptyText: {
        fontSize: 14,
        color: customTheme.colors.onSurfaceVariant,
    },
});