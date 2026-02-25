export type ContaminadoStatus = 'Aguardando' | 'Destinado';

export interface Contaminado {
  id?: string;
  photoUrl?: string;      // legado — campo antigo (foto única)
  photoUrls?: string[];   // novo — suporte a múltiplas fotos
  data: string;
  empresa: string;
  mtr: string;
  pesagem: string;
  status: ContaminadoStatus;
  createdAt: string;
  updatedAt: string;
}

export const getItemPhotos = (item: Contaminado): string[] => {
  if (item.photoUrls && item.photoUrls.length > 0) return item.photoUrls;
  if (item.photoUrl) return [item.photoUrl];
  return [];
};
