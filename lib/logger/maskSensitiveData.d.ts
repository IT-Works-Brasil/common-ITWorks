declare const MASK = "** sensitive data **";
declare const maskSensitiveData: <T>(value: T) => T;
export { maskSensitiveData, MASK as SENSITIVE_DATA_MASK };
