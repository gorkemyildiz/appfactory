import { useDemo } from "./demo";
import project from "./project.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
export type RecordItem = {
  id: string;
  title: string;
  notes: string;
  createdAt: string;
};
const key = "app-factory.records.v1";
type Store = {
  records: RecordItem[];
  ready: boolean;
  error: string | null;
  add: (title: string, notes: string) => Promise<void>;
  update: (id: string, title: string, notes: string) => Promise<void>;
};
const Context = createContext<Store | null>(null);
function isRecords(value: unknown): value is RecordItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.notes === "string" &&
        typeof item.createdAt === "string",
    )
  );
}
export function RecordsProvider({ children }: { children: ReactNode }) {
  const demo = useDemo();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<RecordItem[]>([]);
  useEffect(() => {
    let active = true;
    const initial = demo.seed
      ? [
          {
            id: "demo-1",
            title: `${project.name} · Demo kayıt`,
            notes: project.idea,
            createdAt: "2026-01-01T12:00:00.000Z",
          },
        ]
      : [];
    void (
      demo.enabled
        ? Promise.resolve(JSON.stringify(initial))
        : AsyncStorage.getItem(key)
    )
      .then((raw) => {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (!isRecords(parsed)) throw new Error("Veri biçimi geçersiz.");
        if (active) {
          current.current = parsed;
          setRecords(parsed);
          setReady(true);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Kayıtlar yüklenemedi. Verilerinizi korumak için düzenleme kapatıldı.",
          );
      });
    return () => {
      active = false;
    };
  }, [demo.enabled, demo.seed]);
  const persist = async (next: RecordItem[]) => {
    try {
      if (!demo.enabled) await AsyncStorage.setItem(key, JSON.stringify(next));
      current.current = next;
      setRecords(next);
      setError(null);
    } catch {
      setError("Kayıt yapılamadı. Depolama alanını kontrol edin.");
      throw new Error("Kayıt yapılamadı.");
    }
  };
  const validate = (title: string) => {
    if (!ready) throw new Error("Kayıtlar henüz hazır değil.");
    if (!title.trim() || title.trim().length > 120)
      throw new Error("Başlık 1–120 karakter olmalıdır.");
  };
  const add = async (title: string, notes: string) => {
    validate(title);
    await persist([
      {
        id:
          Date.now().toString(36) +
          "-" +
          Math.random().toString(36).slice(2, 10),
        title: title.trim(),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      },
      ...current.current,
    ]);
  };
  const update = async (id: string, title: string, notes: string) => {
    validate(title);
    await persist(
      current.current.map((item) =>
        item.id === id
          ? { ...item, title: title.trim(), notes: notes.trim() }
          : item,
      ),
    );
  };
  return (
    <Context.Provider value={{ records, ready, error, add, update }}>
      {children}
    </Context.Provider>
  );
}
export function useRecords() {
  const state = useContext(Context);
  if (!state) throw new Error("RecordsProvider gerekli.");
  return state;
}
