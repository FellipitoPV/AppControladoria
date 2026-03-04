export type AreaDocumento = 'Segurança' | 'Saúde' | 'Meio Ambiente' | 'Qualidade';
export type StatusDocumento = 'vigente' | 'alerta' | 'vencido';
export type AlertaVencimento = '4meses' | '3meses' | '2meses' | '1mes';

export const AREAS: AreaDocumento[] = ['Segurança', 'Saúde', 'Meio Ambiente', 'Qualidade'];

export const AREA_COLORS: Record<AreaDocumento, string> = {
    'Segurança': '#1565c0',
    'Saúde': '#2e7d32',
    'Meio Ambiente': '#00695c',
    'Qualidade': '#6a1b9a',
};

export const AREA_ICONS: Record<AreaDocumento, string> = {
    'Segurança': 'shield-check',
    'Saúde': 'heart-pulse',
    'Meio Ambiente': 'leaf',
    'Qualidade': 'certificate',
};

export const ALERTA_OPTIONS: { label: string; value: AlertaVencimento }[] = [
    { label: '1 mês', value: '1mes' },
    { label: '2 meses', value: '2meses' },
    { label: '3 meses', value: '3meses' },
    { label: '4 meses', value: '4meses' },
];

export interface ControleDocumento {
    id?: string;
    tipoPrograma: string;
    responsavel: string;
    dataAtualizacao: string;
    vencimento: string;
    alertaVencimento: AlertaVencimento;
    dataCriacao?: any;
    area?: AreaDocumento;
}

const THRESHOLD_DAYS: Record<AlertaVencimento, number> = {
    '4meses': 120,
    '3meses': 90,
    '2meses': 60,
    '1mes': 30,
};

export const getStatusDocumento = (
    vencimento: string,
    alertaVencimento: AlertaVencimento,
): StatusDocumento => {
    if (!vencimento) return 'vigente';
    const hoje = new Date();
    const dataVencimento = new Date(vencimento);
    const diffMs = dataVencimento.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDias < 0) return 'vencido';
    if (diffDias <= THRESHOLD_DAYS[alertaVencimento]) return 'alerta';
    return 'vigente';
};

export const STATUS_COLORS: Record<StatusDocumento, string> = {
    vigente: '#2e7d32',
    alerta: '#e65100',
    vencido: '#c62828',
};

export const STATUS_ICONS: Record<StatusDocumento, string> = {
    vigente: 'check-circle',
    alerta: 'clock-alert',
    vencido: 'alert-circle',
};

export const STATUS_LABELS: Record<StatusDocumento, string> = {
    vigente: 'Vigente',
    alerta: 'Em Alerta',
    vencido: 'Vencido',
};

export const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
