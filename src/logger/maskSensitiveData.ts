const MASK = "** sensitive data **";
const MAX_DEPTH = 20;

const SENSITIVE_KEYS = new Set([
  "senha",
  "senha_confirmacao",
  "confirmsenha",
  "password",
  "numerocartao",
  "nomecartao",
  "codigosegurancacartao",
  "mesvalidadecartao",
  "anovalidadecartao",
  "cvv",
  "st_cartao_sac",
  "st_nomecartao_sac",
  "st_segurancacartao_sac",
  "st_mesvalidade_sac",
  "st_anovalidade_sac",
  "authorization",
  "app_token",
  "access_token",
  "accesstoken",
  "x-api-key",
]);

const isSensitiveKey = (key: string) => SENSITIVE_KEYS.has(key.toLowerCase());

const decodeKey = (key: string) => {
  try {
    return decodeURIComponent(key.replace(/\+/g, " "));
  } catch {
    return key;
  }
};

const maskUrlEncoded = (text: string) =>
  text.replace(/(^|[&?])([^=&?]+)=([^&]*)/g, (match, separator, key) =>
    isSensitiveKey(decodeKey(key))
      ? `${separator}${key}=${encodeURIComponent(MASK)}`
      : match
  );

const looksLikeJson = (text: string) =>
  (text.startsWith("{") && text.endsWith("}")) ||
  (text.startsWith("[") && text.endsWith("]"));

const maskValue = (value: unknown, depth: number): unknown => {
  if (depth > MAX_DEPTH || value == null) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (looksLikeJson(trimmed)) {
      try {
        return JSON.stringify(maskValue(JSON.parse(trimmed), depth + 1));
      } catch {
        return maskUrlEncoded(value);
      }
    }

    return value.includes("=") ? maskUrlEncoded(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        isSensitiveKey(key) && child !== "" && child != null
          ? MASK
          : maskValue(child, depth + 1),
      ])
    );
  }

  return value;
};

const maskSensitiveData = <T>(value: T): T => maskValue(value, 0) as T;

export { maskSensitiveData, MASK as SENSITIVE_DATA_MASK };
