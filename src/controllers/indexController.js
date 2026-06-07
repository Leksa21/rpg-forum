const getHome = (req, res) => {
  res.json({
    status: 'ok',
    message: 'RPG Forum API is running',
    version: '1.0.0',
  });
};

module.exports = { getHome };
