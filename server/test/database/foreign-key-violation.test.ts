import { isForeignKeyViolation } from "../../src/database/foreign-key-violation";

describe("isForeignKeyViolation", () => {
  test('deve retornar true quando recebe objeto com code "23503"', () => {
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
  });

  test.each([null, undefined, "23505", 23503, {}, { code: "outro" }])(
    "deve retornar false quando recebe %p",
    (input) => {
      expect(isForeignKeyViolation(input)).toBe(false);
    },
  );
});
