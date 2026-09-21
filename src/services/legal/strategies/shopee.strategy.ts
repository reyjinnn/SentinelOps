import { CanonicalDisputeEvent } from '../../../schemas/canonical-dispute';
import { ForensicAnalysisResult } from '../../ai/forensic-sensor.service';
import { DecisionResult } from '../../decision-engine.service';
import { ArbitrationStrategy } from '../dossier.strategy';

export class ShopeeArbitrationStrategy implements ArbitrationStrategy {
  supports(marketplace: string): boolean {
    return marketplace === 'SHOPEE';
  }

  generateDossier(event: CanonicalDisputeEvent, aiResult: ForensicAnalysisResult, decision: DecisionResult): string {
    return `
# BUKTI SANGGAHAN RESMI (DISPUTE DOSSIER)
**Platform:** Shopee Indonesia
**Nomor Pesanan (SN):** ${event.order.order_id}
**Nomor Resi:** ${event.logistics.tracking_number}

## 1. Dasar Hukum Penolakan
Berdasarkan **Syarat Layanan Shopee Pasal 8.2** mengenai Tanggung Jawab Pengembalian Barang, Penjual menolak pengembalian dana ini karena bukti menunjukkan adanya indikasi kelalaian atau manipulasi dari pihak Ekspedisi/Pembeli.

## 2. Analisis Investigasi SentinelOps AI
- **Selisih Berat Terdeteksi:** ${aiResult.weight_discrepancy_grams} Gram.
- **Berat Katalog / Awal:** ${event.evidence.catalog_weight_grams} Gram.
- **Berat Serah Terima Kurir (First Mile):** ${event.logistics.driver_handover_weight_grams} Gram.
- **Indikasi Kerusakan Fisik (Visual Tampering):** ${aiResult.visual_tamper_detected ? 'YA (Lakban rusak/terbuka)' : 'TIDAK'}

## 3. Kesimpulan & Tuntutan
Terdapat deviasi yang melampaui toleransi standar operasional. Sesuai dengan hasil investigasi, status keputusan saat ini adalah **${decision.decision_lane}**.
Kami memohon Tim Arbitrase Shopee (Shopee Dispute Team) untuk menolak pengajuan pengembalian dana pembeli dan mencairkan dana (Escrow) kembali ke Penjual, karena paket diserahkan ke kurir ${event.logistics.courier_code} dalam kondisi baik dan sesuai berat.

---
*Dokumen ini di-generate secara otomatis oleh SentinelOps AI.*
    `.trim();
  }
}
