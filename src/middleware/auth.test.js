const { requireRole } = require('./auth');

function mockRes() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('requireRole()', () => {
  test('calls next() when the user role is in the allowed list', () => {
    const req  = { userRole: 'admin' };
    const res  = mockRes();
    const next = jest.fn();

    requireRole('admin', 'moderator')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 403 when the user role is not in the allowed list', () => {
    const req  = { userRole: 'member' };
    const res  = mockRes();
    const next = jest.fn();

    requireRole('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Insufficient permissions',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts any role from a multi-role allow-list', () => {
    const roles = ['admin', 'moderator'];

    for (const role of roles) {
      const req  = { userRole: role };
      const res  = mockRes();
      const next = jest.fn();

      requireRole('admin', 'moderator')(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  test('blocks a member even when multiple roles are allowed', () => {
    const req  = { userRole: 'member' };
    const res  = mockRes();
    const next = jest.fn();

    requireRole('admin', 'moderator')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
