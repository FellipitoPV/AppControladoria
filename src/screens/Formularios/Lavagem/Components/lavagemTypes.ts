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

export interface IAgendamentoLavagem {
    id: string;
    placa: string;
    tipoVeiculo?: 'placa' | 'equipamento';
    tipoLavagem: string;
    data: string;
    concluido: boolean;
}

export interface VeiculoPlaca {
    value: string;
    tipo: 'placa';
}

export const PLACAS_VEICULOS: VeiculoPlaca[] = [
    { value: 'LMD-4E79', tipo: 'placa' },
    { value: 'LMD-6E04', tipo: 'placa' },
    { value: 'LQE-4E43', tipo: 'placa' },
    { value: 'LRE-9H87', tipo: 'placa' },
    { value: 'LRM-9A04', tipo: 'placa' },
    { value: 'MRI-1C33', tipo: 'placa' },
    { value: 'MSZ-6751', tipo: 'placa' },
    { value: 'MTQ-3I66', tipo: 'placa' },
    { value: 'OCW-4I96', tipo: 'placa' },
    { value: 'ODA-9H29', tipo: 'placa' },
    { value: 'ODE-5J15', tipo: 'placa' },
    { value: 'ODE-5J01', tipo: 'placa' },
    { value: 'ODP-4F83', tipo: 'placa' },
    { value: 'OIQ-7C97', tipo: 'placa' },
    { value: 'OVH-4J40', tipo: 'placa' },
    { value: 'OVH-4J42', tipo: 'placa' },
    { value: 'OVS-8G82', tipo: 'placa' },
    { value: 'PPO-4J82', tipo: 'placa' },
    { value: 'PPV-6A12', tipo: 'placa' },
    { value: 'QRB-9I05', tipo: 'placa' },
    { value: 'QRB-9I06', tipo: 'placa' },
    { value: 'RIQ-5E78', tipo: 'placa' },
    { value: 'RJA-5F61', tipo: 'placa' },
    { value: 'RJH-6F51', tipo: 'placa' },
    { value: 'RJI-6I71', tipo: 'placa' },
    { value: 'RJR-6C75', tipo: 'placa' },
    { value: 'RJS-6B27', tipo: 'placa' },
    { value: 'RKE-6C41', tipo: 'placa' },
    { value: 'RKF-6I48', tipo: 'placa' },
    { value: 'RKO-7C06', tipo: 'placa' },
    { value: 'SRH-2H49', tipo: 'placa' },
    { value: 'SVX-8A18', tipo: 'placa' },
    { value: 'SVC-3E96', tipo: 'placa' },
    { value: 'SVI-2F25', tipo: 'placa' },
    { value: 'SVY-2E21', tipo: 'placa' },
    { value: 'SVY-5F43', tipo: 'placa' },
    { value: 'SVJ-1F06', tipo: 'placa' },
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