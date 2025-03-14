import React from 'react';
import {
    View,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Text,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../../../theme/theme';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { showGlobalToast } from '../../../../helpers/GlobalApi';
import { Photo } from '../../Controladoria/rdo/Types/rdoTypes';

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
    sectionTitle = "Registro Fotográfico"
}) => {
    const [loadingStates, setLoadingStates] = React.useState<{ [key: string]: boolean }>({});

    // Combinar fotos existentes e novas
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

    const handleLoadStart = (photoId: string) => {
        setLoadingStates(prev => ({ ...prev, [photoId]: true }));
    };

    const handleLoadEnd = (photoId: string) => {
        setLoadingStates(prev => ({ ...prev, [photoId]: false }));
    };

    const selectImage = () => {
        const options: any = {
            mediaType: 'photo',
            quality: 1,
        };

        launchImageLibrary(options, (response: any) => {
            if (response.didCancel) {
                console.log('Seleção de imagem cancelada');
            } else if (response.error) {
                console.log('Erro ImagePicker:', response.error);
                showGlobalToast(
                    'error',
                    'Não foi possível selecionar a imagem',
                    'Tente novamente',
                    4000
                );
            } else if (response.assets && response.assets.length > 0) {
                const newPhotoUri = response.assets[0].uri;
                // Criando um objeto com uri e id único
                const newPhoto = {
                    uri: newPhotoUri,
                    id: Date.now().toString(), // Usando timestamp como id único
                };

                if (onAddPhoto) {
                    onAddPhoto(newPhoto);
                }
            }
        });
    };

    const launchCustomCamera = () => {
        const options: any = {
            mediaType: 'photo',
            quality: 1,
        };

        launchCamera(options, (response: any) => {
            if (response.didCancel) {
                console.log('Captura de foto cancelada');
            } else if (response.error) {
                console.log('Erro Camera:', response.error);
                showGlobalToast(
                    'error',
                    'Não foi possível capturar a foto',
                    'Tente novamente',
                    4000
                );
            } else if (response.assets && response.assets.length > 0) {
                const newPhotoUri = response.assets[0].uri;
                // Criando um objeto com uri e id único
                const newPhoto = {
                    uri: newPhotoUri,
                    id: Date.now().toString(), // Usando timestamp como id único
                };

                if (onAddPhoto) {
                    onAddPhoto(newPhoto);
                }
            }
        });
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Icon
                    name="camera-alt"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text style={styles.sectionTitle}>
                    {sectionTitle}
                </Text>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.photoButtonsContainer}>
                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        activeOpacity={0.7}
                        onPress={launchCustomCamera}
                    >
                        <View style={styles.photoButton}>
                            <Icon
                                name="camera-alt"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.photoButtonText}>Tirar Foto</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        activeOpacity={0.7}
                        onPress={selectImage}
                    >
                        <View style={styles.photoButton}>
                            <Icon
                                name="photo-library"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.photoButtonText}>Galeria</Text>
                        </View>
                    </TouchableOpacity>
                </View>

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
                                // Determinar URI da imagem (pode ser local ou do Firebase)
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
    inputGroup: {
        gap: 10,
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
        borderWidth: 1,
        borderColor: customTheme.colors.outline,
        borderStyle: 'dashed',
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