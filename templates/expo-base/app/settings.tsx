import { screen } from "../src/screens";
import { Text } from "react-native";
import project from "../src/project.json";
import { useRecords } from "../src/records";
import { Page, styles } from "../src/ui";
export default function Settings() {
  const { records } = useRecords();
  return (
    <Page>
      <Text style={styles.text}>{screen("settings").description}</Text>
      <Text style={styles.title}>Uygulama bilgileri</Text>
      <Text style={styles.text}>{project.name}</Text>
      <Text style={styles.text}>
        {records.length} kayıt bu cihazda saklanıyor.
      </Text>
      <Text style={styles.text}>
        Veriler sunucuya gönderilmez. Uygulamayı kaldırmak yerel verileri
        silebilir.
      </Text>
      <Text style={styles.text}>
        App Factory başlangıç şablonu · Sürüm 1.0.0
      </Text>
    </Page>
  );
}
