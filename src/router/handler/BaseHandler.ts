import { HttpResponseModel } from "../../@types/http";
import * as logger from "../../logger";

export default class BaseHandler {
  event: any = null;

  context = null;

  env = process.env;

  /** Métodos (rotas) que não exigem autenticação */
  publicMethods: string[] = [];

  /** Métodos (rotas) que não devem logar entrada nem saída */
  noLogMethods: string[] = [];

  async handle(event, context, method) {
    let log;

    this.setFunctionContext(event, context);

    // Quando o método está em `noLogMethods`, nenhum log de entrada/saída é
    // emitido (nem info, nem warn, nem error).
    const shouldLog = !this.noLogMethods.includes(method);

    const origin = event.headers?.origin || event.headers?.Origin;

    if (JSON.stringify(event?.headers)?.toUpperCase().includes("DB_NAME")) {
      global.DB_NAME = event.headers.DB_NAME ?? event.headers.db_name;
    }

    if (
      JSON.stringify(event?.headers)
        ?.toLowerCase()
        .includes("usuario_compartilhado")
    ) {
      global.USUARIO_COMPARTILHADO =
        event.headers.USUARIO_COMPARTILHADO ??
        event.headers.usuario_compartilhado;
    }

    if (JSON.stringify(event?.headers)?.toLowerCase().includes("email_login")) {
      global.EMAIL_LOGIN =
        event.headers.EMAIL_LOGIN ?? event.headers.email_login;
    }

    if (JSON.stringify(event?.headers)?.toLowerCase().includes("cnpj_gestor")) {
      global.CNPJ_GESTOR =
        event.headers.CNPJ_GESTOR ?? event.headers.cnpj_gestor;
    }

    if (JSON.stringify(event?.headers)?.toLowerCase().includes("app") || JSON.stringify(event?.pathParameters)?.toLowerCase().includes("app")) {
      global.APP = event.headers.APP ?? event.headers.app ?? event?.pathParameters?.app;

      switch (global.APP?.toLowerCase()) {
        case "simulador":
          global.DB_NAME_MAIN = "SMF";
          break;

        case "impostograma":
        case "emalote":
          global.DB_NAME_MAIN = "REVERSA";
          break;

        case "impostocerto":
          global.DB_NAME_MAIN = "CAT";
          break;

        case "erp":
          global.DB_NAME_MAIN = "ERP";
          break;

        default:
          break;
      }
    }

    if (JSON.stringify(event?.headers)?.includes("form-data")) {
      event.body = JSON.stringify({
        formData: event.body,
      });

      const newEvent = { ...event };

      newEvent.body = JSON.stringify({
        formData: "***FORMDATA***",
      });

      log = logger.initLog({ event: newEvent, context }, "pending", true, shouldLog);
    } else if (JSON.stringify(event?.body)?.includes("base64")) {
      let newEvent = JSON.parse(event.body);

      newEvent.base64 = "***BASE64***";

      newEvent = JSON.stringify(newEvent);

      log = logger.initLog({ event: newEvent, context }, "pending", true, shouldLog);
    } else {
      log = logger.initLog({ event, context }, "pending", true, shouldLog);
    }
    try {
      if (!this.publicMethods.includes(method) && !this.isAuthorized()) {
        const logPayload = log();
        logPayload.response = {
          statusCode: 401,
          message: "Unauthorized!",
        };

        if (shouldLog) {
          logger.initLog(logPayload, "warn");
        }

        return BaseHandler.httpResponse({
          statusCode: 401,
          body: JSON.stringify(logPayload.response),
        });
      }

      context.callbackWaitsForEmptyEventLoop = false;

      let response;

      if (typeof this[method] == "object") {
        response = await this[method]["default"](event, context);
      } else {
        response = await this[method](event, context);
      }

      if (response?.status) {
        response.statusCode = response?.status;
      }

      // Permite que um controller opte por NÃO receber o awsFilter na resposta.
      // O controller retorna `disableAwsFilter: true`; aqui removemos a flag para
      // não vazar no body e sinalizamos via header interno lido pelo middleware.
      const disableAwsFilter =
        typeof response === "object" && response?.disableAwsFilter === true;

      if (disableAwsFilter) {
        delete response.disableAwsFilter;
      }

      const logPayload = log();

      logPayload.response = { ...response };

      if (shouldLog) {
        if (response.statusCode >= 200 && response.statusCode <= 299) {
          logger.initLog(logPayload, "info");
        } else {
          logger.initLog(logPayload, "error");
        }
      }

      let body =
        typeof response === "string" ? response : JSON.stringify(response);

      if (JSON.parse(body)?.custom) {
        body = JSON.stringify(JSON.parse(body)?.body);
      }

      const returnFunction = BaseHandler.httpResponse({
        statusCode: response.statusCode,
        body,
        headers: {
          ...(response.headers ?? {}),
          ...(disableAwsFilter ? { "x-disable-aws-filter": "true" } : {}),
        },
      });

      return returnFunction;
    } catch (err) {
      const logPayload = log();

      const message =
        err?.response && err?.response?.data
          ? err.response.data
          : err?.message || err;

      if (shouldLog) {
        logger.initLog(logPayload, "error");
      }

      return BaseHandler.httpResponse({
        statusCode: 500,
        body: message,
      });
    }
  }

