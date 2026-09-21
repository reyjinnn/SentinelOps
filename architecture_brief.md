# **ARCHITECTURE BRIEF: SentinelOps AI**

**Universal Omnichannel Reverse Logistics & Autonomous Dispute Arbitrator (SaaS)**  
*Document Version: 2.1.0-PROD | Status: Approved Engineering Architecture Specification*  
*Target Ecosystem: Multi-Marketplace (Shopee, TikTok Shop, Tokopedia, Lazada, Shopify) & Multi-Carrier (SPX, J\&T, SiCepat, Anteraja, JNE, Ninja Van)*

---

## 1\. Executive Architecture Overview

SentinelOps AI adalah platform **B2B SaaS Middleware** berbasis *Event-Driven Architecture (EDA)* dan *Hexagonal Architecture (Ports & Adapters)* yang beroperasi secara *headless* dan otonom. Sistem bertindak sebagai lapisan arbitrase cerdas terpadu di antara berbagai saluran penjualan *e-commerce*, telemetri timbangan fisik kurir logistik pihak ketiga, dan tim operasional *merchant*.

### 1.1. Prinsip Utama Rekayasa (Core Engineering Tenets)

1. **Decoupled & Platform-Agnostic (Hexagonal Architecture)**: Domain inti evaluasi sengketa tidak memiliki dependensi terhadap vendor atau marketplace eksternal. Semua event dinormalisasi melalui *Canonical Ingestion Port*.  
2. **Deterministic Financial Guardrails**: Model AI probabilistik (LLM/Vision) **dilarang keras** mengeksekusi mutasi saldo secara sepihak. AI hanya bertindak sebagai *sensor forensik kuantitatif*. Keputusan mutasi status dana (*escrow/refund*) dieksekusi 100% oleh *Deterministic Decision Matrix* berbasis aturan matematika murni dan plafon risiko finansial ketat.  
3. **Sub-2.5s Turnaround SLA**: Menggantikan investigasi manual staf CS (15–20 menit) menjadi pemrosesan otonom end-to-end dalam 1.8–2.2 detik untuk 85% volume kasus komplain berisiko rendah.  
4. **Multi-Carrier Telemetry Aggregator**: Mengabstraksi pengambilan telemetri berat dan status *checkpoint* fisik dari berbagai kurir logistik (baik API langsung maupun agregator logistik).  
5. **Multi-Tenant & Multi-Store Isolation**: Satu akun organisasi merchant (*tenant*) dapat mengelola puluhan toko di berbagai marketplace dengan isolasi data tingkat baris (*Row-Level Security* / RLS) dan enkripsi kredensial API berbasis AES-GCM 256\.

---

## 2\. Diagram Topologi Sistem & Arus Data

Sistem memisahkan alur penerimaan (ingestion), antrean job asinkron (Redis BullMQ), pipa evaluasi (Core Pipeline), dan aliran realtime ke antarmuka operator:

- Webhook Ingestion Port menerima payload dari Shopee, TikTok Shop, Tokopedia, Lazada, dan Shopify.  
- Ingestion Adapter memvalidasi signature HMAC dan menolak event duplikat via Redis Idempotency Lock (24h).  
- Data dinormalisasi menjadi *CanonicalDisputeEvent* dan dimasukkan ke dalam antrean BullMQ.  
- Worker mengambil job dan memproses:  
  - 1\. Sensor Forensik AI (OpenAI GPT-4o Vision) untuk inspeksi fisik kemasan, lakban, dan konsistensi bukti.  
  - 2\. Mesin Keputusan Deterministik (TypeScript) untuk verifikasi deviasi berat timbangan kurir dan batas pagu keuangan.  
  - 3\. Mesin Kebijakan Arbitrase (Strategy Pattern) untuk memilih format sanggahan hukum sesuai marketplace tujuan.  
- Hasil disimpan di PostgreSQL 16 dan dialirkan ke React Cockpit secara instan via Server-Sent Events (SSE).

---

## 3\. Spesifikasi Kontrak Data Kanonikal (Canonical Data Contract)

Seluruh payload webhook masuk dari berbagai marketplace dinormalisasi ke satu kontrak data TypeScript murni sebelum masuk ke dalam antrean pemrosesan:

