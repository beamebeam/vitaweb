-- ============================================================
-- Migrasi: tandai obat yang didapat saat kontrol tertentu
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- (Aman dijalankan walau kolomnya sudah ada - tidak akan error/duplikat)
-- ============================================================

-- Kalau botol obat ini dikaitkan ke suatu kontrol, dan kontrolnya dihapus,
-- botol obatnya TETAP ada (cuma tidak lagi terhubung ke kontrol manapun) -
-- makanya "on delete set null", bukan cascade.
alter table stock_history add column if not exists control_visit_id uuid references control_visits(id) on delete set null;
