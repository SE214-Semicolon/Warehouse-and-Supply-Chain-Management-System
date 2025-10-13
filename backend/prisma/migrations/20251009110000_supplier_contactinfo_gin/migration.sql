-- Tạo GIN index trên Supplier.contactInfo để tìm kiếm JSONB key/value nhanh hơn
-- Lưu ý: Prisma không natively declare GIN indexes trong schema; áp dụng qua SQL migration
CREATE INDEX IF NOT EXISTS "idx_supplier_contactinfo"
ON "Supplier" USING GIN ("contactInfo");




