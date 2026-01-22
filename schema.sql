-- sales_records (매출 상세 데이터)
CREATE TABLE sales_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_date DATE NOT NULL,
    category VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    total_amount INTEGER NOT NULL,
    discount_amount INTEGER NOT NULL,
    net_amount INTEGER NOT NULL,
    payment_method VARCHAR(255),
    source VARCHAR(50) NOT NULL CHECK (source IN ('POS', 'MANUAL'))
);

-- daily_summary (일별 합계)
CREATE TABLE daily_summary (
    sale_date DATE PRIMARY KEY,
    total_sales INTEGER NOT NULL DEFAULT 0,
    pos_sales INTEGER NOT NULL DEFAULT 0,
    manual_sales INTEGER NOT NULL DEFAULT 0
);

-- manual_inputs (영업 외 매출 수기 입력 내역)
CREATE TABLE manual_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment explaining the tables
COMMENT ON TABLE sales_records IS 'Contains detailed sales data from both POS and manual inputs.';
COMMENT ON TABLE daily_summary IS 'Aggregates daily sales totals for quick reporting.';
COMMENT ON TABLE manual_inputs IS 'Stores records of manually entered off-premise sales.';
