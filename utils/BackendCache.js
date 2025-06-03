// utils/BackendCache.js
const { v4: uuidv4 } = require("uuid");

const sessions = {};

function initSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      cart: [],
      filters: {},
      recommended: {},
      pendingOrders: [],
      pendingOrder: null,
    };
  }
}

function ensureSession(req) {
  let sessionId = req.body.sessionId;
  if (!sessionId) {
    sessionId = uuidv4();
    req.body.sessionId = sessionId;
  }
  initSession(sessionId);
  return sessionId;
}

// ✅ 옵션 입력 대기 상태 관리
function setPendingOrder(sessionId, pendingData) {
  initSession(sessionId);
  sessions[sessionId].pendingOrder = pendingData;
  //sessions[sessionId].pendingOrders = [pendingData]; // 하나만 유지
}

function getPendingOrderSingle(sessionId) {
  initSession(sessionId);
  return sessions[sessionId].pendingOrder;
}

function clearPendingOrder(sessionId) {
  initSession(sessionId);
  sessions[sessionId].pendingOrder = null;
  sessions[sessionId].pendingOrders = [];
}

// ✅ 여러 개 저장되는 pendingOrders 리스트
function addPendingOrder(sessionId, pendingData) {
  initSession(sessionId);
  sessions[sessionId].pendingOrders.push(pendingData);
  sessions[sessionId].pendingOrder = pendingData; // 동기화
}

function getPendingOrder(sessionId) {
  initSession(sessionId);
  return sessions[sessionId].pendingOrders;
}

function updatePendingOrder(sessionId, id, updatedData) {
  initSession(sessionId);
  const idx = sessions[sessionId].pendingOrders.findIndex((p) => p.id === id);
  if (idx !== -1) sessions[sessionId].pendingOrders[idx] = updatedData;
  if (sessions[sessionId].pendingOrder?.id === id) {
    sessions[sessionId].pendingOrder = updatedData;
  }
}

function removePendingOrder(sessionId, id) {
  initSession(sessionId);
  sessions[sessionId].pendingOrders = sessions[sessionId].pendingOrders.filter(
    (p) => p.id !== id
  );
  if (sessions[sessionId].pendingOrder?.id === id) {
    sessions[sessionId].pendingOrder = null;
  }
}

// 🛒 장바구니 관련 함수
function addToCart(sessionId, item) {
  initSession(sessionId);
  sessions[sessionId].cart.push(item);
}

function getCart(sessionId) {
  initSession(sessionId);
  return sessions[sessionId].cart;
}

function setCart(sessionId, cartItems) {
  initSession(sessionId);
  sessions[sessionId].cart = cartItems;
}

function updateCartItem(sessionId, index, changes) {
  initSession(sessionId);
  const cart = sessions[sessionId].cart;
  if (!cart[index]) return;

  const target = cart[index];

  // 필수: selectedOptions 객체 초기화
  if (!target.selectedOptions) {
    target.selectedOptions = {};
  }

  // 변경된 옵션만 반영 (selectedOptions 키는 따로)
  for (const key of Object.keys(changes)) {
    if (["온도", "크기", "샷"].includes(key)) {
      target.selectedOptions[key] = changes[key];
    } else {
      target[key] = changes[key]; // 일반 속성 (예: name, count 등)
    }
  }

  cart[index] = target;
  sessions[sessionId].cart = cart;
}

// 🧠 추천 관련 캐시
function addRecommendations(sessionId, filters, items) {
  initSession(sessionId);
  const key = JSON.stringify(filters);
  const newIds = items.map((item) => item.id);
  const existingIds = sessions[sessionId].recommended[key] || [];

  const merged = [...new Set([...existingIds, ...newIds])];
  sessions[sessionId].recommended[key] = merged;

  sessions[sessionId].filters = filters;

  console.log(`[추천 캐시 저장] 세션: ${sessionId}`);
  console.log(`- 조건: ${key}`);
  console.log(`- 추천된 메뉴 ID 누적:`, merged);
}

function getRecommendedIds(sessionId, filters) {
  initSession(sessionId);
  const key = JSON.stringify(filters);
  return sessions[sessionId].recommended[key] || [];
}

function getLastFilters(sessionId) {
  initSession(sessionId);
  return sessions[sessionId].filters;
}

function clearSession(sessionId) {
  delete sessions[sessionId];
}

function getAllSessions() {
  return sessions;
}

module.exports = {
  initSession,
  ensureSession,
  addToCart,
  getCart,
  setCart,
  updateCartItem,
  addRecommendations,
  getRecommendedIds,
  getLastFilters,
  clearSession,
  getAllSessions,
  addPendingOrder,
  updatePendingOrder,
  removePendingOrder,
  getPendingOrder,
  setPendingOrder,
  getPendingOrderSingle,
  clearPendingOrder,
};
