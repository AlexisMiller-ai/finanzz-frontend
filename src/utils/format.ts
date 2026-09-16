export function budgetTone(percent: number): "good" | "warning" | "bad" {
  if (percent > 100) return "bad";
  if (percent >= 80) return "warning";
  return "good";
}

export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}
