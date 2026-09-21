# DATABASE SCHEMA & ARCHITECTURE: SentinelOps AI

Universal Omnichannel & Multi-Tenant Relational Data Model

Document Version: 2.1.0-PROD | Target Database Engine: PostgreSQL 16+

---

## 1\. Prinsip Desain & Arsitektur Data

SentinelOps AI menggunakan basis data relasional PostgreSQL 16 dengan standar arsitektur tingkat enterprise:

1. Multi-Tenancy & Multi-Store Hierarchy: Setiap tenant organisasi merchant (tenants) dapat memiliki banyak koneksi toko (store\_connections) di berbagai marketplace (Shopee, TikTok Shop, Tokopedia, Lazada, Shopify).  
2. ACID Transactions & Append-Only Ledger: Setiap perubahan status dana escrow dan tiket sengketa dicatat secara permanen pada tabel ledger\_mutations untuk menjamin kesiapan audit (audit-ready compliance).  
3. Hybrid Relational \+ JSONB: Kolom analitik fleksibel seperti daftar anomali AI (anomaly\_reasons), URL gambar bukti pembeli (proof\_image\_urls), dan kredensial API terenkripsi disimpan dalam kolom JSONB yang dioptimasi dengan indeks GIN.  
4. Strict Idempotency Constraints: Mencegah pemrosesan ganda (duplicate execution) melalui unique composite index pada (tenant\_id, marketplace, external\_order\_id) dan dispute\_code.

---

## 2\. Entity-Relationship Diagram (ERD)

```
 +--------------------+       1:N       +----------------------+ 
 |      tenants       | <────────────── |        users         | 
 +--------------------+                 +----------------------+ 
          │ 
          │ 1:N 
          +─────────────────────────────+ 
          │                             │ 
          ▼                             ▼ 
 +--------------------+       1:N       +----------------------+ 
 |  store_connections │ <────────────── |        orders        | 
 +--------------------+                 +----------------------+ 
          │                                        │ 
          │ 1:N                                    │ 1:N 
          ▼                                        ▼ 
 +--------------------+                 +----------------------+ 
 |      api_keys      |                 |     order_items      | 
 +--------------------+                 +----------------------+ 
                                                   │ 
                                                   │ 1:N 
                                                   ▼ 
 +--------------------+       1:N       +----------------------+ 
 | customer_profiles  | <────────────── |       disputes       | 
 +--------------------+                 +----------------------+ 
                                                   │ 
                                                   ├────────────────────────┐ 
                                                   │ 1:1                    │ 1:1 
                                                   ▼                        ▼ 
                                         +-------------------+    +--------------------+ 
                                         |logistics_telemetry|    |  forensic_audits   | 
                                         +-------------------+    +--------------------+ 
                                                   │                        │ 
                                                   │ 1:1                    │ 1:1 
                                                   ▼                        ▼ 
                                         +-------------------+    +--------------------+ 
                                         |   decision_logs   |    |  dispute_dossiers  | 
                                         +-------------------+    +--------------------+ 
                                                   │ 
                                                   │ 1:N 
                                                   ▼ 
                                         +-------------------+ 
                                         |  ledger_mutations | 
                                         +-------------------+ 
```

---

## 3\. Kamus Data Lengkap (Data Dictionary)

### 3.1. Tabel tenants (Organisasi Merchant)

