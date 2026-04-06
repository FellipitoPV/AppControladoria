/**
 * ============================================================
 * ECOLOGIKA MOBILE — GUIA DE IDENTIDADE VISUAL (DevGuide)
 * ============================================================
 * Documenta os padrões visuais e de componentes do app mobile.
 * Rota: registrar em App.tsx como "DevGuide" (visível só para Admins).
 *
 * REGRAS GERAIS — SEMPRE SEGUIR:
 *
 * 1.  NUNCA hardcode cores — usar sempre `customTheme.colors.*`
 * 2.  Cards: elevation={2} + borderColor: customTheme.colors.surfaceVariant
 * 3.  border-radius padrão: 8 (= customTheme.roundness) em inputs/botões
 *     border-radius de cards: 12 (padrão) ou 16 (cards de destaque)
 * 4.  GRADIENTES: PROIBIDO em todo o projeto (cards, headers, modais, backgrounds)
 * 5.  Faixa de destaque (topo de modal/card): backgroundColor sólido, nunca gradiente
 * 6.  Textos primários: customTheme.colors.onSurface (#191C1B)
 * 7.  Textos secundários: customTheme.colors.onSurfaceVariant (#424242)
 * 8.  Ações destrutivas: customTheme.colors.error (#BA1A1A)
 * 9.  Fundo de tela: customTheme.colors.background (#F5F5F5)
 * 10. Superfície de card/modal: customTheme.colors.surface (#FFFFFF)
 * 11. Ícones: MaterialCommunityIcons (pacote react-native-vector-icons)
 * 12. Toasts: showGlobalToast — NUNCA Alert.alert para feedback de operação
 * 13. Header de tela: sempre <ModernHeader> como primeiro elemento
 * 14. Botão de ação principal: sempre <SaveButton>
 *
 * PADRÃO DE CARD:
 *   backgroundColor: customTheme.colors.surface
 *   borderRadius: 12
 *   elevation: 2
 *   borderWidth: 1, borderColor: customTheme.colors.surfaceVariant
 *
 * PADRÃO DE MODAL:
 *   Faixa no topo: height 4, backgroundColor: customTheme.colors.primary (sólido)
 *   Cabeçalho: ícone em box com primaryContainer + título/subtítulo ao lado
 *   Botão cancelar: TouchableOpacity com texto onSurfaceVariant
 *   Botão confirmar: SaveButton ou botão primary
 *   Modal de exclusão: faixa + ícone na cor error
 *
 * PADRÃO DE CHIP/BADGE:
 *   borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3
 *   backgroundColor: `${COR}20` (hex com alpha 12%)
 *   color: COR
 *   fontWeight: '600', fontSize: 11
 * ============================================================
 */

import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Card, Surface, Text } from 'react-native-paper';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ModernHeader from '../../assets/components/ModernHeader';
import SaveButton from '../../assets/components/SaveButton';
import { customTheme } from '../../theme/theme';
import { showGlobalToast } from '../../helpers/GlobalApi';

// ─── Helpers de cor ───────────────────────────────────────────────────────────
/** Adiciona opacidade a uma cor hex. alpha: 0–1 */
const withAlpha = (hex: string, alpha: number): string => {
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
};

// ─── Componente: Seção ────────────────────────────────────────────────────────
const Section = ({
    title,
    iconName,
    note,
    children,
}: {
    title: string;
    iconName: string;
    note?: string;
    children: React.ReactNode;
}) => (
    <View style={s.section}>
        {/* Título da seção */}
        <View style={s.sectionHeader}>
            <View style={s.sectionIconBox}>
                <Icon name={iconName} size={18} color={customTheme.colors.primary} />
            </View>
            <Text style={s.sectionTitle}>{title}</Text>
        </View>

        {/* Caixa de nota técnica */}
        {note && (
            <View style={s.noteBox}>
                <Text style={s.noteText}>{note}</Text>
            </View>
        )}

        {children}
    </View>
);

// ─── Componente: Swatch de cor ────────────────────────────────────────────────
const ColorSwatch = ({
    color,
    label,
    token,
}: {
    color: string;
    label: string;
    token: string;
}) => (
    <View style={s.swatchContainer}>
        <View style={[s.swatchBlock, { backgroundColor: color }]} />
        <Text style={s.swatchLabel}>{label}</Text>
        <Text style={s.swatchToken}>{token}</Text>
    </View>
);

