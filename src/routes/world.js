const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  getRegions, getLocations, getLocation, getSubLocations,
  createLocation, createSubLocation,
} = require('../controllers/worldController');

router.get('/regions',                  getRegions);
router.get('/locations',                getLocations);
router.get('/locations/:id',            getLocation);
router.get('/locations/:cityId/subs',   getSubLocations);

router.post('/locations',     protect, requireRole('admin', 'head_admin'), createLocation);
router.post('/sublocations',  protect, requireRole('admin', 'head_admin'), createSubLocation);

router.post('/seed', protect, requireRole('admin', 'head_admin'), async (req, res) => {
  try {
    const { execFile } = require('child_process');
    const path = require('path');
    execFile('node', [path.join(__dirname, '../seed/worldSeed.js')], (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, data: 'World seeded successfully!' });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
