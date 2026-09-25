import { screen } from "../src/screens";
import { router } from "expo-router";
import { Text } from "react-native";
import { useRecords } from "../src/records";
import { RecordForm } from "../src/record-form";
import { Page, styles } from "../src/ui";
export default function Create() {
  const { add, ready, error } = useRecords();
  if (!ready)
    return (
      <Page>
        <Text style={styles.text}>{error ?? "Yükleniyor…"}</Text>
      </Page>
    );
  return (
    <RecordForm
      description={screen("create").description}
      onSave={async (title, notes) => {
        await add(title, notes);
        router.replace("/");
      }}
    />
  );
}