- id (UUID, PRIMARY KEY): Identitas unik tenant.  
- name (VARCHAR(150), NOT NULL): Nama resmi organisasi / merchant.  
- slug (VARCHAR(100), UNIQUE, NOT NULL): Slug identitas tenant untuk subdomain/URL.  
- subscription\_tier (tenant\_tier\_enum, NOT NULL, DEFAULT 'STARTER'): Tier langganan (STARTER, GROWTH, ENTERPRISE).  
- daily\_refund\_ceiling\_idr (NUMERIC(14,2), NOT NULL, DEFAULT 5000000.00): Batas maksimum refund harian otomatis.  
- created\_at, updated\_at (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Timestamp audit.

### 3.2. Tabel store\_connections (Koneksi Toko Omnichannel)

- id (UUID, PRIMARY KEY): Identitas unik koneksi toko.  
- tenant\_id (UUID, FK \-\> tenants.id ON DELETE CASCADE): Tenant pemilik toko.  
- marketplace (marketplace\_enum, NOT NULL): Kanal (SHOPEE, TIKTOK\_SHOP, TOKOPEDIA, dll).  
- store\_name (VARCHAR(150), NOT NULL): Nama toko (misal: "Official Store Shopee").  
- external\_store\_id (VARCHAR(100), NOT NULL): ID toko unik pada platform marketplace.  
- credentials\_encrypted (JSONB, NOT NULL): OAuth token / app secrets terenkripsi AES-256.  
- is\_active (BOOLEAN, NOT NULL, DEFAULT TRUE): Status keaktifan integrasi.  
- created\_at, updated\_at (TIMESTAMPTZ, NOT NULL): Timestamp audit.  
- Constraint: UNIQUE (tenant\_id, marketplace, external\_store\_id).

### 3.3. Tabel users (Operator & Analis)

- id (UUID, PRIMARY KEY): ID unik pengguna.  
- tenant\_id (UUID, FK \-\> tenants.id ON DELETE CASCADE): Tenant pemilik akun.  
- email (VARCHAR(255), UNIQUE, NOT NULL): Surel login pengguna.  
- password\_hash (VARCHAR(255), NOT NULL): Hash kata sandi (Argon2id/bcrypt).  
- full\_name (VARCHAR(120), NOT NULL): Nama lengkap operator.  
- role (user\_role\_enum, NOT NULL, DEFAULT 'OPS\_ANALYST'): Peran (SUPER\_ADMIN, TENANT\_ADMIN, OPS\_ANALYST, VIEWER).  
- created\_at, updated\_at (TIMESTAMPTZ, NOT NULL).

### 3.4. Tabel orders & order\_items (Pesanan & Katalog SKU)

- orders:  
  - id (UUID, PK)  
  - tenant\_id (UUID, FK \-\> tenants)  
  - store\_connection\_id (UUID, FK \-\> store\_connections, NULLABLE)  
  - external\_order\_id (VARCHAR(100), NOT NULL): Nomor pesanan platform  
  - marketplace (marketplace\_enum, NOT NULL)  
  - total\_amount\_idr (NUMERIC(14,2), NOT NULL CHECK \>= 0\)  
  - escrow\_status (escrow\_status\_enum: HELD\_IN\_ESCROW, RELEASED\_TO\_SELLER, REFUNDED\_TO\_BUYER, FROZEN)  
  - Constraint: UNIQUE (tenant\_id, marketplace, external\_order\_id)  
- order\_items:  
  - id (UUID, PK), order\_id (UUID, FK \-\> orders)  
  - sku\_code (VARCHAR(80), NOT NULL): Kode SKU acuan  
  - item\_name (VARCHAR(255), NOT NULL)  
  - catalog\_weight\_grams (NUMERIC(10,2), NOT NULL CHECK \> 0): Berat acuan resmi  
  - unit\_price\_idr (NUMERIC(14,2), NOT NULL CHECK \>= 0\)  
  - quantity (INTEGER, NOT NULL DEFAULT 1 CHECK \> 0\)

### 3.5. Tabel disputes (Tiket Sengketa Universal)

- id (UUID, PRIMARY KEY): ID unik internal sengketa.  
- tenant\_id (UUID, FK \-\> tenants.id ON DELETE CASCADE): Tenant pemilik tiket.  
- order\_id (UUID, FK \-\> orders.id ON DELETE CASCADE): Pesanan terkait.  
- store\_connection\_id (UUID, FK \-\> store\_connections.id SET NULL): Toko asal pesanan.  
- dispute\_code (VARCHAR(80), UNIQUE, NOT NULL): Kode sengketa platform (e.g. "DSP-882190").  
- customer\_id (VARCHAR(100), NOT NULL): ID pembeli di marketplace.  
- customer\_reason (TEXT, NOT NULL): Teks alasan komplain pembeli.  
- proof\_image\_urls (JSONB, NOT NULL, DEFAULT '\[\]'::jsonb): Array URL foto bukti komplain.  
- status (dispute\_status\_enum, NOT NULL, DEFAULT 'INGESTED'): Status sengketa terkini.  
- created\_at, updated\_at (TIMESTAMPTZ, NOT NULL).

### 3.6. Tabel logistics\_telemetries (Telemetri Timbangan Kurir)

- id (UUID, PRIMARY KEY): ID telemetri.  
- dispute\_id (UUID, UNIQUE, FK \-\> disputes.id): Tiket sengketa terkait.  
- courier\_code (courier\_code\_enum, NOT NULL): Ekspedisi (SPX\_EXPRESS, JNT\_EXPRESS, dll).  
- tracking\_number (VARCHAR(100), NOT NULL): Nomor resi pelacakan kurir.  
- hub\_inbound\_weight\_grams (NUMERIC(10,2), NOT NULL): Timbangan saat paket masuk sorting hub.  
- driver\_handover\_weight\_grams (NUMERIC(10,2), NOT NULL): Timbangan saat serah terima kurir akhir.  
- delta\_weight\_grams (NUMERIC(10,2), NOT NULL): Selisih mutlak |W\_katalog \- W\_kurir|.  
- deviation\_ratio (NUMERIC(6,4), NOT NULL): Rasio deviasi terhadap berat katalog.  
- recorded\_at (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Waktu pencatatan telemetri.

### 3.7. Tabel forensic\_audits (Sensor AI OpenAI GPT-4o)

- id (UUID, PRIMARY KEY): ID audit forensik.  
- dispute\_id (UUID, UNIQUE, FK \-\> disputes.id): Tiket sengketa terkait.  
- visual\_tamper\_detected (BOOLEAN, NOT NULL, DEFAULT FALSE): Flag indikasi lakban disilet/ditempel ulang.  
- visual\_evidence\_match\_rating (NUMERIC(3,2), NOT NULL): Relevansi bukti visual pembeli (0.00–1.00).  
- fraud\_risk\_score (NUMERIC(5,2), NOT NULL): Estimasi skor probabilitas fraud (0.00–100.00).  
- confidence\_score (NUMERIC(3,2), NOT NULL): Keyakinan sensor AI (0.00–1.00).  
- recommended\_posture (recommended\_posture\_enum, NOT NULL): Postur rekomendasi AI.  
- anomaly\_reasons (JSONB, NOT NULL, DEFAULT '\[\]'::jsonb): Poin anomali objektif.  
- raw\_model\_response (JSONB, NULLABLE): Payload mentah respons LLM.  
- evaluated\_at (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Waktu evaluasi AI.

### 3.8. Tabel decision\_logs (Eksekusi Matriks Deterministik)

- id (UUID, PRIMARY KEY): ID keputusan.  
- dispute\_id (UUID, UNIQUE, FK \-\> disputes.id): Tiket sengketa terkait.  
- decision\_lane (decision\_lane\_enum, NOT NULL): Jalur keputusan (GREEN, RED, YELLOW).  
- triggered\_rule (VARCHAR(120), NOT NULL): Nama aturan matematika yang aktif.  
- loss\_prevented\_idr (NUMERIC(14,2), NOT NULL, DEFAULT 0.00): Nilai rupiah kerugian yang berhasil dicegah.  
- is\_human\_overridden (BOOLEAN, NOT NULL, DEFAULT FALSE): Apakah keputusan diubah manual oleh operator.  
- override\_by (UUID, FK \-\> users.id, NULLABLE): ID operator yang melakukan intervensi manual.  
- override\_reason (TEXT, NULLABLE): Alasan intervensi manual.  
- decided\_at (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Waktu keputusan diambil.

### 3.9. Tabel dispute\_dossiers (Berkas Sanggahan Hukum)

- id (UUID, PRIMARY KEY): ID dokumen sanggahan.  
- dispute\_id (UUID, UNIQUE, FK \-\> disputes.id): Tiket sengketa terkait.  
- dossier\_number (VARCHAR(100), UNIQUE, NOT NULL): Nomor registrasi berkas hukum.  
- marketplace\_policy\_applied (VARCHAR(120), NOT NULL): Klausul hukum spesifik marketplace.  
- markdown\_content (TEXT, NOT NULL): Teks lengkap dokumen sanggahan.  
- pdf\_storage\_url (TEXT, NULLABLE): URL penyimpanan berkas PDF.  
- generated\_at (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Waktu penyusunan berkas.

### 3.10. Tabel ledger\_mutations (Buku Besar Finansial Append-Only)

- id (UUID, PRIMARY KEY): ID mutasi.  
- tenant\_id (UUID, FK \-\> tenants.id): Tenant pemilik transaksi.  
- dispute\_id (UUID, FK \-\> disputes.id): Tiket sengketa terkait.  
- amount\_idr (NUMERIC(14,2), NOT NULL CHECK \>= 0): Nilai transaksi mutasi.  
- mutation\_type (mutation\_type\_enum, NOT NULL): Jenis mutasi (ESCROW\_LOCK, AUTO\_REFUND, dll).  
- balance\_state\_before (VARCHAR(50), NOT NULL): Status saldo sebelum mutasi.  
- balance\_state\_after (VARCHAR(50), NOT NULL): Status saldo setelah mutasi.  
- created\_at (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()): Timestamp mutasi.

---

## 4\. Strategi Pengindeksan & Performa Tinggi (Indexing Strategy)

- Indeks komposit tenant pada disputes(tenant\_id, status) dan disputes(created\_at DESC).  
- Indeks unik idempotensi pada orders(tenant\_id, marketplace, external\_order\_id) dan disputes(dispute\_code).  
- Indeks GIN pada kolom JSONB forensic\_audits(anomaly\_reasons).

&nbsp;