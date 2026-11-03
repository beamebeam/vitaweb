-- ============================================================
-- Migrasi: catatan untuk log "kurangi butir obat" (obat rusak/hilang/dibuang, dsb)
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- (Aman dijalankan walau kolomnya sudah ada - tidak akan error/duplikat)
-- ============================================================

alter table medicine_logs add column if not exists note text;
