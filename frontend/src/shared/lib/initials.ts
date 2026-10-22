// Split by visible character, so "Ó" typed with a combining accent or a CJK name never turns into "�".
const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

function firstGraphemes(word: string, count: number) {
  return Array.from(graphemes.segment(word), (part) => part.segment).slice(0, count).join("");
}

// "Ana Souza" -> "AS", "Jo" -> "JO", "王秀英" -> "王秀". Only words that start with a letter count,
// so prefixes like "[T82]" and emoji ("🦊 Fox" -> "FO") are skipped.
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter((word) => /^\p{L}/u.test(word));
  if (words.length === 0) return "?";

  const letters =
    words.length > 1 ? firstGraphemes(words[0], 1) + firstGraphemes(words[words.length - 1], 1) : firstGraphemes(words[0], 2);

  return letters.toLocaleUpperCase("pt-BR");
}
