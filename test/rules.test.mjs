// Test bộ máy dán nhãn (core/rules.js) — ngưỡng biên 2 bộ (xây lắp / ngành khác), Đỏ ngay, thiếu dữ liệu, nhãn nhóm. Dữ liệu GIẢ.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require('../core/rules.js');
const S = require('../core/schema.js');

let pass = 0, fail = 0;
const eq = (a, b, m) => { if (a === b) { pass++; } else { fail++; console.log('  ✗', m, '→ nhận', JSON.stringify(a), 'cần', JSON.stringify(b)); } };

// Pháp nhân đủ 7 tiêu chí Xanh (ngành khác): NNH/DT 30% · DT TT/GN 90% · OD2 Không · TPB/CIC 20% · tương xứng 0,8 · AA/Green · DT +5%
const base = () => ({ nganh: 'Sắt thép', nnhCic: 30, dtVat12: 100, dtTrucTiep: 90, dsGiaiNgan: 100, od2: 'Không', tyTrongDuNo: 0.2, tyTrongTsbd: 0.25,
  hangThauChi: 'AA', binning: 'Green', bienDongDT: 0.05 });
const tc = (p, id) => R.evalPN(p).tc.find(c => c.id === id).nhan;

eq(R.evalPN(base()).nhan, 'Xanh', 'đủ 7 Xanh → Xanh');

// TC1 ngành khác: ≤40% Xanh · ≤60% Vàng · >60% Đỏ — biên
eq(tc({ ...base(), nnhCic: 40 }, 1), 'Xanh', 'TC1 khác 40% = Xanh');
eq(tc({ ...base(), nnhCic: 40.01 }, 1), 'Vàng', 'TC1 khác 40,01% = Vàng');
eq(tc({ ...base(), nnhCic: 60 }, 1), 'Vàng', 'TC1 khác 60% = Vàng');
eq(tc({ ...base(), nnhCic: 61 }, 1), 'Đỏ', 'TC1 khác 61% = Đỏ');
// TC1 xây lắp: ≤35 / ≤45
eq(tc({ ...base(), nganh: 'Xây lắp', nnhCic: 35 }, 1), 'Xanh', 'TC1 XL 35% = Xanh');
eq(tc({ ...base(), nganh: 'Xây lắp', nnhCic: 36 }, 1), 'Vàng', 'TC1 XL 36% = Vàng');
eq(tc({ ...base(), nganh: 'Xây lắp', nnhCic: 45 }, 1), 'Vàng', 'TC1 XL 45% = Vàng');
eq(tc({ ...base(), nganh: 'Xây lắp', nnhCic: 46 }, 1), 'Đỏ', 'TC1 XL 46% = Đỏ');
eq(tc({ ...base(), nganh: 'Xây lắp Mass', nnhCic: 40 }, 1), 'Vàng', 'TC1 Xây lắp Mass dùng ngưỡng XL');

// TC2: ≥80 Xanh · ≥50 Vàng · <50 Đỏ
eq(tc({ ...base(), dtTrucTiep: 80 }, 2), 'Xanh', 'TC2 80% Xanh');
eq(tc({ ...base(), dtTrucTiep: 79 }, 2), 'Vàng', 'TC2 79% Vàng');
eq(tc({ ...base(), dtTrucTiep: 50 }, 2), 'Vàng', 'TC2 50% Vàng');
eq(tc({ ...base(), dtTrucTiep: 49 }, 2), 'Đỏ', 'TC2 49% Đỏ');
eq(tc({ ...base(), dsGiaiNgan: 0 }, 2), 'Thiếu', 'TC2 DS GN = 0 → Thiếu (không chia 0)');

// TC3 OD2 — 2 cách viết trong file điều hành
eq(tc({ ...base(), od2: 'Có nhưng đã khắc phục, không tái diễn' }, 3), 'Vàng', 'TC3 đã khắc phục = Vàng');
eq(tc({ ...base(), od2: 'Có nhưng đã khắc phục và không tái diễn' }, 3), 'Vàng', 'TC3 biến thể "và" = Vàng');
eq(R.evalPN({ ...base(), od2: 'Tái diễn hoặc chưa khắc phục dứt điểm' }).nhan, 'Đỏ', 'TC3 tái diễn → Đỏ ngay');

// TC4: ≤30 Xanh · ≤50 Vàng
eq(tc({ ...base(), tyTrongDuNo: 0.3, tyTrongTsbd: 0.4 }, 4), 'Xanh', 'TC4 30% Xanh');
eq(tc({ ...base(), tyTrongDuNo: 0.5, tyTrongTsbd: 0.6 }, 4), 'Vàng', 'TC4 50% Vàng');
eq(tc({ ...base(), tyTrongDuNo: 0.51, tyTrongTsbd: 0.6 }, 4), 'Đỏ', 'TC4 51% Đỏ');

