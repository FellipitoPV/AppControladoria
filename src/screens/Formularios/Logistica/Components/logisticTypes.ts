export type Meeting = {
    name: string;
    entrada: string;
    saida: string;
    date: string;
    assunto: string;
    sala: string;
}

export type Pesagem = {
    id: string;
    responsavel: string;
    data: string;
    hora: string;
    nCacamba: string;
    medida: string;
    quantidade: string;
    irregularidade: string;
    obsMtr: string;
    gerador: string;
    residuo: string;
    placa: string;
    photoUris: string[]; // Agora é um array de strings
}

export type Props = {
    meetingInfo?: Meeting;
    closeModal: (meeting: Meeting) => void;
};

export type dropdownType = {
    label: string;
    value: string;
}

export type GraphType = {
    name: string;
    count: number;
    color: string;
    quantidade: number;
    legendFontColor: string;
    legendFontSize: number;
    medida: string;
};

export const allResponsaveis: dropdownType[] = [
    { label: 'Lucas', value: 'Lucas' },
    { label: 'Gabriel', value: 'Gabriel' },
    { label: 'Fernanda', value: 'Fernanda' },
];

export interface RelatorioData {
    num: string;
    resp: string;
    class: string;
    cliente: string;
    ocoOsDia: string;
    dataOm: string;
    obs: string;
    images: {
        image: string;
        name: string;
    }[];
}

export type Compostagem = {
    timestamp?: any;
    isMedicaoRotina?: boolean;
    leira: string;
    id: string;
    data: string;
    hora: string;
    responsavel: string;
    tempAmb: string;
    tempBase: string;
    tempMeio: string;
    tempTopo: string;
    umidadeAmb: string;
    umidadeLeira: string;
    ph: string;
    odor: string | null;
    observacao: string;
    photoUris: string[];
    photoUrls?: string[];
};

export interface User {
    id: string;
    user: string;
    email: string;
    telefone?: string | null;  // Agora aceita null
    cargo: string;
    ramal?: string | null;     // Agora aceita null
    area?: string | null;      // Agora aceita null
    acesso?: string[];
}

// Interfaces base
export interface Equipment {
    id: string;
    tipo: string;
    status?: string;
}

export interface Container {
    id: string;
    numero?: string;
    tipo: string;
    residuo?: string;
    capacidade?: string;
    status?: string;
}

// Interfaces para itens selecionados
export interface SelectedEquipment extends Equipment {
    quantidade: number;
}

export interface SelectedContainer extends Container {
    quantidade: number;
}

// Lista de tipos de equipamentos disponíveis
export const listaTiposEquipamentos: Equipment[] = [
    {
        id: 'POL',
        tipo: 'Poliguindaste'
    },
    {
        id: 'ROL',
        tipo: 'Rollon'
    },
    {
        id: 'CAV',
        tipo: 'Cavalo'
    },
    {
        id: 'JUL',
        tipo: 'Julieta'
    },
    {
        id: 'VAC',
        tipo: 'Vacuo'
    }
];

// Lista de tipos de containers disponíveis
export const listaTiposContainers: Container[] = [
    //Especiias
    {
        id: 'BAG',
        tipo: 'Bags',
    },
    {
        id: 'BANHEIRO',
        tipo: 'Banehiro Químico',
    },


    //Caçambas
    {
        id: 'CAC20',
        tipo: 'cacamba',
        capacidade: '20 m³'
    },
    {
        id: 'CAC30',
        tipo: 'cacamba',
        capacidade: '30 m³'
    },
    {
        id: 'CAC40',
        tipo: 'cacamba',
        capacidade: '40 m³'
    },
    {
        id: 'CAC5BIP',
        tipo: 'cacamba',
        residuo: 'Bi-partida',
        capacidade: '5 m³'
    },
    {
        id: 'CAC5CTAMP',
        tipo: 'cacamba',
        residuo: "Cont. (c/Tampa)",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5STAMP',
        tipo: 'cacamba',
        residuo: "Cont. (s/Tampa)",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5ENT',
        tipo: 'cacamba',
        residuo: "Entulho",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5LIX',
        tipo: 'cacamba',
        residuo: "Lixo Comum",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5MAD',
        tipo: 'cacamba',
        residuo: "Madeira",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5MET',
        tipo: 'cacamba',
        residuo: "Metal",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5ORG',
        tipo: 'cacamba',
        residuo: "Lixo orgânico",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5PAP',
        tipo: 'cacamba',
        residuo: "Lixo Papel",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5PLAS',
        tipo: 'cacamba',
        residuo: "Lixo Plástico",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5VID',
        tipo: 'cacamba',
        residuo: "Lixo Vidro",
        capacidade: '5 m³'
    },
    {
        id: 'CAC5TRIP',
        tipo: 'cacamba',
        residuo: "Lixo Tripartida",
        capacidade: '5 m³'
    },

    //Carga Seca
    {
        id: 'CARGSEC',
        tipo: 'Carga Seca',
    },

    //Compactadores
    {
        id: 'COM7',
        tipo: 'Compactador',
        capacidade: '7 m³'
    },
    {
        id: 'COM17',
        tipo: 'Compactador',
        capacidade: '17 m³'
    },

    //OUTROS
    {
        id: 'CESTMET',
        tipo: 'Cesta Metálica',
    },
    {
        id: 'GARRA',
        tipo: 'Garra Hidráulica',
    },
    {
        id: 'POLIG',
        tipo: 'Poliguindaste',
    },
    {
        id: 'TAMBOR',
        tipo: 'Tambor',
    },
    {
        id: 'TANQUE',
        tipo: 'Tanque',
        capacidade: "5 m³"
    },

];

