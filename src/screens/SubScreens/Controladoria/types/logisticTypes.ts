import { Equipamento } from "../../Lavagem/Components/lavagemTypes";

export type Pesagem = {
    id: string;
    responsavel: string;
    data: string;
    hora: string;
    nCacamba: string;
    medida: string;
    quantidade: string;
    irregularidade: string;
    obsMtr: string;
    gerador: string;
    residuo: string;
    placa: string;
    photoUris: string[]; // Agora é um array de strings
}

export type dropdownType = {
    label: string;
    value: string;
}

// Interfaces base
export interface Equipment {
    id: string;
    tipo?: string;
    label: string;
    status?: string;
    quantidade?: number;
}

export interface Container {
    id: string;
    numero?: string;
    tipo: string;
    residuo?: string;
    capacidade?: string;
    status?: string;
    quantidade?: number;
}

// Lista de tipos de equipamentos disponíveis (formatada)
export const listaTiposEquipamentos = [
    {
        id: 'POL',
        tipo: 'Poliguindaste',
        icon: 'forklift',
        label: 'Poliguindaste',  // Adicionando label para o dropdown
        value: 'POL'             // Adicionando value para o dropdown
    },
    {
        id: 'ROL',
        tipo: 'Rollon',
        icon: 'truck',
        label: 'Rollon',
        value: 'ROL'
    },
    {
        id: 'CAV',
        tipo: 'Cavalo',
        icon: 'truck-trailer',
        label: 'Cavalo',
        value: 'CAV'
    },
    {
        id: 'JUL',
        tipo: 'Julieta',
        icon: 'truck-trailer',
        label: 'Julieta',
        value: 'JUL'
    },
    {
        id: 'VAC',
        tipo: 'Vacuo',
        icon: 'vacuum',
        label: 'Vacuo',
        value: 'VAC'
    }
];

