import { RefObject } from 'react';

export interface DropdownRef {
    open: () => void;
    close: () => void;
}

export interface Ocorrencia {
    tipo: string;
    descricao: string;
    id?: string;
}

export interface Atividade {
    descricao: string;
    observacao: string;
    id?: string;
}

export interface Profissional {
    profissional: string;
    quantidade: string;
    id?: string;
}

export interface Equipamento {
    equipamento: string;
    quantidade: string;
    id?: string;
}

export interface Photo {
    uri: string;
    id: string;
}

export interface FormDataInterface {
    cliente: string;
    servico: string;
    responsavel: string;
    material: string;
    numeroRdo: string;
    funcao: string;
    inicioOperacao: string;
    terminoOperacao: string;
    data: string;
    condicaoTempoManha: string;
    condicaoTempoTarde: string;
    condicaoTempoNoite: string;
    diaSemana: string;
    cargo?: string;
    clienteNome?: string;
}

export type RootStackParamList = {
    RdoForm: { cliente?: string; servico?: string };
};

// Constants for dropdowns
export const CONDICOES_TEMPO = [
    { label: 'Sol', value: 'sol', icon: 'weather-sunny' },
    { label: 'Nublado', value: 'nublado', icon: 'cloud' },
    { label: 'Chuva', value: 'chuva', icon: 'weather-rainy' },
    { label: 'Impraticável', value: 'impraticavel', icon: 'alert' }
];

export const DIAS_SEMANA = [
    { label: 'Domingo', value: 'domingo', icon: 'calendar' },
    { label: 'Segunda-feira', value: 'segunda', icon: 'calendar' },
    { label: 'Terça-feira', value: 'terca', icon: 'calendar' },
    { label: 'Quarta-feira', value: 'quarta', icon: 'calendar' },
    { label: 'Quinta-feira', value: 'quinta', icon: 'calendar' },
    { label: 'Sexta-feira', value: 'sexta', icon: 'calendar' },
    { label: 'Sábado', value: 'sabado', icon: 'calendar' }
];

export const MATERIAIS = [
    { label: 'Flexíveis', value: 'flexiveis', icon: 'pipe' },
    { label: 'Umbilical', value: 'umbilical', icon: 'cable-data' },
    { label: 'Sucata', value: 'sucata', icon: 'delete' },
    { label: 'Equipamentos', value: 'equipamentos', icon: 'wrench' }
];

export const PROFISSIONAIS = [
    { label: 'Auxiliar de Operação', value: 'auxiliar_operacao', icon: 'account-hard-hat' },
    { label: 'Coordenador Operacional', value: 'coordenador_operacional', icon: 'account-supervisor' },
    { label: 'Operador de Empilhadeira', value: 'operador_empilhadeira', icon: 'forklift' },
    { label: 'Supervisor de Radioproteção', value: 'supervisor_radioprotecao', icon: 'shield' },
    { label: 'Supervisor Operacional', value: 'supervisor_operacional', icon: 'account-cog' }
];

export const EQUIPAMENTOS = [
    { label: 'Empilhadeira', value: 'empilhadeira', icon: 'forklift' },
    { label: 'Maçarico', value: 'macarico', icon: 'fire' },
    { label: 'Poli Corte', value: 'poli_corte', icon: 'content-cut' }
];

export const TIPOS_OCORRENCIAS = [
    { label: 'Acidente', value: 'acidente', icon: 'alert' },
    { label: 'Incidente', value: 'incidente', icon: 'alert-circle' },
    { label: 'Quase Acidente', value: 'quase_acidente', icon: 'alert-outline' },
    { label: 'Desvio', value: 'desvio', icon: 'swap-horizontal' },
    { label: 'Condição Insegura', value: 'condicao_insegura', icon: 'safety-goggles' }
];