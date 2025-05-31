const Menu = require("../models/menu");
const Order = require("../models/orders");
const cache = require("../utils/BackendCache");
const sessionHelper = require("../utils/sessionHelper");

exports.handleConfirm = async (req, res) => {
  const sessionId = sessionHelper.ensureSession(req);
  const { request, payload } = req.body;
  const { target, categories = [], item = {} } = payload;

  const typeMap = {
    coffee: "커피",
    decaffeine: "디카페인",
    drink: "음료",
    dessert: "디저트",
  };


  try {
    if (target === "menu") {
      // 카테고리별 메뉴 확인
      const result = await Menu.find(
        categories.length > 0 ? { type: { $in: categories } } : {}
      );
      const pageValue = categories.length === 1 ? categories[0] : "menu";

      return res.json({
        response: request,
        speech: `${categories.join(", ")} 메뉴 보여드릴게요.`,
        page: pageValue,
        items: result,
      });

    } else if (target === "cart") {
      const cart = cache.getCart(sessionId);
      console.log("[DEBUG] 세션 ID:", sessionId);
      console.log("[DEBUG] 장바구니 조회 결과:", cart);

      return res.json({
        response: request,
        speech: "지금 담으신 내역이에요.",
        page: "confirm_cart",
        sessionId,
        items: cart || [],
      });

    } else if (target === "order") {
      const cart = cache.getCart(sessionId);
      const matchCategories = categories.map(c => typeMap[c] || c);

      const filtered = cart?.filter(menu => {
        const matchName = !item.name || menu.name === item.name;
        const matchTemp = !item.temperature || menu.temperature === item.temperature;
        const matchSize = !item.size || menu.size === item.size;
        const matchShot = !item.shot || menu.shot === item.shot;
        const matchCategory = matchCategories.length === 0 || matchCategories.includes(menu.type);

        return matchName && matchTemp && matchSize && matchShot && matchCategory;
      }) || [];

      return res.json({
        response: request,
        speech: "메뉴는 이렇게 주문 들어가 있어요.",
        page: "confirm_order",
        sessionId,
        items: filtered,
      });

    } else if (target === "price") {
      const cart = cache.getCart(sessionId) || [];

      const totalPrice = cart.reduce((acc, item) => acc + (item.price || 0) * (item.count || 1), 0);

      return res.json({
        response: request,
        speech: `가격은 총 ${totalPrice}원이에요.`,
        page: "confirm_price",
        sessionId,
        total: totalPrice,
      });

    } else {
        return res.json({
          response: "query.error",
          speech: "그 부분은 도와드릴 수 없어요. 다시 말씀해주세요.",
          page: "error"
        });
    }
  } catch (err) {
    console.error("confirm 처리 오류:", err);
    return res.json({
      response: "query.error",
      speech: "그 부분은 도와드릴 수 없어요. 다시 말씀해주세요.",
      page: "error"
    });
  }
};
