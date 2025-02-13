import { View, StyleSheet } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { customTheme } from "../../../../theme/theme";
import { Text } from "react-native-paper";

// Componente Section
interface SectionProps {
    icon: string;
    title: string;
    children: React.ReactNode;
}

const LavagemSection: React.FC<SectionProps> = ({ icon, title, children }) => {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Icon
                    name={icon}
                    size={24}
                    color={customTheme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    {title}
                </Text>
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 12,
        marginBottom: 16,
    },
    sectionTitle: {
        color: customTheme.colors.onSurfaceVariant,
        fontWeight: '500',
    },
    sectionContent: {
        paddingHorizontal: 8,
    },
});

export default LavagemSection;