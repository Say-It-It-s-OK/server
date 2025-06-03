// controllers/orderController.js
const Menu = require("../models/menu");
const Order = require("../models/orders");
const cache = require("../utils/BackendCache");
const sessionHelper = require("../utils/sessionHelper");
const { v4: uuidv4 } = require("uuid");

const keyMap = {
  temperature: "온도",
  size: "크기",
  shot: "샷",
  shot_add: "샷 추가",
};

const mapKeys = (obj) => {
  if (!obj) return;
  for (const k in obj) {
    const mapped = keyMap[k];
    if (mapped) {
      obj[mapped] = obj[k];
      delete obj[k];
    }
  }
};

const buildOptionSpeech = (itemName, missingOptions, allOptions) => {
  const temps = allOptions["온도"] || ["따뜻한", "차가운"];
  const sizes = allOptions["크기"] || ["스몰", "미디움", "라지"];
  const hasTemp = missingOptions.includes("온도");
  const hasSize = missingOptions.includes("크기");

  if (hasTemp && hasSize) {
    return `${itemName}는 ${temps.join(", ")} 중에서 그리고 사이즈는 ${sizes.join(", ")} 중에서 골라주시면 돼요.`;
  }

  if (hasTemp) {
    return `${itemName}는 ${temps[0]} 거로 드릴까요, ${temps[1]} 거로 드릴까요?`;
  }

  if (hasSize) {
    return `${itemName}는 ${sizes.join(", ")} 중에 어떤 걸로 드릴까요?`;
  }

  return `${itemName} 옵션을 선택해주세요.`;
};

const buildOptionUpdateSpeech = (options) => {
  if (!options || Object.keys(options).length === 0) return "옵션을 변경했어요.";

  const phrases = [];

  for (const [key, value] of Object.entries(options)) {
    if (key === "온도") {
      if (value.includes("따뜻") || value === "핫") {
        phrases.push("따뜻한 걸로 바꿔드릴게요.");
      } else {
        phrases.push("아이스로 바꿔드릴게요.");
      }
    } else if (key === "크기") {
      phrases.push(`${value}로 바꿔드릴게요.`);
    } else if (key === "샷") {
      if (value === "없음" || value === "0") {
        phrases.push("샷 빼드릴게요.");
      } else {
        phrases.push(`샷 ${value}로 해드릴게요.`);
      }
    } else {
      phrases.push(`${key} ${value}로 바꿔드릴게요.`);
    }
  }

  return phrases.join(" ");
};

const finalizeItem = async (rawItem) => {
  const menu = await Menu.findOne({ name: rawItem.name });
  if (!menu) return null;

  const options = menu.options || {};
  const optionPrices = menu.optionPrices || {};
  const selectedOptions = { ...(rawItem.selectedOptions || {}) };

  if (rawItem.options) {
    mapKeys(rawItem.options);
    ["온도", "크기", "샷", "샷 추가"].forEach((key) => {
      if (rawItem.options[key]) {
        selectedOptions[key] = rawItem.options[key];
      }
    });
  }

  if ((menu.type === "커피" || menu.type === "디카페인") && !selectedOptions["샷"] && options["샷"]?.length) {
    selectedOptions["샷"] = "보통";
  }

  // ✅ 디폴트 샷 추가 설정 (음료)
  if (menu.type === "음료" && !selectedOptions["샷 추가"] && options["샷 추가"]?.includes("없음")) {
    selectedOptions["샷 추가"] = "없음";
  }

  // ✅ 온도 필드 제거 (온도 선택이 필요 없는 음료는 제거)
  if (menu.type === "음료") {
    const 온도옵션 = options["온도"];
    if (Array.isArray(온도옵션) && 온도옵션.length === 1) {
      delete selectedOptions["온도"];
    }
  }



  // ✅ 옵션 가격 계산
  let finalPrice = menu.price;

  for (const key in selectedOptions) {
    const value = selectedOptions[key];

    if (optionPrices instanceof Map) {
      const inner = optionPrices.get(key);
      if (inner instanceof Map && inner.has(value)) {
        finalPrice += inner.get(value);
      }
    } else if (typeof optionPrices === "object") {
      if (optionPrices[key] && optionPrices[key][value] !== undefined) {
        finalPrice += optionPrices[key][value];
      }
    }
  }

  return {
    ...rawItem,
    selectedOptions,
    options,
    ingredient: menu.ingredient,
    tag: menu.tag,
    id: menu.id,
    caffeine: menu.caffeine,
    price: menu.price,
    _id: menu._id,
    image: menu.image,
  };
};

