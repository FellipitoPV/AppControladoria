import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = 'http://node262658-etm-ecodashboard-api.sp1.br.saveincloud.net.br';

const getHeaders = async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('@authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token ?? ''}`,
    };
};

// ─── Autenticação ────────────────────────────────────────────────────────────

export const ecoAuth = {
    login: async (email: string, password: string): Promise<{ token: string }> => {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Credenciais inválidas');
        }
        return res.json();
    },

    register: async (email: string, password: string): Promise<any> => {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Erro ao registrar usuário');
        }
        return res.json();
    },
};

// ─── CRUD genérico ───────────────────────────────────────────────────────────

export const ecoApi = {
    list: async (col: string, filters?: Record<string, string>): Promise<any[]> => {
        const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
        const res = await fetch(`${BASE_URL}/api/${col}${params}`, {
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error(`Erro ao listar ${col}`);
        return res.json();
    },

    getById: async (col: string, id: string): Promise<any> => {
        const res = await fetch(`${BASE_URL}/api/${col}/${id}`, {
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error(`Erro ao buscar ${col}/${id}`);
        return res.json();
    },

    create: async (col: string, data: object): Promise<any> => {
        const res = await fetch(`${BASE_URL}/api/${col}`, {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Erro ao criar em ${col}`);
        return res.json();
    },

    update: async (col: string, id: string, data: object): Promise<any> => {
        const res = await fetch(`${BASE_URL}/api/${col}/${id}`, {
            method: 'PUT',
            headers: await getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Erro ao atualizar ${col}/${id}`);
        return res.json();
    },

    delete: async (col: string, id: string): Promise<any> => {
        const res = await fetch(`${BASE_URL}/api/${col}/${id}`, {
            method: 'DELETE',
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error(`Erro ao deletar ${col}/${id}`);
        return res.json();
    },
};

// ─── Storage ─────────────────────────────────────────────────────────────────

export const ecoStorage = {
    upload: async (file: any): Promise<{ url: string; filename: string; originalName: string; size: number; mimetype: string }> => {
        const token = await AsyncStorage.getItem('@authToken');
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${BASE_URL}/storage/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token ?? ''}` },
            body: formData,
        });
        if (!res.ok) throw new Error('Erro ao fazer upload do arquivo');
        return res.json();
    },

    getFileUrl: (filename: string): string => `${BASE_URL}/storage/files/${filename}`,

    delete: async (filename: string): Promise<any> => {
        const res = await fetch(`${BASE_URL}/storage/files/${filename}`, {
            method: 'DELETE',
            headers: await getHeaders(),
        });
        if (!res.ok) throw new Error('Erro ao deletar arquivo');
        return res.json();
    },
};