- *event\_id*: UUID unik event untuk kontrol idempotensi.  
- *timestamp*: Timestamp ISO8601.  
- *tenant\_id*: UUID identitas tenant organisasi merchant.  
- *store\_connection\_id*: UUID relasi toko spesifik.  
- *marketplace*: Enum (SHOPEE, TIKTOK\_SHOP, TOKOPEDIA, LAZADA, SHOPIFY, CUSTOM\_API).  
- *dispute\_id*: ID unik sengketa platform e-commerce.  
- *order*:  
  - *order\_id*: String nomor pesanan platform.  
  - *total\_amount\_idr*: Nilai transaksi pesanan dalam Rupiah.  
  - *currency*: Default "IDR".  
  - *escrow\_status*: Enum (HELD\_IN\_ESCROW, RELEASED, FROZEN).  
- *customer*:  
  - *user\_id*: ID pembeli di marketplace.  
  - *account\_age\_days*: Umur akun pembeli dalam hari.  
  - *historical\_return\_count*: Jumlah retur historis pembeli.  
  - *historical\_order\_count*: Total transaksi pembeli.  
- *logistics*:  
  - *courier\_code*: Enum (SPX\_EXPRESS, JNT\_EXPRESS, SICEPAT, ANTERAJA, JNE, NINJA\_VAN, OTHER).  
  - *tracking\_number*: Nomor resi pengiriman.  
  - *hub\_inbound\_weight\_grams*: Berat saat pertama kali tiba di sorting hub kurir.  
  - *driver\_handover\_weight\_grams*: Berat saat diserahterimakan kurir ke pembeli.  
- *evidence*:  
  - *customer\_reason*: Alasan komplain pembeli.  
  - *proof\_image\_urls*: Array URL foto bukti komplain.  
  - *catalog\_weight\_grams*: Berat acuan produk resmi dari katalog toko.  
  - *sku\_reference*: Kode SKU produk.

---

## 4\. Frontend Architecture (React 18+ Operations Cockpit)

Frontend dirancang sebagai **High-Density Operations Cockpit Single-Page Application (SPA)** untuk operator dan analis sengketa.

### 4.1. Struktur Direktori Frontend

- *src/components/cockpit/PanelOneHarness.tsx*: Harness pengujian, scenario picker, dan JSON editor interaktif.  
- *src/components/cockpit/PanelTwoAuditStream.tsx*: Terminal log SSE streaming milidetik dengan indikator visual.  
- *src/components/cockpit/PanelThreeDecisionRoom.tsx*: Decision badges, loss metrics, dossier viewer, dan tombol tindakan.  
- *src/components/cockpit/ChannelBadge.tsx*: Badge visual kanal penjualan (Shopee, TikTok, Tokopedia).  
- *src/stores/useCockpitStore.ts*: Zustand store untuk manajemen state global UI (selectedMarketplace, streamingLogs, currentDecision, lossPreventedIdr).  
- *src/hooks/useDisputeStream.ts*: Custom hook koneksi SSE (Server-Sent Events) ke endpoint backend.  
- *src/hooks/useDisputeEvaluation.ts*: TanStack Query mutation untuk memicu evaluasi sengketa.

### 4.2. Tata Letak Tiga Panel (3-Panel High-Density Viewport)

1. **1\. Panel 1 — Multi-Channel Event Harness & Ingestion**:  
   - Selector Marketplace (*Shopee, TikTok Shop, Tokopedia, Lazada, Shopify*).  
   - Store Connection Switcher untuk berpindah akun toko.  
   - 4 Preset Skenario Uji (Valid Return, Empty Box Fraud, Weight Tampering, High-Value Borderline).  
   - JSON Payload preview & Tombol eksekusi "Trigger Dispute Evaluation".  
2. **2\. Panel 2 — Live Forensic Audit Trace**:  
   - Terminal streaming realtime dengan timestamp berskala milidetik.  
   - Visual step trace: Ingest & Normalize \-\> Multi-Modal Vision Inspection \-\> Courier Telemetry Cross-Match \-\> Deterministic Rule Activation.  
   - Badges: Rasio Deviasi Berat, Indikator Segel Lakban Dirasuki, Skor Risiko Fraud (0–100).  
