// lavagemTypes.ts
export type TipoEquipamento = 'COMPACTADORA' | 'CAÇAMBA' | 'CONTAINER' | 'COLETOR';

export type TipoLavagem = 'simples' | 'completa';

export type UnidadeMedida = 'unidade' | 'kilo' | 'litro';

export interface ProdutoSelecionado {
    produto: string;
    quantidade: string;
}

// Primeiro, defina a interface do Produto
export interface ProdutoEstoque {
    id?: string;
    nome: string;
    quantidade: string;
    quantidadeMinima: string;
    unidadeMedida: UnidadeMedida;
    descricao?: string;
    photoUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Equipamento {
    label: string;
    value: TipoEquipamento;
    tipo: 'equipamento';
}

export interface RegistroLavagem {
    id?: string;
    timestamp?: number;
    data: string;
    hora: string;
    responsavel: string;
    placaVeiculo: string;
    tipoLavagem: 'simples' | 'completa';
    produtos: Array<{
        produto: string;
        quantidade: string;
    }>;
    observacoes: string;
    photoUris?: string[];
    photoUrls?: string[];
    createdAt?: string;
    updatedAt?: string;
    isSync?: boolean;
    agendamentoId?: string;
}

export interface AgendamentoLavagem {
    id: string;
    placa: string;
    tipoVeiculo?: 'placa' | 'equipamento';
    tipoLavagem: string;
    data: string;
    concluido: boolean;
}

export interface VeiculoPlaca {
    label: string;
    value: string;
    tipo: 'placa';
}

export const PLACAS_VEICULOS: VeiculoPlaca[] = [
    { label: 'LMD-4E79', value: 'LMD-4E79', tipo: 'placa' },
    { label: 'LMD-6E04', value: 'LMD-6E04', tipo: 'placa' },
    { label: 'LQE-4E43', value: 'LQE-4E43', tipo: 'placa' },
    { label: 'LRE-9H87', value: 'LRE-9H87', tipo: 'placa' },
    { label: 'LRM-9A04', value: 'LRM-9A04', tipo: 'placa' },
    { label: 'MRI-1C33', value: 'MRI-1C33', tipo: 'placa' },
    { label: 'MSZ-6751', value: 'MSZ-6751', tipo: 'placa' },
    { label: 'MTQ-3I66', value: 'MTQ-3I66', tipo: 'placa' },
    { label: 'OCW-4I96', value: 'OCW-4I96', tipo: 'placa' },
    { label: 'ODA-9H29', value: 'ODA-9H29', tipo: 'placa' },
    { label: 'ODE-5J15', value: 'ODE-5J15', tipo: 'placa' },
    { label: 'ODE-5J01', value: 'ODE-5J01', tipo: 'placa' },
    { label: 'ODP-4F83', value: 'ODP-4F83', tipo: 'placa' },
    { label: 'OIQ-7C97', value: 'OIQ-7C97', tipo: 'placa' },
    { label: 'OVH-4J40', value: 'OVH-4J40', tipo: 'placa' },
    { label: 'OVH-4J42', value: 'OVH-4J42', tipo: 'placa' },
    { label: 'OVS-8G82', value: 'OVS-8G82', tipo: 'placa' },
    { label: 'PPO-4J82', value: 'PPO-4J82', tipo: 'placa' },
    { label: 'PPV-6A12', value: 'PPV-6A12', tipo: 'placa' },
    { label: 'QRB-9I05', value: 'QRB-9I05', tipo: 'placa' },
    { label: 'QRB-9I06', value: 'QRB-9I06', tipo: 'placa' },
    { label: 'RIQ-5E78', value: 'RIQ-5E78', tipo: 'placa' },
    { label: 'RJA-5F61', value: 'RJA-5F61', tipo: 'placa' },
    { label: 'RJH-6F51', value: 'RJH-6F51', tipo: 'placa' },
    { label: 'RJI-6I71', value: 'RJI-6I71', tipo: 'placa' },
    { label: 'RJR-6C75', value: 'RJR-6C75', tipo: 'placa' },
    { label: 'RJS-6B27', value: 'RJS-6B27', tipo: 'placa' },
    { label: 'RKE-6C41', value: 'RKE-6C41', tipo: 'placa' },
    { label: 'RKF-6I48', value: 'RKF-6I48', tipo: 'placa' },
    { label: 'RKO-7C06', value: 'RKO-7C06', tipo: 'placa' },
    { label: 'SRH-2H49', value: 'SRH-2H49', tipo: 'placa' },
    { label: 'SVX-8A18', value: 'SVX-8A18', tipo: 'placa' },
    { label: 'SVC-3E96', value: 'SVC-3E96', tipo: 'placa' },
    { label: 'SVI-2F25', value: 'SVI-2F25', tipo: 'placa' },
    { label: 'SVY-2E21', value: 'SVY-2E21', tipo: 'placa' },
    { label: 'SVY-5F43', value: 'SVY-5F43', tipo: 'placa' },
    { label: 'SVJ-1F06', value: 'SVJ-1F06', tipo: 'placa' },
];

export const EQUIPAMENTOS: Equipamento[] = [
    { label: 'COMPACTADORA', value: 'COMPACTADORA', tipo: 'equipamento' },
    { label: 'CAÇAMBA', value: 'CAÇAMBA', tipo: 'equipamento' },
    { label: 'CONTAINER', value: 'CONTAINER', tipo: 'equipamento' },
    { label: 'COLETOR', value: 'COLETOR', tipo: 'equipamento' },
];


export const TIPOS_LAVAGEM = [
    { label: 'Simples', value: 'simples' as TipoLavagem },
    { label: 'Completa', value: 'completa' as TipoLavagem }
];

export const PRODUTOS = [
    { label: 'Shampoo Automotivo', value: 'shampoo' },
    { label: 'Cera', value: 'cera' },
    { label: 'Limpa Pneus', value: 'limpa_pneus' },
    { label: 'Limpa Vidros', value: 'limpa_vidros' }
];