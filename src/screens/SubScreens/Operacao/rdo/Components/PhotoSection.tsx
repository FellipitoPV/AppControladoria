import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { showGlobalToast } from '../../../../../helpers/GlobalApi';
import { customTheme } from '../../../../../theme/theme';
import PhotoGallery from '../../../Lavagem/Components/PhotoGallery';
import { Photo } from '../Types/rdoTypes';

interface PhotoSectionProps {
    photos: Photo[];
    setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}

const PhotoSection: React.FC<PhotoSectionProps> = ({
    photos,
    setPhotos
}) => {

    useEffect(() => {
        console.log('Fotos carregadas:', photos);
    }, [photos]);

    // Função para selecionar imagens da galeria
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
                    'Erro',
                    'Não foi possível selecionar a imagem',
                    4000
                );
            } else if (response.assets && response.assets.length > 0) {
                const newPhotoUri = response.assets[0].uri;
                // Criando um objeto com uri e id único
                const newPhoto = {
                    uri: newPhotoUri,
                    id: Date.now().toString(), // Usando timestamp como id único
                };
                setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
            }
        });
    };

    // Função para tirar fotos com a câmera
    const LaunchCustomCamera = () => {
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
                    "error",
                    "Erro",
                    "Não foi possível acessar a câmera",
                    4000
                );
            } else if (response.assets && response.assets.length > 0) {
                const newPhotoUri = response.assets[0].uri;
                // Criando um objeto com uri e id único
                const newPhoto = {
                    uri: newPhotoUri,
                    id: Date.now().toString(), // Usando timestamp como id único
                };
                setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
            }
        });
    };

    // Função para apagar uma foto
    const handleDeletePhoto = (photoId: string) => {
        setPhotos(prevPhotos => prevPhotos.filter(photo => photo.id !== photoId));
    };

    // Função para lidar com o clique em uma foto
    const handlePhotoPress = (photo: Photo) => {
        // Implementar visualização da foto em tamanho completo, se necessário
        console.log("Foto clicada:", photo);
    };

    useEffect(() => {
        console.log('Fotos:', photos);
    }, [photos]);

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                    name="camera"
                    size={20}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Registro Fotográfico
                </Text>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.photoButtonsContainer}>
                    <TouchableOpacity
                        style={styles.dropdownContainer}
                        activeOpacity={0.7}
                        onPress={LaunchCustomCamera}
                    >
                        <View style={styles.photoButton}>
                            <MaterialCommunityIcons
                                name="camera"
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
                            <MaterialCommunityIcons
                                name="image-multiple"
                                size={24}
                                color={customTheme.colors.primary}
                            />
                            <Text style={styles.photoButtonText}>Galeria</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Componente de Galeria */}
                <View style={styles.photoGalleryContainer}>
                    <PhotoGallery
                        photos={photos}
                        onDeletePhoto={handleDeletePhoto}
                        onPhotoPress={handlePhotoPress}
                    />
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
        borderColor: customTheme.colors.outline,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 8,
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
});

export default PhotoSection;