  setFunctionContext(event, context) {
    this.event = event;
    this.context = context;

    process.env.sourceIpAddress =
      event.requestContext &&
      event.requestContext.identity &&
      event.requestContext.identity.sourceIp
        ? event.requestContext.identity.sourceIp
        : null;
  }

  static httpResponse(data: HttpResponseModel) {
    return {
      statusCode: data.statusCode,
      body: data.body,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token, cnpj, type, cnpj_gestor",
        ...(data.headers ?? {}),
      },
    };
  }

  isAuthorized() {
    const checkByAuthMethod = {
      header: () => this.authHeaderIsTheSameInTheEnvironment(),
    }[this.env.authMethod ?? "header"];

    if (checkByAuthMethod === undefined) {
      return true;
    }
    return checkByAuthMethod();
  }

  /**
   * Confere o cabeçalho `Authorization` contra `authToken` e, durante a troca da credencial, também contra
   * `authTokenNext`; quando casa, registra qual dos dois foi usado, sem o valor.
   */
  authHeaderIsTheSameInTheEnvironment() {
    if (this.event.headers === undefined || this.env.noAuth) {
      return true;
    }

    const credencial = this.credencialUsada();

    if (credencial !== null) {
      this.registrarCredencialUsada(credencial);
    }

    return credencial !== null;
  }

  credencialUsada(): CredencialUsada | null {
    const { Authorization, authorization } = this.event.headers;
    const casa = (valor: string | undefined) =>
      Authorization === valor || authorization === valor;

    const proxima = this.env.authTokenNext;
    if (typeof proxima === "string" && proxima.length > 0 && casa(proxima)) {
      return "nova";
    }

    if (casa(this.env.authToken)) {
      return this.env.authToken ? "antiga" : "nenhuma-configurada";
    }

    return null;
  }

  registrarCredencialUsada(credencial: CredencialUsada) {
    const headers = this.event.headers ?? {};

    console.log(
      JSON.stringify({
        evento: EVENTO_CREDENCIAL_USADA,
        credencial,
        servico: this.env.AWS_LAMBDA_FUNCTION_NAME ?? this.env.service ?? null,
        origem: headers.origin ?? headers.Origin ?? null,
        userAgent: headers["User-Agent"] ?? headers["user-agent"] ?? null,
        ip: this.event.requestContext?.identity?.sourceIp ?? null,
      })
    );
  }
}

/** Qual valor da credencial casou: o atual (`authToken`), o próximo (`authTokenNext`) ou nenhum, quando o serviço não tem `authToken`. */
export type CredencialUsada = "antiga" | "nova" | "nenhuma-configurada";

/** Marca da linha de log que diz qual credencial casou — é por ela que se conta quem ainda usa o valor antigo. */
export const EVENTO_CREDENCIAL_USADA = "credencial-do-gateway";
