// One dictionary entry: the Spanish and Vietnamese text for an English key.
export interface Entry {
  es: string;
  vi: string;
}
export type Dict = Record<string, Entry>;
