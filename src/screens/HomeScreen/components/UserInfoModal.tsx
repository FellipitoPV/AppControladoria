import React, {useEffect, useState} from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import {Text, Surface} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {customTheme} from '../../../theme/theme';
import {useNavigation} from '@react-navigation/native';
import {User} from '../../Adm/types/admTypes';
import {VersionInfo} from '../../../helpers/AppUpdater';
import {version} from '../../../../package.json';

interface ProfileMenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface UserModalProps {
  visible: boolean;
  onClose: () => void;
  userInfo: User;
  onLogout: () => void;
  // Adicionar estas propriedades:
  updateInfo?: VersionInfo | null; // Tornar opcional com ?
  onUpdate?: () => void; // Tornar opcional com ?
}

const UserProfileModal = ({
  visible,
  onClose,
  userInfo,
  onLogout,
  updateInfo,
  onUpdate,
}: UserModalProps) => {
  const navigation = useNavigation<any>();
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  useEffect(() => {
    // 0.5% de chance (0.005)
    const randomNumber = Math.random();
    const shouldShowEasterEgg = randomNumber < 0.25;
    setShowEasterEgg(shouldShowEasterEgg);
    // console.log("Quantidade recebida do esterEgg:", randomNumber)
  }, []);

  const handleRickRoll = async () => {
    await Linking.openURL('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  };

  const menuItems: ProfileMenuItem[] = [
    ...(updateInfo
      ? [
          {
            icon: updateInfo.obrigatoria ? 'alert-decagram' : 'update',
            label: `Atualizar para v${updateInfo.versao}`,
            onPress: () => {
              onClose();
              onUpdate && onUpdate(); // Use o operador && para verificar se onUpdate existe
            },
            color: updateInfo.obrigatoria
              ? customTheme.colors.error
              : customTheme.colors.primary,
          },
        ]
      : []),
    {
      icon: 'account-edit',
      label: 'Editar Perfil',
      onPress: () => handleNavigate('Profile'),
    },
    {
      icon: 'shield-key',
      label: 'Meus acessos',
      onPress: () => handleNavigate('Acessos'),
    },
  ];

  const handleNavigate = (screen: string) => {
    onClose();
    navigation.navigate(screen);
  };

  const renderMenuItem = ({icon, label, onPress, color}: ProfileMenuItem) => (
    <TouchableOpacity
      key={label}
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.menuItemLeft}>
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={color || customTheme.colors.onSurfaceVariant}
        />
        <Text style={styles.menuItemText}>{label}</Text>

        {/* Adicionar badge para atualizações obrigatórias */}
        {updateInfo &&
          label.includes(`Atualizar para v${updateInfo.versao}`) &&
          updateInfo.obrigatoria && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Obrigatória</Text>
            </View>
          )}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={customTheme.colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalBackground}>
        <Surface style={styles.modalContent}>
          {/* Header com botão voltar */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={customTheme.colors.onSurface}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Meu Perfil</Text>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Seção do perfil */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {userInfo.photoURL ? (
                  <Image
                    source={{uri: userInfo.photoURL}}
                    style={styles.avatar}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="account"
                    size={40}
                    color={customTheme.colors.onPrimary}
                  />
                )}
              </View>
              <Text style={styles.userName}>{userInfo.user}</Text>
              <Text style={styles.userCargo}>{userInfo.cargo}</Text>
            </View>

            {/* Lista de menus */}
            <View style={styles.menuSection}>
              {menuItems.map(item => renderMenuItem(item))}
            </View>

            {/* Botão de Logout */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onLogout}
              activeOpacity={0.7}>
              <MaterialCommunityIcons
                name="logout"
                size={24}
                color={customTheme.colors.error}
              />
              <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>

            {showEasterEgg && (
              <TouchableOpacity
                style={styles.easterEgg}
                onPress={handleRickRoll}>
                <MaterialCommunityIcons
                  name="music-note"
                  size={24}
                  color={customTheme.colors.onPrimary}
                />
              </TouchableOpacity>
            )}

            {/* Versão do App */}
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Versão {version}</Text>
            </View>
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    color: customTheme.colors.onSurfaceVariant,
    opacity: 0.7,
  },
  requiredBadge: {
    backgroundColor: customTheme.colors.error,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  requiredText: {
    color: customTheme.colors.onError,
    fontSize: 10,
    fontWeight: 'bold',
  },
  easterEgg: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: customTheme.colors.primary,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: customTheme.colors.surface,
    marginTop: 40, // Deixa um espaço no topo
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.surfaceVariant,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
  },
  scrollContent: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: customTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
    marginBottom: 4,
  },
  userCargo: {
    fontSize: 16,
    color: customTheme.colors.onSurfaceVariant,
  },
  menuSection: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.surfaceVariant,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 16,
    fontSize: 16,
    color: customTheme.colors.onSurface,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  logoutText: {
    marginLeft: 16,
    fontSize: 16,
    color: customTheme.colors.error,
    fontWeight: '500',
  },
});

export default UserProfileModal;
