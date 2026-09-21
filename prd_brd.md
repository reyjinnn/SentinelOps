# PRD & BRD: SentinelOps AI

Universal Omnichannel Reverse Logistics & Dispute Arbitrator Middleware (SaaS)  
Document Version: 2.1.0-PROD | Status: Approved Product & Business Specification  
Target Market: Multi-Channel E-Commerce Brands, Enterprise Sellers, & 3PL Logistics in SE Asia

---

# BAGIAN 1: BUSINESS REQUIREMENTS DOCUMENT (BRD)

## 1\. Konteks Industri & Analisis Masalah Pasar (Market Context)

Dalam ekosistem e-commerce Asia Tenggara (khususnya Indonesia), volume transaksi harian yang tinggi di Shopee, TikTok Shop, Tokopedia, dan Lazada diiringi oleh lonjakan sengketa pasca-transaksi (post-order disputes) dan penipuan retur (return fraud).

### 1.1. Taksonomi Titik Kebocoran Finansial:

1. Empty Box Fraud: Pembeli menerima paket asli, mengambil isinya, lalu memotret kotak kosong untuk klaim pengembalian dana penuh (refund only).  
2. Logistics Weight Tampering: Barang bernilai tinggi diganti dengan batu/kardus basah di sepanjang rantai distribusi kurir.  
3. Wardrobing / Used Goods: Pembeli menggunakan pakaian atau gadget untuk keperluan sesaat lalu mengajukan retur dengan segel yang ditempel ulang secara rapi.  
4. Frivolous Low-Value Claims: Pembeli sengaja komplain untuk barang di bawah Rp 30.000 karena tahu penjual enggan menanggung ongkos kirim retur balik.

### 1.2. Kerugian Finansial & Operasional Saat Ini:

* Durasi Investigasi Manual: Rata-rata staf CS membutuhkan 15–20 menit per kasus untuk membuka Seller Center, mengecek resi di web kurir, dan mencari data berat katalog di sistem gudang.  
* Biaya Operasional per Kasus: \~Rp 12.500 per tiket (berdasarkan alokasi gaji staf CS dan overhead).  
* Fraud Leakage Rate: 12–18% dari total dana sengketa berakhir cair ke pembeli nakal karena kelalaian atau lambatnya penjual merespons batas waktu sanggahan (SLA 24–48 jam).

---

## 2\. Model ROI & Nilai Ekonomi Unit (Unit Economics)

| Parameter | Operasional Manual CS | SentinelOps AI Middleware | Penghematan (%) |
| ----- | ----- | ----- | ----- |
| Waktu Penanganan Kasus | 15–20 menit | 1.8–2.2 detik | 99.8% lebih cepat |
| Biaya Pemrosesan per Kasus | Rp 12.500 | \~Rp 450 (API token GPT-4o) | 96.4% penghematan biaya |
| Tingkat Kebocoran Dana Fraud | 12–18% | \< 1.5% | Mitigasi kerugian 90%+ |
| Kapasitas Harian per Staf/Instans | 25–30 kasus / hari | Tak terbatas (Asynchronous EDA) | Skalabilitas instan |

### Studi Kasus ROI Toko Skala Menengah (3.000 Kasus Sengketa / Bulan):

* Biaya Manual Sebelum SentinelOps: 3.000 x Rp 12.500 \= Rp 37.500.000 / bulan.  
* Biaya Berlangganan SentinelOps (Tier Growth): Rp 5.999.000 / bulan.  
* Biaya Token AI Konsumsi: 3.000 x Rp 450 \= Rp 1.350.000.  
* Penghematan Bersih Biaya Operasional: Rp 30.151.000 / bulan.  
* Penyelamatan Dana Escrow (Asumsi Nilai Tiket Rata-rata Rp 250.000): Mencegah kerugian fraud sebesar \>= Rp 67.500.000 / bulan.  
* Total ROI Bulanan: \> 1.000%.

## 3\. Strategi Monetisasi SaaS (Pricing Architecture)

1. Starter Tier (Rp 1.999.000 / bulan):  
   1. Kuota hingga 500 evaluasi tiket sengketa/bulan.  
   2. Maksimal 2 koneksi toko (misal: 1 Shopee \+ 1 TikTok Shop).  
   3. Sensor forensik foto standar dan integrasi telemetri SPX & J\&T.  
2. Growth Tier (Rp 5.999.000 / bulan):  
   1. Kuota hingga 3.500 evaluasi tiket sengketa/bulan.  
   2. Hingga 10 koneksi toko di Shopee, TikTok Shop, Tokopedia, dan Lazada.  
   3. Dukungan multi-kurir (SPX, J\&T, SiCepat, Anteraja, JNE, Ninja Van).  
   4. Generator dokumen sanggahan hukum otomatis berformat Markdown.  
3. Enterprise Tier (Custom mulai Rp 17.999.000 / bulan):  
   1. Volume evaluasi tanpa batas (custom rate limit).  
   2. Koneksi toko dan kanal D2C (Shopify / ERP SAP / JMS) tanpa batas.  
   3. Dedicated OpenAI inference instance & Custom Decision Matrix parameters.  
   4. SLA Ketersediaan 99.99% dan dukungan teknis 24/7.  
4. Usage-Based Over-quota: Rp 1.250 – Rp 1.500 per tiket tambahan.  
5. Escrow Recovery Success Fee (Opsional Enterprise): 3–5% dari total nilai dana escrow yang berhasil diselamatkan dari penolakan klaim sepihak.

