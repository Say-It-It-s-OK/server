const { v4: uuidv4 } = require("uuid");
const Menu = require("../models/menu");
const Order = require("../models/orders");
const cache = require("../utils/BackendCache");
const sessionHelper = require("../utils/sessionHelper");

exports.handleRecommend = async (req, res, payloadArg = null, actionArg = null) => {
  const sessionId = sessionHelper.ensureSession(req); 
  const { request, payload: bodyPayload, action: bodyAction } = req.body;
  const currentSessionId = sessionId;
  cache.initSession(currentSessionId);

  const payload = payloadArg || bodyPayload;
  const action = actionArg || bodyAction;

  const typeMap = {
    coffee: "커피",
    drink: "음료",
    decaffeine: "디카페인",
    dessert: "디저트",
  };

  if (request === "query.recommend" || action === "retry") {
    let filtersPayload = payload;
    if (action === "retry") {
      filtersPayload = cache.getLastFilters(currentSessionId);
      if (!filtersPayload) {
        return res.json({
          response: "query.error",
          speech: "어떤 기준으로 추천해드릴까요?",
          page: "error"
        });
      }
    }

    const { categories = [], filters = {} } = filtersPayload || {};
    const {
      tag = [],
      caffeine,
      price = {},
      include_ingredients = [],
      exclude_ingredients = [],
      count = 1
    } = filters;

    const matchType = categories.map(c => typeMap[c] || c);
    const includePopular = tag.includes("popular");
    const filteredTags = tag.filter(t => t !== "popular");

    const excluded = cache.getRecommendedIds(currentSessionId, filtersPayload);

    const buildMatchStage = () => {
      const andConditions = [];

      if (matchType.length > 0) andConditions.push({ type: { $in: matchType } });
      if (filteredTags.length > 0) andConditions.push({ tag: { $in: filteredTags } });

      if (caffeine) {
        const caffeineMap = { decaffeine: "decaffeine", caffeine: "caffeine" };
        andConditions.push({ caffeine: caffeineMap[caffeine] || caffeine });
      }

      if (include_ingredients.length > 0) {
        andConditions.push({ ingredient: { $all: include_ingredients } });
      }

      if (exclude_ingredients.length > 0) {
        andConditions.push({ ingredient: { $not: { $in: exclude_ingredients } } });
      }

      if (price.min || price.max) {
        const priceFilter = {};
        if (price.min) priceFilter.$gte = price.min;
        if (price.max) priceFilter.$lte = price.max;
        andConditions.push({ price: priceFilter });
      }

      if (excluded.length > 0) {
        andConditions.push({ id: { $nin: excluded } });
      }

      return andConditions.length > 0 ? { $and: andConditions } : {};
    };

    try {
      const match = buildMatchStage();

      if (filters.group_counts) {
        const groupCounts = filters.group_counts;
        const groupResults = [];

        for (const [key, count] of Object.entries(groupCounts)) {
          const matchStage = [];

          if (["커피", "음료", "디카페인", "디저트"].includes(key)) {
            // ✅ 카테고리 기반
            matchStage.push({ type: key });
          } else if (key.startsWith("tag:")) {
            const [, category, tag] = key.split(":");
            matchStage.push({ type: category, tag: tag });
          } else {
            // ✅ 태그 기반
            matchStage.push({ tag: key });
          }

          const matched = await Menu.aggregate([
            { $match: { $and: matchStage } },
            { $sample: { size: count } }
          ]);

          groupResults.push(...matched);
        }

        if (groupResults.length > 0) {
          cache.addRecommendations(currentSessionId, filtersPayload, groupResults);
        }

        const names = groupResults.map(i => i.name).join(", ");
        const responseSpeech = names.length === 0 ? "추천드릴 메뉴가 없어요." : `${names} 어떠세요?`;

        return res.json({
          response: "query.recommend",
          speech: responseSpeech,
          page: "recommend_custom",
          sessionId: currentSessionId,
          items: groupResults,
        });
      }

      if (includePopular) {
        const menuMatch = match.$and
          ? {
              $and: match.$and.map(condition => {
                const remap = {};
                for (const key in condition) {
                  remap[`menu.${key}`] = condition[key];
                }
                return remap;
              }),
            }
          : {};

        const results = await Order.aggregate([
          {
            $lookup: {
              from: "Menu",
              localField: "menu_id",
              foreignField: "id",
              as: "menu",
            },
          },
          { $unwind: "$menu" },
          { $match: menuMatch },
          {
            $group: {
              _id: "$menu.id",
              id: { $first: "$menu.id" },
              name: { $first: "$menu.name" },
              type: { $first: "$menu.type" },
              price: { $first: "$menu.price" },
              image: { $first: "$menu.image" },    
              options: { $first: "$menu.options" },
              ingredient: { $first: "$menu.ingredient" },
              totalOrders: { $sum: "$quantity" },
            },
          },
          { $sort: { totalOrders: -1 } },
          { $limit: count },
        ]);

        const names = results.map(item => item.name).join(", ");
        const responseSpeech = results.length === 0
          ? "더 이상 추천드릴 메뉴가 없어요."
          : `${names}가 인기가 많아요.`;
        
        if (results.length > 0) {
          cache.addRecommendations(currentSessionId, filtersPayload, results);
        }

        return res.json({
          response: "query.recommend",
          speech: responseSpeech,
          page: "recommend_custom",
          currentSessionId,
          items: results,
          title: "추천 메뉴",

        });
      } else {
        const pipeline = [];

        if (Object.keys(match).length > 0) pipeline.push({ $match: match });

        if (price.sort === "asc") {
          pipeline.push({ $sort: { price: 1 } });
        } else if (price.sort === "desc") {
          pipeline.push({ $sort: { price: -1 } });
        } else {
          pipeline.push({ $sample: { size: count } });
        }

        if (price.sort) pipeline.push({ $limit: count });

        const results = await Menu.aggregate(pipeline);

        const names = results.map(item => item.name).join(", ");
        const responseSpeech = results.length === 0
          ? "조건에 딱 맞는 메뉴는 없는 것 같아요."
          : `${names} 어떠세요?`;
        
        if (results.length > 0) {
          cache.addRecommendations(currentSessionId, filtersPayload, results);
        }

        return res.json({
          response: "query.recommend",
          speech: responseSpeech,
          page: "recommend_custom",
          sessionId: currentSessionId,
          items: results,
          title: "추천 메뉴",
        });
      }
    } catch (err) {
      console.error("추천 오류:", err);
      return res.json({
        response: "query.error",
        speech: "어떤 기준으로 추천해드릴까요?",
        page: "error"
      });
    }
  }

  return res.json({
    response: "query.error",
    speech: "죄송해요, 해당 요청은 처리할 수 없어요. 다시 한번 말씀해주시겠어요?",
    page: "error"
  });
};