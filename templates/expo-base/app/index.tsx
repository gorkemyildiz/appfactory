import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { screen } from "../src/screens";
import project from "../src/project.json";
import { useRecords } from "../src/records";
import { Action, Page, styles } from "../src/ui";
export default function Home() {
  const { records, ready, error } = useRecords();
  return (
    <Page>
      <Text style={styles.text}>{screen("home").description}</Text>
      <Text style={styles.title}>{project.name}</Text>
      <Text style={styles.text}>{project.idea}</Text>
      <Text style={styles.text}>
        Başlangıç şablonu · Fikre özel özellikler henüz üretilmedi.
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {screen("create").enabled && (
        <Action
          title={screen("create").name}
          disabled={!ready}
          onPress={() => router.push("/create")}
        />
      )}
      {!ready && !error && <Text style={styles.text}>Yükleniyor…</Text>}
      {ready && records.length === 0 && (
        <Text style={styles.text}>
          Henüz kayıt yok.
          {screen("create").enabled ? " İlk kaydınızı ekleyin." : ""}
        </Text>
      )}
      {records.map((item) => (
        <Pressable
          disabled={!screen("details").enabled}
          accessibilityRole={screen("details").enabled ? "button" : undefined}
          accessibilityLabel={item.title}
          key={item.id}
          onPress={() =>
            router.push({ pathname: "/items/[id]", params: { id: item.id } })
          }
        >
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.text} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        </Pressable>
      ))}
      {screen("settings").enabled && (
        <Action
          title={screen("settings").name}
          onPress={() => router.push("/settings")}
        />
      )}
      {screen("register").enabled && (
        <Action
          title={screen("register").name}
          onPress={() => router.push("/register")}
        />
      )}
    </Page>
  );
}
