import { useState } from "react";
import { Text } from "react-native";
import { Action, Field, Page, styles } from "./ui";
export function RecordForm({
  description = "",
  initialTitle = "",
  initialNotes = "",
  onSave,
}: {
  description?: string;
  initialTitle?: string;
  initialNotes?: string;
  onSave: (title: string, notes: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (busy) return;
    if (!title.trim()) {
      setError("Başlık girin.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(title, notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kayıt yapılamadı.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <Text style={styles.text}>{description}</Text>
      <Text style={styles.text}>Başlık</Text>
      <Field
        accessibilityLabel="Başlık"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        placeholder="Kayıt başlığı"
      />
      <Text style={styles.text}>Notlar</Text>
      <Field
        accessibilityLabel="Notlar"
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={5000}
        placeholder="Notlarınızı yazın"
        style={{ minHeight: 120, textAlignVertical: "top" }}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Action
        title={busy ? "Kaydediliyor…" : "Kaydet"}
        disabled={busy}
        onPress={() => {
          void save();
        }}
      />
    </Page>
  );
}
