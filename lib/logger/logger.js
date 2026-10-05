"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructureLogger = exports.initLog = exports.fail = exports.error = exports.warn = exports.info = exports.pending = exports.debug = void 0;
var _a = process.env, client = _a.client, service = _a.service, hideSensitiveProperies = _a.hideSensitiveProperies, sourceIpAddress = _a.sourceIpAddress;
var index_1 = require("./index");
var maskSensitiveData_1 = require("./maskSensitiveData");
var hideSensitiveData = function (object, propertiesToHide) {
    var newObject = JSON.parse(JSON.stringify(object));
    propertiesToHide.forEach(function (property) {
        if (object[property]) {
            newObject[property] = "** sensitive data **";
        }
    });
    return newObject;
};
var generateLogPayload = function (level, payload, propertiesToHide) {
    if (payload === void 0) { payload = {}; }
    if (propertiesToHide === void 0) { propertiesToHide = []; }
    var toHide = [];
    var newPayload = (0, maskSensitiveData_1.maskSensitiveData)(JSON.parse(JSON.stringify(payload)));
    if (propertiesToHide && propertiesToHide.length) {
        toHide.push.apply(toHide, propertiesToHide);
    }
    if (hideSensitiveProperies && hideSensitiveProperies.length) {
        toHide.push(hideSensitiveProperies);
    }
    if (payload.response && payload.response.body) {
        var hidedObject = hideSensitiveData(payload.response.body, toHide);
        newPayload.response.body = hidedObject;
    }
    return {
        level: level,
        newPayload: newPayload,
        client: client,
        service: service,
    };
};
var initLog = function (logPayload, level, logData, emit) {
    var _a, _b, _c, _d, _e, _f;
    if (logData === void 0) { logData = true; }
    if (emit === void 0) { emit = true; }
    var startDate = new Date();
    var payload = typeof logPayload === "string"
        ? __assign({}, JSON.parse(logPayload)) : __assign({}, logPayload);
    if (Array.isArray((_a = payload === null || payload === void 0 ? void 0 : payload.response) === null || _a === void 0 ? void 0 : _a.body) &&
        ((_c = (_b = payload === null || payload === void 0 ? void 0 : payload.response) === null || _b === void 0 ? void 0 : _b.body) === null || _c === void 0 ? void 0 : _c.length) > 2) {
        payload.response.body = {
            message: "***ARRAY GRANDE***",
            preview: [(_d = payload === null || payload === void 0 ? void 0 : payload.response) === null || _d === void 0 ? void 0 : _d.body[0], (_e = payload === null || payload === void 0 ? void 0 : payload.response) === null || _e === void 0 ? void 0 : _e.body[1]],
        };
    }
    if (((_f = payload === null || payload === void 0 ? void 0 : payload.response) === null || _f === void 0 ? void 0 : _f.body) != null && !logData) {
        payload.response.body = {
            message: "***LOG DESABILITADO***",
        };
    }
    if ((payload === null || payload === void 0 ? void 0 : payload.request) != null && !logData) {
        payload.request = {
            message: "***LOG DESABILITADO***",
        };
    }
    // `emit = false` mantém a closure (necessária para duration/payload), mas não
    // imprime nada no console — usado por rotas que optam por não logar.
    var customLog = emit
        ? {
            debug: debug,
            pending: pending,
            info: info,
            warn: warn,
            error: error,
            fail: fail,
        }[level](logPayload)
        : null;
    return function () { return (__assign(__assign({}, (customLog || logPayload)), { duration: (new Date() - startDate) / 1000 })); };
};
exports.initLog = initLog;
var logPayloadAccordingLevel = function (level, payload) {
    switch (level) {
        case index_1.LEVEL_DEBUG:
            console.debug(JSON.stringify(payload, null, 2));
            break;
        case index_1.LEVEL_PENDING:
            console.info(JSON.stringify(payload, null, 2));
            break;
        case index_1.LEVEL_INFO:
            console.info(JSON.stringify(payload, null, 2));
            break;
        case index_1.LEVEL_WARN:
            console.warn(JSON.stringify(payload, null, 2));
            break;
        case index_1.LEVEL_ERROR:
            console.error(JSON.stringify(payload, null, 2));
            break;
        case index_1.LEVEL_FAIL:
            console.error(JSON.stringify(payload, null, 2));
            break;
        default:
            console.info(JSON.stringify(payload, null, 2));
            break;
    }
};
var log = function (level, payload, propertiesToHide) {
    if (propertiesToHide === void 0) { propertiesToHide = []; }
    var payloadCopy = JSON.parse(JSON.stringify(payload));
    var logPayload = generateLogPayload(level, payloadCopy, propertiesToHide);
    if (process.env.stage) {
        logPayloadAccordingLevel(level, logPayload);
    }
    return payload;
};
/**
 * Creates DEBUG log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
var debug = function (payload, propertiesToHide) {
    if (propertiesToHide === void 0) { propertiesToHide = []; }
    return log(index_1.LEVEL_DEBUG, payload, propertiesToHide);
};
exports.debug = debug;
/**
 * Creates PENDING log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
var pending = function (payload, propertiesToHide) {
    if (propertiesToHide === void 0) { propertiesToHide = []; }
    return log(index_1.LEVEL_PENDING, payload, propertiesToHide);
};
exports.pending = pending;
/**
 * Creates INFO log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
var info = function (payload, propertiesToHide) {
    if (propertiesToHide === void 0) { propertiesToHide = []; }
    return log(index_1.LEVEL_INFO, payload, propertiesToHide);
};
exports.info = info;
/**
 * Creates WARN log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
var warn = function (payload, propertiesToHide) {
    if (propertiesToHide === void 0) { propertiesToHide = []; }
    return log(index_1.LEVEL_WARN, payload, propertiesToHide);
};
exports.warn = warn;
/**
 * Creates ERROR log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
var error = function (payload, propertiesToHide) {
    if (propertiesToHide === void 0) { propertiesToHide = []; }
    return log(index_1.LEVEL_ERROR, payload, propertiesToHide);
};
exports.error = error;
/**
 * Creates FAIL log information for internal requests.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
var fail = function (payload, propertiesToHide) {
    if (propertiesToHide === void 0) { propertiesToHide = []; }
    return log(index_1.LEVEL_FAIL, payload, propertiesToHide);
};
exports.fail = fail;
/**
 * @description A class that makes it easy to show logs
 */
var StructureLogger = /** @class */ (function () {
    function StructureLogger() {
    }
    /**
     * @param {string} functionName - the name of the lambda function
     * @param {string} level - the level of logging. Can be 'INFO', 'WARN' or 'ERROR'
     * @param {any} data - anything important to log. Can be Object or string
     */
    StructureLogger.prototype.log = function (functionName, level, data) {
        if (level === void 0) { level = "INFO"; }
        var log = {
            functionName: functionName,
            time: new Date().toLocaleDateString("pt-br", index_1.dateOptions),
            data: data,
        };
        switch (level) {
            case "ERROR":
                return error(log);
            case "WARN":
                return warn(log);
                break;
            default:
                return info(log);
        }
    };
    return StructureLogger;
}());
exports.StructureLogger = StructureLogger;
//# sourceMappingURL=logger.js.map