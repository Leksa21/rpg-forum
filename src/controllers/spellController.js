const { getCatalog } = require('../data/spells');

const getSpellCatalog = (req, res) => {
  res.json({ success: true, data: getCatalog() });
};

module.exports = { getSpellCatalog };
