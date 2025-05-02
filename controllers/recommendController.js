const Menu = require("../models/menu");
const Order = require('../models/orders');

exports.handleRecommend = async (req, res) => {
  const { request, payload } = req.body;

  const typeMap = {
    coffee: "커피",
    drink: "음료",
    decaffeine: "디카페인",
    dessert: "디저트",
  };

  if (request === "query.recommend") {
    const { categories, filters } = payload || {};
    const { tag } = filters || {};

    const matchType = Array.isArray(categories) && categories.length > 0
      ? categories.map(c => typeMap[c] || c)
      : [];

    try {
      // 태그가 있는 경우
      if (Array.isArray(tag) && tag.length > 0) {
        const includePopular = tag.includes("popular");
        const filteredTags = tag.filter(t => t !== "popular");

        const matchQuery = {
          ...(matchType.length > 0 ? { "menu.type": { $in: matchType } } : {})
        };

        if (filteredTags.length > 0) {
          matchQuery["menu.tag"] = { $in: filteredTags };
        }

        if (includePopular) {
          // popular 태그만 있는 경우 or 다른 태그도 있는 경우 → 조건에 맞는 메뉴 중 판매량 상위 2개
          const results = await Order.aggregate([
            {
              $lookup: {
                from: "Menu",
                localField: "menu_id",
                foreignField: "id",
                as: "menu"
              }
            },
            { $unwind: "$menu" },
            { $match: matchQuery },
            {
              $group: {
                _id: "$menu.id",
                id: { $first: "$menu.id" },
                name: { $first: "$menu.name" },
                type: { $first: "$menu.type" },
                price: { $first: "$menu.price" },
                totalOrders: { $sum: "$quantity" }
              }
            },
            { $sort: { totalOrders: -1 } },
            { $limit: 2 }
          ]);

          return res.json({
            response: "query.recommend",
            speech: "인기 기준으로 추천해드릴게요.",
            page: "recommend_custom",
            items: results
          });
        } else {
          // popular가 없고 다른 태그만 있으면 랜덤 추천
          const menuMatch = {
            ...(matchType.length > 0 ? { type: { $in: matchType } } : {}),
            tag: { $in: filteredTags }
          };

          const results = await Menu.aggregate([
            { $match: menuMatch },
            { $sample: { size: 1 } }
          ]);

          return res.json({
            response: "query.recommend",
            speech: "태그 기준으로 랜덤 추천해드릴게요.",
            page: "recommend_custom",
            items: results
          });
        }
      }

      // 태그가 없고 카테고리만 있을 경우 랜덤 추천
      const matchQuery = matchType.length > 0 ? { type: { $in: matchType } } : {};
      const results = await Menu.aggregate([
        { $match: matchQuery },
        { $sample: { size: 1 } }
      ]);

      return res.json({
        response: "query.recommend",
        speech: "카테고리 내에서 랜덤으로 추천해드릴게요.",
        page: "recommend_custom",
        items: results
      });
    } catch (err) {
      console.error("추천 조회 오류:", err);
      res.status(500).json({ error: "추천 처리 중 오류가 발생했습니다." });
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
}