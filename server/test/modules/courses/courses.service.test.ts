import { HttpError } from "../../../src/errors";
import type {
  Course,
  CourseRepository,
} from "../../../src/modules/courses/courses.repository";
import { CoursesService } from "../../../src/modules/courses/courses.service";

async function expectHttpError(
  action: Promise<unknown>,
  statusCode: 400 | 404 | 409,
) {
  await expect(action).rejects.toThrow(HttpError);
  await expect(action).rejects.toMatchObject({ statusCode });
}

describe("CoursesService", () => {
  let repository: jest.Mocked<CourseRepository>;
  let service: CoursesService;

  beforeEach(() => {
    jest.resetAllMocks();
    repository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    service = new CoursesService(repository);
  });

  test("deve criar uma disciplina válida e repassar os dados ao repositório (mock)", async () => {
    const created: Course = { id: 1, name: "Qualidade" };
    repository.create.mockResolvedValue(created);

    const result = await service.create({ name: "Qualidade" });

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
  });

  test.each([null, {}, { name: "A" }])(
    "deve rejeitar criação inválida com statusCode 400 para entrada %p sem chamar repository.create",
    async (invalidInput) => {
      await expectHttpError(service.create(invalidInput), 400);
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  test("deve lançar HttpError 409 quando o nome da disciplina for duplicado (23505)", async () => {
    repository.create.mockRejectedValue({ code: "23505" });

    await expectHttpError(service.create({ name: "Qualidade" }), 409);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  test("deve listar disciplinas usando stub e chamar repository.findAll uma única vez", async () => {
    const coursesList: Course[] = [
      { id: 1, name: "Qualidade" },
      { id: 2, name: "Testes" },
    ];
    // Stub preparado para devolver uma lista predefinida conhecida
    const findAllStub = jest.fn().mockResolvedValue(coursesList);
    const stubRepository: CourseRepository = {
      create: jest.fn(),
      findAll: findAllStub,
      findOne: jest.fn(),
    };
    const serviceWithStub = new CoursesService(stubRepository);

    const result = await serviceWithStub.findAll();

    expect(result).toEqual(coursesList);
    expect(findAllStub).toHaveBeenCalledTimes(1);
  });

  test("deve retornar disciplina existente ao buscar findOne(123) e encaminhar o argumento ao repositório", async () => {
    const course: Course = { id: 123, name: "Qualidade" };
    repository.findOne.mockResolvedValue(course);

    const result = await service.findOne(123);

    expect(result).toEqual(course);
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123);
  });

  test("deve lançar HttpError 404 quando findOne(123) retornar undefined", async () => {
    repository.findOne.mockResolvedValue(undefined);

    await expectHttpError(service.findOne(123), 404);
    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith(123);
  });

  test("deve lançar HttpError 400 ao buscar com identificador inválido findOne(0) sem consultar o repositório", async () => {
    await expectHttpError(service.findOne(0), 400);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  describe("propagação de falhas inesperadas", () => {
    test("deve propagar a mesma instância de Error quando create falhar inesperadamente", async () => {
      const unexpectedError = new Error("Falha inesperada no banco ao criar");
      repository.create.mockRejectedValue(unexpectedError);

      await expect(service.create({ name: "Qualidade" })).rejects.toBe(
        unexpectedError,
      );
    });

    test("deve propagar a mesma instância de Error quando findAll falhar inesperadamente", async () => {
      const unexpectedError = new Error("Falha inesperada no banco ao listar");
      repository.findAll.mockRejectedValue(unexpectedError);

      await expect(service.findAll()).rejects.toBe(unexpectedError);
    });

    test("deve propagar a mesma instância de Error quando findOne falhar inesperadamente", async () => {
      const unexpectedError = new Error("Falha inesperada no banco ao buscar");
      repository.findOne.mockRejectedValue(unexpectedError);

      await expect(service.findOne(123)).rejects.toBe(unexpectedError);
    });
  });

  test("deve observar findOne de um stub existente usando jest.spyOn", async () => {
    const stubRepository: CourseRepository = {
      async create(data) {
        return { id: 1, name: data.name };
      },
      async findAll() {
        return [{ id: 1, name: "Qualidade" }];
      },
      async findOne(id) {
        return { id, name: "Qualidade" };
      },
    };

    const findOneSpy = jest.spyOn(stubRepository, "findOne");
    const serviceWithStub = new CoursesService(stubRepository);

    const result = await serviceWithStub.findOne(1);

    expect(result).toEqual({ id: 1, name: "Qualidade" });
    expect(findOneSpy).toHaveBeenCalledTimes(1);
    expect(findOneSpy).toHaveBeenCalledWith(1);
  });

  test("deve ignorar campos extras na criação e encaminhar somente { name } ao repositório", async () => {
    const created: Course = { id: 1, name: "Qualidade" };
    repository.create.mockResolvedValue(created);

    const result = await service.create({ name: "Qualidade", extra: true });

    expect(result).toEqual(created);
    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith({ name: "Qualidade" });
  });
});
