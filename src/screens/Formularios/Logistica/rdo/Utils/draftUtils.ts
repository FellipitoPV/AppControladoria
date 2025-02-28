import AsyncStorage from '@react-native-async-storage/async-storage';
import { Atividade, Equipamento, FormDataInterface, Profissional } from '../Types/rdoTypes';

// Função para salvar múltiplos rascunhos (um para cada cliente/serviço)
export const saveRdoDraftWithId = async (
    formData: FormDataInterface,
    clienteId: string,
    servicoId: string
): Promise<void> => {
    try {
        const key = `rdo_draft_${clienteId}_${servicoId}`;
        const draftData = {
            data: formData,
            lastSaved: new Date().toISOString(),
            clienteId,
            servicoId
        };
        await AsyncStorage.setItem(key, JSON.stringify(draftData));
        console.log(`Rascunho do RDO para cliente ${clienteId} e serviço ${servicoId} salvo`);
    } catch (error) {
        console.error('Erro ao salvar rascunho específico do RDO:', error);
        throw error;
    }
};

// Utilitários
export const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Funções de rascunho
export const saveRdoDraft = async (data: FormDataInterface): Promise<void> => {
    try {
        console.log("Draft com isso :", data)
        const draft = {
            data,
            lastSaved: new Date().toISOString()
        };
        await AsyncStorage.setItem('rdoDraft', JSON.stringify(draft));
    } catch (error) {
        console.error('Erro ao salvar rascunho:', error);
    }
};

export const loadRdoDraft = async (): Promise<{ data: FormDataInterface; lastSaved: string } | null> => {
    try {
        const draftJson = await AsyncStorage.getItem('rdoDraft');
        if (draftJson) {
            return JSON.parse(draftJson);
        }
        return null;
    } catch (error) {
        console.error('Erro ao carregar rascunho:', error);
        return null;
    }
};

export const clearRdoDraft = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('rdoDraft');
    } catch (error) {
        console.error('Erro ao limpar rascunho:', error);
    }
};

// Função de validação
export const validateForm = (
    formData: FormDataInterface,
    material: string,
    tempoManha: string,
    tempoTarde: string,
    tempoNoite: string,
    profissionais: Profissional[],
    equipamentos: Equipamento[],
    atividades: Atividade[]
): string[] => {
    const errors: string[] = [];

    if (!formData.cliente) errors.push('Selecione um cliente');
    if (!formData.servico) errors.push('Selecione um serviço');
    if (!material) errors.push('Selecione um material');
    if (!tempoManha) errors.push('Informe a condição do tempo pela manhã');
    if (!tempoTarde) errors.push('Informe a condição do tempo pela tarde');
    if (!tempoNoite) errors.push('Informe a condição do tempo pela noite');

    // Validar profissionais
    const profissionaisValidos = profissionais.every(p => p.tipo && p.quantidade);
    if (!profissionaisValidos) errors.push('Preencha corretamente todos os profissionais');

    // Validar equipamentos
    const equipamentosValidos = equipamentos.every(e => e.tipo && e.quantidade);
    if (!equipamentosValidos) errors.push('Preencha corretamente todos os equipamentos');

    // Validar atividades
    const atividadesValidas = atividades.every(a => a.descricao);
    if (!atividadesValidas) errors.push('Preencha a descrição de todas as atividades');

    return errors;
};