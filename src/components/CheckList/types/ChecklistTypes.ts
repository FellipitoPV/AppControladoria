// types/ChecklistTypes.ts
export type ConformityStatus = 'C' | 'NC' | 'NA';
export type ChecklistStatus = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Concluído com NC';

export interface ChecklistQuestion {
    id: string;
    label: string;
    quantidade: string;
    type: 'conformity';
    required: boolean;
}

export interface ChecklistLocation {
    id: string;
    name: string;
    status: ChecklistStatus;
    lastUpdate?: string;
    weeklyStatus?: Record<number, ChecklistStatus>;
}

export interface ChecklistDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
    questions: ChecklistQuestion[];
    locations: ChecklistLocation[];
}


// KIT EMERGENCIA AMBIENTAL
const KIT_EMERGENCIA_QUESTIONS: ChecklistQuestion[] = [
    { id: 'coletor', label: 'Coletor', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'pa', label: 'Pá antifaísca', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'cordaoIsolamento', label: 'Cordão de isolamento', quantidade: '3 un', type: 'conformity', required: true },
    { id: 'travesseiroAbsorcao', label: 'Travesseiro de absorção 5 un', quantidade: '5 un', type: 'conformity', required: true },
    { id: 'mantaAbsorcao', label: 'Manta de absorção', quantidade: '10 un', type: 'conformity', required: true },
    { id: 'sacosPlasticos', label: 'Sacos plásticos', quantidade: '5 un', type: 'conformity', required: true },
    { id: 'fitaZebrada', label: 'Fita zebrada', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'oculosAmpla', label: 'Óculos ampla visão', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'mascaraSemifacial', label: 'Máscara semifacial', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'filtroQuimico', label: 'Filtro Químico', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'luvaNitrilica', label: 'Luva nitrílica', quantidade: '1 par', type: 'conformity', required: true },
    { id: 'poSerra', label: 'Pó de serra', quantidade: '', type: 'conformity', required: true },
    { id: 'coletorLacrado', label: 'Coletor lacrado', quantidade: '', type: 'conformity', required: true },
];

// KIT PRIMEIRO SOCORROS
const KPS_QUESTIONS: ChecklistQuestion[] = [
    { id: 'soro', label: 'Soro fisiológico(0,9%) de 500ml', quantidade: '2 un', type: 'conformity', required: true },
    { id: 'compresa', label: 'Compressa de gaze 7,5x7,5cm', quantidade: '5 pacotes', type: 'conformity', required: true },
    { id: 'atadura', label: 'Atadura de crepom 10 e 4,5cm', quantidade: '2 rolos', type: 'conformity', required: true },
    { id: 'esparadrapo', label: 'Esparadrapo 10x4,5cm (1 rolo)', quantidade: '1 rolo', type: 'conformity', required: true },
    { id: 'tesoura', label: 'Tesoura de ponta Romba-12cm', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'luvaCirugica', label: 'Luva cirúrgica numero 8', quantidade: '4 pares', type: 'conformity', required: true },
    { id: 'termometro', label: 'Termômetro', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'oculosProtecao', label: 'Óculos de proteção individual', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'algodao', label: 'Algodão', quantidade: '2 pacote', type: 'conformity', required: true },
    { id: 'bolsaGelo', label: 'Bolsa de gelo', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'bandaid', label: 'Band aid', quantidade: '1 caixa', type: 'conformity', required: true },
    { id: 'alcoolEstilico', label: 'Álcool etílico 70 GL', quantidade: '1 Litro', type: 'conformity', required: true },
];

// KIT IMOBILIZAÇÃO
const KIM_QUESTIONS: ChecklistQuestion[] = [
    { id: 'pranchaImob', label: 'Prancha de imobilização', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'cintoAmarelo', label: 'Cinto de engate - amarelo', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'cintoAzul', label: 'Cinto de engate - azul', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'cintoVermelho', label: 'Cinto de engate - vermelho', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'colarCervical', label: 'Colar cervical - Tam. M e G', quantidade: '2 un', type: 'conformity', required: true },
    { id: 'headBlock', label: 'Head Block', quantidade: '1 un', type: 'conformity', required: true },
    { id: 'condicoesCapa', label: 'Condições da capa', quantidade: '', type: 'conformity', required: true },
];