// TC5 tương xứng = AD/AE: ≤1,0 Xanh · ≤1,5 Vàng
eq(tc({ ...base(), tyTrongDuNo: 0.2, tyTrongTsbd: 0.2 }, 5), 'Xanh', 'TC5 1,0 Xanh');
eq(tc({ ...base(), tyTrongDuNo: 0.3, tyTrongTsbd: 0.2 }, 5), 'Vàng', 'TC5 1,5 Vàng');
eq(tc({ ...base(), tyTrongDuNo: 0.3, tyTrongTsbd: 0.19 }, 5), 'Đỏ', 'TC5 >1,5 Đỏ');

// TC6: Q1 từ CCC trở xuống = Đỏ ngay · Q2 lấy mức xấu hơn
eq(R.evalPN({ ...base(), hangThauChi: 'CCC' }).nhan, 'Đỏ', 'CCC → Đỏ ngay');
eq(R.evalPN({ ...base(), hangThauChi: 'CC' }).nhan, 'Đỏ', 'CC → Đỏ ngay');
eq(R.evalPN({ ...base(), hangThauChi: 'C' }).nhan, 'Đỏ', 'C → Đỏ ngay');
eq(R.evalPN({ ...base(), hangThauChi: 'B' }).nhan, 'Vàng', 'B → Vàng (không Đỏ ngay)');
eq(R.evalPN({ ...base(), hangThauChi: 'BBB' }).nhan, 'Vàng', 'BBB → Vàng');
eq(R.evalPN({ ...base(), binning: 'Red' }).nhan, 'Đỏ', 'Binning Red → Đỏ ngay');
eq(tc({ ...base(), hangThauChi: 'BB', binning: 'Green' }, 6), 'Vàng', 'Q2: thấu chi Vàng + binning Green → Vàng');
eq(tc({ ...base(), hangThauChi: 'A', binning: 'Amber' }, 6), 'Vàng', 'Q2: A + Amber → Vàng');
eq(tc({ ...base(), hangThauChi: '#N/A', binning: 'Green' }, 6), 'Xanh', 'TC6 thiếu thấu chi, có binning → theo binning');
eq(tc({ ...base(), hangThauChi: '', binning: '' }, 6), 'Thiếu', 'TC6 thiếu cả hai → Thiếu');

// TC7 ngành khác: ≥−10% Xanh · ≥−25% Vàng · <−25% Đỏ (tăng mạnh vẫn Xanh)
eq(tc({ ...base(), bienDongDT: -0.10 }, 7), 'Xanh', 'TC7 khác −10% Xanh');
eq(tc({ ...base(), bienDongDT: -0.11 }, 7), 'Vàng', 'TC7 khác −11% Vàng');
eq(tc({ ...base(), bienDongDT: -0.25 }, 7), 'Vàng', 'TC7 khác −25% Vàng');
eq(tc({ ...base(), bienDongDT: -0.26 }, 7), 'Đỏ', 'TC7 khác −26% Đỏ');
eq(tc({ ...base(), bienDongDT: 0.9 }, 7), 'Xanh', 'TC7 khác +90% Xanh');
// TC7 xây lắp: [−20%, +30%] Xanh · giảm ≤30%/tăng ≤50% Vàng · ngoài Đỏ
const xl = v => tc({ ...base(), nganh: 'Xây lắp', nnhCic: 30, bienDongDT: v }, 7);
eq(xl(-0.20), 'Xanh', 'TC7 XL −20% Xanh'); eq(xl(0.30), 'Xanh', 'TC7 XL +30% Xanh');
eq(xl(-0.21), 'Vàng', 'TC7 XL −21% Vàng'); eq(xl(-0.30), 'Vàng', 'TC7 XL −30% Vàng'); eq(xl(0.31), 'Vàng', 'TC7 XL +31% Vàng'); eq(xl(0.50), 'Vàng', 'TC7 XL +50% Vàng');
eq(xl(-0.31), 'Đỏ', 'TC7 XL −31% Đỏ'); eq(xl(0.51), 'Đỏ', 'TC7 XL +51% Đỏ');

