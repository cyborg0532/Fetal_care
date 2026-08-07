import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../constants/theme';

// ── QuestionCard ─────────────────────────────────────────────────────────────
interface QuestionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function QuestionCard({ title, description, children }: QuestionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

// ── ProgressIndicator ────────────────────────────────────────────────────────
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  const percentage = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          Step <Text style={styles.progressHighlight}>{currentStep}</Text> of {totalSteps}
        </Text>
        <Text style={styles.progressPercentage}>{Math.round(percentage)}% Completed</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

// ── YesNoSelector ────────────────────────────────────────────────────────────
interface YesNoSelectorProps {
  value: boolean | null;
  onChange: (val: boolean) => void;
}

export function YesNoSelector({ value, onChange }: YesNoSelectorProps) {
  return (
    <View style={styles.yesNoContainer}>
      <TouchableOpacity
        style={[
          styles.yesNoButton,
          value === true && styles.yesButtonActive,
        ]}
        onPress={() => onChange(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.yesNoText, value === true && styles.textActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.yesNoButton,
          value === false && styles.noButtonActive,
        ]}
        onPress={() => onChange(false)}
        activeOpacity={0.8}
      >
        <Text style={[styles.yesNoText, value === false && styles.textActive]}>No</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── MultiChoiceSelector ──────────────────────────────────────────────────────
interface MultiChoiceSelectorProps {
  options: { label: string; value: string }[];
  selectedValue: string;
  onChange: (val: string) => void;
}

export function MultiChoiceSelector({ options, selectedValue, onChange }: MultiChoiceSelectorProps) {
  return (
    <View style={styles.multiChoiceContainer}>
      {options.map((opt) => {
        const isSelected = opt.value === selectedValue;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.choiceButton,
              isSelected && styles.choiceButtonActive,
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.choiceText, isSelected && styles.choiceTextActive]}>
              {opt.label}
            </Text>
            {isSelected && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── NumericInput ─────────────────────────────────────────────────────────────
interface NumericInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  unit?: string;
  validationError?: string | null;
}

export function NumericInput({
  value,
  onChangeText,
  placeholder,
  unit,
  validationError,
}: NumericInputProps) {
  return (
    <View style={styles.inputContainer}>
      <View style={[styles.inputWrapper, validationError ? styles.inputWrapperError : null]}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
        />
        {unit && <Text style={styles.unitText}>{unit}</Text>}
      </View>
      {validationError && (
        <Text style={styles.errorText}>⚠️ {validationError}</Text>
      )}
    </View>
  );
}

// ── ReviewCard ───────────────────────────────────────────────────────────────
interface ReviewCardProps {
  title: string;
  items: { label: string; value: string | number | boolean | null }[];
  onEditPress: () => void;
}

export function ReviewCard({ title, items, onEditPress }: ReviewCardProps) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewTitle}>{title}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={onEditPress}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.reviewList}>
        {items.map((item, idx) => {
          let displayVal = '—';
          if (item.value === true) displayVal = 'Yes';
          else if (item.value === false) displayVal = 'No';
          else if (item.value !== null && item.value !== undefined && item.value !== '') {
            displayVal = String(item.value);
          }
          return (
            <View key={idx} style={styles.reviewItem}>
              <Text style={styles.reviewItemLabel}>{item.label}</Text>
              <Text style={styles.reviewItemValue}>{displayVal}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  content: {
    marginTop: Spacing.xs,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  progressHighlight: {
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  progressPercentage: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    overflow: 'hidden' as any,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  yesNoContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesButtonActive: {
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary,
  },
  noButtonActive: {
    backgroundColor: Colors.textSecondary + '12',
    borderColor: Colors.textSecondary,
  },
  yesNoText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  textActive: {
    color: Colors.textPrimary,
  },
  multiChoiceContainer: {
    gap: Spacing.sm,
  },
  choiceButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  choiceButtonActive: {
    backgroundColor: Colors.lavenderBg,
    borderColor: Colors.lavender,
  },
  choiceText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  choiceTextActive: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  checkmark: {
    color: Colors.lavender,
    fontWeight: '700',
    fontSize: 16,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  inputWrapperError: {
    borderColor: Colors.danger,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  unitText: {
    ...Typography.bodyBold,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.danger,
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  reviewTitle: {
    ...Typography.h4,
    color: Colors.primary,
  },
  editBtn: {
    backgroundColor: Colors.lavenderBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.lavenderLight,
  },
  editBtnText: {
    ...Typography.captionBold,
    color: Colors.lavender,
  },
  reviewList: {
    gap: Spacing.xs,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  reviewItemLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  reviewItemValue: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
});
