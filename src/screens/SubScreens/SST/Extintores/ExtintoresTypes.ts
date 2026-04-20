import dayjs from 'dayjs';

export interface ExtintorInterface {
    id?: string;
    hidranteId?: string;
    numero: string;
    tipo: string;
    carga: string;
    unidadeEcologika: string;
    unidadeNova?: boolean;
    localizacao: string;
    status?: string;
    statusTesteHidrostatico: 'Aprovado' | 'Reprovado';
    observacoes: string;
    dataRecarga: string;
    validadeMeses: number;
    dataTesteHidrostatico: string;
}

export interface ExtintoresConfig {
    tipos: string[];
    capacidade: string[];
    validade: number;
    validadeHidrostatico: number;
    localizacoes: string[];
}

export interface ExtintorComStatus extends ExtintorInterface {
    statusFinal: 'Vencido' | 'A Vencer' | 'Valido';
    diasCriticos: number;
}

export const defaultExtintoresConfig: ExtintoresConfig = {
    tipos: ['Agua', 'PQS', 'CO2'],
    capacidade: ['4 kg', '6 kg', '8 kg', '10 kg'],
    validade: 12,
    validadeHidrostatico: 5,
    localizacoes: [],
};

export const unidadeOptions = ['Lote 03', 'Lote 13'];

export const emptyExtintor = (
    config: ExtintoresConfig = defaultExtintoresConfig,
): ExtintorInterface => ({
    numero: '',
    tipo: '',
    carga: '',
    unidadeEcologika: '',
    unidadeNova: false,
    localizacao: '',
    status: 'Regular',
    statusTesteHidrostatico: 'Reprovado',
    observacoes: '',
    dataRecarga: '',
    validadeMeses: config.validade || 12,
    dataTesteHidrostatico: '',
});

export const normalizeExtintor = (item: any): ExtintorInterface => ({
    ...emptyExtintor(),
    ...item,
    id: item?._id || item?.id || item?.hidranteId,
    hidranteId: item?._id || item?.id || item?.hidranteId,
    validadeMeses: Number(item?.validadeMeses || defaultExtintoresConfig.validade),
    statusTesteHidrostatico:
        item?.statusTesteHidrostatico === 'Aprovado' ? 'Aprovado' : 'Reprovado',
});

export const getExtintorStatus = (
    extintor: ExtintorInterface,
    validadeHidrostatico: number,
): ExtintorComStatus['statusFinal'] => {
    const hoje = dayjs();
    const proximaRecarga = extintor.dataRecarga
        ? dayjs(extintor.dataRecarga).add(extintor.validadeMeses || 0, 'month')
        : null;
    const proximoTeste = extintor.dataTesteHidrostatico
        ? dayjs(extintor.dataTesteHidrostatico).add(validadeHidrostatico || 0, 'year')
        : null;

    const diasRecarga = proximaRecarga ? proximaRecarga.diff(hoje, 'day') : Number.NEGATIVE_INFINITY;
    const diasTeste = proximoTeste ? proximoTeste.diff(hoje, 'day') : Number.NEGATIVE_INFINITY;
    const diasCriticos = Math.min(diasRecarga, diasTeste);

    if (diasCriticos < 0) {
        return 'Vencido';
    }

    if (diasRecarga <= 30 || diasTeste <= 365) {
        return 'A Vencer';
    }

    return 'Valido';
};

export const getDiasCriticos = (
    extintor: ExtintorInterface,
    validadeHidrostatico: number,
): number => {
    const hoje = dayjs();
    const proximaRecarga = extintor.dataRecarga
        ? dayjs(extintor.dataRecarga).add(extintor.validadeMeses || 0, 'month')
        : null;
    const proximoTeste = extintor.dataTesteHidrostatico
        ? dayjs(extintor.dataTesteHidrostatico).add(validadeHidrostatico || 0, 'year')
        : null;

    const diasRecarga = proximaRecarga ? proximaRecarga.diff(hoje, 'day') : Number.NEGATIVE_INFINITY;
    const diasTeste = proximoTeste ? proximoTeste.diff(hoje, 'day') : Number.NEGATIVE_INFINITY;
    return Math.min(diasRecarga, diasTeste);
};

export const getDiasParaRecarga = (extintor: ExtintorInterface): number => {
    if (!extintor.dataRecarga) return Number.NEGATIVE_INFINITY;
    return dayjs(extintor.dataRecarga)
        .add(extintor.validadeMeses || 0, 'month')
        .diff(dayjs(), 'day');
};

export const getDiasParaTesteHidrostatico = (
    extintor: ExtintorInterface,
    validadeHidrostatico: number,
): number => {
    if (!extintor.dataTesteHidrostatico) return Number.NEGATIVE_INFINITY;
    return dayjs(extintor.dataTesteHidrostatico)
        .add(validadeHidrostatico || 0, 'year')
        .diff(dayjs(), 'day');
};

export const formatDate = (value?: string) => {
    if (!value) return 'Nao informado';
    const date = dayjs(value);
    return date.isValid() ? date.format('DD/MM/YYYY') : 'Nao informado';
};

export const formatMonthYear = (value?: string, months = 0) => {
    if (!value) return 'Nao calculado';
    const date = dayjs(value).add(months, 'month');
    return date.isValid() ? date.format('MM/YYYY') : 'Nao calculado';
};

export const formatYear = (value?: string, years = 0) => {
    if (!value) return 'Nao calculado';
    const date = dayjs(value).add(years, 'year');
    return date.isValid() ? date.format('YYYY') : 'Nao calculado';
};
