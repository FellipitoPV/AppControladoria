import { customTheme } from "../../../../../theme/theme";

// 1. Atualizar a função getTipoVeiculoIcon com ícones do MaterialCommunityIcons
export const getTipoVeiculoIcon = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
        case 'veiculo':
            return 'car'; // MaterialCommunityIcons
        case 'equipamento':
            return 'wrench'; // MaterialCommunityIcons
        case 'outros':
            return 'shape'; // MaterialCommunityIcons
        default:
            return 'help-circle-outline'; // MaterialCommunityIcons
    }
};

// 2. Função para obter cor do ícone baseada no tipo
export const getTipoVeiculoColor = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
        case 'veiculo':
            return customTheme.colors.primary;
        case 'equipamento':
            return customTheme.colors.secondary;
        case 'outros':
            return customTheme.colors.tertiary || '#FF9800';
        default:
            return customTheme.colors.onSurfaceVariant;
    }
};

// 3. Obter nome amigável do tipo de veículo
export const getTipoVeiculoLabel = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
        case 'veiculo':
            return 'Veículo';
        case 'equipamento':
            return 'Equipamento';
        case 'outros':
            return 'Outro';
        default:
            return tipo || 'Desconhecido';
    }
};

// 4. Função para obter detalhes da lavagem usando MaterialCommunityIcons
export const getTipoLavagemDetails = (tipo: string, tipoVeiculo?: string) => {
    // Determina o ícone com base no tipo de veículo (usando MaterialCommunityIcons)
    let baseIcon = 'car-wash'; // Padrão para veículos

    if (tipoVeiculo?.toLowerCase() === 'equipamento') {
        baseIcon = 'toolbox-outline'; // Ícone para equipamentos
    } else if (tipoVeiculo?.toLowerCase() === 'outros') {
        baseIcon = 'spray-bottle'; // Ícone para outros itens
    }

    switch (tipo?.toLowerCase()) {
        case 'completa':
            return {
                icon: baseIcon,
                label: 'Lavagem Completa',
                bg: customTheme.colors.primaryContainer,
                text: customTheme.colors.primary
            };
        case 'simples':
            return {
                icon: tipoVeiculo?.toLowerCase() === 'equipamento' ? 'tools' :
                    tipoVeiculo?.toLowerCase() === 'outros' ? 'spray' : 'car-wash',
                label: 'Lavagem Simples',
                bg: customTheme.colors.secondaryContainer,
                text: customTheme.colors.secondary
            };
        default:
            return {
                icon: baseIcon,
                label: `Lavagem ${tipo || ''}`,
                bg: customTheme.colors.surfaceVariant,
                text: customTheme.colors.onSurfaceVariant
            };
    }
};