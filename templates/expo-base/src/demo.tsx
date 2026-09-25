import { createContext, useContext, useState, type ReactNode } from "react";
import { View, Text, Button } from "react-native";
import { setDemoMode } from "./demo-state";
const Context = createContext({ enabled: false, seed: false });
export const useDemo = () => useContext(Context);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(__DEV__);
  const [seed, setSeed] = useState(true);
  const [version, setVersion] = useState(0);
  function change(next: boolean, examples: boolean) {
    setDemoMode(next);
    setEnabled(next);
    setSeed(examples);
    setVersion((v) => v + 1);
  }
  return (
    <Context.Provider value={{ enabled, seed }}>
      <View style={{ flex: 1 }}>
        {__DEV__ && (
          <View
            style={{ padding: 12, paddingTop: 48, backgroundColor: "#e0f2fe" }}
          >
            <Text>
              {enabled
                ? "Demo veri · gerçek kayıt veya bağlantı değildir"
                : "Gerçek mod · bağlantıları ayrıca doğrulayın"}
            </Text>
            <Button
              title={enabled ? "Gerçek moda geç" : "Demo verileri yükle"}
              onPress={() => change(!enabled, true)}
            />
            {enabled && (
              <Button
                title="Demo verileri temizle"
                onPress={() => change(true, false)}
              />
            )}
          </View>
        )}
        <View key={version} style={{ flex: 1 }}>
          {children}
        </View>
      </View>
    </Context.Provider>
  );
}