---

# BAGIAN 2: PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 4\. Persona Pengguna & Alur Kerja (User Personas)

### 4.1. Persona 1: E-Commerce Director (Budi, 41\)

* Tujuan: Menghentikan kebocoran margin keuntungan dari retur palsu di seluruh saluran penjualan online.  
* JTBD: "Saat akhir bulan tiba, saya ingin melihat laporan konsolidasi tentang berapa juta rupiah dana sengketa yang berhasil diselamatkan dari Shopee dan TikTok Shop tanpa perlu menambah staf CS."

### 4.2. Persona 2: Dispute Resolution Lead (Dina, 26\)

* Tujuan: Menyelesaikan antrean komplain secepat mungkin dan memastikan sanggahan tidak pernah ditolak marketplace.  
* JTBD: "Saat ada komplain kardus kosong dari pembeli, saya ingin sistem otomatis membandingkan berat kurir dan menerbitkan surat sanggahan berformat hukum dalam 1 kali klik."

## 5\. Rincian Kebutuhan Fungsional (Functional Requirements)

### FR-01: Canonical Ingestion & Multi-Marketplace Webhooks

* Deskripsi: Menyediakan endpoint POST /api/v1/disputes/evaluate yang menerima webhook dari Shopee, TikTok Shop, Tokopedia, Lazada, dan Shopify.  
* User Story: Sebagai sistem, saya ingin mengubah payload webhook yang beraneka ragam ke dalam Canonical Dispute Event agar logika forensik dapat dieksekusi secara seragam.  
* Kriteria Penerimaan: Validasi signature HMAC-SHA256 sesuai marketplace. Penolakan duplikasi (idempotency) berbasis event\_id dan dispute\_id dalam 24 jam dengan respons HTTP 200\.

### FR-02: Multi-Store Connection Management

* Deskripsi: Mengelola kredensial koneksi toko multi-marketplace per tenant.  
* Kriteria Penerimaan: Kredensial API/OAuth token disimpan dengan enkripsi AES-GCM-256. Operator dapat mengaktifkan atau menonaktifkan toko sewaktu-waktu.

### FR-03: Multi-Modal AI Forensic Sensor

* Deskripsi: OpenAI GPT-4o Vision menganalisis foto bukti pembeli, teks komplain, dan SKU katalog.  
* Kriteria Penerimaan: Mengembalikan objek JSON valid terhadap Zod schema yang memuat visual\_tamper\_detected, visual\_evidence\_match\_rating, fraud\_risk\_score, dan anomaly\_reasons.

### FR-04: Multi-Carrier Telemetry Aggregator

* Deskripsi: Mengambil dan mencocokkan data berat dari titik inbound hub kurir dan driver handover kurir pengantar.  
* Kriteria Penerimaan: Menghitung selisih berat mutlak ΔW dan rasio deviasi terhadap berat katalog resmi produk.

### FR-05: Mesin Keputusan Deterministik 3-Jalur (The 3 Lanes)

* Green Lane (AUTO\_REFUND): Transaksi \<= Rp 50.000, risk score \<= 15, deviasi berat \<= 10%, confidence \>= 0.90.  
* Red Lane (ESCROW\_FROZEN): Deviasi berat \>= 30% ATAU visual tamper \= true ATAU risk score \>= 75\.  
* Yellow Lane (ESCALATE\_HUMAN): Transaksi \> Rp 500.000 ATAU risk score antara 15–75 ATAU confidence \< 0.80.  
* Hard Limit: Dilarang melakukan auto-refund jika nilai transaksi \> Rp 200.000 atau jika akumulasi refund harian merchant melebihi limit.

### FR-06: Dynamic Dispute Dossier Generator

* Deskripsi: Membuat draf dokumen sanggahan resmi berformat Markdown yang mengutip pasal hukum yang relevan dengan marketplace tempat komplain terjadi (Shopee vs TikTok Shop vs Tokopedia).  
* Kriteria Penerimaan: Berisi nomor sengketa, kronologi timbangan kurir, hasil sensor visual AI, rujukan klausul kebijakan, dan rekomendasi aksi.

### FR-07: React Omnichannel Cockpit UI

* Deskripsi: Tampilan dasbor 3-panel terintegrasi (Panel 1: Ingestion & Simulator, Panel 2: Live Audit Stream SSE, Panel 3: Decision Room & Dossier Viewer).  
* Kriteria Penerimaan: Mendukung filter marketplace dan store, pencarian nomor resi, streaming terminal log milidetik, serta tombol ekspor laporan audit PDF.

## 6\. Kebutuhan Non-Fungsional (Non-Functional Requirements)

* NFR-01 (Performance & Latency Budget): Total latency end-to-end P95 \<= 2.2 detik (Ingestion 50ms, AI Sensor 1500ms, Matrix 10ms, DB Write 40ms, SSE Push 20ms).  
* NFR-02 (High Availability & Fault Tolerance): 99.9% uptime dengan mekanisme fallback timeout pada panggilan OpenAI API (fallback otomatis ke antrean eskalasi manusia jika API LLM timeout \> 5 detik).  
* NFR-03 (Security & Data Privacy): Kepatuhan terhadap UU Perlindungan Data Pribadi (UU PDP Indonesia No. 27/2022). Masking data nama lengkap, nomor HP, dan alamat pembeli pada tampilan cockpit.

&nbsp;