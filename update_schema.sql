-- 1. 카테고리 컬럼을 NULL 허용으로 변경
ALTER TABLE sales_records ALTER COLUMN category DROP NOT NULL;

-- 2. 새로운 컬럼 추가
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(50);
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS pos_number VARCHAR(50);
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS payment_time VARCHAR(20); -- HH:MM:SS 형식
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS is_refund BOOLEAN DEFAULT FALSE;

-- 3. 테이블 코멘트 업데이트
COMMENT ON COLUMN sales_records.receipt_number IS '영수증 번호';
COMMENT ON COLUMN sales_records.pos_number IS '포스 번호';
COMMENT ON COLUMN sales_records.payment_time IS '결제 시각';
COMMENT ON COLUMN sales_records.is_refund IS '반품 여부';
