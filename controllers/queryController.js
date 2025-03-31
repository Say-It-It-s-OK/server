exports.handleQuery = (req, res) => {
  const { request } = req.body;

  let response = { text: "", buttons: [] };

  switch (request) {
    case "query.recommend.popular": // 인기 메뉴 추천
      response.text =
        "가장 인기 있는 메뉴는 아이스 아메리카노입니다. 주문하시겠습니까?";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
        { label: "Hot/Cold 선택", action: "choose_temperature" },
        { label: "Small/Medium/Large", action: "choose_size" },
      ];
      break;

    case "query.recommend.cafe": // 커피 추천
      response.text = "추천 커피는 아메리카노 카푸치노 등이 있습니다.";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
        { label: "Hot/Cold 선택", action: "choose_temperature" },
        { label: "Small/Medium/Large", action: "choose_size" },
        { label: "진하게/보통/연하게", action: "choose_strength" },
      ];
      break;

    case "query.recommend.decafein": // 디카페인 커피 추천
      response.text =
        "추천 디카페인 음료는 디카페인 아메리카노, 디카페인 카푸치노 등이 있습니다.";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
        { label: "Hot/Cold 선택", action: "choose_temperature" },
        { label: "Small/Medium/Large", action: "choose_size" },
      ];
      break;

    case "query.recommend.dessert":
      response.text = "추천 디저트는 티라미수입니다.";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
      ];
      break;

    case "query.confirm.menu": // 전체 메뉴
      response.text = "전체 메뉴입니다.";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "인기 메뉴 보기", action: "view_popular" },
        { label: "제로 칼로리 메뉴 보기", action: "view_zero" },
      ];
      break;

    case "query.confirm.order":
      response.text = "주문 내역을 확인해 주세요";
      response.buttons = [
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
      ];
      break;

    case "query.confirm.cost":
      response.text = "총 결제 금액은 12,000원 입니다.";
      response.buttons = [
        { label: "결제하기", action: "complete_payment" },
        { label: "장바구니 보기", action: "view_cart" },
      ];
      break;

    case "query.choose_temperature":
      response.text = "온도를 선택해주세요: Hot 또는 Cold";
      response.buttons = [
        { label: "HOT", action: "choose_hot" },
        { label: "COLD", action: "choose_cold" },
      ];
      break;

    case "query.choose_size":
      response.text = "사이즈를 선택해주세요: Small, Medium, Large";
      response.buttons = [
        { label: "Small", action: "choose_small" },
        { label: "Medium", action: "choose_medium" },
        { label: "Large", action: "choose_large" },
      ];
      break;

    case "query.choose_strength":
      response.text = "진한 정도를 선택해주세요: 진하게, 보통, 연하게";
      response.buttons = [
        { label: "진하게", action: "choose_strong" },
        { label: "보통", action: "choose_medium_strength" },
        { label: "연하게", action: "choose_light" },
      ];
      break;

    case "query.cancel.order": // 초기 화면으로 돌아가기
      response.text =
        "초기 화면으로 돌아가시겠습니까? 장바구니 상품은 전부 취소됩니다.";
      response.buttons = [
        { label: "초기 화면", action: "go_home" },
        { label: "주문 계속하기", action: "continue_order" },
      ];
      break;

    case "query.exit": // 주문 종료
      response.text = "주문을 종료합니다. 감사합니다.";
      response.buttons = [];
      break;

    default:
      response.text = "요청을 처리할 수 없습니다.";
      response.buttons = [];
      break;
  }

  res.json(response);
};
