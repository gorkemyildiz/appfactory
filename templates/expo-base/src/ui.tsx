import {
  Pressable,
  StyleSheet,
  Text,
  ScrollView,
  TextInput,
  type TextInputProps,
} from "react-native";
import type { ReactNode } from "react";
import theme from "./theme.json";
export const styles = StyleSheet.create({
  page: { padding: theme.spacing, gap: theme.spacing },
  title: { fontSize: 24, fontWeight: "600", color: theme.text },
  text: { fontSize: 16, lineHeight: 24, color: theme.text },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: theme.radius,
    gap: 8,
    backgroundColor: "#fff",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#999",
    borderRadius: theme.radius,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: theme.text,
  },
  error: { color: "#b91c1c", fontSize: 14 },
  button: {
    minHeight: 48,
    backgroundColor: theme.primary,
    borderRadius: theme.radius,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
export function Page({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.page}
    >
      {children}
    </ScrollView>
  );
}
export function Action({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#737373"
      {...props}
      style={[styles.input, props.style]}
    />
  );
}
