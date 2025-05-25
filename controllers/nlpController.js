const recommendController = require("./recommendController");
const queryController = require("./queryController");
const orderController = require("./orderController");
const cache = require("../utils/BackendCache");
const sessionHelper = require("../utils/sessionHelper");

exports.handleNLPRequest = async (req, res) => {
  const { request, payload } = req.body;
  const sessionId = sessionHelper.ensureSession(req);
  console.log("[NLP 요청 수신]", request, payload);

  try {
    if (request === "query.sequence") {
      const {
        intents = [],
        filters = {},
        items = [],
        categories = [],
        target,
        action
      } = payload;

      const results = [];

      const createTempRes = () => {
        const tempRes = {};
        tempRes.json = (result) => {
          // ✅ 중첩된 query.sequence 응답이면 내부 results만 flatten
          if (result?.response === "query.sequence" && Array.isArray(result.results)) {
            results.push(...result.results);
          } else {
            results.push(result);
          }
        };
        return tempRes;
      };

      for (const intent of intents) {
        const tempRes = createTempRes();

        req.body = {
          request: `query.${intent}`,
          payload: { filters, items, categories, target, action },
          sessionId
        };

        if (intent === "order.update") {
          await orderController.handleOrder(req, tempRes);
        } else if (intent.startsWith("recommend")) {
          await recommendController.handleRecommend(req, tempRes, req.body.payload);
        } else if (intent.startsWith("order.")) {
          await orderController.handleOrder(req, tempRes);
        } else if (intent === "confirm") {
          await queryController.handleConfirm(req, tempRes);
        } else if (intent === "help") {
          results.push({
            response: "query.help",
            speech: "키오스크 사용법을 알려드릴게요. 메뉴를 말하면 추천이나 주문을 도와드려요!",
            page: "help",
          });
        } else if (intent === "exit") {
          cache.clearSession(sessionId);
          results.push({
            response: "query.exit",
            speech: "주문을 종료할게요. 감사합니다!",
            page: "exit",
          });
        } else if (intent === "error") {
          results.push({
            response: "query.error",
            speech: "죄송해요. 무슨 말인지 잘 이해하지 못했어요.",
            page: "error",
          });
        } else {
          results.push({ error: `알 수 없는 intent: ${intent}` });
        }
      }

      return res.json({
        response: "query.sequence",
        sessionId,
        results,
      });
    }

    // ✅ 단일 intent 처리
    const [group, action, subaction] = request.split(".");

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

      if (action === "reply") {
        const { action: replyAction } = payload;

        if (replyAction === "retry") {
          return recommendController.handleRecommend(req, res, null, "retry");
        }
        if (replyAction === "accept") {
          return res.json({
            response: "query.reply",
            speech: "좋아요! 선택하신 메뉴로 진행할게요.",
            page: "confirm",
          });
        }
        if (replyAction === "reject") {
          return res.json({
            response: "query.reply",
            speech: "알겠습니다. 다른 메뉴를 추천해드릴게요.",
            page: "recommend_retry",
          });
        }

        return res.status(400).json({ error: "알 수 없는 reply action입니다." });
      }

      if (action === "exit") {
        if (sessionId) cache.clearSession(sessionId);
        return res.json({
          response: "query.exit",
          speech: "주문을 종료할게요. 감사합니다!",
          page: "exit",
        });
      }

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