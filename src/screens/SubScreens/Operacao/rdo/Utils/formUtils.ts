import { showGlobalToast } from '../../../../../helpers/GlobalApi';
import { FormDataInterface, Profissional, Equipamento, Atividade, Ocorrencia, Photo } from '../Types/rdoTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Format date to DD/MM/YYYY
export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR');
};

// Format time to HH:MM
export const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Validate the form data - funciona bem com o formData consolidado
export const validateForm = (
    formData: FormDataInterface,
): string[] => {
    const errors: string[] = [];

    // Basic validations
    if (!formData.cliente) errors.push("Informe o cliente");
    if (!formData.servico) errors.push("Selecione o serviço");
    if (!formData.responsavel) errors.push("Informe o responsável");
    if (!formData.material) errors.push("Selecione o material");
    if (!formData.condicaoTempo.manha) errors.push("Informe a condição do tempo pela manhã");
    if (!formData.condicaoTempo.tarde) errors.push("Informe a condição do tempo pela tarde");
    if (!formData.condicaoTempo.noite) errors.push("Informe a condição do tempo pela noite");

    // Validate professionals
    if (!formData.profissionais || formData.profissionais.length === 0) {
        errors.push("Adicione pelo menos um profissional");
    } else {
        const profissionaisInvalidos = formData.profissionais.some(
            p => !p.tipo || !p.quantidade || p.quantidade === '0'
        );
        if (profissionaisInvalidos) {
            errors.push("Preencha corretamente todos os profissionais e suas quantidades");
        }
    }

    // Validate equipment
    if (!formData.equipamentos || formData.equipamentos.length === 0) {
        errors.push("Adicione pelo menos um equipamento");
    } else {
        const equipamentosInvalidos = formData.equipamentos.some(
            e => !e.tipo || !e.quantidade || e.quantidade === '0'
        );
        if (equipamentosInvalidos) {
            errors.push("Preencha corretamente todos os equipamentos e suas quantidades");
        }
    }

    // Validate activities
    if (!formData.atividades || formData.atividades.length === 0) {
        errors.push("Adicione pelo menos uma atividade");
    } else {
        const atividadesInvalidas = formData.atividades.some(
            a => !a.descricao || a.descricao.trim() === ''
        );
        if (atividadesInvalidas) {
            errors.push("Preencha a descrição de todas as atividades");
        }
    }

    return errors;
};

// Helper to get the start of day
export const getStartOfDay = (): Date => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

// Helper to get the start of week
export const getStartOfWeek = (): Date => {
    const date = new Date();
    const day = date.getDay(); // 0-6
    const diff = date.getDate() - day;
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
};

// Helper to get the start of month
export const getStartOfMonth = (): Date => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
};

// Função auxiliar para preparar formData para salvamento
export const prepareFormDataForSave = (
    formData: FormDataInterface,
    selectedDate: Date,
    horaInicio: Date,
    horaTermino: Date,
    atividadesRealizadas: Atividade[] = [],
    ocorrencias: Ocorrencia[] = [],
    comentarioGeral: string = '',
    photos: Photo[] = []
): FormDataInterface => {
    return {
        ...formData,
        data: formatDate(selectedDate),
        inicioOperacao: formatTime(horaInicio),
        terminoOperacao: formatTime(horaTermino),
        atividades: atividadesRealizadas,
        ocorrencias: ocorrencias,
        comentarioGeral: comentarioGeral,
        photos: photos
    };
};