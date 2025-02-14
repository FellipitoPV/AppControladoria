import React from 'react';
import {
    View,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../../../theme/theme';

const { width: screenWidth } = Dimensions.get('window');
const padding = 16;
const containerWidth = screenWidth - (padding * 2);

interface PhotoGalleryProps {
    photos: Array<{
        uri: string;
        id: string;
    }>;
    onPhotoPress?: (photo: { uri: string; id: string }) => void;
    onDeletePhoto?: (photoId: string) => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
    photos,
    onPhotoPress,
    onDeletePhoto,
}) => {
    if (!photos || photos.length === 0) {
        return (
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
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.photoGrid}>
                {photos.map((photo, index) => (
                    <TouchableOpacity
                        key={photo.id}
                        style={styles.photoContainer}
                        onPress={() => onPhotoPress?.(photo)}
                    >
                        <Image
                            source={{ uri: photo.uri }}
                            style={styles.photo}
                        />
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => onDeletePhoto?.(photo.id)}
                        >
                            <Icon
                                name="close"
                                size={20}
                                color="#FFF"
                            />
                        </TouchableOpacity>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between', // Adicionado para distribuir o espaço
        gap: 8,
        width: '100%',
    },
    photoContainer: {
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: customTheme.colors.surfaceVariant,
        width: '48%', // Usando porcentagem em vez de cálculo fixo
        aspectRatio: 4 / 3, // Usando aspectRatio em vez de altura fixa
    },
    photo: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        resizeMode: 'cover',
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

export default PhotoGallery;