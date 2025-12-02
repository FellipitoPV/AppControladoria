// Definindo interface para níveis de acesso
export interface AccessLevel {
    level: number;
    title: string;
    description: string;
    capabilities: string[];
}

// Interface principal de acesso
export interface AcessoInterface {
    id: string;
    label: string;
    icon: string;
    description: string;
    levels: AccessLevel[];
}

// Definição dos tipos de acesso com níveis
export const AcessosType: AcessoInterface[] = [
    {
        id: 'lavagem',
        label: 'Lavagem',
        icon: 'truck',
        description: 'Sistema de gestão de lavagem de veículos',
        levels: [
            {
                level: 1,
                title: "Operador Básico",
                description: "Acesso básico ao sistema de lavagem",
                capabilities: [
                    "Registrar novas lavagens",
                    "Visualizar agenda de lavagens",
                    "Gerar relatórios"
                ]
            },
            {
                level: 2,
                title: "Operador Avançado",
                description: "Acesso intermediário com recursos adicionais",
                capabilities: [
                    "Registrar novas lavagens",
                    "Visualizar agenda de lavagens",
                    "Gerar relatórios",
                    "Editar lavagens do dia atual",
                ]
            },
            {
                level: 3,
                title: "Administrador",
                description: "Acesso total ao módulo de lavagem",
                capabilities: [
                    "Registrar novas lavagens",
                    "Visualizar agenda de lavagens",
                    "Gerar relatórios",
                    "Editar qualquer lavagem",
                    "Excluir lavagens",
                    "Agendar lavagens",
                ]
            }
        ]
    },
    {
        id: 'compostagem',
        label: 'Compostagem',
        icon: 'sprout',
        description: 'Sistema de gestão de compostagem',
        levels: [
            {
                level: 1,
                title: "Operador Básico",
                description: "Acesso básico ao sistema de compostagem",
                capabilities: [
                    "Visualizar lotes",
                    "Registrar medições",
                    "Gerar relatórios básicos"
                ]
            },
            {
                level: 2,
                title: "Operador Avançado",
                description: "Acesso intermediário com recursos adicionais",
                capabilities: [
                    "Visualizar lotes",
                    "Registrar medições",
                    "Gerar relatórios básicos",
                    "Criar novos lotes",
                    "Editar medições do dia"
                ]
            },
            {
                level: 3,
                title: "Administrador",
                description: "Acesso total ao módulo de compostagem",
                capabilities: [
                    "Visualizar lotes",
                    "Registrar medições",
                    "Gerar relatórios básicos",
                    "Criar novos lotes",
                    "Editar qualquer medição",
                    "Excluir lotes",
                    "Gerenciar configurações"
                ]
            }
        ]
    },
    {
        id: 'logistica',
        label: 'Logística',
        icon: 'truck-delivery',
        description: 'Sistema de gestão de programações logísticas',
        levels: [
            {
                level: 1,
                title: "Operador Básico",
                description: "Acesso básico ao sistema de logística",
                capabilities: [
                    "Criar programações",
                    "Visualizar histórico de programações",
                    "Gerar relatórios",
                    "Excluir programações",
                ]
            },
            {
                level: 2,
                title: "Operador Avançado",
                description: "Acesso intermediário ao sistema de logística",
                capabilities: [
                    "Criar programações",
                    "Visualizar histórico de programações",
                    "Gerar relatórios",
                    "Excluir programações",
                ]
            },
            {
                level: 3,
                title: "Administrador",
                description: "Acesso total ao sistema de logística",
                capabilities: [
                    "Criar programações",
                    "Visualizar histórico de programações",
                    "Gerar relatórios",
                    "Excluir programações",
                ]
            }
        ]
    },
    {
        id: 'operacao',
        label: 'Operação',
        icon: 'clipboard-check',
        description: 'Sistema de execução de programações operacionais',
        levels: [
            {
                level: 1,
                title: "Operador Básico",
                description: "Acesso básico ao sistema de operação",
                capabilities: [
                    "Visualizar programações",
                    "Aceitar responsabilidade",
                    "Finalizar programações",
                ]
            },
            {
                level: 2,
                title: "Operador Avançado",
                description: "Acesso intermediário ao sistema de operação",
                capabilities: [
                    "Visualizar programações",
                    "Aceitar responsabilidade",
                    "Finalizar programações",
                ]
            },
            {
                level: 3,
                title: "Administrador",
                description: "Acesso total ao sistema de operação",
                capabilities: [
                    "Visualizar programações",
                    "Aceitar responsabilidade",
                    "Finalizar programações",
                ]
            }
        ]
    },
    {
        id: 'controladoria',
        label: 'Gestão de Materiais',
        icon: 'file-document-outline',
        description: 'Sistema de gestão de relatórios documentais',
        levels: [
            {
                level: 1,
                title: "Operador Básico",
                description: "Acesso básico ao sistema de Gestão de Materiais",
                capabilities: [
                    "Visualizar histórico de RDO",
                    "Exportar relatório em PDF"
                ]
            },
            {
                level: 2,
                title: "Operador Avançado",
                description: "Acesso intermediário ao sistema de Gestão de Materiais",
                capabilities: [
                    "Visualizar histórico de RDO",
                    "Exportar relatório em PDF",
                    "Editar relatórios anteriores"
                ]
            },
            {
                level: 3,
                title: "Administrador",
                description: "Acesso total ao sistema de Gestão de Materiais",
                capabilities: [
                    "Visualizar histórico de RDO",
                    "Exportar relatório em PDF",
                    "Editar relatórios anteriores",
                    "Gerenciar configurações de relatórios"
                ]
            }
        ]
    }
];

// Interface para o acesso do usuário
export interface UserAccess {
    moduleId: string;
    level: number;
}

export interface User {
    id: string;
    user: string;
    email: string;
    telefone?: string | null;  // Agora aceita null
    cargo: string;
    ramal?: string | null;     // Agora aceita null
    area?: string | null;      // Agora aceita null
    acesso?: UserAccess[];
    photoURL?: string;
    emergency_contacts?: emergencyContact[]; // Adicionando a propriedade emergencyContact
}

interface emergencyContact {
    id: string;
    nome: string;
    parentesco: string;
    telefone: string;
}

// Funções úteis para verificação de acesso
export function getUserLevel(user: User, moduleId: string): number {
    const access = user.acesso?.find(a => a.moduleId === moduleId);
    return access?.level || 0;
}

export function hasAccess(user: User, moduleId: string, requiredLevel: number): boolean {
    if (user.cargo === 'Administrador') return true;
    return getUserLevel(user, moduleId) >= requiredLevel;
}

export function getCapabilities(user: User, moduleId: string): string[] {
    const level = getUserLevel(user, moduleId);
    const module = AcessosType.find(m => m.id === moduleId);
    const accessLevel = module?.levels.find(l => l.level === level);
    return accessLevel?.capabilities || [];
}
