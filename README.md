# Vita (versi web + Supabase)

Aplikasi pendamping kesehatan pribadi (jadwal obat ARV, kontrol, timeline kesehatan).
Setiap pengguna login dengan akun sendiri (email & password), dan datanya tersimpan
di database cloud [Supabase](https://supabase.com) — aman, privat per akun, dan bisa
diakses dari perangkat mana saja.

## 1. Setup Supabase (sekali saja)

1. Buka [supabase.com](https://supabase.com), sign up / login, klik **New Project**.
   Catat **Database Password** yang kamu buat (untuk jaga-jaga, jarang dipakai langsung).
2. Setelah project selesai dibuat (± 1-2 menit), buka menu **SQL Editor** di sidebar kiri.
3. Klik **New query**, buka file [`supabase/schema.sql`](./supabase/schema.sql) dari project
   ini, copy-paste seluruh isinya ke SQL Editor, lalu klik **Run**.
   Ini akan membuat semua tabel, aturan keamanan (Row Level Security), dan trigger yang
   dibutuhkan aplikasi.
4. Buka menu **Settings → API**. Catat dua nilai ini:
   - **Project URL**
   - **anon public** key (bagian "Project API keys")
5. (Opsional tapi disarankan) Di **Authentication → Providers → Email**, kamu bisa matikan
   "Confirm email" kalau tidak mau pengguna wajib klik link verifikasi email dulu sebelum
   bisa login pertama kali.

## 2. Menjalankan secara lokal

```bash
cp .env.example .env
# lalu isi .env dengan Project URL & anon key dari langkah di atas

npm install
npm run web      # buka di browser, http://localhost:8081
```

## 3. Publish ke Vercel

### Opsi A — lewat browser (auto-update tiap kali kamu push ke GitHub)

1. Push project ini ke GitHub.
2. Buka **vercel.com** → sign up/login → **Add New... → Project → Import Git Repository**,
   pilih repo tadi.
3. Sebelum klik Deploy, buka bagian **Environment Variables**, tambahkan:
   | Name | Value |
   |---|---|
   | `EXPO_PUBLIC_SUPABASE_URL` | Project URL dari Supabase |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | anon public key dari Supabase |
4. Klik **Deploy**. Setelah selesai, situsnya live di `https://nama-project.vercel.app`.
5. Setiap push berikutnya ke GitHub akan otomatis di-build & di-deploy ulang oleh Vercel.

### Opsi B — lewat terminal (tanpa GitHub)

```bash
npm install -g vercel
cd vita-web
vercel                      # login & konfirmasi ikuti instruksi di terminal
```

Saat pertama kali deploy, Vercel akan menanyakan Environment Variables — masukkan
`EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY` seperti di atas. Kalau
sudah pernah diisi lewat dashboard, `vercel` di terminal akan otomatis memakainya.
Jalankan `vercel --prod` untuk publish ke domain production.

> Kalau env var ini belum diisi, aplikasi tetap bisa dibuka tapi login/daftar tidak akan
> berfungsi (akan muncul peringatan warna merah di halaman login).

## 4. (Alternatif) Publish ke GitHub Pages

Repo ini juga sudah dilengkapi `.github/workflows/deploy.yml` untuk GitHub Pages, kalau
suatu saat ingin pakai itu selain/daripada Vercel:

1. Di GitHub repo → **Settings → Secrets and variables → Actions**, tambahkan repository
   secret `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. **Settings → Pages → Source**, pilih **GitHub Actions**.
3. Push ke branch `main` — situsnya live di `https://<username>.github.io/<repo>/`.

## Fitur & keterbatasan

- **Login per akun** — data tiap pengguna terpisah total (Row Level Security di database),
  tidak ada satu pun pengguna lain yang bisa melihat data kesehatanmu.
- **Sinkron lintas perangkat** — karena datanya di cloud (bukan lagi di `localStorage`
  seperti versi sebelumnya), kamu bisa buka dari HP maupun laptop dengan akun yang sama.
- **Export/Import CSV** tetap ada di menu Pengaturan, berguna untuk migrasi data dari versi
  lokal lama, atau sekadar backup manual.
- **Pengingat/notifikasi terjadwal** (jam minum obat, H-3/H-1 kontrol) tidak berfungsi di
  browser — keterbatasan platform web itu sendiri (browser tidak bisa menjalankan alarm
  terjadwal di background), bukan bug.
- PIN lock di menu Pengaturan adalah kunci tambahan lokal (mis. supaya orang lain yang
  pinjam HP/laptop kamu tidak bisa buka-buka), terpisah dari login akun Supabase.
