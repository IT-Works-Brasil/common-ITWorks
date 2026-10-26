import { calculaDigitoEAN, zerosInvalidam } from "./index";

describe("zerosInvalidam", () => {
  it.each(["7894000001159", "7892300000100", "7894354000006", "17891000000080", "4000417000002"])(
    "zeros no item com empresa preenchida não invalidam: %s",
    (ean) => expect(zerosInvalidam(ean)).toBe(false),
  );

  it.each(["10000078989174", "00000012345670"])("zeros de enchimento não invalidam: %s", (ean) =>
    expect(zerosInvalidam(ean)).toBe(false),
  );

  it.each(["1100000080060", "7000004167900", "7890000012345", "8000001000636", "31000008512390"])(
    "zeros logo após o prefixo invalidam: %s",
    (ean) => expect(zerosInvalidam(ean)).toBe(true),
  );

  it.each(["80000006", "10000000123454"])("conteúdo curto com zeros invalida: %s", (ean) =>
    expect(zerosInvalidam(ean)).toBe(true),
  );

  it.each(["7891000100103", "7898640000121"])("menos de cinco zeros não invalida: %s", (ean) =>
    expect(zerosInvalidam(ean)).toBe(false),
  );
});

describe("calculaDigitoEAN", () => {
  it("aceita zeros no item e recusa a empresa zerada", () => {
    expect(calculaDigitoEAN("7894000001159")).toBe(true);
    expect(calculaDigitoEAN("7892300000100")).toBe(true);
    expect(calculaDigitoEAN("1100000080060")).toBe(false);
    expect(calculaDigitoEAN("7890000123457")).toBe(false);
  });
});
