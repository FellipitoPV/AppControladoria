import React, {useRef} from 'react';
import {View, StyleSheet, Modal} from 'react-native';
import {Text, Button, IconButton} from 'react-native-paper';
import SignatureCanvas from 'react-native-signature-canvas';
import {customTheme} from '../theme/theme';

interface SignatureCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
  title?: string;
}

export default function SignatureCaptureModal({
  visible,
  onClose,
  onSave,
  title = 'Assinatura',
}: SignatureCaptureModalProps) {
  const signatureRef = useRef<any>(null);

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const handleOK = (signature: string) => {
    onSave(signature); // Já vem em base64
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <IconButton icon="close" size={24} onPress={onClose} />
          </View>

          <Text style={styles.instructions}>
            Desenhe sua assinatura na área abaixo
          </Text>

          <View style={styles.signatureContainer}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleOK}
              descriptionText=""
              clearText="Limpar"
              confirmText="Confirmar"
              webStyle={`
                .m-signature-pad {
                  box-shadow: none;
                  border: none;
                  margin: 0;
                }
                .m-signature-pad--body {
                  border: none;
                }
                .m-signature-pad--footer {
                  display: none;
                }
                body, html {
                  margin: 0;
                  padding: 0;
                }
              `}
            />
          </View>

          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleClear}
              icon="eraser"
              style={styles.clearButton}>
              Limpar
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              icon="check"
              style={styles.saveButton}>
              Confirmar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: customTheme.colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: customTheme.colors.outline,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: customTheme.colors.onSurface,
  },
  instructions: {
    fontSize: 13,
    color: customTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 8,
  },
  signatureContainer: {
    height: 200,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: customTheme.colors.outline,
    borderRadius: 8,
    overflow: 'hidden',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: customTheme.colors.outline,
  },
  clearButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});