// CHUVEIRO LAVA-OLHOS
const CHUVEIRO_QUESTIONS: ChecklistQuestion[] = [
    { id: '1', label: 'O equipamento está obstruído?', quantidade: '', type: 'conformity', required: true },
    { id: '2', label: 'O equipamento está em boas condições físicas (sem ferrugens ou danos na estrutura)?', quantidade: '', type: 'conformity', required: true },
    { id: '3', label: 'Sinalização visível?', quantidade: '', type: 'conformity', required: true },
    { id: '4', label: 'Fluxo de água aciona em 1 segundo?', quantidade: '', type: 'conformity', required: true },
    { id: '5', label: 'Válvulas permanecem abertas (mãos livres em operação)?', quantidade: '', type: 'conformity', required: true },
    { id: '6', label: 'Esguichos do lava-olhos protegidos de contaminantes?', quantidade: '', type: 'conformity', required: true },
    { id: '7', label: 'O chuveiro e lava-olhos/face tem os meios de acionamento com fácil acesso?', quantidade: '', type: 'conformity', required: true },
    { id: '8', label: 'As válvulas apresentam vazamento?', quantidade: '', type: 'conformity', required: true },
    { id: '9', label: 'Chuveiro e lava-olhos apresentam funcionamento simultâneo?', quantidade: '', type: 'conformity', required: true },
];

// SISTEMA DE CONTENÇÃO
const SISTEMA_CONTENCAO_QUESTIONS: ChecklistQuestion[] = [
    { id: '1', label: 'CSAO - Área de abastecimento', quantidade: '', type: 'conformity', required: true },
    { id: '2', label: 'CSAO - ETAR', quantidade: '', type: 'conformity', required: true },
    { id: '3', label: 'Caixa Estanque - Área Contida no Pátio', quantidade: '', type: 'conformity', required: true },
    { id: '4', label: 'Caixa Estanque - Área de Armazenamento Res. Comum', quantidade: '', type: 'conformity', required: true },
    { id: '5', label: 'Caixa Estanque - Galpão Residuo Classe I', quantidade: '', type: 'conformity', required: true },
    { id: '6', label: 'Bacia de Contenção do Tanque de Abastecimento', quantidade: '', type: 'conformity', required: true },
    { id: '7', label: 'O chuveiro e lava-olhos/face tem os meios de acionamento com fácil acesso?', quantidade: '', type: 'conformity', required: true },
    { id: '8', label: 'Canaletas', quantidade: '', type: 'conformity', required: true },
    { id: '9', label: 'Chuveiro e lava-olhos apresentam funcionamento simultâneo?', quantidade: '', type: 'conformity', required: true },
];

export const CHECKLIST_DEFINITIONS: Record<string, ChecklistDefinition> = {
    'kit-emergencia': {
        id: 'kit-emergencia',
        title: 'Kit Emergência Ambiental',
        description: 'Checklist de inspeção dos kits de emergência ambiental',
        icon: 'alert-circle',
        questions: KIT_EMERGENCIA_QUESTIONS,
        locations: [
            { id: 'kea-1', name: 'Lote 03 - Abastecimento', status: 'Pendente', lastUpdate: '2025-02-10' },
            { id: 'kea-2', name: 'Lote 03 - Galpão Classe I', status: 'Pendente', lastUpdate: '2025-02-09' },
            { id: 'kea-3', name: 'Lote 13', status: 'Pendente', lastUpdate: '2025-02-09' },
        ]
    },
    'kit-socorros': {
        id: 'kit-socorros',
        title: 'Kit Primeiro Socorros',
        description: 'Checklist de inspeção dos Kits Primeiro Socorros',
        icon: 'medical-bag',
        questions: KPS_QUESTIONS,
        locations: [
            { id: 'kps-1', name: 'Lote 03', status: 'Pendente', lastUpdate: '2025-02-11' },
            { id: 'kps-2', name: 'Lote 13', status: 'Pendente', lastUpdate: '2025-02-11' },
        ]
    },
    'chuveiro': {
        id: 'chuveiro',
        title: 'Chuveiro - Lava Olhos',
        description: 'Checklist de inspeção do Chuveiro - Lava Olhos',
        icon: 'water',
        questions: CHUVEIRO_QUESTIONS,
        locations: [
            { id: 'chu-1', name: 'Lote 03', status: 'Pendente', lastUpdate: '2025-02-11' },
            { id: 'chu-2', name: 'Lote 13', status: 'Pendente', lastUpdate: '2025-02-11' },
        ]
    },
    'kit-imobilizacao': {
        id: 'kit-imobilizacao',
        title: 'Kit Imobilização',
        description: 'Checklist de inspeção do Kit de Imobilização',
        icon: 'bandage',
        questions: KIM_QUESTIONS,
        locations: [
            { id: 'kim-1', name: 'Lote 03', status: 'Pendente', lastUpdate: '2025-02-11' },
            { id: 'kim-2', name: 'Lote 13', status: 'Pendente', lastUpdate: '2025-02-11' },
        ]
    },
    'sistema-contencao': {
        id: 'sistema-contencao',
        title: 'Sistema de Contenção',
        description: 'Checklist de inspeção do Sistema de Contenção',
        icon: 'shield-alert',
        questions: SISTEMA_CONTENCAO_QUESTIONS,
        locations: [
            { id: 'siscon-1', name: 'Lote 03', status: 'Pendente', lastUpdate: '2025-02-11' },
        ]
    },
};

export type ChecklistId = keyof typeof CHECKLIST_DEFINITIONS;