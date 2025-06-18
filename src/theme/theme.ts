import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import type { MD3Type } from 'react-native-paper/lib/typescript/types';

interface CustomColors {
    warning: string;
}

interface CustomTheme extends MD3Theme {
    colors: MD3Theme['colors'] & CustomColors;
}

// Configuração de fontes corrigida
const fontConfig: Record<string, MD3Type> = {
    displayLarge: {
        fontFamily: 'System',
        fontSize: 57,
        fontWeight: '400',
        letterSpacing: 0,
        lineHeight: 64,
        fontStyle: 'normal',
    },
    displayMedium: {
        fontFamily: 'System',
        fontSize: 45,
        fontWeight: '400',
        letterSpacing: 0,
        lineHeight: 52,
        fontStyle: 'normal',
    },
    displaySmall: {
        fontFamily: 'System',
        fontSize: 36,
        fontWeight: '400',
        letterSpacing: 0,
        lineHeight: 44,
        fontStyle: 'normal',
    },
    headlineLarge: {
        fontFamily: 'System',
        fontSize: 32,
        fontWeight: '400',
        letterSpacing: 0,
        lineHeight: 40,
        fontStyle: 'normal',
    },
    headlineMedium: {
        fontFamily: 'System',
        fontSize: 28,
        fontWeight: '400',
        letterSpacing: 0,
        lineHeight: 36,
        fontStyle: 'normal',
    },
    headlineSmall: {
        fontFamily: 'System',
        fontSize: 24,
        fontWeight: '400',
        letterSpacing: 0,
        lineHeight: 32,
        fontStyle: 'normal',
    },
    titleLarge: {
        fontFamily: 'System',
        fontSize: 22,
        fontWeight: '500',
        letterSpacing: 0,
        lineHeight: 28,
        fontStyle: 'normal',
    },
    titleMedium: {
        fontFamily: 'System',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 0.15,
        lineHeight: 24,
        fontStyle: 'normal',
    },
    titleSmall: {
        fontFamily: 'System',
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.1,
        lineHeight: 20,
        fontStyle: 'normal',
    },
    labelLarge: {
        fontFamily: 'System',
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.1,
        lineHeight: 20,
        fontStyle: 'normal',
    },
    labelMedium: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.5,
        lineHeight: 16,
        fontStyle: 'normal',
    },
    labelSmall: {
        fontFamily: 'System',
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
        lineHeight: 16,
        fontStyle: 'normal',
    },
    bodyLarge: {
        fontFamily: 'System',
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.15,
        lineHeight: 24,
        fontStyle: 'normal',
    },
    bodyMedium: {
        fontFamily: 'System',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.25,
        lineHeight: 20,
        fontStyle: 'normal',
    },
    bodySmall: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '400',
        letterSpacing: 0.4,
        lineHeight: 16,
        fontStyle: 'normal',
    },
};

// Ajuste no arquivo theme.ts
const colors = {
    // Cores primárias e secundárias
    primary: '#006A4E',
    onPrimary: '#FFFFFF',
    primaryContainer: '#95F1D3',
    onPrimaryContainer: '#002116',
    secondary: '#4B635A',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#CDE8DD',
    onSecondaryContainer: '#082018',
    tertiary: '#3F6374',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#C2E8FC',
    onTertiaryContainer: '#001F2A',

    // Cores de fundo e superfície - Ajustadas para melhor contraste
    background: '#F5F5F5',
    onBackground: '#191C1B',
    surface: '#FFFFFF',
    onSurface: '#191C1B',
    surfaceVariant: '#F0F0F0',
    onSurfaceVariant: '#424242',

    // Cores de contorno e estados
    outline: '#707973',
    outlineVariant: '#BFC9C3',

    // Cores de input e dropdown
    inputBackground: '#FFFFFF',
    inputText: '#191C1B',
    inputPlaceholder: '#757575',
    dropdownBackground: '#FFFFFF',
    dropdownText: '#191C1B',
    dropdownItemHover: '#F5F5F5',

    // Resto das cores
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#2E3130',
    inverseOnSurface: '#EFF1EE',
    inversePrimary: '#77D4B7',
    warning: "#FF9800",

    // Elevações
    elevation: {
        level0: 'transparent',
        level1: '#FFFFFF',
        level2: '#F8F8F8',
        level3: '#F5F5F5',
        level4: '#F2F2F2',
        level5: '#F0F0F0',
    },

    // Estados desabilitados
    surfaceDisabled: 'rgba(25, 28, 27, 0.12)',
    onSurfaceDisabled: 'rgba(25, 28, 27, 0.38)',
    backdrop: 'rgba(50, 66, 61, 0.3)',
};

// Criação do tema customizado
export const customTheme: CustomTheme = {
    ...MD3LightTheme,
    colors: colors,
    fonts: configureFonts({ config: fontConfig }),
    roundness: 8,
    animation: {
        scale: 1.0,
    },
    isV3: true,
    // Força o tema a sempre ser claro
    dark: false,
    mode:'exact'
};