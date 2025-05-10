const express = require('express');
const router = express.Router();
const nlpController = require("../controllers/nlpController.js");


router.post("/handle", nlpController.handleNLPRequest);
module.exports = router;