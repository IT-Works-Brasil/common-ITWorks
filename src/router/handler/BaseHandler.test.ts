import BaseHandler, { EVENTO_CREDENCIAL_USADA, lerHeader } from "./BaseHandler";

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

describe("BaseHandler — cabeçalhos em qualquer caixa (chamado 140433)", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    jest.spyOn(console, "info").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    delete (global as any).APP;
    delete (global as any).DB_NAME_MAIN;
    delete (global as any).EMAIL_LOGIN;
    delete (global as any).CNPJ_GESTOR;
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(["App", "APP", "app"])("escolhe o banco do Simulador com o cabeçalho %s", async (nome) => {
    const handler = montar({ authToken: ANTIGO });

    await handler.handle(evento({ Authorization: ANTIGO, [nome]: "simulador" }), {}, "rota");

    expect((global as any).APP).toBe("simulador");
    expect((global as any).DB_NAME_MAIN).toBe("SMF");
  });

  it("lê e-mail e gestor em caixa mista", async () => {
    const handler = montar({ authToken: ANTIGO });

    await handler.handle(
      evento({ Authorization: ANTIGO, Email_Login: "pessoa@exemplo.test", Cnpj_Gestor: "12345678000100" }),
      {},
      "rota",
    );

    expect((global as any).EMAIL_LOGIN).toBe("pessoa@exemplo.test");
    expect((global as any).CNPJ_GESTOR).toBe("12345678000100");
  });

  it("lerHeader devolve undefined sem cabeçalhos ou sem a chave", () => {
    expect(lerHeader(undefined, "app")).toBeUndefined();
    expect(lerHeader({ Outro: "x" }, "app")).toBeUndefined();
  });
});
