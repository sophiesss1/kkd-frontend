import { ApiError, apiGet, buildQuery } from './client';

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

afterEach(() => vi.unstubAllGlobals());

describe('buildQuery', () => {
  it('пропускает пустые значения и склеивает списки через запятую', () => {
    expect(buildQuery({ run_id: 'RUN-008', q: '', severity: ['critical', 'major'], rule_code: [], x: undefined })).toBe(
      '?run_id=RUN-008&severity=critical%2Cmajor',
    );
  });
});

describe('apiGet', () => {
  it('разбирает ошибку в едином формате API', async () => {
    mockFetch(async () =>
      new Response(JSON.stringify({ error: { code: 'RUN_FAILED', message: 'Прогон RUN-006 завершился с ошибкой' } }), {
        status: 409,
      }),
    );
    const error = await apiGet('/api/kkd/summary').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'RUN_FAILED', isClientError: true });
  });

  it('сетевая ошибка превращается в NETWORK_ERROR', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(apiGet('/api/meta')).rejects.toMatchObject({ code: 'NETWORK_ERROR', isClientError: false });
  });

  it('422 от валидации FastAPI ({"detail": [...]}) называет параметр', async () => {
    mockFetch(async () =>
      new Response(
        JSON.stringify({
          detail: [{ type: 'greater_than_equal', loc: ['query', 'limit'], msg: 'Input should be greater than or equal to 1' }],
        }),
        { status: 422 },
      ),
    );
    await expect(apiGet('/api/kkd/issues', { limit: 0 })).rejects.toMatchObject({
      status: 422,
      code: 'INVALID_PARAM',
      message: 'Некорректные параметры запроса: limit.',
      isClientError: true,
    });
  });

  it('5xx от прокси без тела API — сервис недоступен', async () => {
    mockFetch(async () => new Response('Bad Gateway', { status: 502 }));
    await expect(apiGet('/api/meta')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('успешный ответ не в JSON (адрес API указывает на фронтенд) — понятная ошибка, а не null', async () => {
    mockFetch(async () => new Response('<!doctype html><title>ККД</title>', { status: 200 }));
    await expect(apiGet('/api/runs')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      message: 'Сервер ответил не в формате API. Проверьте адрес API.',
    });
  });
});
