import type { QueryResultRow } from "pg";
import type { Database } from "../../../src/database/connection";
import {
  type Course,
  PgCourseRepository,
} from "../../../src/modules/courses/courses.repository";

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("PgCourseRepository", () => {
  let queryMock: jest.Mock<
    Promise<{ rows: QueryResultRow[] }>,
    [string, unknown[]?]
  >;
  let db: Database;
  let repository: PgCourseRepository;

  beforeEach(() => {
    jest.resetAllMocks();
    queryMock = jest.fn();
    db = {
      query: queryMock as Database["query"],
    };
    repository = new PgCourseRepository(db);
  });

  test("deve inserir disciplina em courses com $1, retornar id e name e chamar query uma única vez", async () => {
    const created: Course = { id: 1, name: "Qualidade" };
    queryMock.mockResolvedValue({ rows: [created] });

    const result = await repository.create({ name: "Qualidade" });

    expect(result).toEqual(created);
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe(
      "INSERT INTO courses (name) VALUES ($1) RETURNING id, name",
    );
    expect(params).toEqual(["Qualidade"]);
  });

  test("deve listar disciplinas selecionando id, name de courses com ORDER BY id sem array de parâmetros", async () => {
    const courses: Course[] = [
      { id: 1, name: "Qualidade" },
      { id: 2, name: "Testes" },
    ];
    queryMock.mockResolvedValue({ rows: courses });

    const result = await repository.findAll();

    expect(result).toEqual(courses);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]).toHaveLength(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe("SELECT id, name FROM courses ORDER BY id");
    expect(params).toBeUndefined();
  });

  test("deve retornar lista vazia quando findAll receber rows vazio", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const result = await repository.findAll();

    expect(result).toEqual([]);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  test("deve retornar a primeira linha ao buscar disciplina existente findOne(7) filtrando id = $1 com [7]", async () => {
    const course: Course = { id: 7, name: "Qualidade" };
    queryMock.mockResolvedValue({ rows: [course] });

    const result = await repository.findOne(7);

    expect(result).toEqual(course);
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe(
      "SELECT id, name FROM courses WHERE id = $1",
    );
    expect(params).toEqual([7]);
  });

  test("deve retornar undefined quando findOne(7) receber rows vazio", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const result = await repository.findOne(7);

    expect(result).toBeUndefined();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  describe("propagação de falhas do banco", () => {
    test("deve propagar a mesma instância de Error quando query falhar em create", async () => {
      const dbError = new Error("Falha no banco em create");
      queryMock.mockRejectedValue(dbError);

      await expect(repository.create({ name: "Qualidade" })).rejects.toBe(
        dbError,
      );
    });

    test("deve propagar a mesma instância de Error quando query falhar em findAll", async () => {
      const dbError = new Error("Falha no banco em findAll");
      queryMock.mockRejectedValue(dbError);

      await expect(repository.findAll()).rejects.toBe(dbError);
    });

    test("deve propagar a mesma instância de Error quando query falhar em findOne", async () => {
      const dbError = new Error("Falha no banco em findOne");
      queryMock.mockRejectedValue(dbError);

      await expect(repository.findOne(7)).rejects.toBe(dbError);
    });
  });
});
