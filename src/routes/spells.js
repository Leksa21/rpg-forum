const express = require('express');
const router  = express.Router();
const { getSpellCatalog } = require('../controllers/spellController');

router.get('/', getSpellCatalog);

module.exports = router;
