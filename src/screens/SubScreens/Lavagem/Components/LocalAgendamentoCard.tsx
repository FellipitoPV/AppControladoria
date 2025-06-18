import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { customTheme } from '../../../../theme/theme';

type RootStackParamList = {
    LavagemForm: { placa: string; lavagem: string };
};

type LocalAgendamentoCardProps = {
    placa: string;
    lavagem: string;
};

const LocalAgendamentoCard: React.FC<LocalAgendamentoCardProps> = ({ placa, lavagem }) => {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();

    const handlePress = () => {
        console.log('Enviando para LavagemForm:', { placa, lavagem: lavagem });
    
        navigation.navigate('LavagemForm', {
            placa,
            lavagem, // Certifique-se de que 'lavagem' está sendo passado corretamente
        });
    };
    

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress}>
            <Text style={styles.title}>Agendamento Local</Text>
            <Text style={styles.text}>Placa: {placa}</Text>
            <Text style={styles.text}>Tipo de Lavagem: {lavagem}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: customTheme.colors.surface,
        padding: 15,
        borderRadius: 10,
        margin: 10,
        alignItems: 'center'
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: customTheme.colors.onSurface,
    },
    text: {
        fontSize: 16,
        marginTop: 5,
        color: customTheme.colors.onSurface,
    }
});

export default LocalAgendamentoCard;
