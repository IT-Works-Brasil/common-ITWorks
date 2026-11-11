import BaseHandler, { EVENTO_CREDENCIAL_USADA } from "./BaseHandler";

const ANTIGO = "valor-antigo-de-teste";
const NOVO = "valor-novo-de-teste";

class Handler extends BaseHandler {
  async rota() {
    return { statusCode: 200, body: "ok" };
  }
}

function montar(env: Record<string, string | undefined>) {
  const handler = new Handler();
  handler.env = { ...env } as NodeJS.ProcessEnv;
  return handler;
}

function evento(headers?: Record<string, string>) {
  return {
    headers,
    body: null,
    requestContext: { identity: { sourceIp: "203.0.113.10" } },
  };
}

function linhasDeCredencial(spy: jest.SpyInstance) {
  return spy.mock.calls
    .map(([linha]) => {
      try {
        return JSON.parse(linha);
      } catch {
        return null;
      }
    })
    .filter((linha) => linha?.evento === EVENTO_CREDENCIAL_USADA);
}

describe("BaseHandler — convivência da credencial antiga com a nova", () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "info").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("aceita o valor antigo e registra que foi o antigo", async () => {
    const handler = montar({ authToken: ANTIGO, authTokenNext: NOVO, service: "svc" });

    const resposta = await handler.handle(evento({ Authorization: ANTIGO }), {}, "rota");

    expect(resposta.statusCode).toBe(200);
    expect(linhasDeCredencial(log)).toEqual([
      expect.objectContaining({ credencial: "antiga", servico: "svc", ip: "203.0.113.10" }),
    ]);
  });

  it("aceita o valor novo, em qualquer caixa do cabeçalho, e registra que foi o novo", async () => {
    const handler = montar({ authToken: ANTIGO, authTokenNext: NOVO });

    const resposta = await handler.handle(evento({ authorization: NOVO }), {}, "rota");

    expect(resposta.statusCode).toBe(200);
    expect(linhasDeCredencial(log)).toEqual([expect.objectContaining({ credencial: "nova" })]);
  });

  it("recusa o valor novo enquanto authTokenNext não estiver configurado", async () => {
    const handler = montar({ authToken: ANTIGO });

    const resposta = await handler.handle(evento({ Authorization: NOVO }), {}, "rota");

    expect(resposta.statusCode).toBe(401);
    expect(linhasDeCredencial(log)).toEqual([]);
  });

  it("recusa o valor antigo depois de ele sair do authToken", async () => {
    const handler = montar({ authToken: NOVO });

    const resposta = await handler.handle(evento({ Authorization: ANTIGO }), {}, "rota");

    expect(resposta.statusCode).toBe(401);
  });

  it("authTokenNext vazio não abre a porta para quem manda o cabeçalho vazio", async () => {
    const handler = montar({ authToken: ANTIGO, authTokenNext: "" });

    const resposta = await handler.handle(evento({ Authorization: "" }), {}, "rota");

    expect(resposta.statusCode).toBe(401);
  });

  it("nunca escreve o valor da credencial na linha de log", async () => {
    const handler = montar({ authToken: ANTIGO, authTokenNext: NOVO });

    await handler.handle(evento({ Authorization: ANTIGO }), {}, "rota");
    await handler.handle(evento({ Authorization: NOVO }), {}, "rota");

    const linhas = JSON.stringify(linhasDeCredencial(log));
    expect(linhas).not.toContain(ANTIGO);
    expect(linhas).not.toContain(NOVO);
    expect(linhasDeCredencial(log)).toHaveLength(2);
  });

  it("mantém o comportamento de serviço sem authToken: quem chega sem cabeçalho passa, como antes", async () => {
    const handler = montar({});

    const resposta = await handler.handle(evento({}), {}, "rota");

    expect(resposta.statusCode).toBe(200);
    expect(linhasDeCredencial(log)).toEqual([
      expect.objectContaining({ credencial: "nenhuma-configurada" }),
    ]);
  });

  it("rota pública não confere nem registra credencial", async () => {
    const handler = montar({ authToken: ANTIGO });
    handler.publicMethods = ["rota"];

    const resposta = await handler.handle(evento({}), {}, "rota");

    expect(resposta.statusCode).toBe(200);
    expect(linhasDeCredencial(log)).toEqual([]);
  });
});
