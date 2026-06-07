async function request(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export const get  = (url, token)        => request('GET',    url, null, token);
export const post = (url, body, token)  => request('POST',   url, body, token);
export const put  = (url, body, token)  => request('PUT',    url, body, token);
export const del  = (url, token)        => request('DELETE', url, null, token);
