import { Timestamp } from 'firebase/firestore';

export type DDSStatus = 'Planejado' | 'Realizado' | 'Cancelado';

export interface Participante {
    id?: string;
    nome: string;
    cargo: string;
    signatureUrl: string;
    registeredAt: string;
}

export interface DDSInterface {
    id?: string;
    titulo: string;
    instrutor: string;
    funcao?: string;
    dataRealizacao: Timestamp | string;
    horaInicio: string;
    horaFim: string;
    status: DDSStatus;
    local: string;
    assunto: string;
    participantes: Participante[];
    anexos?: string[];
    documentoUrl?: string;
    observacoes?: string;
    dataCriacao?: Timestamp | string;
    createdBy?: string;
}

export interface DDSFormData {
    titulo: string;
    instrutor: string;
    funcao: string;
    dataRealizacao: Date;
    horaInicio: string;
    horaFim: string;
    status: DDSStatus;
    local: string;
    assunto: string;
    observacoes: string;
}

export const STATUS_OPTIONS: { label: string; value: DDSStatus }[] = [
    { label: 'Planejado', value: 'Planejado' },
    { label: 'Realizado', value: 'Realizado' },
    { label: 'Cancelado', value: 'Cancelado' },
];

export const getStatusColor = (status: DDSStatus): string => {
    switch (status) {
        case 'Planejado':
            return '#2196F3'; // Azul
        case 'Realizado':
            return '#4CAF50'; // Verde
        case 'Cancelado':
            return '#F44336'; // Vermelho
        default:
            return '#9E9E9E'; // Cinza
    }
};
