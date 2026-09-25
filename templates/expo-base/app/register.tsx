import { useState } from "react";
import { Text } from "react-native";
import { screen } from "../src/screens";
import { Action, Field, Page, styles } from "../src/ui";
export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <Page>
      <Text style={styles.text}>{screen("register").description}</Text>
      <Text style={styles.text}>Ad</Text>
      <Field
        accessibilityLabel="Ad"
        placeholder="Adınız"
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.text}>E-posta</Text>
      <Field
        accessibilityLabel="E-posta"
        placeholder="E-posta adresiniz"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Action title="Kayıt ol · Yakında" disabled onPress={() => {}} />
      <Text style={styles.text}>
        Arayüz prototipi. Hesap oluşturulmaz ve bilgiler gönderilmez.
      </Text>
    </Page>
  );
}