const handleNextItem = async (sessionId, request, res) => {
  console.log("[handleNextItem] 호출됨");

  const session = await sessionHelper.getSession(sessionId);
  const queue = session.itemQueue || [];

  if (queue.length === 0) {
    const cart = cache.getCart(sessionId);
    const names = cart.map(item => item.name);
    const counted = {};

    names.forEach(name => {
      counted[name] = (counted[name] || 0) + 1;
    });

    const nameList = Object.entries(counted)
      .map(([name, count]) => `${name}${count > 1 ? ` ${count}개` : ""}`)
      .join(", ");

    console.log("[handleNextItem] 모든 항목 처리 완료 → order_add 응답");
    return res.json({
      response: "query.sequence",
      sessionId,
      results: [
        {
          response: request,
          page: "order_add",
          speech: `${nameList} 장바구니에 추가했어요.`
        }
      ]
    });
  }

  const item = queue[0];
  const menu = await Menu.findOne({ name: item.name });

  if (!menu) {
    console.log("[handleNextItem] 메뉴 정보 없음 → 건너뜀");
    queue.shift();
    await sessionHelper.saveSession(sessionId, session);
    return handleNextItem(sessionId, request, res); // 다음 항목으로 재귀
  }

  const options = menu.options || {};
  item.options = item.options || {};
  mapKeys(item.options);

  const required = [];
  if (menu.type === "커피" || menu.type === "디카페인") {
    required.push("온도", "크기");
  } else if (menu.type === "음료") {
    if (Array.isArray(options["온도"]) && options["온도"].length === 1) {
      required.push("크기");
    } else {
      required.push("온도", "크기");
    }
  }

  const missing = required.filter((key) => !item.options[key]);
  if (missing.length > 0) {
    const pendingId = uuidv4();
    cache.addPendingOrder(sessionId, {
      currentAction: "order.add",
      pendingItem: item,
      needOptions: missing,
      allOptions: options,
      id: pendingId
    });

    await sessionHelper.saveSession(sessionId, session);

    console.log("[handleNextItem] 옵션 누락 → pending 상태로 전환");
    return res.json({
      response: "query.sequence",
      sessionId,
      results: [
        {
          response: request,
          page: "order_option_required",
          speech: `${item.name}의 ${missing.join("와 ")}을(를) 선택해주세요.`,
          item: await finalizeItem(item),
          needOptions: missing,
          options,
          pendingid: pendingId
        }
      ]
    });
  }

  // ✅ 옵션이 모두 입력된 경우
  const finalizedItem = await finalizeItem(item);
  cache.addToCart(sessionId, finalizedItem);
  queue.shift();
  await sessionHelper.saveSession(sessionId, session);

  console.log("[handleNextItem] 옵션 완료 → 장바구니 추가 및 개별 응답");

  return res.json({
    response: "query.sequence",
    sessionId,
    results: [
      {
        response: request,
        page: "order_add",
        speech: `${finalizedItem.name}을(를) 장바구니에 추가했어요.`,
        items: [finalizedItem]
      }
    ]
  });
};

