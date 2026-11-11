import { isUniqueViolation } from "../../src/database/unique-violation";

describe("isUniqueViolation", () => {
  test('deve retornar true quando recebe objeto com code "23505"', () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  test.each([null, undefined, "23505", 23503, {}, { code: "outro" }])(
    "deve retornar false quando recebe %p",
    (input) => {
      expect(isUniqueViolation(input)).toBe(false);
    },
  );
});
