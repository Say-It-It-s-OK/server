const { v4: uuidv4 } = require("uuid");
const cache = require("./BackendCache");

function ensureSession(req) {
  let sessionId = req.body.sessionId;

  if (!sessionId) {
    sessionId = uuidv4();
    console.log("[세션 생성] 새 sessionId 발급:", sessionId);
  } else {
    console.log("[세션 유지] 기존 sessionId 사용:", sessionId);
  }

  cache.initSession(sessionId);
  req.body.sessionId = sessionId; // 이후 로직에서 계속 쓰이도록 갱신
  return sessionId;
}

module.exports = {
  ensureSession,
};
