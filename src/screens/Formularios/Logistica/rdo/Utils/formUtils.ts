import { showGlobalToast } from '../../../../../helpers/GlobalApi';
import { FormDataInterface, Profissional, Equipamento, Atividade, Ocorrencia, Photo } from '../Types/rdoTypes';

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

// Validate the form data
export const validateForm = (
    formData: FormDataInterface,
    materialSelecionado: string,
    tempoManha: string,
    tempoTarde: string,
    tempoNoite: string,
    profissionaisSelecionados: Profissional[],
    equipamentosSelecionados: Equipamento[],
    atividadesRealizadas: Atividade[]
): string[] => {
    const errors: string[] = [];

    // Basic validations
    if (!formData.cliente) errors.push("Informe o cliente");
    if (!formData.servico) errors.push("Selecione o serviço");
    if (!formData.responsavel) errors.push("Informe o responsável");
    if (!materialSelecionado) errors.push("Selecione o material");
    if (!tempoManha) errors.push("Informe a condição do tempo pela manhã");
    if (!tempoTarde) errors.push("Informe a condição do tempo pela tarde");
    if (!tempoNoite) errors.push("Informe a condição do tempo pela noite");

    // Validate professionals
    if (profissionaisSelecionados.length === 0) {
        errors.push("Adicione pelo menos um profissional");
    } else {
        const profissionaisInvalidos = profissionaisSelecionados.some(
            p => !p.tipo || !p.quantidade || p.quantidade === '0'
        );
        if (profissionaisInvalidos) {
            errors.push("Preencha corretamente todos os profissionais e suas quantidades");
        }
    }

    // Validate equipment
    if (equipamentosSelecionados.length === 0) {
        errors.push("Adicione pelo menos um equipamento");
    } else {
        const equipamentosInvalidos = equipamentosSelecionados.some(
            e => !e.tipo || !e.quantidade || e.quantidade === '0'
        );
        if (equipamentosInvalidos) {
            errors.push("Preencha corretamente todos os equipamentos e suas quantidades");
        }
    }

    // Validate activities
    const atividadesInvalidas = atividadesRealizadas.some(
        a => !a.descricao || a.descricao.trim() === ''
    );
    if (atividadesInvalidas) {
        errors.push("Preencha a descrição de todas as atividades");
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

