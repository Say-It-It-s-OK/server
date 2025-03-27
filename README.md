# Say_it_it's_ok - API Server

Node.js 기반의 음성 인식 키오스크 서비스 백엔드 서버입니다.  
사용자의 음성 혹은 터치 입력을 받아 제품 주문 및 추천 기능을 제공하며,  
MongoDB를 통해 데이터 저장 및 조회를 처리합니다.

--------------------------------------------------------

## 프로젝트 구조

Say_it_it's_ok/
└── server/
    ├── index.js                  # 앱 진입점
    ├── routes/                   # API 엔드포인트
    │   ├── query.js              # query 관련 API (추천, 메뉴 확인 등)
    │   ├── order.js              # 주문 관련 API (장바구니 추가/변경/삭제)
    ├── controllers/              # 로직 처리
    │   ├── queryController.js
    │   ├── orderController.js
    ├── models/                   # MongoDB 모델
    │   ├── Order.js
    │   ├── CartItem.js
    │   └── Menu.js
    ├── services/                 # 응답 생성 서비스 (text 생성 등)
    │   └── responseGenerator.js
    ├── utils/                    # 공통 유틸
    │   └── errorHandler.js
    ├── db/
    │   └── mongoose.js           # MongoDB 연결
    ├── swagger/
    │   └── swagger.js            # Swagger 세팅
    ├── .env
    ├── .gitignore
    └── package.json



---

## 🚀 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 또는
node index.js
```

