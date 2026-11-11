import { HttpError } from "../src/errors";
import {
  parseId,
  positiveInteger,
  validateBody,
  validateName,
} from "../src/validation";

function expectBadRequest(action: () => unknown) {
  try {
    action();
    throw new Error("Deveria ter lançado HttpError com statusCode 400");
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(400);
  }
}

describe("validation", () => {
  describe("positiveInteger", () => {
    test.each([1, 2147483647])(
      "deve retornar o próprio número quando recebe %p",
      (value) => {
        expect(positiveInteger(value, "RA")).toBe(value);
      },
    );

    test.each([
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      2147483648,
      "123",
      null,
      undefined,
    ])(
      "deve lançar HttpError 400 quando recebe entrada inválida %p",
      (value) => {
        expectBadRequest(() => positiveInteger(value, "RA"));
      },
    );
  });

  describe("parseId", () => {
    test.each([
      ["1", 1],
      ["2147483647", 2147483647],
    ])(
      "deve converter a string %p para o número %p",
      (input, expected) => {
        expect(parseId(input, "RA")).toBe(expected);
      },
    );

    test.each(["1abc", "1.2", "1e2", "", "-1", "0", "2147483648", 123])(
      "deve lançar HttpError 400 quando recebe entrada inválida %p",
      (value) => {
        expectBadRequest(() => parseId(value, "RA"));
      },
    );
  });

  describe("validateName", () => {
    test.each(["Ana", "a".repeat(100)])(
      "deve retornar o nome válido recebido (%p)",
      (value) => {
        expect(validateName(value)).toBe(value);
      },
    );

    test.each(["", "ab", "   ", " a ", "a".repeat(101), 123, null, undefined])(
      "deve lançar HttpError 400 quando recebe nome inválido %p",
      (value) => {
        expectBadRequest(() => validateName(value));
      },
    );
  });

  describe("validateBody", () => {
    test("deve retornar a mesma referência para objeto congelado com Object.freeze sem modificá-lo", () => {
      const frozen = Object.freeze({ name: "Ana" });
      const result = validateBody(frozen);

      expect(result).toBe(frozen);
      expect(result).toEqual({ name: "Ana" });
    });

    test.each([null, undefined, [], "Ana", 12])(
      "deve lançar HttpError 400 quando recebe corpo inválido %p",
      (value) => {
        expectBadRequest(() => validateBody(value));
      },
    );

    test("deve aceitar campos extras e retornar a mesma referência sem alterar o objeto", () => {
      const body = { name: "Ana", extra: true };
      const result = validateBody(body);

      expect(result).toBe(body);
      expect(result).toEqual({ name: "Ana", extra: true });
    });
  });
});