// Lista de tipos de containers disponíveis (formatada)
export const listaTiposContainers = [
    //Especiias
    {
        id: 'BAG',
        tipo: 'Bags',
        icon: 'bag-personal',
        label: 'Bags',
        value: 'BAG'
    },
    {
        id: 'BANHEIRO',
        tipo: 'Banheiro Químico',
        icon: 'toilet',
        label: 'Banheiro Químico',
        value: 'BANHEIRO'
    },

    //Caçambas
    {
        id: 'CAC20',
        tipo: 'Caçamba 20 m³',
        capacidade: '20 m³',
        icon: 'dump-truck',
        label: 'Caçamba 20 m³',
        value: 'CAC20'
    },
    {
        id: 'CAC30',
        tipo: 'Caçamba 30 m³',
        capacidade: '30 m³',
        icon: 'dump-truck',
        label: 'Caçamba 30 m³',
        value: 'CAC30'
    },
    {
        id: 'CAC40',
        tipo: 'Caçamba 40 m³',
        capacidade: '40 m³',
        icon: 'dump-truck',
        label: 'Caçamba 40 m³',
        value: 'CAC40'
    },
    {
        id: 'CAC5BIP',
        tipo: 'Caçamba Bi-partida 5 m³',
        residuo: 'Bi-partida',
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Bi-partida 5 m³',
        value: 'CAC5BIP'
    },
    {
        id: 'CAC5CTAMP',
        tipo: 'Caçamba com Tampa 5 m³',
        residuo: "Cont. (c/Tampa)",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba com Tampa 5 m³',
        value: 'CAC5CTAMP'
    },
    {
        id: 'CAC5STAMP',
        tipo: 'Caçamba sem Tampa 5 m³',
        residuo: "Cont. (s/Tampa)",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba sem Tampa 5 m³',
        value: 'CAC5STAMP'
    },
    {
        id: 'CAC5ENT',
        tipo: 'Caçamba Entulho 5 m³',
        residuo: "Entulho",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Entulho 5 m³',
        value: 'CAC5ENT'
    },
    {
        id: 'CAC5LIX',
        tipo: 'Caçamba Lixo Comum 5 m³',
        residuo: "Lixo Comum",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Lixo Comum 5 m³',
        value: 'CAC5LIX'
    },
    {
        id: 'CAC5MAD',
        tipo: 'Caçamba Madeira 5 m³',
        residuo: "Madeira",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Madeira 5 m³',
        value: 'CAC5MAD'
    },
    {
        id: 'CAC5MET',
        tipo: 'Caçamba Metal 5 m³',
        residuo: "Metal",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Metal 5 m³',
        value: 'CAC5MET'
    },
    {
        id: 'CAC5ORG',
        tipo: 'Caçamba Lixo Orgânico 5 m³',
        residuo: "Lixo orgânico",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Lixo Orgânico 5 m³',
        value: 'CAC5ORG'
    },
    {
        id: 'CAC5PAP',
        tipo: 'Caçamba Papel 5 m³',
        residuo: "Lixo Papel",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Papel 5 m³',
        value: 'CAC5PAP'
    },
    {
        id: 'CAC5PLAS',
        tipo: 'Caçamba Plástico 5 m³',
        residuo: "Lixo Plástico",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Plástico 5 m³',
        value: 'CAC5PLAS'
    },
    {
        id: 'CAC5VID',
        tipo: 'Caçamba Vidro 5 m³',
        residuo: "Lixo Vidro",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Vidro 5 m³',
        value: 'CAC5VID'
    },
    {
        id: 'CAC5TRIP',
        tipo: 'Caçamba Tripartida 5 m³',
        residuo: "Lixo Tripartida",
        capacidade: '5 m³',
        icon: 'dump-truck',
        label: 'Caçamba Tripartida 5 m³',
        value: 'CAC5TRIP'
    },

    //Carga Seca
    {
        id: 'CARGSEC',
        tipo: 'Carga Seca',
        icon: 'truck-cargo-container',
        label: 'Carga Seca',
        value: 'CARGSEC'
    },

    //Compactadores
    {
        id: 'COM7',
        tipo: 'Compactador 7 m³',
        capacidade: '7 m³',
        icon: 'trash-can',
        label: 'Compactador 7 m³',
        value: 'COM7'
    },
    {
        id: 'COM17',
        tipo: 'Compactador 17 m³',
        capacidade: '17 m³',
        icon: 'trash-can',
        label: 'Compactador 17 m³',
        value: 'COM17'
    },

    //OUTROS
    {
        id: 'CESTMET',
        tipo: 'Cesta Metálica',
        icon: 'basket',
        label: 'Cesta Metálica',
        value: 'CESTMET'
    },
    {
        id: 'GARRA',
        tipo: 'Garra Hidráulica',
        icon: 'robot-industrial',
        label: 'Garra Hidráulica',
        value: 'GARRA'
    },
    {
        id: 'POLIG',
        tipo: 'Poliguindaste',
        icon: 'forklift',
        label: 'Poliguindaste',
        value: 'POLIG'
    },
    {
        id: 'TAMBOR',
        tipo: 'Tambor',
        icon: 'barrel',
        label: 'Tambor',
        value: 'TAMBOR'
    },
    {
        id: 'TANQUE',
        tipo: 'Tanque 5 m³',
        capacidade: "5 m³",
        icon: 'tank',
        label: 'Tanque 5 m³',
        value: 'TANQUE'
    },
];

export const formatarTipoContainer = (container: Container): string => {
    const tipo = container.tipo === 'cacamba' ? 'cacamba' : 'Compactador';
    return `${tipo} ${container.capacidade}m³`;
};

export interface Responsavel {
    nome: string;
    userId: string;
    timestamp: number;
}

// Interface para programação
export interface ProgramacaoEquipamento {
    id: string;
    cliente: string;
    firebaseKey?: string;
    dataConclusao?: string;
    dataEntrega: string;
    equipamentos: Equipment[]; // Mudei para array de SelectedEquipment
    containers: Container[];    // Mudei para array de SelectedContainer
    endereco: string;
    observacoes: string;
    status: 'programado' | 'em_rota' | 'finalizado';
    createdAt: number;
    createdBy: string;
    responsavelLogistica?: Responsavel;
    responsavelCarregamento?: Responsavel;
    responsavelOperacao?: Responsavel;
}

export interface Endereco {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    pontoReferencia?: string;
}

export interface ClienteInterface {
    cnpjCpf: string;
    razaoSocial: string;
    endereco?: string;
}
