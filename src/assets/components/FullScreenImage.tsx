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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from '../../theme/theme';

interface FullScreenImageProps {
    visible: boolean;
    photo: { uri: string; id: string } | null;
    onClose: () => void;
}

const FullScreenImage: React.FC<FullScreenImageProps> = ({
    visible,
    photo,
    onClose
}) => {
    const [isLoading, setIsLoading] = useState(true);

    if (!photo) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header com botão de fechar */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                    >
                        <Icon
                            name="close"
                            size={24}
                            color={customTheme.colors.error}
                        />
                    </TouchableOpacity>
                </View>

                {/* Container da Imagem */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: photo.uri }}
                        style={styles.image}
                        resizeMode="contain"
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                    />

                    {/* Indicador de carregamento */}
                    {isLoading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator
                                size="large"
                                color="white"
                            />
                        </View>
                    )}
                </View>

                {/* Footer com ações */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon
                            name="share"
                            size={24}
                            color={customTheme.colors.primary}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon
                            name="file-download"
                            size={24}
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
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    image: {
        width: screenWidth,
        height: screenHeight * 0.7,
    },

    highQualityImage: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    header: {
        height: 56,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        height: 64,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        gap: 24,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default FullScreenImage;