// Quy tắc tổng
eq(R.evalPN({ ...base(), nnhCic: 70, dtTrucTiep: 10 }).nhan, 'Đỏ', '2 tiêu chí Đỏ → Đỏ');
eq(R.evalPN({ ...base(), nnhCic: 70 }).nhan, 'Vàng', '1 tiêu chí Đỏ → Vàng');
eq(R.evalPN({ ...base(), nnhCic: 50 }).nhan, 'Vàng', '0 Đỏ 1 Vàng → Vàng');
// Q3: thiếu mà chưa chạm Đỏ → Chưa đủ dữ liệu, kể cả đã có Vàng
const thieu = { ...base(), nnhCic: 50, bienDongDT: '' };
eq(R.evalPN(thieu).nhan, 'Chưa đủ dữ liệu', 'Q3: có Vàng + thiếu TC7 → Chưa đủ dữ liệu');
eq(R.evalPN(thieu).nghieng, 'Vàng', 'Q3: gợi ý đang nghiêng Vàng');
eq(R.evalPN({ ...base(), bienDongDT: '' }).nhan, 'Chưa đủ dữ liệu', 'thiếu 1, còn lại Xanh → Chưa đủ dữ liệu');
eq(R.evalPN({ ...base(), nnhCic: 70, dtTrucTiep: 10, bienDongDT: '' }).nhan, 'Đỏ', 'thiếu nhưng đã 2 Đỏ → Đỏ');
eq(R.evalPN({ ...base(), binning: 'Red', bienDongDT: '' }).nhan, 'Đỏ', 'thiếu nhưng Đỏ ngay → Đỏ');
eq(R.evalPN({}).nhan, 'Chưa đánh giá', 'chưa nhập gì → Chưa đánh giá');
eq(R.evalPN({ hangThauChi: 'AA', binning: 'Green' }).nhan, 'Chưa đủ dữ liệu', 'chỉ có số hệ thống → Chưa đủ dữ liệu');

// Ghi đè + nhãn nhóm
eq(R.nhanHieuLuc({ nhanChot: 'Đỏ' }, { nhan: 'Vàng' }), 'Đỏ', 'nhãn chốt ghi đè');
eq(R.nhanHieuLuc({ nhanChot: '' }, { nhan: 'Vàng' }), 'Vàng', 'không chốt → nhãn máy');
eq(R.groupLabel(['Xanh', 'Vàng', 'Xanh']), 'Vàng', 'nhóm = cao nhất (Vàng)');
eq(R.groupLabel(['Xanh', 'Chưa đủ dữ liệu']), 'Chưa đủ dữ liệu', 'nhóm có PN chưa xong → Chưa đủ dữ liệu');
eq(R.groupLabel(['Chưa đủ dữ liệu', 'Đỏ']), 'Đỏ', 'Đỏ thắng chưa đủ');
eq(R.groupLabel([]), 'Chưa đánh giá', 'nhóm rỗng');

// Chỉ tiêu tính khớp công thức file điều hành
const d = R.derive({ duVay: 100, duBL: 50, duLC: 10, hmVay: 200, tsbd: 80, nnhCic: 30, dtVat12: 120, dtTrucTiep: 45, dsGiaiNgan: 90, tyTrongDuNo: 0.3, tyTrongTsbd: 0.6 });
eq(d.duTong, 160, 'J = L+N+P'); eq(d.hmTong, 200, 'I = K+M+O (bỏ ô trống)'); eq(d.tyLeTsbd, 0.5, 'R = Q/J'); eq(d.tyLeNnh, 0.25, 'X = W/V');
eq(d.tyLeDtTT, 0.5, 'AB = AA/Z'); eq(d.tuongXung, 0.5, 'AF = AD/AE');

// Ngưỡng sửa được qua Config
R.setThresholds({ tc4: [0.4, 0.6] });
eq(tc({ ...base(), tyTrongDuNo: 0.35, tyTrongTsbd: 0.4 }, 4), 'Xanh', 'ngưỡng TC4 đổi 40% → 35% Xanh');
R.setThresholds(null);
eq(tc({ ...base(), tyTrongDuNo: 0.35, tyTrongTsbd: 0.4 }, 4), 'Vàng', 'trả ngưỡng mặc định');

// Schema: cột Excel không trùng, db header không trùng
for (const [n, F] of Object.entries(S.TABLES)) {
  const dbs = F.map(f => f.db).filter(Boolean), xs = F.map(f => f.x).filter(Boolean);
  eq(new Set(dbs).size, dbs.length, n + ': tên cột DB không trùng');
  eq(new Set(xs).size, xs.length, n + ': cột Excel không trùng');
}
eq(S.PN.filter(f => f.x).length, 38, 'Phân loại KH đủ 38 cột A–AL');
eq(S.NHOM.filter(f => f.x).length, 18, 'TH TT nhóm đủ 18 cột A–R');
eq(S.ACTION.filter(f => f.x).length, 22, 'Action Plan đủ 22 cột A–V');
eq(S.DATAREQ.filter(f => f.x).length, 13, 'Theo dõi dữ liệu đủ 13 cột A–M');

console.log(`rules.test: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
