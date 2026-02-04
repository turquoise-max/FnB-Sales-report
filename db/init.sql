-- F&B Dashboard 통합 데이터베이스 스키마

-- 1. 주문 단위 통합 테이블 (수익성 분석용 메인 테이블)
CREATE TABLE IF NOT EXISTS sales_orders (
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

-- 2. 주문 내 개별 상품 상세 테이블 (상품별 분석용)
CREATE TABLE IF NOT EXISTS sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,              -- 매출 날짜
    order_at TIMESTAMPTZ NOT NULL,       -- 주문 일시
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    options_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 일별 합계 요약 테이블 (성능 최적화용)
CREATE TABLE IF NOT EXISTS daily_summary (
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

-- 4. 매출원가(재료비) 테이블
CREATE TABLE IF NOT EXISTS material_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_date DATE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    amount INTEGER NOT NULL DEFAULT 0,
    vendor VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. 판관비 테이블
CREATE TABLE IF NOT EXISTS sg_and_a_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL, -- 임대료, 인건비, 공과금 등
    item_name VARCHAR(255),
    amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. KPI 목표 테이블
CREATE TABLE IF NOT EXISTS kpi_targets (
    target_month DATE PRIMARY KEY, -- '2024-02-01' 형식으로 월 단위 저장
    sales_target INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_at);
CREATE INDEX IF NOT EXISTS idx_sales_items_date ON sales_items(sale_date);
CREATE INDEX IF NOT EXISTS idx_material_costs_date ON material_costs(cost_date);
CREATE INDEX IF NOT EXISTS idx_sg_and_a_costs_date ON sg_and_a_costs(cost_date);

-- 테이블 및 컬럼 코멘트 추가
COMMENT ON TABLE sales_orders IS 'Order-level aggregated data from all channels for financial analysis.';
COMMENT ON TABLE sales_items IS 'Detailed items within each order for product-level analysis.';
COMMENT ON TABLE daily_summary IS 'Daily aggregated totals per channel for reporting performance.';
COMMENT ON TABLE kpi_targets IS 'Monthly KPI sales targets for business tracking.';

COMMENT ON COLUMN sales_orders.order_number IS '주문번호 (POS는 영수증번호+결제시각 조합)';
COMMENT ON COLUMN sales_orders.channel IS '판매 채널 (POS, BAEMIN, COUPANG, MANUAL)';
COMMENT ON COLUMN sales_orders.order_at IS '주문 일시 (타임존 포함)';
COMMENT ON COLUMN sales_orders.gross_amount IS '총 판매액 (고객이 결제한 전체 금액)';
COMMENT ON COLUMN sales_orders.net_amount IS '실 매출액 (플랫폼 수수료 등을 제외한 실제 정산액)';

COMMENT ON COLUMN sales_items.sale_date IS '매출 날짜';
COMMENT ON COLUMN sales_items.order_at IS '주문 일시 (타임존 포함)';
COMMENT ON COLUMN sales_items.item_name IS '상품명';
COMMENT ON COLUMN sales_items.quantity IS '수량';
COMMENT ON COLUMN sales_items.total_amount IS '해당 상품의 합계 금액';