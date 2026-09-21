# SentinelOps AI

**Universal Omnichannel Reverse Logistics & Autonomous Dispute Arbitrator Middleware**

SentinelOps AI adalah platform B2B SaaS Middleware berbasis *Event-Driven Architecture (EDA)* dan *Hexagonal Architecture*. Sistem ini bertindak sebagai lapisan arbitrase cerdas terpadu yang mencegat sengketa *e-commerce* dari berbagai saluran penjualan (Shopee, TikTok Shop, dll.), menganalisis bukti secara otonom, dan meneruskan keputusan mutasi berbasis aturan deterministik.

## Tech Stack
- **Runtime**: Node.js 20+ LTS / TypeScript 5.x
- **Framework**: Fastify (Backend) / React 18 & Vite (Frontend)
- **Database**: PostgreSQL 16 (dengan Kysely Query Builder)
- **Queue & Cache**: Redis 7 + BullMQ
- **AI Integration**: OpenAI GPT-4o Vision + Zod Structured Outputs
- **State & Real-time**: Zustand, Server-Sent Events (SSE)
- **Testing**: Vitest

## Step-by-Step Technical Setup

Ikuti panduan berikut untuk menjalankan infrastruktur dan aplikasi di lingkungan lokal Anda.

### 1. Instalasi Dependensi
Pastikan `pnpm` sudah terpasang di sistem Anda.
```bash
pnpm install
```

### 2. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Pastikan port tidak bentrok dan secret key untuk HMAC sesuai untuk keperluan *testing* lokal.

### 3. Setup Infrastruktur Database & Cache
Sistem membutuhkan PostgreSQL dan Redis. Gunakan Docker Compose untuk menjalankan keduanya secara terisolasi.
```bash
docker-compose up -d
```
*Technical Note*: Saat container PostgreSQL berjalan untuk pertama kalinya, Docker akan mem-mount file `db.sql` ke dalam `/docker-entrypoint-initdb.d/init.sql` dan mengeksekusinya secara otomatis untuk membuat skema DDL (Tabel, Enum, Index, Trigger) dan *seed data*.

Untuk memverifikasi container berjalan dengan baik:
```bash
docker-compose ps
```

### 4. Menjalankan Server Development (Backend)
Jalankan Fastify dalam mode *watch* menggunakan `tsx` dari *root directory*:
```bash
pnpm run dev
```
Server akan mengikat pada alamat `0.0.0.0` dan *port* sesuai dengan isi konfigurasi `.env` (default `9000`).

### 5. Menjalankan Operations Cockpit (Frontend)
Masuk ke direktori `frontend/` dan jalankan Vite server:
```bash
cd frontend
pnpm install
pnpm run dev
```
Buka browser di `http://localhost:5173` untuk mengakses dasbor real-time.

### 6. Pengujian Unit (Unit Testing)
Jalankan *test suite* yang memverifikasi *HMAC signature*, validasi Zod, dan logika *Idempotency lock* dari BullMQ/Redis:
```bash
pnpm test
```

## Arsitektur & Alur Kerja (Ingestion Flow)

1. **Webhook Endpoint (`POST /api/v1/disputes/evaluate`)**
   - Menerima payload dari *marketplace*.
   - Mengekstrak header `x-marketplace-source`, `x-signature`, dan `x-tenant-id`.
   - Menggunakan `verifyHmacSha256` dengan `crypto.timingSafeEqual` untuk memvalidasi *signature* dari raw payload *body*.

2. **Adapters & Normalisasi**
   - Payload dilempar ke *adapter* spesifik (Shopee/TikTok) untuk dipetakan ke format `CanonicalDisputeEvent`.
   - Payload divalidasi ketat oleh *Zod schema*.

3. **Idempotency & Enqueue**
   - Menginisialisasi *lock* di Redis dengan kunci `idempotency:evt:{event_id}` menggunakan operasi `SET ... NX EX 86400` (TTL 24 jam).
   - Bila *event* baru, data didorong ke dalam antrean `dispute-evaluation-queue` di BullMQ dan Fastify mengembalikan HTTP `202 Accepted`.
   - Bila *event* duplikat (idempotent), koneksi Redis memblokirnya dan Fastify mengembalikan HTTP `200 OK`.

## Struktur Direktori Kunci
- `src/index.ts`: Entry point Fastify.
- `src/routes/ingestion.route.ts`: Handler HTTP.
- `src/schemas/canonical-dispute.ts`: Zod schema untuk kontrak data *canonical*.
- `src/queues/dispute-queue.ts`: Setup BullMQ dan Redis Idempotency.
- `src/adapters/`: Mapper spesifik per-*marketplace*.
- `src/db/`: Koneksi Postgres dan referensi tipe *Kysely*.
- `src/utils/crypto.ts`: Utilitas kriptografi untuk HMAC.
- `tests/`: *Test suite* berbasis Vitest.
