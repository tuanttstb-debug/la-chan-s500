// ⚠ FILE SINH TỰ ĐỘNG từ core/rules.js (node tools/sync_gas.mjs) — KHÔNG sửa tay.
/* rules.js — BỘ MÁY DÁN NHÃN Xanh/Vàng/Đỏ chiến dịch Lá chắn S-500 (một nguồn: trình duyệt + GAS qua tools/sync_gas.mjs).
 * Nguồn quy tắc: "Kế hoạch triển khai chiến dịch Lá chắn S-500" (bản final 21/10/2026) §5 + Phụ lục 1, email chị Nhung 22/10.
 *   7 tiêu chí, 2 bộ ngưỡng (Xây lắp | ngành còn lại — khác ở TC1 đòn bẩy ngắn hạn + TC7 biến động doanh thu).
 *   Đỏ ngay: (i) hạng mô hình thấu chi từ CCC trở xuống HOẶC binning = Red; (ii) OD2 tái diễn/chưa khắc phục dứt điểm.
 *   Còn lại: ≥2 tiêu chí Đỏ → Đỏ · còn tiêu chí thiếu → "Chưa đủ dữ liệu" · 1 Đỏ → Vàng · 0 Đỏ & ≥1 Vàng → Vàng · đủ 7 Xanh → Xanh.
 *   Nhãn nhóm = nhãn rủi ro cao nhất của pháp nhân trong nhóm.
 * PM chị Dung xác nhận 22/10: Q1 "từ CCC trở xuống" = hạng bắt đầu bằng C hoặc D (CCC/CC/C/D) · Q2 tiêu chí 6 có 2 mô hình → lấy mức xấu hơn
 *   · Q3 thiếu dữ liệu chưa chạm Đỏ → "Chưa đủ dữ liệu" · Q4 ngành = ngành ĐẦU MỐI chọn khi rà soát.
 * Giả định còn lại: ngành "Xây lắp" và "Xây lắp Mass" cùng dùng bộ ngưỡng xây lắp.
 * Ngưỡng nằm ở THRESH — PM sửa được qua Config (khóa RULES_JSON) mà không cần sửa code. */
