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

export function getLevelLabel(level: number): string {
    switch (level) {
        case 3: return 'Administrador';
        case 2: return 'Avançado';
        case 1: return 'Básico';
        default: return 'Sem acesso';
    }
}
