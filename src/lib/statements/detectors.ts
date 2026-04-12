const bankMatchers = [
  { bank: "Caixa", patterns: [/caixa econ[oô]mica/i, /\bcaixa\b/i] },
  { bank: "Itaú", patterns: [/\bita[uú]\b/i, /unibanco/i] },
  { bank: "Bradesco", patterns: [/bradesco/i] },
  { bank: "Banco do Brasil", patterns: [/banco do brasil/i, /\bbb\b/i] },
  { bank: "Santander", patterns: [/santander/i] },
  { bank: "Inter", patterns: [/\bbanco inter\b/i, /\binter\b/i] },
  { bank: "Nubank", patterns: [/\bnubank\b/i, /\bnu pagamentos\b/i] },
  { bank: "Sicoob", patterns: [/sicoob/i] },
  { bank: "Sicredi", patterns: [/sicredi/i] },
];

const accountMatchers = [
  /conta[:\s]+([\d.\-xX/]+)/i,
  /ag[êe]ncia[:\s]+([\d.\-xX/]+)/i,
  /cc[:\s]+([\d.\-xX/]+)/i,
];

export function detectBankName(text: string) {
  for (const matcher of bankMatchers) {
    if (matcher.patterns.some((pattern) => pattern.test(text))) {
      return matcher.bank;
    }
  }

  return null;
}

export function detectAccountLabel(text: string) {
  const matches = accountMatchers
    .map((pattern) => text.match(pattern)?.[1]?.trim())
    .filter(Boolean);

  if (matches.length === 0) {
    return null;
  }

  return matches.join(" / ");
}
