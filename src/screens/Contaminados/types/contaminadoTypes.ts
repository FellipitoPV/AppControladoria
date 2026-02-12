export type ContaminadoStatus = 'Aguardando' | 'Destinado';

export interface Contaminado {
  id?: string;
  photoUrl: string;
  data: string;
  empresa: string;
  mtr: string;
  pesagem: string;
  status: ContaminadoStatus;
  createdAt: string;
  updatedAt: string;
}