// Funções auxiliares de formatação
export const formatarTipoEquipamento = (equipamento: Equipment): string => {
    const tipos: { [key: string]: string } = {
        poliguindaste: 'Poliguindaste',
        rollon: 'Roll-on',
        cavalo: 'Cavalo Mecânico',
        julieta: 'Julieta',
        vacuo: 'Sistema à Vácuo'
    };
    return tipos[equipamento.tipo];
};

export const formatarTipoContainer = (container: Container): string => {
    const tipo = container.tipo === 'cacamba' ? 'cacamba' : 'Compactador';
    return `${tipo} ${container.capacidade}m³`;
};

export interface Responsavel {
    nome: string;
    userId: string;
    timestamp: number;
}

// Interface para programação
export interface ProgramacaoEquipamento {
    id: string;
    cliente: string;
    firebaseKey?: string;
    dataConclusao?: string;
    dataEntrega: string;
    equipamentos: SelectedEquipment[]; // Mudei para array de SelectedEquipment
    containers: SelectedContainer[];    // Mudei para array de SelectedContainer
    endereco: string;
    observacoes: string;
    status: 'programado' | 'em_rota' | 'finalizado';
    createdAt: number;
    createdBy: string;
    responsavelLogistica?: Responsavel;
    responsavelCarregamento?: Responsavel;
    responsavelOperacao?: Responsavel;
}

export interface Endereco {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    pontoReferencia?: string;
}

export interface ClienteInterface {
    cnpjCpf: string;
    razaoSocial: string;
    endereco?: string;
}

