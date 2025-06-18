import React, { useState } from 'react';
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
import { customTheme } from '../../theme/theme';

// Interface expandida para suportar tanto fotos locais quanto do Firebase
interface PhotoType {
    uri?: string;
    url?: string;
    id: string;
    path?: string;
    timestamp?: number;
}

interface FullScreenImageProps {
    visible: boolean;
    photo: PhotoType | null;
    onClose: () => void;
}

const FullScreenImage: React.FC<FullScreenImageProps> = ({
    visible,
    photo,
    onClose
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    // Impedir renderização quando não há foto
    if (!photo) return null;

    // Determinar a URL da imagem (compatibilidade com fotos Firebase e locais)
    const imageUri = photo.uri || photo.url || '';

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
                {/* Header com botão de fechar */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name="close"
                            size={24}
                            color="#FFFFFF"
                        />
                    </TouchableOpacity>
                </View>

                {/* Container da Imagem */}
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

                    {/* Indicador de carregamento */}
                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator
                                size="large"
                                color="#FFFFFF"
                            />
                            <Text style={styles.loadingText}>Carregando foto...</Text>
                        </View>
                    )}

                    {/* Mensagem de erro */}
                    {imageError && (
                        <View style={styles.errorContainer}>
                            <Icon
                                name="error-outline"
                                size={48}
                                color="#FFFFFF"
                            />
                            <Text style={styles.errorText}>
                                Não foi possível carregar a imagem
                            </Text>
                        </View>
                    )}
                </View>

                {/* Footer com ações */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name="share"
                            size={22}
                            color={customTheme.colors.primary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name="file-download"
                            size={22}
                            color={customTheme.colors.primary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        activeOpacity={0.7}
                        onPress={onClose}
                    >
                        <Icon
                            name="fullscreen-exit"
                            size={22}
                            color={customTheme.colors.primary}
                        />
                    </TouchableOpacity>
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
    footer: {
        height: 80,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
    },
    actionButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
});

export default FullScreenImage;