exports.handleOrder = async (req, res) => {
  const sessionId = sessionHelper.ensureSession(req);
  const { request, payload } = req.body;
  const { page } = payload;
  const actionType = request.split(".")[2];

  if (actionType === "add") {
    const items = payload.items || [];
    const results = [];

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({
        response: request,
        sessionId,
        speech: "메뉴를 추가하였습니다.",
        page: "add_menu"
      });
    }


    for (const item of items) {
      const menu = await Menu.findOne({ name: item.name });
      if (!menu) {
        results.push({
          response: "query.error",
          sessionId,
          speech: `죄송해요, ${item.name}은(는) 아직 준비되지 않은 메뉴예요. 다른 메뉴로 도와드릴까요?`,
          page: "error"
        });
        continue;
      }

      const options = menu.options || {};
      item.options = item.options || {}; // ✅ 안전 초기화
      mapKeys(item.options);

      const required = [];

      if (menu.type === "커피" || menu.type === "디카페인") {
        required.push("온도", "크기");
      } else if (menu.type === "음료") {
        const 온도옵션 = options["온도"];
        if (Array.isArray(온도옵션) && 온도옵션.length === 1) {
          // ✅ 온도 옵션이 하나뿐이면 자동 지정
          item.options["온도"] = 온도옵션[0];
          required.push("크기");
        } else {
          required.push("온도", "크기");
        }
      }

      const missing = required.filter((key) => !item.options?.[key]);

      // ✅ 여기부터 로그 찍기
      console.log("[추적] 메뉴:", item.name);
      console.log(" - 입력 옵션:", item.options);
      console.log(" - 필수 옵션:", required);
      console.log(" - 누락된 옵션:", missing);

      if (missing.length > 0) {
        console.log(" ✅ pending 등록됨:", item.name);
        const pendingId = uuidv4();
        cache.addPendingOrder(sessionId, {
          currentAction: "order.add",
          pendingItem: item,
          needOptions: missing,
          allOptions: options,
          id: pendingId
        });

        results.push({
          response: request,
          page: "order_option_required",
          speech: buildOptionSpeech(item.name, missing, options),
          item: await finalizeItem(item),
          needOptions: missing,
          options,
          pendingid: pendingId
        });
      } else {
        const finalizedItem = await finalizeItem(item);
        cache.addToCart(sessionId, finalizedItem);
        results.push({
          response: request,
          page: "order_add",
          speech: `${item.name} 추가했어요.`,
          items: [finalizedItem]
        });
      }
    }

    return res.json({
      response: "query.sequence",
      sessionId,
      results
    });
  }
    
  if (actionType === "update") {
    const itemList = payload.items || [];
    const item = itemList[0] || {};
    const pendingId = payload.id;
    const session = await sessionHelper.getSession(sessionId);

    const pendingOrders = cache.getPendingOrder(sessionId);
    const cart = cache.getCart(sessionId);

    // 옵션을 한글 key로 매핑
    itemList.forEach(item => {
      if (item.options) mapKeys(item.options);
      if (item.from?.options) mapKeys(item.from.options);
      if (item.to?.options) mapKeys(item.to.options);
    });

    // ① from → to 구조 처리 (옵션 교체)
    if (item.from && item.to) {
      const index = cart.findIndex(cartItem => {
        if (cartItem.name !== item.from.name) return false;
        const selOpts = cartItem.selectedOptions || {};
        const fromOpts = item.from.options || {};
        return Object.entries(fromOpts).every(
          ([key, value]) => selOpts[key] === value
        );
      });

      if (index !== -1) {
        cart[index].selectedOptions = {
          ...(cart[index].selectedOptions || {}),
          ...(item.to.options || {})
        };

        cache.setCart(sessionId, cart);

        return res.json({
          response: request,
          sessionId,
          speech: buildOptionUpdateSpeech(item.to.options),
          page: "order_update"
        });
      }

      return res.json({
        response: "query.error",
        sessionId,
        speech: "장바구니에서 변경할 메뉴를 찾지 못했어요. 다시 한 번 확인해주시겠어요?",
        page: "error"
      });
    }

    // 1️⃣ pending 처리 (옵션만 보완한 경우)
    if (!item.name) {
      if (pendingOrders.length > 0) {
        let pending = pendingOrders.find((p) => p.id === pendingId) || pendingOrders[0];
        console.log("이것좀 보세요", pending)

        const updatedItem = {
          ...pending.pendingItem,
          selectedOptions: {
            ...(pending.pendingItem.selectedOptions || {}),
            ...(item.options || {})
          }
        };

        const stillMissing = pending.needOptions.filter(
          (opt) =>
            !updatedItem.selectedOptions ||
            updatedItem.selectedOptions[opt] === undefined ||
            updatedItem.selectedOptions[opt] === null
        );

        if (stillMissing.length === 0) {
          const finalizedItem = await finalizeItem(updatedItem);
          cache.addToCart(sessionId, finalizedItem);
          cache.removePendingOrder(sessionId, pending.id);
          cache.clearPendingOrder(sessionId);
          session.itemQueue = session.itemQueue || [];
          session.itemQueue.shift();
          await sessionHelper.saveSession(sessionId, session);

          // ✅ 다음 항목으로 자동 이동 ❌ → 여기서 한 항목만 응답
          return res.json({
            response: "query.sequence",
            sessionId,
            results: [
              {
                response: "query.order.add",
                page: "order_option_resolved",
                speech: `${finalizedItem.name} 추가했어요.`,
                items: [finalizedItem]
              }
            ]
          });
        } else {
          cache.updatePendingOrder(sessionId, pending.id, {
            ...pending,
            pendingItem: updatedItem,
            needOptions: stillMissing,
          });

          const finalizedInfo = await finalizeItem(updatedItem);

          return res.json({
            response: "query.order.add",
            sessionId,
            speech: buildOptionSpeech(updatedItem.name, stillMissing, pending.allOptions),
            page: "order_option_resolved",
            item: finalizedInfo,
            needOptions: stillMissing,
            options: pending.allOptions,
            pendingid: pending.id,
          });
        }
      }
      // ✅ 🌟 장바구니 1개만 있을 경우 → 자동 업데이트
      if (page === "장바구니" && item.options && Object.keys(item.options).length > 0) {
        if (cart.length === 1) {
          const targetItem = cart[0];
          targetItem.selectedOptions = {
            ...(targetItem.selectedOptions || {}),
            ...item.options
          };
          cache.setCart(sessionId, cart);
          return res.json({
            response: request,
            sessionId,
            speech: buildOptionUpdateSpeech(item.options),
            page: "order_update"
          });
        } else {
          return res.json({
            response: request,
            sessionId,
            speech: "장바구니에 여러 개가 있어서 어떤 걸 바꿀지 몰라요. 메뉴 이름도 말씀해 주세요.",
            page: "error"
          });
        }
      }

      if (item.options && Object.keys(item.options).length > 0) {
        return res.json({
          response: request,
          sessionId,
          speech: `옵션을 선택하였습니다.`,
          page: "option_resolved",
          selectedOptions: item.options
        });
      }
      return res.json({
        response: request,
        sessionId,
        speech: "옵션을 변경하였습니다.",
        page: "update_options"
      });
    }

    // 2️⃣ 장바구니 직접 수정 (이름+옵션 명시한 경우)
    let isCartUpdated = false;

    for (const targetItem of itemList) {
      const cartItem = cart.find(c => {
        if (c.name !== targetItem.name) return false;
        return Object.entries(targetItem.options || {}).every(
          ([key, value]) => c.selectedOptions[key] !== undefined
        ) || Object.keys(targetItem.options || {}).length === 0;
      });

      if (cartItem) {
        cartItem.selectedOptions = {
          ...(cartItem.selectedOptions || {}),
          ...(targetItem.options || {})
        };
        isCartUpdated = true;
      }
    }

    if (isCartUpdated) {
      cache.setCart(sessionId, cart);
      return res.json({
        response: request,
        sessionId,
        speech: buildOptionUpdateSpeech(itemList[0].options),
        page: "order_update"
      });
    }

    return res.json({
      response: "query.error",
      sessionId,
      speech: "장바구니에서 변경할 메뉴를 찾지 못했어요. 다시 한 번 확인해주시겠어요?",
      page: "error"
    });
  }


  if (actionType === "delete") {
    const items = payload.items || [];

    if (page === "장바구니 옵션" && (!Array.isArray(items) || items.length === 0)) {
      return res.json({
        response: request,
        sessionId,
        speech: "메뉴를 삭제하였습니다.",
        page: "option_delete"
      });
    }

    const cart = cache.getCart(sessionId);
    const updatedCart = [...cart]; // 복사본
    let deletedCount = 0;
    let notFoundNames = [];


    for (const target of items) {
      mapKeys(target.options); // keyMap 적용

      // 항목 하나씩 찾아서 삭제
      const index = updatedCart.findIndex(cartItem => {
        if (cartItem.name !== target.name) return false;

        const selOpts = cartItem.selectedOptions || {};
        const tgtOpts = target.options || {};

        // 옵션이 있는 경우 정확히 일치해야 삭제
        return Object.keys(tgtOpts).every(
          key => selOpts[key] === tgtOpts[key]
        );
      });

      // 일치하는 항목 삭제
      if (index !== -1) {
        updatedCart.splice(index, 1);
        deletedCount++;
      }
      else{
        notFoundNames.push(target.name);
      }
    }

    cache.setCart(sessionId, updatedCart);
    // ❗ 삭제된 항목 없음 + 이름도 안 맞음 → 에러 처리
    if (deletedCount === 0 && notFoundNames.length > 0) {
      return res.json({
        response: "query.error",
        sessionId,
        speech: `${notFoundNames.join(", ")}(은)는 장바구니에 없어요.`,
        page: "error"
      });
    }


    return res.json({
      response: request,
      speech: `${items.length}개 메뉴 빼드렸어요.`,
      sessionId,
      page: "cart_delete"
    });
  }

  if (actionType === "pay") {
    const cart = cache.getCart(sessionId);
    const now = new Date();
    const orderId = "ORD" + now.toISOString().replace(/[-T:\.Z]/g, "").slice(0, 14);

    // ✅ 메뉴별로 그룹핑 후 수량 계산
    const itemMap = new Map();

    for (const item of cart) {
      const key = item.id;
      if (!itemMap.has(key)) {
        itemMap.set(key, { ...item, quantity: 1 });
      } else {
        itemMap.get(key).quantity += 1;
      }
    }

    
    // ✅ 총액 계산: price × quantity 반영
    const total = [...itemMap.values()].reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (total === 0) {
      return res.json({
        response: "query.error",
        sessionId,
        speech: "결제할 항목이 없어요.",
        page: "error"
      });
    }


    for (const [, item] of itemMap) {
      // 👉 콘솔에 저장될 데이터 출력
      console.log("[DB 저장 예정]", {
      order_id: orderId,
      order_date: now,
      menu_id: item.id,
      quantity: item.quantity
      });

      await Order.create({
        order_id: orderId,
        order_date: now,
        menu_id: item.id,
        quantity: item.quantity
      });
    }

    cache.clearSession(sessionId);

    return res.json({
      response: request,
      speech: `총 ${total}원입니다. 감사합니다!`,
      sessionId,
      page: "order_pay",
      total
    });
  }

  return res.json({
    response: "query.error",
    sessionId,
    speech: "죄송해요, 아직 지원하지 않는 주문 유형이에요. 다시 한 번 말씀해주시겠어요?",
    page: "error"
  });
};