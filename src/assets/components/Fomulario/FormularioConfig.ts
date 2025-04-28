import { Dayjs } from 'dayjs';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';

export interface FormFieldConfig {
  name: string; // Nome do campo (usado como chave no estado)
  label: string; // Texto do label
  type: 'text' | 'number' | 'datetime' | 'dropdown' | 'photos' | 'textarea' | 'products'; // Adiciona 'products'
  icon?: string | IconSource; // Suporta strings ou IconSource
  required?: boolean; // Campo obrigatório?
  disabled?: boolean; // Adiciona suporte para disabled
  options?: { label: string; value: string; icon?: string; tipo?: string; isCustom?: boolean }[]; // Para dropdowns
  multiline?: boolean; // Para textarea
  keyboardType?: 'default' | 'numeric' | 'decimal-pad'; // Tipo de teclado
  infoText?: string; // Texto informativo abaixo do campo
  search?: boolean; // Para dropdown com busca
  searchPlaceholder?: string; // Placeholder para busca
  onSearch?: (text: string) => void; // Callback para busca
  onAddCustom?: (value: string) => void; // Callback para adicionar item personalizado
  products?: { // Para o tipo 'products'
    availableProducts: any[]; // Pode ser tipado melhor, se possível
    onAddProduct: (product: any) => void;
    onRemoveProduct: (index: number) => void;
    onUpdateProduct: (index: number, product: any) => void;
  };
}

export interface FormSectionConfig {
  title: string; // Título da seção
  icon: string | IconSource; // Suporta strings ou IconSource
  fields: FormFieldConfig[]; // Lista de campos na seção
}

export interface FormConfig {
  sections: FormSectionConfig[]; // Lista de seções do formulário
}

export interface FormValues {
  [key: string]: string | Dayjs | string[] | null | { uri: string; id: string }[] | any[];
}