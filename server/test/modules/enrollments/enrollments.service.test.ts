import { HttpError } from "../../../src/errors";
import type {
  Enrollment,
  EnrollmentRepository,
} from "../../../src/modules/enrollments/enrollments.repository";
import { EnrollmentsService } from "../../../src/modules/enrollments/enrollments.service";

describe("EnrollmentsService", () => {
  const fixedDate = new Date("2026-10-15T12:00:00.000Z");
  let repository: jest.Mocked<EnrollmentRepository>;
  let service: EnrollmentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    service = new EnrollmentsService(repository);
  });

  test("deve criar matrícula válida e passar os argumentos separados 123 e 1 na ordem correta", async () => {
    const enrollment: Enrollment = {
      studentRa: 123,
      courseId: 1,
      enrolledAt: fixedDate,
    };
    repository.create.mockResolvedValue(enrollment);

    const result = await service.create({ studentRa: 123, courseId: 1 });

    expect(result).toEqual(enrollment);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(123, 1);
  });

  test.each([
    { studentRa: 0, courseId: 1 },
    { studentRa: 123, courseId: 0 },
  ])(
    "deve rejeitar criação com chave inválida %p com statusCode 400 sem chamar repository.create",
    async (invalidInput) => {
      await expect(service.create(invalidInput)).rejects.toEqual(
        expect.objectContaining({
          statusCode: 400,
        }),
      );
      await expect(service.create(invalidInput)).rejects.toBeInstanceOf(
        HttpError,
      );
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  test("deve lançar HttpError 404 quando aluno ou disciplina não existir (violação de chave estrangeira 23503)", async () => {
    repository.create.mockRejectedValue({ code: "23503" });

    await expect(
      service.create({ studentRa: 123, courseId: 1 }),
    ).rejects.toEqual(
      expect.objectContaining({
        statusCode: 404,
      }),
    );
  });

  test("deve lançar HttpError 409 quando a matrícula for duplicada (violação de unicidade 23505)", async () => {
    repository.create.mockRejectedValue({ code: "23505" });

    await expect(
      service.create({ studentRa: 123, courseId: 1 }),
    ).rejects.toEqual(
      expect.objectContaining({
        statusCode: 409,
      }),
    );
  });

  test("deve lançar HttpError 404 ao buscar matrícula inexistente findOne(123, 1) e repassar os argumentos na ordem correta", async () => {
    repository.findOne.mockResolvedValue(undefined);

    await expect(service.findOne(123, 1)).rejects.toEqual(
      expect.objectContaining({
        statusCode: 404,
      }),
    );
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123, 1);
  });

  test("deve propagar a mesma instância de Error em falha inesperada na criação", async () => {
    const unexpectedError = new Error("Falha inesperada na matrícula");
    repository.create.mockRejectedValue(unexpectedError);

    await expect(service.create({ studentRa: 123, courseId: 1 })).rejects.toBe(
      unexpectedError,
    );
  });

  test("deve listar matrículas e chamar repository.findAll uma única vez sem argumentos", async () => {
    const enrollments: Enrollment[] = [
      { studentRa: 123, courseId: 1, enrolledAt: fixedDate },
    ];
    repository.findAll.mockResolvedValue(enrollments);

    const result = await service.findAll();

    expect(result).toEqual(enrollments);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(repository.findAll).toHaveBeenCalledWith();
  });

  test("deve retornar matrícula existente em findOne(123, 1) e chamar repository.findOne uma única vez com ambos os identificadores", async () => {
    const enrollment: Enrollment = {
      studentRa: 123,
      courseId: 1,
      enrolledAt: fixedDate,
    };
    repository.findOne.mockResolvedValue(enrollment);

    const result = await service.findOne(123, 1);

    expect(result).toEqual(enrollment);
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123, 1);
  });
});
