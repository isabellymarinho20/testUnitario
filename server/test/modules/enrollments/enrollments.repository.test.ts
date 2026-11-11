import type { QueryResultRow } from "pg";
import type { Database } from "../../../src/database/connection";
import {
  type Enrollment,
  PgEnrollmentRepository,
} from "../../../src/modules/enrollments/enrollments.repository";

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

describe("PgEnrollmentRepository", () => {
  const fixedDate = new Date("2026-10-15T12:00:00.000Z");
  let queryMock: jest.Mock<
    Promise<{ rows: QueryResultRow[] }>,
    [string, unknown[]?]
  >;
  let db: Database;
  let repository: PgEnrollmentRepository;

  beforeEach(() => {
    jest.resetAllMocks();
    queryMock = jest.fn();
    db = {
      query: queryMock as Database["query"],
    };
    repository = new PgEnrollmentRepository(db);
  });

  test("deve inserir matrícula em enrollments com $1, $2 e parâmetros [123, 7], retornando aliases em camelCase e data simulada", async () => {
    const created: Enrollment = {
      studentRa: 123,
      courseId: 7,
      enrolledAt: fixedDate,
    };
    queryMock.mockResolvedValue({ rows: [created] });

    const result = await repository.create(123, 7);

    expect(result).toEqual({
      studentRa: 123,
      courseId: 7,
      enrolledAt: fixedDate,
    });
    expect(result.enrolledAt).toBe(fixedDate);
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe(
      'INSERT INTO enrollments (student_ra, course_id) VALUES ($1, $2) RETURNING student_ra AS "studentRa", course_id AS "courseId", enrolled_at AS "enrolledAt"',
    );
    expect(params).toEqual([123, 7]);
  });

  test("deve listar matrículas selecionando aliases em camelCase com ORDER BY student_ra, course_id sem array de parâmetros", async () => {
    const enrollments: Enrollment[] = [
      { studentRa: 123, courseId: 7, enrolledAt: fixedDate },
    ];
    queryMock.mockResolvedValue({ rows: enrollments });

    const result = await repository.findAll();

    expect(result).toEqual(enrollments);
    expect(result[0].enrolledAt).toBe(fixedDate);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0]).toHaveLength(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe(
      'SELECT student_ra AS "studentRa", course_id AS "courseId", enrolled_at AS "enrolledAt" FROM enrollments ORDER BY student_ra, course_id',
    );
    expect(params).toBeUndefined();
  });

  test("deve retornar lista vazia quando findAll receber rows vazio", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const result = await repository.findAll();

    expect(result).toEqual([]);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  test("deve retornar a primeira linha ao buscar matrícula existente findOne(123, 7) filtrando student_ra = $1 AND course_id = $2 com [123, 7]", async () => {
    const enrollment: Enrollment = {
      studentRa: 123,
      courseId: 7,
      enrolledAt: fixedDate,
    };
    queryMock.mockResolvedValue({ rows: [enrollment] });

    const result = await repository.findOne(123, 7);

    expect(result).toEqual({
      studentRa: 123,
      courseId: 7,
      enrolledAt: fixedDate,
    });
    expect(result?.enrolledAt).toBe(fixedDate);
    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(normalizeSql(sql)).toBe(
      'SELECT student_ra AS "studentRa", course_id AS "courseId", enrolled_at AS "enrolledAt" FROM enrollments WHERE student_ra = $1 AND course_id = $2',
    );
    expect(params).toEqual([123, 7]);
  });

  test("deve retornar undefined quando findOne(123, 7) receber rows vazio", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const result = await repository.findOne(123, 7);

    expect(result).toBeUndefined();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  describe("propagação de falhas do banco", () => {
    test("deve propagar a mesma instância de Error quando query falhar em create", async () => {
      const dbError = new Error("Falha no banco em create");
      queryMock.mockRejectedValue(dbError);

      await expect(repository.create(123, 7)).rejects.toBe(dbError);
    });

    test("deve propagar a mesma instância de Error quando query falhar em findAll", async () => {
      const dbError = new Error("Falha no banco em findAll");
      queryMock.mockRejectedValue(dbError);

      await expect(repository.findAll()).rejects.toBe(dbError);
    });

    test("deve propagar a mesma instância de Error quando query falhar em findOne", async () => {
      const dbError = new Error("Falha no banco em findOne");
      queryMock.mockRejectedValue(dbError);

      await expect(repository.findOne(123, 7)).rejects.toBe(dbError);
    });
  });
});
