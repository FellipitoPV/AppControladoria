import { Timestamp } from 'firebase/firestore';

export type TipoTeste = 'Programada' | 'Sorteio' | 'Aleatório';
export type ResultadoTeste = 'Negativo' | 'Positivo';
export type SituacaoRecusa = 'Não houve recusa' | 'Houve recusa injustificada';

export interface AssinaturaField {
    nome: string;
    assinatura?: string; // base64
}

export interface ToxicologicoInterface {
    id?: string;
    // Identificação
    colaborador: string;
    encarregado: string;
    data: Timestamp | string | any;
    hora: string;
    // Tipo de Teste
    tipoTeste: TipoTeste;
    embasamento: string;
    // Resultado mg/L
    resultadoMgL: string;
    // Observação
    observacao: string;
    // Resultado final
    resultado: ResultadoTeste;
    houveRecusa: SituacaoRecusa;
    descricaoRecusa: string;
    // Assinaturas
    assinaturaResponsavel: AssinaturaField;
    assinaturaColaborador: AssinaturaField;
    assinaturaTestemunha?: AssinaturaField; // apenas se houveRecusa
    // Metadados
    dataCriacao: Timestamp;
    criadoPor?: string;
}

export const TIPO_TESTE_OPTIONS: TipoTeste[] = ['Programada', 'Sorteio', 'Aleatório'];

export const RESULTADO_OPTIONS: ResultadoTeste[] = ['Negativo', 'Positivo'];

export const RECUSA_OPTIONS: SituacaoRecusa[] = [
    'Não houve recusa',
    'Houve recusa injustificada',
];

export const getResultadoColor = (resultado: ResultadoTeste): string => {
    switch (resultado) {
        case 'Negativo': return '#43A047';
        case 'Positivo': return '#E53935';
        default: return '#757575';
    }
};

export const getResultadoIcon = (resultado: ResultadoTeste): string => {
    switch (resultado) {
        case 'Negativo': return 'check-circle';
        case 'Positivo': return 'alert-circle';
        default: return 'help-circle';
    }
};
