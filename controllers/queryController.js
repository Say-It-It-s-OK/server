exports.handleQuery = (req, res) => {
  const { request } = req.body;

  let response = { text: "", buttons: [] };

  switch (request) {
    case "query.recommend.popular": // 인기 메뉴
      response.text =
        "가장 인기 있는 커피는 아이스 아메리카노입니다. 주문하시겠습니까?";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
        { label: "Hot/Cold 선택", action: "choose_temperature" },
        { label: "Small/Medium/Large", action: "choose_size" },
        { label: "진하게/보통/연하게", action: "choose_strength" },
      ];
      break;

    case "query.recommend.zero": // 제로 상품
      response.text =
        "제로 칼로리 제품은 아메리카노, 케모마일 티 등이 있습니다.";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
        { label: "Hot/Cold 선택", action: "choose_temperature" },
        { label: "Small/Medium/Large", action: "choose_size" },
      ];
      break;

    case "query.confirm.coffee": // 커피
      response.text = "커피는 아메리카노, 카페라떼, 카푸치노 등이 있습니다.";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
        { label: "Hot/Cold 선택", action: "choose_temperature" },
        { label: "Small/Medium/Large", action: "choose_size" },
        { label: "진하게/보통/연하게", action: "choose_strength" },
      ];
      break;

    case "query.confirm.decaffein": // 디카페인
      response.text = "디카페인 커피는 아메리카노, 카페라떼 등이 있습니다.";
      response.buttons = [
        { label: "장바구니 추가", action: "add_to_cart" },
        { label: "장바구니 보기", action: "view_cart" },
        { label: "주문 완료", action: "complete_order" },
        { label: "Hot/Cold 선택", action: "choose_temperature" },
        { label: "Small/Medium/Large", action: "choose_size" },
        { label: "진하게/보통/연하게", action: "choose_strength" },
      ];
      break;

    case "query.confirm.desert": // 디저트
      response.text = "디저트는 치즈케이크, 초코케이크 등이 있습니다.";
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
