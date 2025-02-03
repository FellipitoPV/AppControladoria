import axios from 'axios';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { RelatorioData } from './Types';

const api = axios.create({
    baseURL: Platform.select({
        ios: 'http://localhost:3000',
        android: 'http://192.168.1.222:3000' // Seu IP atual
    }),
    timeout: 60000, // Aumentado para 60 segundos devido ao processamento de imagens
    maxBodyLength: Infinity, // Permite envio de arquivos grandes
    maxContentLength: Infinity,
});

export interface PhotoItem {
    img: string;
    imgName: string;
}

const ensureDirectoryExists = async (path: string) => {
    try {
        const exists = await RNFS.exists(path);
        if (!exists) {
            await RNFS.mkdir(path);
        }
    } catch (error) {
        console.error('Erro ao criar diretório:', error);
        throw error;
    }
};


export const generateWordDocument = async (data: RelatorioData): Promise<string> => {
    try {

        // Prepara as imagens para envio
        const images = data.images.map(image => ({
            image: image.image,
            name: image.name
        }));

        // Prepara os dados para envio
        const requestData = {
            class: data.class,
            num: data.num,
            cliente: data.cliente,
            ocoOsDia: data.ocoOsDia,
            resp: data.resp,
            dataOm: data.dataOm,
            obs: data.obs,
            images
        };

        //console.log('Enviando requisição para o servidor');
        const response = await api.post('/gerar-documento', requestData, {
            responseType: 'arraybuffer',
            headers: {
                'Accept': 'application/octet-stream',
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 segundos
        });

        // Verifica se a resposta está vazia
        if (!response.data || response.data.length === 0) {
            throw new Error('Resposta vazia do servidor');
        }

        // Opção 1: Usando uma constante local com regex
        const cleanClientName = data.cliente.replace(/\s*\([^)]*\)/, '').trim();
        const fileName = `RO-${data.num}-${cleanClientName}.pdf`;
        const documentsPath = Platform.select({
            android: RNFS.ExternalStorageDirectoryPath + '/Documents',
            ios: RNFS.DocumentDirectoryPath
        });

        if (!documentsPath) {
            throw new Error('Caminho de documentos não encontrado');
        }

        const relatoriosPath = `${documentsPath}/Relatorios`;
        await ensureDirectoryExists(relatoriosPath);

        const outputPath = `${relatoriosPath}/${fileName}`;

        // Convertendo o arraybuffer para base64 de forma mais segura
        const uint8Array = new Uint8Array(response.data);
        let binaryString = '';
        uint8Array.forEach(byte => {
            binaryString += String.fromCharCode(byte);
        });
        const base64Data = btoa(binaryString);

        console.log('Salvando documento em:', outputPath);
        await RNFS.writeFile(outputPath, base64Data, 'base64');

        // Atualiza a mídia no Android
        if (Platform.OS === 'android') {
            try {
                await RNFS.scanFile(outputPath);
            } catch (error) {
                console.error('Erro ao escanear arquivo:', error);
                // Não lançamos o erro aqui pois não é crítico
            }
        }

        return outputPath;
    } catch (error) {
        console.error('Erro detalhado ao gerar documento:', error);
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Tempo limite de conexão excedido');
            }
            if (!error.response) {
                throw new Error('Erro de conexão com o servidor');
            }
            throw new Error(`Erro do servidor: ${error.response.status}`);
        }
        throw error;
    }
};

export default api;