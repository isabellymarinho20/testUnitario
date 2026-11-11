import { HttpError } from "../../../src/errors";
import type {
  Student,
  StudentRepository,
} from "../../../src/modules/students/students.repository";
import { StudentsService } from "../../../src/modules/students/students.service";

describe("StudentsService", () => {
  let repository: jest.Mocked<StudentRepository>;
  let service: StudentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    service = new StudentsService(repository);
  });

  test("deve criar um aluno válido e encaminhar os dados para repository.create", async () => {
    const student: Student = { ra: 123, name: "Ana" };
    repository.create.mockResolvedValue(student);

    const result = await service.create({ ra: 123, name: "Ana" });

    expect(result).toEqual(student);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith({ ra: 123, name: "Ana" });
  });

  test("deve rejeitar criação com RA inválido (0) com statusCode 400 sem chamar repository.create", async () => {
    await expect(service.create({ ra: 0, name: "Ana" })).rejects.toEqual(
      expect.objectContaining({
        statusCode: 400,
      }),
    );
    await expect(service.create({ ra: 0, name: "Ana" })).rejects.toBeInstanceOf(
      HttpError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  test("deve lançar HttpError 409 quando o RA já estiver cadastrado (23505)", async () => {
    repository.create.mockRejectedValue({ code: "23505" });

    await expect(service.create({ ra: 123, name: "Ana" })).rejects.toEqual(
      expect.objectContaining({
        statusCode: 409,
      }),
    );
  });

  test("deve lançar HttpError 404 ao buscar aluno inexistente pelo RA 123", async () => {
    repository.findOne.mockResolvedValue(undefined);

    await expect(service.findOne(123)).rejects.toEqual(
      expect.objectContaining({
        statusCode: 404,
      }),
    );
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123);
  });

  test("deve propagar a mesma instância de Error em falha inesperada na criação", async () => {
    const unexpectedError = new Error("Erro inesperado no repositório");
    repository.create.mockRejectedValue(unexpectedError);

    await expect(service.create({ ra: 123, name: "Ana" })).rejects.toBe(
      unexpectedError,
    );
  });

  test("deve listar alunos e chamar repository.findAll exatamente uma vez sem argumentos", async () => {
    const students: Student[] = [
      { ra: 123, name: "Ana" },
      { ra: 456, name: "Bruno" },
    ];
    repository.findAll.mockResolvedValue(students);

    const result = await service.findAll();

    expect(result).toEqual(students);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
    expect(repository.findAll).toHaveBeenCalledWith();
  });

  test("deve retornar aluno existente em findOne(123) e chamar repository.findOne uma única vez com RA 123", async () => {
    const student: Student = { ra: 123, name: "Ana" };
    repository.findOne.mockResolvedValue(student);

    const result = await service.findOne(123);

    expect(result).toEqual(student);
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123);
  });
});
