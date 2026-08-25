# Zav Recap — Setup Email Mingguan

Semua langkah dapat dilakukan lewat browser. Jangan menaruh Brevo API key di `.env` aplikasi, GitHub, SQL Editor, atau chat.

## 1. Buat Edge Function

1. Buka Supabase Dashboard → Edge Functions.
2. Pilih **Deploy a new function** → **Via Editor**.
3. Gunakan nama `weekly-recap`.
4. Salin seluruh isi `supabase/functions/weekly-recap/index.ts` ke editor.
5. Deploy function.
6. Di pengaturan function, nonaktifkan **Verify JWT**. Function tetap terlindungi oleh header rahasia `x-cron-secret`.

## 2. Buat rahasia cron

Jalankan di terminal Codespaces:

```bash
openssl rand -hex 32
```

Salin hasilnya untuk langkah berikutnya. Jangan kirim nilainya ke siapa pun.

## 3. Isi Edge Function Secrets

Buka Supabase Dashboard → Edge Functions → Secrets, lalu tambahkan:

| Key | Value |
| --- | --- |
| `BREVO_API_KEY` | API key Brevo milikmu |
| `CRON_SECRET` | hasil `openssl rand -hex 32` |
| `BREVO_SENDER_EMAIL` | `ssby3950@gmail.com` |
| `BREVO_SENDER_NAME` | `Zav Recap` |
| `BREVO_REPLY_TO` | `ssby3950@gmail.com` |

`SUPABASE_URL` dan server key Supabase sudah disediakan otomatis untuk Edge Function.

## 4. Isi Supabase Vault

Buka Supabase Dashboard → Database → Vault, lalu buat dua secret:

| Name | Secret |
| --- | --- |
| `zav_recap_project_url` | URL project Supabase, contoh `https://abcdefgh.supabase.co` |
| `zav_recap_cron_secret` | nilai yang sama dengan `CRON_SECRET` |

Project URL dapat dilihat di Settings → API. URL ini bukan Brevo API key.

## 5. Buat tabel log dan jadwal

1. Buka `supabase/weekly-recap-setup.sql`.
2. Salin seluruh isinya ke Supabase SQL Editor.
3. Tekan Run.
4. Hasil terakhir harus menampilkan job `zav-recap-friday-email`, jadwal `55 16 * * 5`, dan `active = true`.

Jadwal database menggunakan UTC. `16:55 UTC` sama dengan `23:55 WIB` pada hari Jumat.

## 6. Kirim email uji coba

1. Buka `supabase/weekly-recap-test.sql`.
2. Salin ke SQL Editor dan Run.
3. Query akan mengembalikan `request_id` karena pemanggilan dilakukan secara asynchronous.
4. Tunggu beberapa detik, cek inbox/spam, Brevo Transactional Logs, dan Supabase Edge Function Logs.

Email uji memiliki awalan subjek `[TEST]` dan tidak menandai recap mingguan sebagai sudah terkirim.

## Perilaku otomatis

- Periode recap: Sabtu 00.00 WIB sampai Jumat 23.55 WIB.
- Tujuan email: `businesses.recap_email` milik masing-masing pengguna.
- Sender dan Reply-To: `ssby3950@gmail.com`.
- Email merinci omzet, modal, hasil usaha kumulatif, order, produk, penjualan per hari, dan jam teramai.
- Pengiriman otomatis dicatat di `weekly_recap_deliveries` untuk mencegah email ganda.
