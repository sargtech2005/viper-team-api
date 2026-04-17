const express    = require('express');
const router     = express.Router();
const apiKeyCheck = require('../../middleware/apiKeyCheck');

// All /api/v1/* routes require a valid API key
router.use(apiKeyCheck);

router.use('/utility', require('./utility'));
router.use('/fun',     require('./fun'));
router.use('/search',  require('./search'));
router.use('/info',    require('./info'));
router.use('/media',   require('./media'));

// Meta endpoint — returns caller's plan info
router.get('/me', (req, res) => {
  res.json({
    success: true,
    plan:       req.apiUser.planName,
    api_limit:  req.apiUser.apiLimit,
    calls_used: req.apiUser.callsUsed,
    calls_left: req.apiUser.apiLimit - req.apiUser.callsUsed,
  });
});

module.exports = router;
