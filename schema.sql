-- sales_orders (주문 단위 통합 테이블: 수익성 분석용 메인 테이블)
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('POS', 'BAEMIN', 'COUPANG', 'MANUAL')),
    order_at TIMESTAMPTZ NOT NULL,
    gross_amount INTEGER NOT NULL DEFAULT 0, -- 고객 결제 총액
    net_amount INTEGER NOT NULL DEFAULT 0,   -- 실 매출액 (정산액)
    is_refund BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(order_number, channel)
);

-- sales_items (주문 내 개별 상품 상세 테이블: 상품별 분석용)
CREATE TABLE sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    options_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- daily_summary (일별 합계 요약: 성능 최적화용)
CREATE TABLE daily_summary (
    sale_date DATE PRIMARY KEY,
    total_sales INTEGER NOT NULL DEFAULT 0,      -- 전체 실매출 합계
    total_gross INTEGER NOT NULL DEFAULT 0,      -- 전체 총매출 합계
    pos_sales INTEGER NOT NULL DEFAULT 0,        -- POS 실매출
    pos_gross INTEGER NOT NULL DEFAULT 0,        -- POS 총매출
    manual_sales INTEGER NOT NULL DEFAULT 0,     -- 수기 실매출
    manual_gross INTEGER NOT NULL DEFAULT 0,     -- 수기 총매출
    baemin_sales INTEGER NOT NULL DEFAULT 0,     -- 배민 실매출
    baemin_gross INTEGER NOT NULL DEFAULT 0,     -- 배민 총매출
    coupang_sales INTEGER NOT NULL DEFAULT 0,    -- 쿠팡 실매출
    coupang_gross INTEGER NOT NULL DEFAULT 0,    -- 쿠팡 총매출
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 테이블 설명 및 컬럼 코멘트 추가
COMMENT ON TABLE sales_orders IS 'Order-level aggregated data from all channels for financial analysis.';
COMMENT ON TABLE sales_items IS 'Detailed items within each order for product-level analysis.';
COMMENT ON TABLE daily_summary IS 'Daily aggregated totals per channel for reporting performance.';

COMMENT ON COLUMN sales_orders.order_number IS '주문번호 (POS는 영수증번호+결제시각 조합)';
COMMENT ON COLUMN sales_orders.channel IS '판매 채널 (POS, BAEMIN, COUPANG, MANUAL)';
COMMENT ON COLUMN sales_orders.order_at IS '주문 일시 (타임존 포함)';
COMMENT ON COLUMN sales_orders.gross_amount IS '총 판매액 (고객이 결제한 전체 금액)';
COMMENT ON COLUMN sales_orders.net_amount IS '실 매출액 (플랫폼 수수료 등을 제외한 실제 정산액)';

COMMENT ON COLUMN sales_items.item_name IS '상품명';
COMMENT ON COLUMN sales_items.quantity IS '수량';
COMMENT ON COLUMN sales_items.total_amount IS '해당 상품의 합계 금액';
