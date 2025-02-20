// Lista de acessos disponíveis
export interface AcessoInterface {
    id: string;
    label: string;
    icon: string;
    description: string;
}

export const AcessosType: AcessoInterface[] = [
    { id: 'lavagem', label: 'Lavagem', icon: 'truck', description: 'Garante acesso a Lavagem, podendo registrar, visualizar e gerar um realtorio.' },
    { id: 'lavagemAdm', label: 'Lavagem ADM', icon: 'shield-account', description: 'Como Administrador da lavagem, o usuario pode editar, excluri e agendar lavagens.' },

    { id: 'compostagem', label: 'Compostagem', icon: 'sprout', description: 'Permite o Acesso a área da compostagem.' },
];