// ─── Componente: Chip de exemplo ──────────────────────────────────────────────
const StatusChip = ({
    label,
    color,
}: {
    label: string;
    color: string;
}) => (
    <View style={[s.chip, { backgroundColor: withAlpha(color, 0.12) }]}>
        <Text style={[s.chipText, { color }]}>{label}</Text>
    </View>
);

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function DevGuideScreen({ navigation }: any) {
    const [modalVisible, setModalVisible] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);

    return (
        <Surface style={s.container}>
            <ModernHeader
                title="Guia de Identidade Visual"
                iconName="palette"
                onBackPress={() => navigation.goBack()}
            />

            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                {/* ── CORES ─────────────────────────────────────────────── */}
                <Section
                    title="Paleta de Cores"
                    iconName="palette-outline"
                    note={
                        'REGRA: Nunca hardcode cores — sempre customTheme.colors.*\n' +
                        'primary         → ações principais, botões, destaques (#006A4E)\n' +
                        'secondary       → variações, destaques secundários (#4B635A)\n' +
                        'error           → ações destrutivas, alertas (#BA1A1A)\n' +
                        'warning         → avisos, atenção (#FF9800)\n' +
                        'tertiary        → informações, estados neutros (#3F6374)\n' +
                        'onSurface       → texto principal\n' +
                        'onSurfaceVariant→ texto secundário'
                    }
                >
                    <View style={s.swatchGrid}>
                        <ColorSwatch color={customTheme.colors.primary} label="Primary" token="colors.primary" />
                        <ColorSwatch color={customTheme.colors.secondary} label="Secondary" token="colors.secondary" />
                        <ColorSwatch color={customTheme.colors.error} label="Error" token="colors.error" />
                        <ColorSwatch color={customTheme.colors.warning} label="Warning" token="colors.warning" />
                        <ColorSwatch color={customTheme.colors.tertiary} label="Tertiary" token="colors.tertiary" />
                        <ColorSwatch color={customTheme.colors.background} label="Background" token="colors.background" />
                        <ColorSwatch color={customTheme.colors.surface} label="Surface" token="colors.surface" />
                        <ColorSwatch color={customTheme.colors.surfaceVariant} label="SurfaceVar." token="colors.surfaceVariant" />
                        <ColorSwatch color={customTheme.colors.onSurface} label="Text Primary" token="colors.onSurface" />
                        <ColorSwatch color={customTheme.colors.onSurfaceVariant} label="Text Second." token="colors.onSurfaceVariant" />
                        <ColorSwatch color={customTheme.colors.primaryContainer} label="PrimaryContainer" token="colors.primaryContainer" />
                    </View>
                </Section>

                <View style={s.divider} />

                {/* ── TIPOGRAFIA ────────────────────────────────────────── */}
                <Section
                    title="Tipografia"
                    iconName="format-text"
                    note={
                        'Componente: <Text variant="..."> do react-native-paper\n' +
                        'titleLarge    → títulos de tela (22px, weight 500)\n' +
                        'titleMedium   → subtítulos, cabeçalhos de card (16px, weight 500)\n' +
                        'titleSmall    → labels de campo (14px, weight 500)\n' +
                        'bodyLarge     → texto principal (16px, weight 400)\n' +
                        'bodyMedium    → texto de suporte (14px, weight 400)\n' +
                        'bodySmall     → metadados, notas (12px, weight 400)\n' +
                        'labelSmall    → chips, badges (11px, weight 500)'
                    }
                >
                    <View style={s.typoList}>
                        <Text variant="titleLarge" style={{ color: customTheme.colors.onSurface }}>titleLarge — Título de Tela</Text>
                        <Text variant="titleMedium" style={{ color: customTheme.colors.onSurface }}>titleMedium — Cabeçalho de Card</Text>
                        <Text variant="titleSmall" style={{ color: customTheme.colors.onSurface }}>titleSmall — Label de Campo</Text>
                        <Text variant="bodyLarge" style={{ color: customTheme.colors.onSurface }}>bodyLarge — Texto principal do conteúdo</Text>
                        <Text variant="bodyMedium" style={{ color: customTheme.colors.onSurfaceVariant }}>bodyMedium — Texto de suporte e descrições</Text>
                        <Text variant="bodySmall" style={{ color: customTheme.colors.onSurfaceVariant }}>bodySmall — Metadados, notas, datas</Text>
                        <Text variant="labelSmall" style={{ color: customTheme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 }}>
                            labelSmall — CATEGORIA (uppercase)
                        </Text>
                    </View>
                </Section>

                <View style={s.divider} />

                {/* ── HEADER ────────────────────────────────────────────── */}
                <Section
                    title="Header (ModernHeader)"
                    iconName="page-layout-header"
                    note={
                        'Sempre o primeiro elemento de qualquer tela.\n' +
                        '<ModernHeader\n' +
                        '  title="Nome da Tela"\n' +
                        '  iconName="nome-do-icone"      ← MaterialCommunityIcons\n' +
                        '  onBackPress={() => navigation.goBack()}\n' +
                        '  rightButton={{ icon: "pencil", onPress: () => {} }}  ← opcional\n' +
                        '/>'
                    }
                >
                    <View style={s.headerPreview}>
                        <ModernHeader
                            title="Exemplo de Tela"
                            iconName="file-document"
                            showBackButton={false}
                            rightButton={{ icon: 'pencil-outline', onPress: () => {} }}
                        />
                    </View>
                </Section>

                <View style={s.divider} />

                {/* ── BOTÕES ────────────────────────────────────────────── */}
                <Section
                    title="Botões"
                    iconName="gesture-tap-button"
                    note={
                        'SaveButton  → ação principal da tela (salvar, confirmar, avançar)\n' +
                        'TouchableOpacity outlined → ação secundária (cancelar, exportar)\n' +
                        'TouchableOpacity text     → ação terciária (ver mais, detalhes)\n' +
                        'error (vermelho)          → apenas em ações destrutivas (excluir)\n\n' +
                        '<SaveButton\n' +
                        '  onPress={handleSave}\n' +
                        '  text="Salvar"\n' +
                        '  iconName="content-save"\n' +
                        '  loading={isSaving}\n' +
                        '  disabled={!isValid}\n' +
                        '/>'
                    }
                >
                    <View style={s.buttonGroup}>
                        <Text style={s.groupLabel}>Principal</Text>
                        <SaveButton onPress={() => {}} text="Salvar" iconName="content-save" />
                        <SaveButton onPress={() => {}} text="Carregando..." iconName="content-save" loading />
                        <SaveButton onPress={() => {}} text="Desabilitado" iconName="content-save" disabled />
                    </View>

                    <View style={s.buttonGroup}>
                        <Text style={s.groupLabel}>Outlined (secundário)</Text>
                        <TouchableOpacity style={s.btnOutlined}>
                            <Icon name="close" size={18} color={customTheme.colors.primary} />
                            <Text style={s.btnOutlinedText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.btnOutlinedExport}>
                            <Icon name="file-export-outline" size={18} color={customTheme.colors.tertiary} />
                            <Text style={[s.btnOutlinedText, { color: customTheme.colors.tertiary }]}>Exportar</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={s.buttonGroup}>
                        <Text style={s.groupLabel}>Destrutivo</Text>
                        <TouchableOpacity style={s.btnDestructive}>
                            <Icon name="trash-can-outline" size={18} color={customTheme.colors.error} />
                            <Text style={[s.btnOutlinedText, { color: customTheme.colors.error }]}>Excluir</Text>
                        </TouchableOpacity>
                    </View>
                </Section>

                <View style={s.divider} />

                {/* ── CHIPS / BADGES ────────────────────────────────────── */}
                <Section
                    title="Chips / Status Badges"
                    iconName="tag-outline"
                    note={
                        'Padrão: borderRadius 6, sem elevation\n' +
                        'backgroundColor: withAlpha(COR, 0.12)  ← helper local\n' +
                        'color: COR (a mesma da bgcolor)\n' +
                        'fontWeight: "600", fontSize: 11\n' +
                        'Usar para: status, cargo, categoria, tipo'
                    }
                >
                    <View style={s.chipRow}>
                        <StatusChip label="Ativo" color={customTheme.colors.primary} />
                        <StatusChip label="Concluído" color="#2E7D32" />
                        <StatusChip label="Pendente" color={customTheme.colors.warning} />
                        <StatusChip label="Erro" color={customTheme.colors.error} />
                        <StatusChip label="Informação" color={customTheme.colors.tertiary} />
                        <StatusChip label="Administrativo" color={customTheme.colors.secondary} />
                    </View>
                </Section>

                <View style={s.divider} />

                {/* ── CARDS ─────────────────────────────────────────────── */}
                <Section
                    title="Cards"
                    iconName="card-outline"
                    note={
                        'SEMPRE: elevation={2} + borderColor: colors.surfaceVariant\n' +
                        'borderRadius: 12 (padrão) ou 16 (cards de destaque)\n' +
                        'backgroundColor: colors.surface\n' +
                        'Faixa superior (opcional): height 4, cor SÓLIDA — NUNCA gradiente\n' +
                        'PROIBIDO em cards: gradiente, blur/backdropFilter'
                    }
                >
                    {/* Card padrão */}
                    <Card style={s.cardExample}>
                        <Card.Content style={{ gap: 4 }}>
                            <Text variant="titleMedium" style={{ color: customTheme.colors.onSurface }}>Card Padrão</Text>
                            <Text variant="bodyMedium" style={{ color: customTheme.colors.onSurfaceVariant }}>
                                elevation=2, borda surfaceVariant, borderRadius 12.
                            </Text>
                        </Card.Content>
                    </Card>

                    {/* Card com faixa de cor */}
                    <View style={[s.cardExample, { overflow: 'hidden', padding: 0 }]}>
                        <View style={s.cardAccentBar} />
                        <View style={{ padding: 16, gap: 4 }}>
                            <Text variant="titleMedium" style={{ color: customTheme.colors.onSurface }}>Card com Faixa</Text>
                            <Text variant="bodyMedium" style={{ color: customTheme.colors.onSurfaceVariant }}>
                                Faixa height=4, cor sólida primary. Sem gradiente.
                            </Text>
                        </View>
                    </View>

                    {/* Card com ícone + badge */}
                    <View style={s.cardExample}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <View style={s.cardIconBox}>
                                <Icon name="car-wash" size={20} color={customTheme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text variant="titleSmall" style={{ color: customTheme.colors.onSurface }}>Card com Ícone</Text>
                                <Text variant="bodySmall" style={{ color: customTheme.colors.onSurfaceVariant }}>Subtítulo ou metadado</Text>
                            </View>
                            <StatusChip label="Concluído" color="#2E7D32" />
                        </View>
                        <Text variant="bodyMedium" style={{ color: customTheme.colors.onSurfaceVariant }}>
                            Conteúdo do card com ícone, título, subtítulo e badge.
                        </Text>
                    </View>
                </Section>

                <View style={s.divider} />

                {/* ── TOASTS ────────────────────────────────────────────── */}
                <Section
                    title="Toasts (showGlobalToast)"
                    iconName="bell-outline"
                    note={
                        'SEMPRE usar showGlobalToast — NUNCA Alert.alert para feedback de operação\n\n' +
                        "showGlobalToast('success', 'Título', 'Mensagem', 3000)\n" +
                        "showGlobalToast('error',   'Título', 'Mensagem', 4000)\n" +
                        "showGlobalToast('info',    'Título', 'Mensagem', 3000)\n\n" +
                        'success → operação concluída com êxito\n' +
                        'error   → falha de operação ou validação crítica\n' +
                        'info    → informação neutra, status'
                    }
                >
                    <View style={s.toastButtonRow}>
                        <TouchableOpacity
                            style={[s.toastBtn, { backgroundColor: withAlpha('#2E7D32', 0.12) }]}
                            onPress={() => showGlobalToast('success', 'Sucesso', 'Operação realizada!', 3000)}
                        >
                            <Icon name="check-circle-outline" size={16} color="#2E7D32" />
                            <Text style={[s.toastBtnText, { color: '#2E7D32' }]}>success</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.toastBtn, { backgroundColor: withAlpha(customTheme.colors.error, 0.12) }]}
                            onPress={() => showGlobalToast('error', 'Erro', 'Não foi possível concluir.', 4000)}
                        >
                            <Icon name="alert-circle-outline" size={16} color={customTheme.colors.error} />
                            <Text style={[s.toastBtnText, { color: customTheme.colors.error }]}>error</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.toastBtn, { backgroundColor: withAlpha(customTheme.colors.tertiary, 0.12) }]}
                            onPress={() => showGlobalToast('info', 'Info', 'Sincronizando dados...', 3000)}
                        >
                            <Icon name="information-outline" size={16} color={customTheme.colors.tertiary} />
                            <Text style={[s.toastBtnText, { color: customTheme.colors.tertiary }]}>info</Text>
                        </TouchableOpacity>
                    </View>
                </Section>

                <View style={s.divider} />

                {/* ── MODAIS ────────────────────────────────────────────── */}
                <Section
                    title="Modais"
                    iconName="dock-window"
                    note={
                        'Estrutura obrigatória:\n' +
                        '  1. Faixa de cor no topo: height 4, cor sólida (primary ou error)\n' +
                        '  2. Cabeçalho: ícone em box primaryContainer + título/subtítulo\n' +
                        '  3. Conteúdo com padding 20\n' +
                        '  4. Rodapé: botão cancelar (text) + botão confirmar (SaveButton)\n\n' +
                        'Modal de exclusão: mesma estrutura, faixa e ícone na cor error.\n' +
                        'NUNCA usar Alert.alert como substituto de modal de confirmação.'
                    }
                >
                    <View style={s.modalBtnRow}>
                        <TouchableOpacity
                            style={s.btnOutlined}
                            onPress={() => setModalVisible(true)}
                        >
                            <Icon name="dock-window" size={18} color={customTheme.colors.primary} />
                            <Text style={s.btnOutlinedText}>Modal padrão</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={s.btnDestructive}
                            onPress={() => setDeleteModalVisible(true)}
                        >
                            <Icon name="trash-can-outline" size={18} color={customTheme.colors.error} />
                            <Text style={[s.btnOutlinedText, { color: customTheme.colors.error }]}>Modal de exclusão</Text>
                        </TouchableOpacity>
                    </View>
                </Section>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Modal padrão ──────────────────────────────────────────── */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={s.modalBackdrop}>
                    <View style={s.modalContainer}>
                        {/* Faixa de cor */}
                        <View style={[s.modalAccentBar, { backgroundColor: customTheme.colors.primary }]} />

                        {/* Cabeçalho */}
                        <View style={s.modalHeader}>
                            <View style={s.modalIconBox}>
                                <Icon name="information-outline" size={20} color={customTheme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text variant="titleMedium" style={{ color: customTheme.colors.onSurface }}>Título do Modal</Text>
                                <Text variant="bodySmall" style={{ color: customTheme.colors.onSurfaceVariant }}>Subtítulo ou contexto da ação</Text>
                            </View>
                        </View>

                        {/* Conteúdo */}
                        <View style={s.modalBody}>
                            <Text variant="bodyMedium" style={{ color: customTheme.colors.onSurfaceVariant }}>
                                Conteúdo do modal. Pode ser um formulário, uma mensagem de confirmação ou qualquer informação relevante.
                            </Text>
                        </View>

                        {/* Rodapé */}
                        <View style={s.modalFooter}>
                            <TouchableOpacity
                                style={s.modalCancelBtn}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={{ color: customTheme.colors.onSurfaceVariant, fontWeight: '500' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <SaveButton
                                    onPress={() => setModalVisible(false)}
                                    text="Confirmar"
                                    iconName="check"
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Modal de exclusão ─────────────────────────────────────── */}
            <Modal
                visible={deleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <View style={s.modalBackdrop}>
                    <View style={s.modalContainer}>
                        {/* Faixa de cor — error */}
                        <View style={[s.modalAccentBar, { backgroundColor: customTheme.colors.error }]} />

                        {/* Cabeçalho */}
                        <View style={s.modalHeader}>
                            <View style={[s.modalIconBox, { backgroundColor: withAlpha(customTheme.colors.error, 0.1) }]}>
                                <Icon name="alert-outline" size={20} color={customTheme.colors.error} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text variant="titleMedium" style={{ color: customTheme.colors.onSurface }}>Confirmar Exclusão</Text>
                                <Text variant="bodySmall" style={{ color: customTheme.colors.onSurfaceVariant }}>Esta ação não pode ser desfeita</Text>
                            </View>
                        </View>

                        {/* Conteúdo */}
                        <View style={s.modalBody}>
                            <Text variant="bodyMedium" style={{ color: customTheme.colors.onSurfaceVariant }}>
                                Tem certeza que deseja excluir este registro? Todos os dados associados serão removidos permanentemente.
                            </Text>
                        </View>

                        {/* Rodapé */}
                        <View style={s.modalFooter}>
                            <TouchableOpacity
                                style={s.modalCancelBtn}
                                onPress={() => setDeleteModalVisible(false)}
                            >
                                <Text style={{ color: customTheme.colors.onSurfaceVariant, fontWeight: '500' }}>Cancelar</Text>
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <SaveButton
                                    onPress={() => setDeleteModalVisible(false)}
                                    text="Excluir"
                                    iconName="trash-can-outline"
                                    style={{ backgroundColor: customTheme.colors.error }}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

        </Surface>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customTheme.colors.background,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },

    // ── Seção ────────────────────────────────────────────────────────────────
    section: {
        marginBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    sectionIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: customTheme.colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: customTheme.colors.onSurface,
    },
    noteBox: {
        borderLeftWidth: 3,
        borderLeftColor: customTheme.colors.tertiary,
        backgroundColor: customTheme.colors.surfaceVariant,
        borderRadius: 6,
        padding: 12,
        marginBottom: 16,
    },
    noteText: {
        fontSize: 11,
        fontFamily: 'monospace',
        color: customTheme.colors.onSurfaceVariant,
        lineHeight: 18,
    },
    divider: {
        height: 1,
        backgroundColor: customTheme.colors.surfaceVariant,
        marginVertical: 24,
    },

    // ── Swatches ─────────────────────────────────────────────────────────────
    swatchGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    swatchContainer: {
        width: 80,
        alignItems: 'center',
    },
    swatchBlock: {
        width: 64,
        height: 40,
        borderRadius: 8,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    swatchLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: customTheme.colors.onSurface,
        textAlign: 'center',
    },
    swatchToken: {
        fontSize: 9,
        color: customTheme.colors.onSurfaceVariant,
        fontFamily: 'monospace',
        textAlign: 'center',
    },

    // ── Tipografia ────────────────────────────────────────────────────────────
    typoList: {
        gap: 12,
    },

    // ── Header preview ────────────────────────────────────────────────────────
    headerPreview: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
    },

    // ── Botões ────────────────────────────────────────────────────────────────
    buttonGroup: {
        gap: 10,
        marginBottom: 16,
    },
    groupLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: customTheme.colors.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 2,
    },
    btnOutlined: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: customTheme.colors.primary,
    },
    btnOutlinedExport: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: customTheme.colors.tertiary,
    },
    btnOutlinedText: {
        fontSize: 15,
        fontWeight: '600',
        color: customTheme.colors.primary,
    },
    btnDestructive: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: customTheme.colors.error,
    },

    // ── Chips ─────────────────────────────────────────────────────────────────
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // ── Cards ─────────────────────────────────────────────────────────────────
    cardExample: {
        backgroundColor: customTheme.colors.surface,
        borderRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: customTheme.colors.surfaceVariant,
        marginBottom: 12,
    },
    cardAccentBar: {
        height: 4,
        backgroundColor: customTheme.colors.primary,
    },
    cardIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: customTheme.colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Toasts ────────────────────────────────────────────────────────────────
    toastButtonRow: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    toastBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    toastBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // ── Modais ────────────────────────────────────────────────────────────────
    modalBtnRow: {
        gap: 10,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: customTheme.colors.surface,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 8,
    },
    modalAccentBar: {
        height: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        paddingBottom: 12,
    },
    modalIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: customTheme.colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    modalFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 20,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: customTheme.colors.surfaceVariant,
    },
    modalCancelBtn: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
});
