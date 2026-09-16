-- ============================================================
-- Migrasi: nomor darurat jadi multi-kontak (max 3, dengan nama)
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- (Aman dijalankan walau kolomnya sudah ada - tidak akan error/duplikat)
-- ============================================================

alter table profiles add column if not exists emergency_contacts jsonb default '[]'::jsonb;

-- Migrasi otomatis: kalau user sudah pernah isi "emergency_contact" versi lama (teks polos),
-- pindahkan jadi kontak pertama di daftar baru (tanpa nama, biar user bisa lengkapi nanti).
update profiles
set emergency_contacts = jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'name', '', 'phone', emergency_contact))
where emergency_contact is not null
  and emergency_contact <> ''
  and (emergency_contacts is null or emergency_contacts = '[]'::jsonb);
