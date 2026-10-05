const { client, service, hideSensitiveProperies, sourceIpAddress } =
  process.env;

import {
  LEVEL_DEBUG,
  LEVEL_ERROR,
  LEVEL_FAIL,
  LEVEL_INFO,
  LEVEL_PENDING,
  LEVEL_WARN,
  dateOptions,
} from "./index";
import { maskSensitiveData } from "./maskSensitiveData";

const hideSensitiveData = (object, propertiesToHide) => {
  const newObject = JSON.parse(JSON.stringify(object));

  propertiesToHide.forEach((property) => {
    if (object[property]) {
      newObject[property] = "** sensitive data **";
    }
  });

  return newObject;
};

const generateLogPayload = (
  level: string,
  payload: any = {},
  propertiesToHide: string[] = []
) => {
  const toHide: string[] = [];
  const newPayload = maskSensitiveData(JSON.parse(JSON.stringify(payload)));

  if (propertiesToHide && propertiesToHide.length) {
    toHide.push(...propertiesToHide);
  }

  if (hideSensitiveProperies && hideSensitiveProperies.length) {
    toHide.push(hideSensitiveProperies);
  }

  if (payload.response && payload.response.body) {
    const hidedObject = hideSensitiveData(payload.response.body, toHide);
    newPayload.response.body = hidedObject;
  }

  return {
    level,
    newPayload,
    client,
    service,
  };
};

const initLog = (logPayload, level, logData = true, emit = true) => {
  const startDate = new Date();

  let payload =
    typeof logPayload === "string"
      ? { ...JSON.parse(logPayload) }
      : { ...logPayload };

  if (
    Array.isArray(payload?.response?.body) &&
    payload?.response?.body?.length > 2
  ) {
    payload.response.body = {
      message: "***ARRAY GRANDE***",
      preview: [payload?.response?.body[0], payload?.response?.body[1]],
    };
  }

  if (payload?.response?.body != null && !logData) {
    payload.response.body = {
      message: "***LOG DESABILITADO***",
    };
  }

  if (payload?.request != null && !logData) {
    payload.request = {
      message: "***LOG DESABILITADO***",
    };
  }

  // `emit = false` mantém a closure (necessária para duration/payload), mas não
  // imprime nada no console — usado por rotas que optam por não logar.
  const customLog = emit
    ? {
        debug,
        pending,
        info,
        warn,
        error,
        fail,
      }[level](logPayload)
    : null;

  return () => ({
    ...(customLog || logPayload),
    duration: ((new Date() as any) - (startDate as any)) / 1000,
  });
};

const logPayloadAccordingLevel = (level, payload) => {
  switch (level) {
    case LEVEL_DEBUG:
      console.debug(JSON.stringify(payload, null, 2));
      break;
    case LEVEL_PENDING:
      console.info(JSON.stringify(payload, null, 2));
      break;
    case LEVEL_INFO:
      console.info(JSON.stringify(payload, null, 2));
      break;
    case LEVEL_WARN:
      console.warn(JSON.stringify(payload, null, 2));
      break;
    case LEVEL_ERROR:
      console.error(JSON.stringify(payload, null, 2));
      break;
    case LEVEL_FAIL:
      console.error(JSON.stringify(payload, null, 2));
      break;
    default:
      console.info(JSON.stringify(payload, null, 2));
      break;
  }
};

const log = (level, payload, propertiesToHide = []) => {
  const payloadCopy = JSON.parse(JSON.stringify(payload));

  const logPayload = generateLogPayload(level, payloadCopy, propertiesToHide);

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
const debug = (payload, propertiesToHide = []) => {
  return log(LEVEL_DEBUG, payload, propertiesToHide);
};

/**
 * Creates PENDING log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
const pending = (payload, propertiesToHide = []) => {
  return log(LEVEL_PENDING, payload, propertiesToHide);
};

/**
 * Creates INFO log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
const info = (payload, propertiesToHide = []) => {
  return log(LEVEL_INFO, payload, propertiesToHide);
};

/**
 * Creates WARN log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
const warn = (payload, propertiesToHide = []) => {
  return log(LEVEL_WARN, payload, propertiesToHide);
};

/**
 * Creates ERROR log information.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
const error = (payload, propertiesToHide = []) => {
  return log(LEVEL_ERROR, payload, propertiesToHide);
};

/**
 * Creates FAIL log information for internal requests.
 *
 * @param {(string|object)} payload
 * @return {object} log model object
 */
const fail = (payload, propertiesToHide = []) => {
  return log(LEVEL_FAIL, payload, propertiesToHide);
};

/**
 * @description A class that makes it easy to show logs
 */
class StructureLogger {
  /**
   * @param {string} functionName - the name of the lambda function
   * @param {string} level - the level of logging. Can be 'INFO', 'WARN' or 'ERROR'
   * @param {any} data - anything important to log. Can be Object or string
   */
  log(functionName, level = "INFO", data) {
    const log = {
      functionName,
      time: new Date().toLocaleDateString("pt-br", dateOptions),
      data,
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
  }
}

export { debug, pending, info, warn, error, fail, initLog, StructureLogger };
