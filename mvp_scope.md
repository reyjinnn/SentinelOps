# **MVP SCOPE & ROADMAP: SentinelOps AI**

**Universal Omnichannel Minimum Viable Product Scope, Implementation Specifications, and Engineering Roadmap**

*Document Version: 2.1.0-PROD | Status: Approved Implementation Specification*

---

## 1\. Sasaran & Filosofi MVP Omnichannel

Tujuan utama MVP adalah membuktikan kelayakan teknis dan ekonomi dari **SentinelOps AI Cockpit & Decision Middleware** dalam menangani sengketa e-commerce lintas marketplace (Shopee, TikTok Shop, Tokopedia, Shopify) dan lintas kurir (SPX, J\&T, SiCepat) dengan akurasi tinggi dan latensi sub-2.5 detik.

### 1.1. Metrik Keberhasilan MVP (KPIs):

1. **Zero Financial Hallucination**: 0.00% mutasi saldo yang dipicu langsung oleh LLM tanpa melewati matriks aturan matematika deterministik.  
2. **Automation Throughput**: Minimal 80% dari total sengketa uji berisiko rendah terselesaikan secara otonom tanpa eskalasi manusia.  
3. **Processing Latency**: Rata-rata waktu evaluasi dari webhook masuk hingga status keputusan di bawah 2.2 detik.  
4. **Legal Compliance**: Dokumen sanggahan yang dihasilkan (*Dispute Dossier*) memuat seluruh klausul wajib marketplace dan data telemetri kurir yang terverifikasi.

---

## 2\. Batasan Ruang Lingkup MVP (In-Scope vs. Out-of-Scope)

| Komponen | Dalam Lingkup MVP (In-Scope) | Luar Lingkup MVP (Fase 2 / Fase 3\) |
| :---- | :---- | :---- |
| **Kanal Penjualan** | \- Adapter webhook untuk Shopee dan TikTok Shop (Lengkap) \- Generic REST Webhook Ingestion untuk Tokopedia & Shopify D2C | \- Integrasi OAuth live multi-tenant otomatis ke 10+ marketplace regional (Lazada, Blibli, Bukalapak) \- Sinkronisasi katalog produk otomatis dua arah |
| **Kanal Ekspedisi Kurir** | \- Telemetri kurir SPX Express & J\&T Express \- Mock/Generic Telemetry Ingestion untuk kurir lainnya | \- Integrasi langsung ke 15+ API kurir lokal (JNE, SiCepat, Anteraja, Ninja Van) \- Integrasi IoT timbangan bluetooth di gudang penjual |
| **Frontend Cockpit (React)** | \- SPA 3-Panel responsif (Harness, Live Trace, Decision Room) \- Filter marketplace & store connection selector \- Realtime terminal log via Server-Sent Events (SSE) \- Dossier viewer dengan 1-klik salin Markdown | \- Aplikasi mobile (iOS/Android via React Native) \- Drag-and-drop dossier template visual builder \- Role-Based Access Control granular (granular RBAC UI) |
| **Sensor Forensik AI** | \- OpenAI GPT-4o Vision API \+ Structured Outputs (Zod) \- Deteksi foto kemasan kosong, bekas sobekan, dan lakban ganda | \- Analisis video unboxing durasi panjang (\> 60 detik) \- Fine-tuned model computer vision lokal (YOLOv10) \- Deteksi sentimen suara/audio keluhan pembeli |
| **Mesin Keputusan** | \- Deterministic Decision Matrix (Green, Red, Yellow lanes) \- Perhitungan deviasi berat fisik kurir vs katalog SKU \- Hard constraint plafon transaksi & refund harian | \- Dynamic risk pricing berbasis pembelajaran mesin (ML) \- Cross-Merchant Fraud Intelligence Network (jaringan blacklist pembeli terdesentralisasi) |
| **Penyimpanan Basis Data** | \- PostgreSQL 16 Multi-Tenant & Multi-Store Schema \- Redis 7 \+ BullMQ untuk job buffer & idempotensi | \- Multi-region active-active database replication \- Data warehouse analitik OLAP (ClickHouse / Snowflake) |

---

## 3\. Matriks Skenario Uji MVP (4 End-to-End Test Fixtures)

Untuk validasi fungsional dan demonstrasi langsung, sistem MVP menyediakan 4 skenario uji siap pakai:

### Skenario A: Shopee — Valid Return (Green Lane / Happy Path)

- **Marketplace**: Shopee Indonesia | **Kurir**: SPX Express  
- **Payload Data**:  
  - SKU: KB-MECH-RGB-01 (Berat Katalog: 1.250g)  
  - Nilai Pesanan: Rp 42.000 (Di bawah plafon Rp 50.000)  
  - Timbangan Kurir: Hub Inbound 1.250g, Driver Handover 1.220g (Deviasi 2.4%)  
  - Bukti Pembeli: Foto switch keyboard patah (Foto relevan, tidak ada bekas sayatan luar)  
