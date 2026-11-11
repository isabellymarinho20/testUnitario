import type { QueryResultRow } from "pg";
import type { Database } from "../../../src/database/connection";
import {
  PgStudentRepository,
  type Student,
} from "../../../src/modules/students/students.repository";

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("PgStudentRepository", () => {
  let queryMock: jest.Mock<
    Promise<{ rows: QueryResultRow[] }>,
    [string, unknown[]?]
  >;
  let db: Database;
  let repository: PgStudentRepository;

  beforeEach(() => {
    jest.resetAllMocks();
    queryMock = jest.fn();
    db = {
      query: queryMock as Database["query"],
    };
    repository = new PgStudentRepository(db);
  });

  test("deve inserir aluno em students com $1, $2 e parâmetros [ra, name], retornando ra, name", async () => {
    const created: Student = { ra: 123, name: "Ana" };
    queryMock.mockResolvedValue({ rows: [created] });

    const result = await repository.create({ ra: 123, name: "Ana" });

    expect(result).toEqual(created);
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe(
      "INSERT INTO students (ra, name) VALUES ($1, $2) RETURNING ra, name",
    );
    expect(params).toEqual([123, "Ana"]);
  });

  test("deve listar alunos selecionando ra, name de students com ORDER BY name sem array de parâmetros", async () => {
    const students: Student[] = [
      { ra: 123, name: "Ana" },
      { ra: 456, name: "Bruno" },
    ];
    queryMock.mockResolvedValue({ rows: students });

    const result = await repository.findAll();

    expect(result).toEqual(students);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]).toHaveLength(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe(
      "SELECT ra, name FROM students ORDER BY name",
    );
    expect(params).toBeUndefined();
  });

  test("deve retornar lista vazia quando findAll receber rows vazio", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const result = await repository.findAll();

    expect(result).toEqual([]);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  test("deve retornar a primeira linha ao buscar aluno existente findOne(123) filtrando ra = $1 com [123]", async () => {
    const student: Student = { ra: 123, name: "Ana" };
    queryMock.mockResolvedValue({ rows: [student] });

    const result = await repository.findOne(123);

    expect(result).toEqual(student);
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe(
      "SELECT ra, name FROM students WHERE ra = $1",
    );
    expect(params).toEqual([123]);
  });

  test("deve retornar undefined quando findOne(123) receber rows vazio", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const result = await repository.findOne(123);

    expect(result).toBeUndefined();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  describe("propagação de falhas do banco", () => {
    test("deve propagar a mesma instância de Error quando query falhar em create", async () => {
      const dbError = new Error("Falha no banco em create");
      queryMock.mockRejectedValue(dbError);

      await expect(repository.create({ ra: 123, name: "Ana" })).rejects.toBe(
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

      await expect(repository.findOne(123)).rejects.toBe(dbError);
    });
  });
});