var S5R = (function () {
  var DEFAULT = {
    xayLap: ['Xây lắp', 'Xây lắp Mass'],
    tc1: { xl: [0.35, 0.45], khac: [0.40, 0.60] },            // NNH/DT 12T: ≤a Xanh · ≤b Vàng · >b Đỏ
    tc2: [0.80, 0.50],                                          // DT trực tiếp/DS GN: ≥a Xanh · ≥b Vàng · <b Đỏ
    tc4: [0.30, 0.50],                                          // Dư nợ TPB/CIC: ≤a Xanh · ≤b Vàng
    tc5: [1.0, 1.5],                                            // Tương xứng: ≤a Xanh · ≤b Vàng
    tc7: { xl: { xanh: [-0.20, 0.30], vang: [-0.30, 0.50] },    // xây lắp: Xanh trong [−20%, +30%]; Vàng giảm 20–30% hoặc tăng 30–50%; ngoài → Đỏ
           khac: { xanh: -0.10, vang: -0.25 } },                // ngành khác: ≥ −10% Xanh · ≥ −25% Vàng · < −25% Đỏ
  };
  var T = JSON.parse(JSON.stringify(DEFAULT));
  function setThresholds(o) { T = JSON.parse(JSON.stringify(DEFAULT)); if (o) for (var k in o) if (o.hasOwnProperty(k)) T[k] = o[k]; }
  function thresholds() { return JSON.parse(JSON.stringify(T)); }

  var SEV = { 'Đỏ': 4, 'Vàng': 3, 'Chưa đủ dữ liệu': 2, 'Xanh': 1, 'Chưa đánh giá': 0 };
  var TEN = {
    1: 'Đòn bẩy ngắn hạn', 2: 'Luân chuyển dòng tiền qua TPB', 3: 'Lịch sử tín dụng (OD2)', 4: 'Tập trung tín dụng tại TPB',
    5: 'Tương xứng tín dụng – TSBĐ', 6: 'Xếp hạng mô hình', 7: 'Biến động doanh thu',
  };

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v).trim();
    if (!s || /^#|^n\/?a$/i.test(s)) return null;
    var x = +s.replace(/\s/g, '');
    return isFinite(x) ? x : null;
  }
  function str(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function div(a, b) { a = num(a); b = num(b); return a === null || b === null || b === 0 ? null : a / b; }
  function sum() { var s = 0, any = false; for (var i = 0; i < arguments.length; i++) { var x = num(arguments[i]); if (x !== null) { s += x; any = true; } } return any ? s : null; }
  var EPS = 1e-9;
  function le(x, a) { return x <= a + EPS; }
  function ge(x, a) { return x >= a - EPS; }

  function isXayLap(nganh) { var n = str(nganh).toLowerCase(); return T.xayLap.some(function (x) { return x.toLowerCase() === n; }); }

  // Hạng thấu chi → nhãn: bắt đầu A = Xanh · B = Vàng · C hoặc D = Đỏ (Q1: từ CCC trở xuống). Không đọc được → null.
  function hangNhan(h) {
    var s = str(h).toUpperCase();
    if (!s || s.charAt(0) === '#' || s === 'N/A' || s === 'NA') return null;
    var c = s.charAt(0);
    return c === 'A' ? 'Xanh' : c === 'B' ? 'Vàng' : (c === 'C' || c === 'D') ? 'Đỏ' : null;
  }
  function binNhan(b) {
    var s = str(b).toLowerCase();
    return s === 'green' || s === 'xanh' ? 'Xanh' : s === 'amber' || s === 'vàng' || s === 'yellow' ? 'Vàng' : s === 'red' || s === 'đỏ' ? 'Đỏ' : null;
  }
  function od2Nhan(v) {
    var s = str(v).toLowerCase();
    if (!s) return null;
    if (s === 'không' || s === 'khong' || s === 'no') return 'Xanh';
    if (s.indexOf('tái diễn hoặc') === 0 || s.indexOf('chưa khắc phục') >= 0) return 'Đỏ';
    if (s.indexOf('có') === 0) return 'Vàng';
    return null;
  }
  function worse(a, b) { if (!a) return b; if (!b) return a; return SEV[a] >= SEV[b] ? a : b; }

  /** Các chỉ tiêu máy tính (khớp công thức file điều hành: R = Q/J · X = W/V · AB = AA/Z · AF = AD/AE). */
  function derive(p) {
    var duTong = sum(p.duVay, p.duBL, p.duLC), hmTong = sum(p.hmVay, p.hmBL, p.hmLC);
    return { duTong: duTong, hmTong: hmTong, tyLeTsbd: div(p.tsbd, duTong), tyLeNnh: div(p.nnhCic, p.dtVat12),
      tyLeDtTT: div(p.dtTrucTiep, p.dsGiaiNgan), tuongXung: div(p.tyTrongDuNo, p.tyTrongTsbd) };
  }

  /** Đánh giá 1 pháp nhân → { tc:[{id,ten,val,nhan,chiTiet}], nhan, doNgay:[lý do], thieu:[id], dem:{Đỏ,Vàng,Xanh} , d:{chỉ tiêu tính} } */
  function evalPN(p) {
    var d = derive(p), xl = isXayLap(p.nganh), tc = [];
    var push = function (id, val, nhan, chiTiet) { tc.push({ id: id, ten: TEN[id], val: val, nhan: nhan || 'Thiếu', chiTiet: chiTiet || '' }); };

    // TC1 — Đòn bẩy ngắn hạn
    var a1 = xl ? T.tc1.xl : T.tc1.khac, x1 = d.tyLeNnh;
    push(1, x1, x1 === null ? null : le(x1, a1[0]) ? 'Xanh' : le(x1, a1[1]) ? 'Vàng' : 'Đỏ', (xl ? 'Xây lắp' : 'Ngành khác') + ': ≤' + pc(a1[0]) + ' Xanh · ≤' + pc(a1[1]) + ' Vàng');
    // TC2 — DT trực tiếp / DS giải ngân
    var x2 = d.tyLeDtTT;
    push(2, x2, x2 === null ? null : ge(x2, T.tc2[0]) ? 'Xanh' : ge(x2, T.tc2[1]) ? 'Vàng' : 'Đỏ', '≥' + pc(T.tc2[0]) + ' Xanh · ≥' + pc(T.tc2[1]) + ' Vàng');
    // TC3 — OD2
    push(3, str(p.od2) || null, od2Nhan(p.od2), 'Tái diễn/chưa khắc phục → Đỏ ngay');
    // TC4 — Dư nợ TPB / CIC
    var x4 = num(p.tyTrongDuNo);
    push(4, x4, x4 === null ? null : le(x4, T.tc4[0]) ? 'Xanh' : le(x4, T.tc4[1]) ? 'Vàng' : 'Đỏ', '≤' + pc(T.tc4[0]) + ' Xanh · ≤' + pc(T.tc4[1]) + ' Vàng');
    // TC5 — Tương xứng tín dụng – TSBĐ
    var x5 = d.tuongXung;
    push(5, x5, x5 === null ? null : le(x5, T.tc5[0]) ? 'Xanh' : le(x5, T.tc5[1]) ? 'Vàng' : 'Đỏ', '≤' + T.tc5[0] + ' lần Xanh · ≤' + T.tc5[1] + ' lần Vàng');
    // TC6 — Xếp hạng mô hình (thấu chi + binning, lấy mức xấu hơn)
    var h6 = hangNhan(p.hangThauChi), b6 = binNhan(p.binning);
    push(6, [str(p.hangThauChi), str(p.binning)].filter(Boolean).join(' · ') || null, worse(h6, b6),
      'Thấu chi: ' + (h6 || 'chưa có') + ' · Binning: ' + (b6 || 'chưa có'));
    // TC7 — Biến động doanh thu
    var x7 = num(p.bienDongDT), n7 = null;
    if (x7 !== null) {
      if (xl) { var a = T.tc7.xl; n7 = ge(x7, a.xanh[0]) && le(x7, a.xanh[1]) ? 'Xanh' : ge(x7, a.vang[0]) && le(x7, a.vang[1]) ? 'Vàng' : 'Đỏ'; }
      else { var b = T.tc7.khac; n7 = ge(x7, b.xanh) ? 'Xanh' : ge(x7, b.vang) ? 'Vàng' : 'Đỏ'; }
    }
    push(7, x7, n7, xl ? 'Xây lắp: −20%…+30% Xanh · giảm ≤30%/tăng ≤50% Vàng' : 'Ngành khác: giảm ≤10% Xanh · giảm ≤25% Vàng');

    var doNgay = [];
    if (h6 === 'Đỏ') doNgay.push('Hạng thấu chi ' + str(p.hangThauChi) + ' (từ C trở xuống)');
    if (b6 === 'Đỏ') doNgay.push('Binning Red');
    if (tc[2].nhan === 'Đỏ') doNgay.push('OD2 tái diễn/chưa khắc phục dứt điểm');

    var dem = { 'Đỏ': 0, 'Vàng': 0, 'Xanh': 0, 'Thiếu': 0 };
    tc.forEach(function (c) { dem[c.nhan]++; });
    var thieu = tc.filter(function (c) { return c.nhan === 'Thiếu'; }).map(function (c) { return c.id; });

    // Q3 (chị Dung 22/10): còn tiêu chí thiếu mà chưa chạm Đỏ → "Chưa đủ dữ liệu" (kể cả đã có Vàng) — để thấy hồ sơ làm chưa xong.
    var nhan;
    if (doNgay.length) nhan = 'Đỏ';
    else if (dem['Đỏ'] >= 2) nhan = 'Đỏ';
    else if (dem['Thiếu'] === 7) nhan = 'Chưa đánh giá';
    else if (dem['Thiếu'] > 0) nhan = 'Chưa đủ dữ liệu';
    else if (dem['Đỏ'] === 1 || dem['Vàng'] >= 1) nhan = 'Vàng';
    else nhan = 'Xanh';

    // Nhãn tạm nếu tính trên phần đã có (gợi ý cho người nhập: "đang nghiêng Vàng")
    var tam = nhan !== 'Chưa đủ dữ liệu' ? null : dem['Đỏ'] === 1 || dem['Vàng'] >= 1 ? 'Vàng' : 'Xanh';
    return { tc: tc, nhan: nhan, nghieng: tam, doNgay: doNgay, thieu: thieu, dem: dem, d: d, xayLap: xl };
  }

  /** Nhãn hiệu lực: nhãn chốt (ghi đè có lý do) nếu có, ngược lại nhãn máy. */
  function nhanHieuLuc(p, e) { var c = str(p.nhanChot); return c && SEV[c] !== undefined ? c : e.nhan; }

  /** Nhãn nhóm = cao nhất của các pháp nhân. Không có pháp nhân → Chưa đánh giá. */
  function groupLabel(labels) {
    var best = 'Chưa đánh giá';
    (labels || []).forEach(function (l) { if (SEV[l] !== undefined && SEV[l] > SEV[best]) best = l; });
    return best;
  }

  function pc(x) { return Math.round(x * 1000) / 10 + '%'; }

  return { evalPN: evalPN, derive: derive, groupLabel: groupLabel, nhanHieuLuc: nhanHieuLuc, setThresholds: setThresholds, thresholds: thresholds,
    hangNhan: hangNhan, binNhan: binNhan, od2Nhan: od2Nhan, isXayLap: isXayLap, SEV: SEV, TEN: TEN, num: num, DEFAULT: DEFAULT };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = S5R;
