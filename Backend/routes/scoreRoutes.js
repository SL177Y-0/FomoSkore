const express = require("express");
const { calculateScore,getTotalScore } = require("../controllers/scoreController.js");

const router = express.Router();

// ✅ Use GET request & dynamic parameters
router.get("/get-score/:privyId/:username/:address", calculateScore);

router.post("/get-score", calculateScore);


router.get("/total-score/:privyId", getTotalScore);

module.exports = router;


