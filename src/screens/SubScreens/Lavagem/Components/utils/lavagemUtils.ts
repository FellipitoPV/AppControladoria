import { customTheme } from "../../../../../theme/theme";

export interface VeiculoInfo {
    icon: string;
    color: string;
    label: string;
}

export const getVeiculoInfo = (tipo: string): VeiculoInfo => {
    switch (tipo?.toLowerCase()) {
        case 'equipamento':
            return { icon: 'wrench', color: customTheme.colors.secondary, label: 'Equipamento' };
        case 'outros':
            return { icon: 'shape', color: customTheme.colors.tertiary || '#FF9800', label: 'Outro' };
        case 'veiculo':
        default:
            return { icon: 'car', color: customTheme.colors.primary, label: 'Veículo' };
    }
};

export const getTipoLavagemDetails = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
        case 'completa':
            return {
                icon: 'car-wash',
                label: 'Lavagem Completa',
                bg: customTheme.colors.primaryContainer,
                text: customTheme.colors.primary,
            };
        case 'simples':
            return {
                icon: 'car-wash',
                label: 'Lavagem Simples',
                bg: customTheme.colors.secondaryContainer,
                text: customTheme.colors.secondary,
            };
        default:
            return {
                icon: 'car-wash',
                label: `Lavagem ${tipo || ''}`,
                bg: customTheme.colors.surfaceVariant,
                text: customTheme.colors.onSurfaceVariant,
            };
    }
};
