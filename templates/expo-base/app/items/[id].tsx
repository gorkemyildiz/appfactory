import { screen } from "../../src/screens";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useRecords } from "../../src/records";
import { RecordForm } from "../../src/record-form";
import { Page, styles } from "../../src/ui";
export default function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { records, ready, error, update } = useRecords();
  const item = records.find((record) => record.id === id);
  if (!ready || !item)
    return (
      <Page>
        <Text style={styles.text}>
          {error ?? (!ready ? "Yükleniyor…" : "Kayıt bulunamadı.")}
        </Text>
      </Page>
    );
  return (
    <RecordForm
      description={screen("details").description}
      key={item.id}
      initialTitle={item.title}
      initialNotes={item.notes}
      onSave={async (title, notes) => {
        await update(item.id, title, notes);
        router.replace("/");
      }}
    />
  );
}
