const Menu = require("../models/menu");
const Order = require('../models/orders');

exports.handleQuery = async (req, res) => {
  const { request } = req.body;

  const typeMap = {
    coffee: "커피",
    drink: "음료",
    decafein: "디카페인",
    dessert: "디저트",
  };

  // query.recommend.[type]
  if (request.startsWith("query.recommend.")) {
    const typeKey = request.split(".")[2];
    const menuType = typeMap[typeKey];

    if (!menuType) {
      return res.status(400).json({ error: "유효하지 않은 추천 타입입니다." });
    }

    try {
      // 메뉴 판매량 기준 상위 3개 추천
      const topMenus = await Order.aggregate([
        {
          $lookup: {
            from: "Menu", // 실제 MongoDB 컬렉션 이름에 따라 'menus'일 수도 있음
            localField: "menu_id",
            foreignField: "id",
            as: "menu"
          }
        },
        { $unwind: "$menu" },
        { $match: { "menu.type": menuType } },
        {
          $group: {
            _id: "$menu_id",
            name: { $first: "$menu.name" },
            type: { $first: "$menu.type" },
            price: { $first: "$menu.price" },
            totalOrders: { $sum: "$quantity" }
          }
        },
        { $sort: { totalOrders: -1 } },
        { $limit: 3 }
      ]);

      return res.json({
        response: "query.recommend",
        speech: `${menuType} 메뉴 중 인기 메뉴를 추천해드릴게요`,
        page: typeKey,
        items: topMenus
      });
    } catch (err) {
      console.error("추천 API 오류:", err);
      return res.status(500).json({ error: "추천 처리 중 오류 발생" });
    }
  }  

  // query.recommend.cost.low(타입도 같이 넣음)
  if (request === "query.recommend.cost.low") {
    const maxPrice = Number(price);
    const menuType = type ? typeMap[type] : null;

    if (!maxPrice || isNaN(maxPrice)) {
      return res.status(400).json({ error: "유효한 가격 값이 필요합니다." });
    }

    const matchStage = {
      "menu.price": { $lte: maxPrice }
    };
    if (menuType) matchStage["menu.type"] = menuType;

    try {
      const filteredMenus = await Order.aggregate([
        {
          $lookup: {
            from: "Menu",
            localField: "menu_id",
            foreignField: "id",
            as: "menu"
          }
        },
        { $unwind: "$menu" },
        { $match: matchStage },
        {
          $group: {
            _id: "$menu_id",
            id: { $first: "$menu.id" },
            name: { $first: "$menu.name" },
            type: { $first: "$menu.type" },
            price: { $first: "$menu.price" },
            totalOrders: { $sum: "$quantity" }
          }
        },
        { $sort: { totalOrders: -1 } } // ← limit 제거로 전체 추천
      ]);

      const speechText = menuType
        ? `${maxPrice}원 이하의 ${menuType} 메뉴를 추천해드릴게요`
        : `${maxPrice}원 이하의 메뉴를 추천해드릴게요`;

      return res.json({
        response: "query.recommend",
        speech: speechText,
        page: "recommend_price_low",
        items: filteredMenus
      });
    } catch (err) {
      console.error("가격 + 타입 필터 추천 오류:", err);
      return res.status(500).json({ error: "추천 처리 중 오류 발생" });
    }
  }
  
  // query.confirm.menu
  if (request.startsWith("query.confirm.menu.")) {
    const typeKey = request.split(".")[3];
    const menuType = typeMap[typeKey];

    if (!menuType) {
      return res
        .status(400)
        .json({ error: "유효하지 않은 메뉴 카테고리입니다." });
    }

    try {
      const menus = await Menu.find({ type: menuType });
      return res.json({
        response: "query.confirm",
        speech: `고객님 요청에 따라 ${menuType} 메뉴를 보여드립니다`,
        page: typeKey,
        items: menus,
      });
    } catch (err) {
      return res.status(500).json({ error: "메뉴 조회 실패" });
    }
  }

  // query.confirm.cart
  if (request === "query.confirm.cart") {
    return res.json({
      response: "query.confirm",
      speech: "고객님 요청에 따라 장바구니를 보여드립니다",
      page: "cart",
    });
  }

  // query.confirm.details
  if (request === "query.confirm.details") {
    return res.json({
      response: "query.confirm",
      speech: "고객님 요청에 따라 결제 내용을 보여드립니다",
      page: "details",
    });
  }

  return res.status(400).json({ error: "지원하지 않는 request 타입입니다." });
};
