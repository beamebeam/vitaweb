-- ============================================================
-- Migrasi: tambah kolom link Google Maps untuk faskes utama
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- (Aman dijalankan walau kolomnya sudah ada - tidak akan error/duplikat)
-- ============================================================

alter table profiles add column if not exists faskes_maps_url text;
