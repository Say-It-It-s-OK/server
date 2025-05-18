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
            speech: "메뉴를 말씀하시면 주문, 조건을 말씀하시면 추천해드려요. 결제나 장바구니 확인도 가능해요.",
            page: "help",
          });
        } else if (intent === "exit") {
          cache.clearSession(sessionId);
          results.push({
            response: "query.exit",
            speech: "주문 여기까지 진행할게요. 감사합니다!",
            page: "exit",
          });
        } else if (intent === "error") {
          results.push({
            response: "query.error",
            speech: "그건 제가 도와드릴 수 없는 부분이에요. 주문하실 메뉴나 추천이 필요하시면 말씀해주세요.",
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
        console.log("[CART] FETCH:", {
          sessionId,
          cart: cache.getCart(sessionId),
        });
        return queryController.handleConfirm(req, res, payload);
        
      }

      if (action === "help") {
        return res.json({
          response: "query.help",
          speech: "메뉴를 말씀하시면 주문, 조건을 말씀하시면 추천해드려요. 결제나 장바구니 확인도 가능해요.",
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
            speech: "그건 제가 도와드릴 수 없는 부분이에요. 주문하실 메뉴나 추천이 필요하시면 말씀해주세요.",
            page: "error",
          });
        }
        return res.json({
          response: "query.error",
          speech: "그건 제가 도와드릴 수 없는 부분이에요. 주문하실 메뉴나 추천이 필요하시면 말씀해주세요.",
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
            speech: "네, 그거로 준비해드릴게요.",
            page: "confirm",
          });
        }
        if (replyAction === "reject") {
          return res.json({
            response: "query.reply",
            speech: "그럼 다른 메뉴 추천해볼게요",
            page: "recommend_retry",
          });
        }

        return res.status(400).json({ error: "알 수 없는 reply action입니다." });
      }

      if (action === "exit") {
        if (sessionId) cache.clearSession(sessionId);
        return res.json({
          response: "query.exit",
          speech: "주문 여기까지 진행할게요. 감사합니다!",
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