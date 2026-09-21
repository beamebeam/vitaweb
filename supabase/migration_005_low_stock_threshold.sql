-- ============================================================
-- Migrasi: batas "obat segera habis" custom per obat (opsional)
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- (Aman dijalankan walau kolomnya sudah ada - tidak akan error/duplikat)
-- ============================================================

alter table medicines add column if not exists low_stock_threshold numeric;
