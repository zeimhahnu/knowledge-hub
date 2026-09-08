export function shouldSuppressSearch(value: string, lastSelectedSymbol: string | null): boolean {
  return lastSelectedSymbol !== null && value.trim().toUpperCase() === lastSelectedSymbol.toUpperCase();
}
