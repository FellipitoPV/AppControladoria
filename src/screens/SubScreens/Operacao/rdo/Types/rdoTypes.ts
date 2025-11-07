import { RefObject } from 'react';

export interface DropdownRef {
    open: () => void;
    close: () => void;
}

export interface GeneralInfoProps {
    formData: FormDataInterface;
    saveFormData: (updates: Partial<FormDataInterface>) => void;
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
    tipo: string;
    quantidade: string;
    id?: string;
}

export interface Equipamento {
    tipo: string;
    quantidade: string;
    id?: string;
}

export type Photo = {
    uri?: string;        // URI para fotos locais
    url?: string;        // URL para fotos do Firebase
    id: string;          // ID único da foto
    path?: string;       // Caminho no storage (opcional)
    timestamp?: number;  // Timestamp (opcional)
    filename?: string;
};

export interface FormDataInterface {
    id: string;
    numeroRdo: string;
    cliente: string;
    clienteNome?: string;
    servico: string;
    responsavel: string;
    cargo: string;
    material: string;
    funcao: string;
    inicioOperacao: string;
    terminoOperacao: string;
    data: string;
    condicaoTempo: {
        manha: string;
        tarde: string;
        noite: string;
    }
    diaSemana: string;
    profissionais?: Profissional[];
    equipamentos?: Equipamento[];
    atividades?: Atividade[];
    ocorrencias?: Ocorrencia[];
    comentarioGeral?: string;
    createdAt: any;
    createdBy: string;
    photos: Photo[];
    updatedBy: string;
    updatedAt: any;

    pdfUrl?: string;
    lastPdfGenerated?: {
        seconds: number;
        nanoseconds: number;
    };
    lastUpdated?: {
        seconds: number;
        nanoseconds: number;
    };
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
    { label: 'Supervisor Operacional', value: 'supervisor_operacional', icon: 'account-cog' },
    { label: 'Técnico de Qualidade', value: 'tecnico_qualidade', icon: 'certificate' }
];

export const EQUIPAMENTOS = [
    { label: 'Empilhadeira', value: 'empilhadeira', icon: 'forklift' },
    { label: 'Maçarico', value: 'macarico', icon: 'fire' },
    { label: 'Poli Corte', value: 'poli_corte', icon: 'content-cut' },
    { label: 'Lixadeira', value: 'lixadeira', icon: 'cog' },
    { label: 'Espectrômetro', value: 'espectrometro', icon: 'magnify' }
];

export const TIPOS_OCORRENCIAS = [
    { label: 'Acidente', value: 'acidente', icon: 'alert' },
    { label: 'Incidente', value: 'incidente', icon: 'alert-circle' },
    { label: 'Quase Acidente', value: 'quase_acidente', icon: 'alert-outline' },
    { label: 'Desvio', value: 'desvio', icon: 'swap-horizontal' },
    { label: 'Condição Insegura', value: 'condicao_insegura', icon: 'safety-goggles' }
];

// Serviços dropdown data
export const SERVICOS = [
    { label: 'Desmantelamento', value: 'desmantelamento', icon: 'hammer-wrench' },
    { label: 'Descaracterização', value: 'descaracterização', icon: 'hammer-wrench' },
    { label: 'Repetro', value: 'repetro', icon: 'hammer-wrench' }
];