3. **3\. Panel 3 — Omnichannel Decision Room & Action Dossier**:  
   - Keputusan akhir: GREEN\_AUTO\_REFUND, RED\_ESCROW\_FROZEN, YELLOW\_ESCALATE\_HUMAN.  
   - Ringkasan nilai terselamatkan (Total Loss Prevented IDR).  
   - Marketplace-Specific Legal Dossier Viewer dengan format Markdown terstruktur dan tombol 1-klik salin / ekspor PDF.

---

## 5\. Backend Implementation Specifications

### 5.1. Sensor Forensik AI (OpenAI GPT-4o Multi-Modal)

Model dipanggil dengan *temperature: 0.0* dan skema validasi Zod:

- *visual\_tamper\_detected*: Boolean indikasi fisik segel rusak / lakban ganda.  
- *visual\_evidence\_match\_rating*: Angka 0.00–1.00 untuk kesesuaian foto dengan keluhan.  
- *weight\_discrepancy\_grams*: Selisih mutlak berat katalog vs timbangan kurir.  
- *fraud\_risk\_score*: Skor probabilitas penipuan (0–100).  
- *confidence\_score*: Keyakinan sensor AI (0.00–1.00).  
- *anomaly\_reasons*: Array teks temuan anomali objektif.  
- *recommended\_posture*: Enum (LOW\_RISK, SUSPICIOUS, HIGH\_CERTAINTY\_FRAUD).

### 5.2. Mesin Aturan Deterministik (Deterministic Decision Engine)

- Menghitung deviasi berat secara deterministik: Delta W \= |W\_katalog \- W\_kurir| dan Rasio Deviasi \= Delta W / W\_katalog  
- **Aturan Hard Constraints**:  
  - Plafon refund otomatis maksimal Rp 50.000.  
  - Transaksi di atas Rp 200.000 DILARANG KERAS disetujui otomatis.  
  - Akumulasi refund harian merchant tidak boleh melampaui limit pagu proteksi (misal Rp 5.000.000/hari).  
- **Klasifikasi Jalur**:  
  - **Red Lane (ESCROW\_FROZEN)**: Jika Rasio Deviasi \>= 30% ATAU Visual Tamper \= true ATAU Risk Score \>= 75\. Aksi: Bekukan escrow, tolak klaim pembeli, terbitkan Dispute Dossier.  
  - **Green Lane (AUTO\_REFUND)**: Jika Nilai \<= Rp 50.000 AND Risk Score \<= 15 AND Deviasi \<= 10% AND Confidence \>= 0.90. Aksi: Refund otomatis dicairkan dalam \< 0.5 detik.  
  - **Yellow Lane (ESCALATE\_HUMAN)**: Jika Nilai \> Rp 500.000 ATAU Risk Score antara 15–75 ATAU Confidence \< 0.80. Aksi: Eskalasi ke supervisor manusia dengan rekomendasi forensik terlampir.

### 5.3. Dynamic Arbitration Strategy Pattern (Legal Engine)

Modul penyusunan berkas sanggahan menerapkan *Strategy Pattern* agar format rujukan klausul tepat sasaran:

- *ShopeeArbitrationStrategy*: Mengacu pada Pasal 8 Ayat 2 Kebijakan Retur Shopee (Ketentuan Bukti Fisik).  
- *TikTokShopArbitrationStrategy*: Mengacu pada TikTok Shop Customer Order Return Policy (Klausul Anomali Paket & Berat Kurir).  
- *TokopediaArbitrationStrategy*: Mengacu pada Syarat & Ketentuan Resolusi Komplain Tokopedia.

---

## 6\. Non-Functional Requirements & Production Budget

- **Latency SLA**: Total waktu evaluasi P95 \<= 2.2 detik (Ingestion 50ms, AI Sensor 1500ms, Matrix 10ms, DB Write 40ms, SSE Push 20ms).  
- **Throughput**: 500 RPS per container instance.  
- **Data Isolation**: PostgreSQL Row-Level Security (RLS) pada kolom *tenant\_id*.  
- **Security**: Kredensial API toko dienkripsi menggunakan AES-GCM-256; autentikasi JWT dan HMAC-SHA256 untuk webhook.  
- **Kepatuhan Privasi**: Mematuhi UU Perlindungan Data Pribadi (UU PDP No. 27/2022) dengan masking data pribadi pembeli.

&nbsp;