"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENSITIVE_DATA_MASK = exports.maskSensitiveData = void 0;
var MASK = "** sensitive data **";
exports.SENSITIVE_DATA_MASK = MASK;
var MAX_DEPTH = 20;
var SENSITIVE_KEYS = new Set([
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
var isSensitiveKey = function (key) { return SENSITIVE_KEYS.has(key.toLowerCase()); };
var decodeKey = function (key) {
    try {
        return decodeURIComponent(key.replace(/\+/g, " "));
    }
    catch (_a) {
        return key;
    }
};
var maskUrlEncoded = function (text) {
    return text.replace(/(^|[&?])([^=&?]+)=([^&]*)/g, function (match, separator, key) {
        return isSensitiveKey(decodeKey(key))
            ? "".concat(separator).concat(key, "=").concat(encodeURIComponent(MASK))
            : match;
    });
};
var looksLikeJson = function (text) {
    return (text.startsWith("{") && text.endsWith("}")) ||
        (text.startsWith("[") && text.endsWith("]"));
};
var maskValue = function (value, depth) {
    if (depth > MAX_DEPTH || value == null)
        return value;
    if (typeof value === "string") {
        var trimmed = value.trim();
        if (looksLikeJson(trimmed)) {
            try {
                return JSON.stringify(maskValue(JSON.parse(trimmed), depth + 1));
            }
            catch (_a) {
                return maskUrlEncoded(value);
            }
        }
        return value.includes("=") ? maskUrlEncoded(value) : value;
    }
    if (Array.isArray(value)) {
        return value.map(function (item) { return maskValue(item, depth + 1); });
    }
    if (typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(function (_a) {
            var key = _a[0], child = _a[1];
            return [
                key,
                isSensitiveKey(key) && child !== "" && child != null
                    ? MASK
                    : maskValue(child, depth + 1),
            ];
        }));
    }
    return value;
};
var maskSensitiveData = function (value) { return maskValue(value, 0); };
exports.maskSensitiveData = maskSensitiveData;
//# sourceMappingURL=maskSensitiveData.js.map