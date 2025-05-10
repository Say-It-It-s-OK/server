const recommendController = require("./recommendController");
const queryController = require("./queryController");
const orderController = require("./orderController");
const cache = require("../utils/BackendCache");

exports.handleNLPRequest = async (req, res) => {
  const { request, payload } = req.body;
  const [group, action, subaction] = request.split(".");

  console.log("[NLP 요청 수신]", request, payload);

  try {
    // 1. query 그룹 처리
    if (group === "query") {
      if (action === "recommend") {
        return recommendController.handleRecommend(req, res, payload);
      }

      if (action === "confirm") {
        return queryController.handleConfirm(req, res, payload);
      }

      if (action === "help") {
        return res.json({
          response: "query.help",
          speech: "키오스크 사용법을 알려드릴게요. 메뉴를 말하면 추천이나 주문을 도와드려요!",
          page: "help",
        });
      }

      if (action === "error") {
        const { action: subAction } = payload;
        if (subAction === "retry") {
          return recommendController.handleRecommend(req, res, null, "retry");
        }
        if (subAction === "accept" || subAction === "reject") {
          return res.json({
            response: "query.error",
            speech: "알겠습니다. 다른 요청을 말씀해주세요.",
            page: "error",
          });
        }
        return res.json({
          response: "query.error",
          speech: "죄송해요. 무슨 말인지 잘 이해하지 못했어요.",
          page: "error",
        });
      }

      if (action === "exit") {
        const sessionId = req.body.sessionId;
        if (sessionId) cache.clearSession(sessionId);
        return res.json({
          response: "query.exit",
          speech: "주문을 종료할게요. 감사합니다!",
          page: "exit",
        });
      }

      // query.order.x 요청도 예외적으로 허용
      if (request.startsWith("query.order.")) {
        return orderController.handleOrder(req, res);
      }
    }

    return res.status(400).json({ error: "알 수 없는 요청입니다." });
  } catch (err) {
    console.error("NLP 처리 중 오류:", err);
    return res.status(500).json({ error: "서버 내부 오류" });
  }
};