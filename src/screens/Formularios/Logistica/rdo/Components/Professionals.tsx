import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { customTheme } from '../../../../../theme/theme';
import { Profissional, DropdownRef, PROFISSIONAIS } from '../Types/rdoTypes';

interface ProfessionalsProps {
  profissionaisSelecionados: Profissional[];
  setProfissionaisSelecionados: React.Dispatch<React.SetStateAction<Profissional[]>>;
}

const Professionals: React.FC<ProfessionalsProps> = ({
  profissionaisSelecionados,
  setProfissionaisSelecionados
}) => {
  const [dropdownRefs, setDropdownRefs] = useState<React.RefObject<DropdownRef>[]>([]);

  useEffect(() => {
    // Initialize dropdown refs when professionals change
    setDropdownRefs(Array(profissionaisSelecionados.length).fill(0).map(() => React.createRef()));
  }, [profissionaisSelecionados.length]);

  const adicionarProfissional = () => {
    setProfissionaisSelecionados([...profissionaisSelecionados, { profissional: '', quantidade: '1' }]);
  };

  const removerProfissional = (index: number) => {
    const novosProfissionais = profissionaisSelecionados.filter((_, idx) => idx !== index);
    setProfissionaisSelecionados(novosProfissionais);
  };

  const atualizarProfissional = (index: number, atualizacoes: Partial<Profissional>) => {
    const novosProfissionais = [...profissionaisSelecionados];
    novosProfissionais[index] = {
      ...novosProfissionais[index],
      ...atualizacoes
    };
    setProfissionaisSelecionados(novosProfissionais);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="account-group"
          size={20}
          color={customTheme.colors.primary}
        />
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Profissionais
        </Text>
      </View>

      <View style={styles.inputGroup}>
        {profissionaisSelecionados.map((item, index) => (
          <View key={`profissional-${index}`} style={styles.itemRow}>
            <View style={styles.itemMain}>
              <TouchableOpacity
                style={styles.dropdownContainer}
                onPress={() => dropdownRefs[index]?.current?.open()}
              >
                <Dropdown
                  ref={dropdownRefs[index]}
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  iconStyle={styles.iconStyle}
                  data={PROFISSIONAIS.filter(p =>
                    !profissionaisSelecionados.some(ps =>
                      ps.profissional === p.value && ps !== item
                    )
                  )}
                  labelField="label"
                  valueField="value"
                  placeholder="Selecione o profissional"
                  value={item.profissional}
                  onChange={value => {
                    atualizarProfissional(index, {
                      profissional: value.value,
                      quantidade: item.quantidade || '1'
                    });
                  }}
                  renderLeftIcon={() => (
                    <MaterialCommunityIcons
                      name="account"
                      size={20}
                      color={customTheme.colors.primary}
                      style={styles.dropdownIcon}
                    />
                  )}
                  renderItem={item => (
                    <View style={styles.dropdownItem}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={20}
                        color={customTheme.colors.primary}
                      />
                      <Text style={styles.dropdownLabel}>
                        {item.label}
                      </Text>
                    </View>
                  )}
                />
              </TouchableOpacity>

              <TextInput
                mode="outlined"
                placeholder="Qtd"
                value={item.quantidade}
                onChangeText={value => {
                  atualizarProfissional(index, { quantidade: value });
                }}
                keyboardType="numeric"
                style={styles.quantidadeInput}
                left={<TextInput.Icon
                  icon={() => (
                    <MaterialCommunityIcons
                      name="numeric"
                      size={24}
                      color={customTheme.colors.primary}
                    />
                  )}
                />}
              />

              <TouchableOpacity
                onPress={() => removerProfissional(index)}
                style={styles.removeButton}
                disabled={profissionaisSelecionados.length === 1}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={24}
                  color={profissionaisSelecionados.length === 1 ?
                    customTheme.colors.surfaceDisabled :
                    customTheme.colors.error}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Button
          mode="outlined"
          onPress={adicionarProfissional}
          icon="plus"
          style={styles.addButton}
        >
          Adicionar Profissional
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    color: customTheme.colors.onSurface,
    fontWeight: '600',
    fontSize: 18,
  },
  inputGroup: {
    gap: 10,
  },
  itemRow: {
    marginBottom: 16,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownContainer: {
    flex: 3,
    borderColor: customTheme.colors.outline,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    height: 56,
  },
  dropdown: {
    height: 56,
    borderColor: customTheme.colors.outline,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  quantidadeInput: {
    flex: 1,
    maxWidth: 100,
    backgroundColor: '#FFFFFF',
    height: 56,
  },
  removeButton: {
    padding: 8,
    height: 56,
    justifyContent: 'center',
  },
  addButton: {
    marginTop: 8,
    borderColor: customTheme.colors.primary,
    borderStyle: 'dashed',
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dropdownLabel: {
    flex: 1,
    fontSize: 16,
    color: customTheme.colors.onSurface,
  },
  placeholderStyle: {
    fontSize: 16,
    color: customTheme.colors.onSurfaceVariant,
  },
  selectedTextStyle: {
    fontSize: 16,
    color: customTheme.colors.onSurface,
    fontWeight: '500',
  },
  iconStyle: {
    width: 24,
    height: 24,
  },
});

export default Professionals;