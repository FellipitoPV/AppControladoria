import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Dimensions,
    ActivityIndicator,
    Text,
    StatusBar,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface PhotoType {
    uri?: string;
    url?: string;
    id: string;
    path?: string;
    timestamp?: number;
}

interface FullScreenImageProps {
    visible: boolean;
    onClose: () => void;
    // Modo simples (um único foto — compatibilidade retroativa)
    photo?: PhotoType | null;
    // Modo galeria (múltiplas fotos com navegação)
    photos?: PhotoType[];
    initialIndex?: number;
}

const FullScreenImage: React.FC<FullScreenImageProps> = ({
    visible,
    onClose,
    photo,
    photos,
    initialIndex = 0,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Normaliza para sempre trabalhar com array
    const gallery: PhotoType[] = photos && photos.length > 0
        ? photos
        : photo ? [photo] : [];

    const currentPhoto = gallery[currentIndex] ?? null;
    const imageUri = currentPhoto?.uri || currentPhoto?.url || '';
    const total = gallery.length;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < total - 1;

    // Sincroniza índice quando o modal abre
    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            setIsLoading(true);
            setImageError(false);
        }
    }, [visible, initialIndex]);

    // Reset loading state ao mudar de foto
    useEffect(() => {
        setIsLoading(true);
        setImageError(false);
    }, [currentIndex]);

    if (!currentPhoto) return null;

    const goToPrev = () => {
        if (hasPrev) setCurrentIndex(i => i - 1);
    };

    const goToNext = () => {
        if (hasNext) setCurrentIndex(i => i + 1);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <StatusBar backgroundColor="rgba(0, 0, 0, 0.9)" barStyle="light-content" />
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    {total > 1 && (
                        <Text style={styles.counter}>{currentIndex + 1} / {total}</Text>
                    )}
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        activeOpacity={0.7}
                    >
                        <Icon name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Imagem + setas de navegação */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.image}
                        resizeMode="contain"
                        onLoadStart={() => {
                            setIsLoading(true);
                            setImageError(false);
                        }}
                        onLoadEnd={() => setIsLoading(false)}
                        onError={() => {
                            setIsLoading(false);
                            setImageError(true);
                        }}
                    />

                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                            <Text style={styles.loadingText}>Carregando foto...</Text>
                        </View>
                    )}

                    {imageError && (
                        <View style={styles.errorContainer}>
                            <Icon name="error-outline" size={48} color="#FFFFFF" />
                            <Text style={styles.errorText}>
                                Não foi possível carregar a imagem
                            </Text>
                        </View>
                    )}

                    {/* Seta anterior */}
                    {hasPrev && (
                        <TouchableOpacity
                            style={[styles.navButton, styles.navButtonLeft]}
                            onPress={goToPrev}
                            activeOpacity={0.7}
                        >
                            <Icon name="chevron-left" size={36} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}

                    {/* Seta próxima */}
                    {hasNext && (
                        <TouchableOpacity
                            style={[styles.navButton, styles.navButtonRight]}
                            onPress={goToNext}
                            activeOpacity={0.7}
                        >
                            <Icon name="chevron-right" size={36} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
    },
    counter: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        paddingLeft: 52, // compensa o botão fechar para centralizar visualmente
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: screenWidth,
        height: screenHeight * 0.8,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginTop: 12,
    },
    errorContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
    },
    navButton: {
        position: 'absolute',
        top: '50%',
        marginTop: -28,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    navButtonLeft: {
        left: 12,
    },
    navButtonRight: {
        right: 12,
    },
});

export default FullScreenImage;
