import { DemoProvider } from "../src/demo";
import { Stack } from "expo-router";
import { RecordsProvider } from "../src/records";
import { screens, screenRoutes } from "../src/screens";
import theme from "../src/theme.json";
export default function Layout() {
  return (
    <DemoProvider>
      <RecordsProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            contentStyle: { backgroundColor: theme.background },
          }}
        >
          {screens
            .filter((s) => s.enabled)
            .map((s) => (
              <Stack.Screen
                key={s.id}
                name={screenRoutes[s.id]}
                options={{ title: s.name }}
              />
            ))}
        </Stack>
      </RecordsProvider>
    </DemoProvider>
  );
}