export const clientes: ClienteInterface[] = [
    {
        cnpjCpf: "09.559.087/0001-06",
        razaoSocial: "ALBANQ SERVIÇOS E LOCAÇÃO DE EQUIPAMENTOS LTDA.",
        endereco: "RUA JORNALISTA JAIME BARREIROS, 433 - CASA 01 QUADRA 03 LOTE 37"
    },
    {
        cnpjCpf: "04.353.185/0001-79",
        razaoSocial: "ALCYR ALVES FERREIRA & CIA LTDA",
        endereco: "RUA CONDE DE ARARUAMA, 365"
    },
    {
        cnpjCpf: "01.679.569/0001-98",
        razaoSocial: "AMBIENSYS GESTAO AMBIENTAL LTDA (COMPACTADOR)"
    },
    {
        cnpjCpf: "17.213.095/0001-24",
        razaoSocial: "AMERAPEX DO BRASIL TESTES E ANALISES TECNICAS LTDA"
    },
    {
        cnpjCpf: "33.833.660/0001-02",
        razaoSocial: "AWC SOLUÇÕES EM ENGENHARIA LTDA"
    },
    {
        cnpjCpf: "13.574.594/1026-06",
        razaoSocial: "BK BRASIL OPERACAO E ASSESSORIA A RESTAURANTES S.A."
    },
    {
        cnpjCpf: "10.787.103/0005-20",
        razaoSocial: "BOSKALIS DO BRASIL DRAGAGEM E SERVICOS MARITIMOS LTDA"
    },
    {
        cnpjCpf: "08.056.030/0002-02",
        razaoSocial: "BRASIL PORT LOGÍSTICA OFFSHORE E ESTALEIRO NAVAL LTDA"
    },
    {
        cnpjCpf: "17.002.138/0001-22",
        razaoSocial: "BRK AMBIENTAL - MACAE S/A"
    },
    {
        cnpjCpf: "34.078.154/0017-85",
        razaoSocial: "BSM ENGENHARIA S.A. EM RECUPERACAO JUDICIAL"
    },
    {
        cnpjCpf: "02.199.357/0001-76",
        razaoSocial: "CABIUNAS INCORPORACOES E PARTICIPACOES LTDA"
    },
    {
        cnpjCpf: "08.021.949/0005-03",
        razaoSocial: "CARBOAMERICA PRODUTOS SIDERURGICOS E METALURGICOS LTDA"
    },
    {
        cnpjCpf: "64.338.171/0012-60",
        razaoSocial: "CCT CONCEITUAL CONSTRUÇÕES LTDA"
    },
    {
        cnpjCpf: "02.961.306/0002-10",
        razaoSocial: "CDG CENTRO COMERCIAL LTDA."
    },
    {
        cnpjCpf: "35.158.548/0001-49",
        razaoSocial: "CEASP CENTRO DE ABASTECIMENTO SAO PEDRO LTDA"
    },
    {
        cnpjCpf: "42.105.407/0001-23",
        razaoSocial: "CIMAVI BABY BEEF LTDA"
    },
    {
        cnpjCpf: "03.389.993/0001-23",
        razaoSocial: "CIS BRASIL LTDA"
    },
    {
        cnpjCpf: "39.373.782/0019-79",
        razaoSocial: "CISA TRADING S/A"
    },
    {
        cnpjCpf: "60.659.166/0002-27",
        razaoSocial: "CONAUT CONTROLES AUTOMÁTICOS LTDA"
    },
    {
        cnpjCpf: "08.931.921/0001-80",
        razaoSocial: "CONDOMINIO PLAZA MACAE"
    },
    {
        cnpjCpf: "48.148.698/0001-13",
        razaoSocial: "CONSORCIO BAIRRO MALVINAS"
    },
    {
        cnpjCpf: "43.939.204/0001-03",
        razaoSocial: "CONSORCIO ECB-SEA_ALSUB"
    },
    {
        cnpjCpf: "09.542.728/0001-10",
        razaoSocial: "CONSORCIO ZADAR-ENGETECNICA"
    },
    {
        cnpjCpf: "83.495.275/0001-70",
        razaoSocial: "CONSTRUTORA STEIN LTDA"
    },
    {
        cnpjCpf: "17.493.338/0009-82",
        razaoSocial: "COSTAZUL ALIMENTOS EIRELI"
    },
    {
        cnpjCpf: "02.164.313/0001-00",
        razaoSocial: "DELFISS ENGENHARIA LTDA"
    },
    {
        cnpjCpf: "31.698.759/0011-95",
        razaoSocial: "DOM ATACAREJO S.A."
    },
    {
        cnpjCpf: "28.483.069/0001-32",
        razaoSocial: "DOME SERVICOS INTEGRADOS"
    },
    {
        cnpjCpf: "07.049.258/0001-21",
        razaoSocial: "DRACARES APOIO MARITIMO E PORTUARIO LTDA"
    },
    {
        cnpjCpf: "28.129.260/0029-81",
        razaoSocial: "DRIFT COMERCIO DE ALIMENTOS S/A"
    },
    {
        cnpjCpf: "03.300.974/0038-70",
        razaoSocial: "ELASA - ELO ALIMENTACAO S/A."
    },
    {
        cnpjCpf: "97.428.668/0001-76",
        razaoSocial: "ELFE OPERAÇÃO E MANUTENÇÃO S.A."
    },
    {
        cnpjCpf: "33.287.862/0001-04",
        razaoSocial: "EMPREENDIMENTOS HOTELEIROS DO PORTO LTDA"
    },
    {
        cnpjCpf: "40.263.170/0008-50",
        razaoSocial: "ESSENCIS SOLUCOES AMBIENTAIS S.A"
    },
    {
        cnpjCpf: "32.149.831/0001-16",
        razaoSocial: "ESTACAO ACU EMPREENDIMENTOS IMOBILIARIOS LTDA"
    },
    {
        cnpjCpf: "16.941.560/0001-80",
        razaoSocial: "FENDER ENGENHARIA LTDA"
    },
    {
        cnpjCpf: "08.807.683/0002-86",
        razaoSocial: "FERROPORT LOGISTICA COMERCIAL EXPORTADORA S.A."
    },
    {
        cnpjCpf: "48.122.295/0001-03",
        razaoSocial: "FMC TECHNOLOGIES DO BRASIL LTDA"
    },
    {
        cnpjCpf: "11.155.874/0001-34",
        razaoSocial: "GARMONE ENGENHARIA LTDA"
    },
    {
        cnpjCpf: "54.187.453/0001-06",
        razaoSocial: "GC OPERAÇÕES MARÍTIMAS"
    },
    {
        cnpjCpf: "09.444.141/0010-69",
        razaoSocial: "GLOBAL SHIP SERVICE LTDA"
    },
    {
        cnpjCpf: "32.319.189/0001-76",
        razaoSocial: "GNI15 EMPREENDIMENTOS IMOBILIÁRIOS LTDA"
    },
    {
        cnpjCpf: "36.966.298/0001-36",
        razaoSocial: "GRAN ENERGIES S.A"
    },
    {
        cnpjCpf: "13.877.690/0001-03",
        razaoSocial: "GranEnergia Investimentos S.A"
    },
    {
        cnpjCpf: "40.892.336/0001-20",
        razaoSocial: "HARGEN OFFSHORE CONTAINERS LTDA"
    },
    {
        cnpjCpf: "00.156.880/0007-85",
        razaoSocial: "INTERMOOR DO BRASIL SERVIÇOS ONSHORE LTDA"
    },
    {
        cnpjCpf: "77.024.644/0002-25",
        razaoSocial: "JORGE MANCHUR & CIA LTDA"
    },
    {
        cnpjCpf: "60.691.250/0047-20",
        razaoSocial: "LC ADMINISTRACAO DE RESTAURANTES LTDA"
    },
    {
        cnpjCpf: "43.183.652/0001-11",
        razaoSocial: "LUBERFIL SERVICOS DE LUBRIFICACAO INDUSTRIAL LTDA"
    },
    {
        cnpjCpf: "20.707.884/0002-07",
        razaoSocial: "MANSERV FACILITIES LTDA"
    },
    {
        cnpjCpf: "27.511.450/0001-03",
        razaoSocial: "METAK METAIS KENNEDY LTDA"
    },
    {
        cnpjCpf: "28.779.772/0001-92",
        razaoSocial: "MHWIRTH DO BRASIL EQUIPAMENTOS LTDA"
    },
    {
        cnpjCpf: "39.522.791/0001-55",
        razaoSocial: "MISC SERVICOS DE PETROLEO DO BRASIL LTDA"
    },
    {
        cnpjCpf: "15.321.765/0002-81",
        razaoSocial: "MOTA ENGIL ENGENHARIA E CONSTRUCAO S.A"
    },
    {
        cnpjCpf: "06.980.064/0173-10",
        razaoSocial: "NACIONAL GAS BUTANO DISTRIBUIDORA LTDA"
    },
    {
        cnpjCpf: "06.980.064/0015-88",
        razaoSocial: "NACIONAL GAS BUTANO DISTRIBUIDORA LTDA"
    },
    {
        cnpjCpf: "02.650.425/0003-33",
        razaoSocial: "NATIONAL OILWELL VARCO DO BRASIL LTDA"
    },
    {
        cnpjCpf: "02.650.425/0008-48",
        razaoSocial: "NATIONAL OILWELL VARCO DO BRASIL LTDA"
    },
    {
        cnpjCpf: "05.353.545/0017-62",
        razaoSocial: "NORMATEL ENGENHARIA LTDA"
    },
    {
        cnpjCpf: "13.812.133/0003-76",
        razaoSocial: "NOV FLEXIBLES EQUIPAMENTOS E SERVICOS LTDA."
    },
    {
        cnpjCpf: "55.658.090/0008-70",
        razaoSocial: "NOV WELLBORE TECHNOLOGIES DO BRASIL EQUIPAMENTOS E SERVICOS LTDA"
    },
    {
        cnpjCpf: "55.658.090/0001-02",
        razaoSocial: "NOV WELLBORE TECHNOLOGIES DO BRASIL EQUIPAMENTOS E SERVICOS LTDA."
    },
    {
        cnpjCpf: "24.792.315/0001-87",
        razaoSocial: "OGTEC SERVICOS OPERACIONAIS LTDA"
    },
    {
        cnpjCpf: "29.060.647/0001-90",
        razaoSocial: "ORMEC ENGENHARIA LTDA"
    },
    {
        cnpjCpf: "11.198.242/0005-81",
        razaoSocial: "OSX BRASIL - PORTO DO ACU S.A."
    },
    {
        cnpjCpf: "34.375.501/0001-74",
        razaoSocial: "PARAGUAÇU ENGENHARIA LTDA"
    },
    {
        cnpjCpf: "05.026.514/0001-30",
        razaoSocial: "PETROGOTAS DE MACAE SERVICOS AMBIENTAIS LTDA"
    },
    {
        cnpjCpf: "08.807.676/0002-84",
        razaoSocial: "PORTO DO ACU OPERACOES S.A."
    },
    {
        cnpjCpf: "27.833.615/0013-99",
        razaoSocial: "PRINCESA AUTO SERVICO DE COMESTIVEIS LTDA"
    },
    {
        cnpjCpf: "27.833.615/0021-07",
        razaoSocial: "PRINCESA AUTO SERVICO DE COMESTIVEIS LTDA"
    },
    {
        cnpjCpf: "27.833.615/0031-70",
        razaoSocial: "PRINCESA AUTO SERVICO DE COMESTIVEIS LTDA"
    },
    {
        cnpjCpf: "27.833.615/0028-75",
        razaoSocial: "PRINCESA AUTO SERVICO DE COMESTIVEIS LTDA"
    },
    {
        cnpjCpf: "27.833.615/0032-51",
        razaoSocial: "PRINCESA AUTO SERVICO DE COMESTIVEIS LTDA"
    },
    {
        cnpjCpf: "27.833.615/0012-08",
        razaoSocial: "PRINCESA AUTO SERVICO DE COMESTIVEIS LTDA"
    },
    {
        cnpjCpf: "27.833.615/0019-84",
        razaoSocial: "PRINCESA AUTO SERVICO DE COMESTIVEIS LTDA."
    },
    {
        cnpjCpf: "03.262.073/0001-40",
        razaoSocial: "RCR REPRESENTAÇÕES E SERVIÇOS"
    },
    {
        cnpjCpf: "14.025.588/0001-42",
        razaoSocial: "RECINTEC TECNOLOGIAS AMBIENTAIS LTDA"
    },
    {
        cnpjCpf: "04.433.625/0001-06",
        razaoSocial: "RT LEA LOCAÇÃO DE EQUIPAMENTOS E ANDAIMES LTDA"
    },
    {
        cnpjCpf: "02.776.035/0001-42",
        razaoSocial: "SANEVIX ENGENHARIA LTDA EM RECUPERACAO JUDICIAL"
    },
    {
        cnpjCpf: "55.636.500/0006-10",
        razaoSocial: "SERVMAR SERVIÇOS TÉCNICOS AMBIENTAIS LTDA"
    },
    {
        cnpjCpf: "11.889.780/0001-99",
        razaoSocial: "SIT MACAÉ TRANSPORTES S/A"
    },
    {
        cnpjCpf: "08.487.503/0001-45",
        razaoSocial: "SUPERIOR ENERGY SERVICES - SERVICOS DE PETROLEO"
    },
    {
        cnpjCpf: "17.833.301/0017-66",
        razaoSocial: "SUPERMERCADOS ALVORADA EIRELI"
    },
    {
        cnpjCpf: "08.217.851/0004-45",
        razaoSocial: "TD CONSTRUÇŐES, REDES E INSTALAÇŐES DE GÁS"
    },
    {
        cnpjCpf: "68.915.891/0001-40",
        razaoSocial: "TECHNIP BRASIL - ENGENHARIA, INSTALACOES E APOIO MARITIMO LTDA"
    },
    {
        cnpjCpf: "68.915.891/0036-70",
        razaoSocial: "TECHNIP BRASIL - ENGENHARIA, INSTALACOES E APOIO MARITIMO LTDA"
    },
    {
        cnpjCpf: "02.976.581/0001-27",
        razaoSocial: "TETRA TECHNOLOGIES DO BRASIL LTDA"
    },
    {
        cnpjCpf: "07.123.390/0001-36",
        razaoSocial: "TRANSPORTADORA AMS DE MACAÉ LTDA"
    },
    {
        cnpjCpf: "21.778.678/0002-50",
        razaoSocial: "VAST INFRAESTRUTURA S.A."
    },
    {
        cnpjCpf: "33.412.883/0001-04",
        razaoSocial: "VINIL SERVICOS E MANUTENCAO DE CALDEIRARIA LTDA"
    },
    {
        cnpjCpf: "03.431.593/0001-39",
        razaoSocial: "VITORIA AMBIENTAL ENGENHARIA E TECNOLOGIA SA"
    },
    {
        cnpjCpf: "03.562.124/0023-64",
        razaoSocial: "WILSON SONS SERVIÇOS MARÍTIMOS LTDA"
    },
    {
        cnpjCpf: "33.411.794/0008-01",
        razaoSocial: "WILSON SONS SHIPPING SERVICES LTDA"
    }
];
