import { get, post, put, del } from './api';

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockOk(body) {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => body,
  });
}

function mockFail(body, status = 400) {
  global.fetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => body,
  });
}

describe('get()', () => {
  test('sends a GET request to the given URL', async () => {
    mockOk({ success: true, data: [] });
    await get('/api/test', 'tok');
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/test');
    expect(opts.method).toBe('GET');
  });

  test('includes Authorization header when token is provided', async () => {
    mockOk({ success: true, data: [] });
    await get('/api/test', 'mytoken');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBe('Bearer mytoken');
  });

  test('omits Authorization header when no token', async () => {
    mockOk({ success: true, data: [] });
    await get('/api/test');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['Authorization']).toBeUndefined();
  });

  test('returns the parsed response body', async () => {
    mockOk({ success: true, data: [1, 2, 3] });
    const result = await get('/api/test', 'tok');
    expect(result.data).toEqual([1, 2, 3]);
  });
});

describe('post()', () => {
  test('sends a POST request with a JSON body', async () => {
    mockOk({ success: true });
    await post('/api/test', { name: 'Aragorn' }, 'tok');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Aragorn' });
  });
});

describe('put()', () => {
  test('sends a PUT request', async () => {
    mockOk({ success: true });
    await put('/api/test', { level: 5 }, 'tok');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('PUT');
  });
});

describe('del()', () => {
  test('sends a DELETE request', async () => {
    mockOk({ success: true });
    await del('/api/test', 'tok');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('DELETE');
  });
});

describe('error handling', () => {
  test('throws with server error message on non-ok status', async () => {
    mockFail({ success: false, error: 'Not authorized' }, 401);
    await expect(get('/api/test', 'tok')).rejects.toThrow('Not authorized');
  });

  test('throws on success:false even when HTTP status is 200', async () => {
    mockOk({ success: false, error: 'Character not found' });
    await expect(get('/api/test', 'tok')).rejects.toThrow('Character not found');
  });

  test('falls back to "Something went wrong" when no error message', async () => {
    mockFail({ success: false });
    await expect(get('/api/test', 'tok')).rejects.toThrow('Something went wrong');
  });
});