- **Hasil Evaluasi**:  
  - AI Risk Score: 8 / 100 | Confidence: 0.95 | Tamper Detected: FALSE  
  - Keputusan Deterministik: **AUTO\_REFUND** (Green Lane).  
  - SLA: 0.45 detik. Tiket ditutup otomatis tanpa membebani staf CS.

### Skenario B: TikTok Shop — Empty Box Fraud (Red Lane)

- **Marketplace**: TikTok Shop | **Kurir**: J\&T Express  
- **Payload Data**:  
  - SKU: EARBUDS-ANC-PRO (Berat Katalog: 350g)  
  - Nilai Pesanan: Rp 850.000  
  - Timbangan Kurir: Hub Inbound 350g, Driver Handover 45g (Deviasi 87.1%)  
  - Bukti Pembeli: Foto kotak terbuka kosong tanpa unit earbuds di dalamnya  
- **Hasil Evaluasi**:  
  - AI Risk Score: 94 / 100 | Tamper Detected: TRUE (Indikasi lakban disilet ulang)  
  - Keputusan Deterministik: **ESCROW\_FROZEN** (Red Lane).  
  - Aksi Sistem: Dana escrow dikunci, klaim ditolak, terbit Dispute Dossier sesuai klausul perlindungan penjual TikTok Shop. Nilai kerugian dicegah: Rp 850.000.

### Skenario C: Tokopedia — Courier Weight Tampering (Red Lane)

- **Marketplace**: Tokopedia | **Kurir**: SiCepat  
- **Payload Data**:  
  - SKU: SMARTPHONE-5G-128GB (Berat Katalog: 550g)  
  - Nilai Pesanan: Rp 2.800.000  
  - Timbangan Kurir: Hub Inbound 550g, Driver Handover 1.200g (Deviasi 118% \- diisi pemberat)  
- **Hasil Evaluasi**:  
  - AI Risk Score: 88 / 100 | Deviasi Berat: 650g  
  - Keputusan Deterministik: **ESCROW\_FROZEN** (Red Lane).  
  - Aksi Sistem: Kunci escrow dan rekomendasikan klaim ganti rugi asuransi ekspedisi kurir.

### Skenario D: Shopify D2C — High-Value Borderline Claim (Yellow Lane)

- **Marketplace**: Shopify D2C | **Kurir**: JNE Express  
- **Payload Data**:  
  - SKU: DESIGNER-JACKET-BLK (Berat Katalog: 800g)  
  - Nilai Pesanan: Rp 3.500.000 (Jauh melampaui plafon otomatis Rp 200.000)  
  - Foto Bukti: Foto gelap buram, tidak jelas apakah barang cacat atau salah ukuran.  
- **Hasil Evaluasi**:  
  - AI Risk Score: 45 / 100 | Confidence: 0.62  
  - Keputusan Deterministik: **ESCALATE\_HUMAN** (Yellow Lane).  
  - Aksi Sistem: Mutasi dibekukan sementara, berkas dilimpahkan ke antrean supervisor manusia dengan rekomendasi investigasi awal.

---

## 4\. Rencana Kerja Rekayasa (4-Sprint Engineering Plan)

- **Sprint 1 (Fondasi Data & Webhook Ingestion)**:  
  - Setup skema PostgreSQL 16 dan Redis BullMQ.  
  - Implementasi *Canonical Ingestion Port* dan adapter Shopee & TikTok Shop.  
  - Pengujian idempotensi dan verifikasi signature HMAC-SHA256.  
- **Sprint 2 (Sensor Forensik AI & Matriks Aturan)**:  
  - Integrasi OpenAI GPT-4o Vision API dengan validasi runtime Zod.  
  - Implementasi modul *Deterministic Decision Matrix* (decision-engine.ts).  
  - Unit testing menyeluruh pada seluruh batas ambang matematis (100% test coverage).  
- **Sprint 3 (Frontend React Operations Cockpit)**:  
  - Pembangunan layout 3-panel (Event Harness, Terminal Log SSE, Decision Room).  
  - Integrasi koneksi SSE stream milidetik antara backend dan frontend.  
  - Komponen visualisasi metrik *Loss Prevented* dan *Dossier Markdown Viewer*.  
- **Sprint 4 (Integrasi End-to-End & Uji Lapangan)**:  
  - Pengujian end-to-end menggunakan 4 skenario terkalibrasi.  
  - Evaluasi batas latensi (target P95 ≤ 2.2 detik).  
  - Finalisasi dokumentasi API dan deployment container Docker.

&nbsp;