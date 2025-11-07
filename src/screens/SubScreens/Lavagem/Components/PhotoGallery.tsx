import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CameraOptions, launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { PERMISSIONS, RESULTS, check, request } from 'react-native-permissions';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { Photo } from '../../Operacao/rdo/Types/rdoTypes';
import React from 'react';
import { customTheme } from '../../../../theme/theme';

interface PhotoGalleryProps {
    photos: Array<Photo>;
    existingPhotos?: Array<Photo>;
    onPhotoPress?: (photo: Photo) => void;
    onDeletePhoto?: (photoId: string) => void;
    onAddPhoto?: (newPhoto: Photo) => void;
    sectionTitle?: string;
}

const PhotoGalleryEnhanced: React.FC<PhotoGalleryProps> = ({
    photos,
    existingPhotos = [],
    onPhotoPress,
    onDeletePhoto,
    onAddPhoto,
    sectionTitle,
}) => {
    const [loadingStates, setLoadingStates] = React.useState<{ [key: string]: boolean }>({});

    const allPhotos = [
        ...existingPhotos.map(foto => ({
            url: foto.url,
            uri: foto.uri,
            id: foto.id || foto.timestamp?.toString() || '',
            timestamp: foto.timestamp,
            path: foto.path
        })),
        ...photos
    ];

    const checkCameraPermission = async () => {
        try {
            const permission = Platform.select({
                android: PERMISSIONS.ANDROID.CAMERA,
                ios: PERMISSIONS.IOS.CAMERA,
            });

            if (!permission) return false;

            const result = await check(permission);
            switch (result) {
                case RESULTS.GRANTED:
                    return true;
                case RESULTS.DENIED:
                    const requestResult = await request(permission);
                    return requestResult === RESULTS.GRANTED;
                case RESULTS.BLOCKED:
                case RESULTS.UNAVAILABLE:
                    Alert.alert(
                        'Permissão Necessária',
                        'Para tirar fotos, é necessário permitir o acesso à câmera nas configurações do aplicativo.',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
                        ]
                    );
                    return false;
                default:
                    return false;
            }
        } catch (error) {
            console.error('Erro ao verificar permissão da câmera:', error);
            return false;
        }
    };

    const tirarFoto = async () => {
        const hasPermission = await checkCameraPermission();
        if (!hasPermission) return;

        const options: CameraOptions = {
            mediaType: 'photo',
            saveToPhotos: true,
            includeBase64: false,
            includeExtra: true,
            quality: 1,
        };

        launchCamera(options, (response: any) => {
            if (!response.didCancel && !response.error && response.assets?.[0]) {
                const newPhoto: Photo = {
                    uri: response.assets[0].uri,
                    id: Date.now().toString(),
                    filename: response.assets[0].fileName,
                };
                onAddPhoto?.(newPhoto);
            }
        });
    };

    const selecionarDaGaleria = () => {
        const options: any = {
            mediaType: 'photo',
            includeBase64: false,
            quality: 1,
        };

        launchImageLibrary(options, (response: any) => {
            if (!response.didCancel && !response.error && response.assets?.[0]) {
                const newPhoto: Photo = {
                    uri: response.assets[0].uri,
                    id: Date.now().toString(),
                    filename: response.assets[0].fileName,
                };
                onAddPhoto?.(newPhoto);
            }
        });
    };

    const handleLoadStart = (photoId: string) => {
        setLoadingStates(prev => ({ ...prev, [photoId]: true }));
    };

    const handleLoadEnd = (photoId: string) => {
        setLoadingStates(prev => ({ ...prev, [photoId]: false }));
    };

    return (
        <View style={styles.section}>
            {sectionTitle && (
                <View style={styles.sectionHeader}>
                    <Icon name="camera" size={20} color={customTheme.colors.primary} />
                    <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                </View>
            )}

            {/* Botões de Adicionar Foto */}
            <View style={styles.photoButtonsContainer}>
                <TouchableOpacity 
                    style={styles.dropdownContainer} 
                    onPress={tirarFoto}
                >
                    <View style={styles.photoButton}>
                        <Icon name="camera" size={24} color={customTheme.colors.primary} />
                        <Text style={styles.photoButtonText}>Tirar Foto</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.dropdownContainer} 
                    onPress={selecionarDaGaleria}
                >
                    <View style={styles.photoButton}>
                        <Icon name="image" size={24} color={customTheme.colors.primary} />
                        <Text style={styles.photoButtonText}>Galeria</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Galeria de Fotos */}
            <View style={styles.photoGalleryContainer}>
                {allPhotos.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Icon
                            name="photo-library"
                            size={48}
                            color={customTheme.colors.outline}
                        />
                        <Text style={styles.emptyText}>
                            Nenhuma foto adicionada
                        </Text>
                    </View>
                ) : (
                    <View style={styles.photoGrid}>
                        {allPhotos.map((photo) => {
                            const imageUri = photo.uri || photo.url || '';
                            const photoId = photo.id || (photo.timestamp?.toString() || '');

                            return (
                                <TouchableOpacity
                                    key={photoId}
                                    style={styles.photoContainer}
                                    onPress={() => onPhotoPress?.({ ...photo, uri: imageUri })}
                                >
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={styles.photo}
                                        onLoadStart={() => handleLoadStart(photoId)}
                                        onLoadEnd={() => handleLoadEnd(photoId)}
                                    />

                                    {loadingStates[photoId] && (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator
                                                color={customTheme.colors.primary}
                                                size="small"
                                            />
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => onDeletePhoto?.(photoId)}
                                    >
                                        <Icon
                                            name="close"
                                            size={20}
                                            color="#FFF"
                                        />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        color: customTheme.colors.onSurface,
        fontWeight: '600',
        fontSize: 18,
    },
    photoButtonsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    dropdownContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 16,
        height: 56,
    },
    photoButtonText: {
        fontSize: 16,
        color: customTheme.colors.primary,
        fontWeight: '500',
    },
    photoGalleryContainer: {
        borderRadius: 8,
        padding: 16,
        minHeight: 200,
        backgroundColor: '#FFFFFF',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
        width: '100%',
    },
    photoContainer: {
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surfaceVariant,
        width: '48%',
        aspectRatio: 4 / 3,
    },
    photo: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        resizeMode: 'cover',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    deleteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 12,
        padding: 4,
        zIndex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 16,
    },
    emptyText: {
        color: customTheme.colors.outline,
        fontSize: 16,
    },
});

export default PhotoGalleryEnhanced;