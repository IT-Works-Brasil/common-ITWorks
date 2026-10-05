import { initLog, info } from "./index";
import { maskSensitiveData, SENSITIVE_DATA_MASK } from "./maskSensitiveData";

const CARD_NUMBER = "4111111111111111";
const CVV = "737";
const PASSWORD = "segredo-do-cliente";
const TOKEN = "token-estatico";

const checkoutBody = {
  idPlano: 223,
  nomeContato: "Maria",
  senha: PASSWORD,
  NumeroCartao: CARD_NUMBER,
  NomeCartao: "MARIA SOUZA",
  MesValidadeCartao: "12",
  AnoValidadeCartao: "30",
  CodigoSegurancaCartao: CVV,
  tipoPagamento: "3",
};

const printed = (spy: jest.SpyInstance) =>
  spy.mock.calls.map((call) => call.join(" ")).join("\n");

describe("maskSensitiveData", () => {
  it("masks sensitive keys at any depth, ignoring case", () => {
    const masked = maskSensitiveData({
      headers: { Authorization: TOKEN },
      body: { nested: [{ numeroCartao: CARD_NUMBER, cvv: CVV }] },
    });

    expect(masked).toEqual({
      headers: { Authorization: SENSITIVE_DATA_MASK },
      body: {
        nested: [{ numeroCartao: SENSITIVE_DATA_MASK, cvv: SENSITIVE_DATA_MASK }],
      },
    });
  });

  it("masks inside a JSON string, as API Gateway delivers the body", () => {
    const masked = maskSensitiveData({ body: JSON.stringify(checkoutBody) });
    const body = JSON.parse(masked.body);

    expect(body.senha).toBe(SENSITIVE_DATA_MASK);
    expect(body.NumeroCartao).toBe(SENSITIVE_DATA_MASK);
    expect(body.CodigoSegurancaCartao).toBe(SENSITIVE_DATA_MASK);
    expect(body.MesValidadeCartao).toBe(SENSITIVE_DATA_MASK);
    expect(body.nomeContato).toBe("Maria");
    expect(body.idPlano).toBe(223);
  });

  it("masks a url-encoded body, as sent to the billing provider", () => {
    const data =
      `idplano=223&ST_NOME_SAC=Empresa&ST_CARTAO_SAC=${CARD_NUMBER}` +
      `&ST_SEGURANCACARTAO_SAC=${CVV}&senha=${PASSWORD}&senha_confirmacao=${PASSWORD}`;

    const masked = maskSensitiveData({ request: { data } });

    expect(masked.request.data).not.toContain(CARD_NUMBER);
    expect(masked.request.data).not.toContain(CVV);
    expect(masked.request.data).not.toContain(PASSWORD);
    expect(masked.request.data).toContain("idplano=223");
    expect(masked.request.data).toContain("ST_NOME_SAC=Empresa");
  });

  it("keeps empty values visible and leaves other values untouched", () => {
    const masked = maskSensitiveData({
      NumeroCartao: "",
      senha: null,
      message: "a=b é texto comum",
      total: 19.9,
      ativo: true,
    });

    expect(masked).toEqual({
      NumeroCartao: "",
      senha: null,
      message: "a=b é texto comum",
      total: 19.9,
      ativo: true,
    });
  });

  it("does not change the object it receives", () => {
    const original = { senha: PASSWORD };

    maskSensitiveData(original);

    expect(original.senha).toBe(PASSWORD);
  });
});

describe("logger output", () => {
  beforeAll(() => {
    process.env.stage = "test";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("never prints card, CVV, password or token from a handler event", () => {
    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const event = {
      headers: { Authorization: TOKEN },
      body: JSON.stringify(checkoutBody),
    };

    const log = initLog({ event, context: {} }, "pending");
    const payload = log();

    payload.response = { statusCode: 200, body: { message: "ok" } };
    initLog(payload, "info");

    const output = printed(consoleSpy);

    expect(output).not.toContain(CARD_NUMBER);
    expect(output).not.toContain(CVV);
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain(TOKEN);
    expect(output).toContain("Maria");
  });

  it("never prints card data from an outgoing url-encoded request", () => {
    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    info({
      request: {
        url: "/financeiro/checkout",
        headers: { app_token: TOKEN, access_token: TOKEN },
        data: `ST_CARTAO_SAC=${CARD_NUMBER}&ST_SEGURANCACARTAO_SAC=${CVV}`,
      },
      response: { statusCode: 200, body: { status: "200" } },
    });

    const output = printed(consoleSpy);

    expect(output).not.toContain(CARD_NUMBER);
    expect(output).not.toContain(CVV);
    expect(output).not.toContain(TOKEN);
  });
});
