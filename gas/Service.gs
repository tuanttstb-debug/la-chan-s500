// ── Service.gs — nghiệp vụ Lá chắn S-500: tải dữ liệu · nhóm KH · pháp nhân (Phân loại KH) · Action Plan · Theo dõi dữ liệu
//    · nạp nguồn số dư (CRM/danh mục/mô hình) · nạp file điều hành Excel · cấu hình. QUYỀN KIỂM Ở ĐÂY (FE chỉ ẩn/hiện).
// Nhãn Xanh/Vàng/Đỏ luôn tính lại ở server bằng Rules.gs (cùng lõi core/rules.js với trình duyệt) → không tin nhãn client gửi lên.

// ── Người dùng + vai trò ──
function usersDir_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('s5:users');
  if (hit) return JSON.parse(hit);
  var U = _userRows_(), H = U.H, iU = H.indexOf('Username'), iD = H.indexOf('Display_Name'), iT = H.indexOf('Team'), iR = H.indexOf('Role'), iA = H.indexOf('Active');
  var out = U.rows.filter(function (r) { return String(r[iU]).trim() && !_isFalse_(r[iA]); })
    .map(function (r) { return { username: String(r[iU]).trim(), name: String(r[iD] || '').trim(), team: String(r[iT] || '').trim(), role: String(r[iR] || '').trim() }; });
  cache.put('s5:users', JSON.stringify(out), 300);
  return out;
}
function lc_(s) { return str_(s).toLowerCase(); }
function userOf_(username) { var k = lc_(username); return usersDir_().filter(function (x) { return lc_(x.username) === k; })[0] || null; }
function cfgList_(key) { return str_(config_()[key]).split(/[\s,;]+/).map(lc_).filter(Boolean); }
function s5Role_(u) {
  var k = lc_(u.username);
  if (u.role === 'Admin' || cfgList_('PM').indexOf(k) >= 0) return 'PM';
  if (cfgList_('BLĐ').indexOf(k) >= 0) return 'BLĐ';
  if (u.role === 'Teamlead') return 'Teamlead';
  return 'Đầu mối';
}
function isPM_(u) { return s5Role_(u) === 'PM'; }
function splitUsers_(v) { return str_(v).split(/[\s,;+\/&]+/).map(lc_).filter(Boolean); }
/** Văn bản đầu mối gõ tay ("LienPK + Anhdtt24") → các username có thật trong User_Master (giữ đúng chữ hoa/thường). */
function matchUsers_(text) {
  var dir = usersDir_(), out = [];
  splitUsers_(text).forEach(function (t) { var hit = dir.filter(function (x) { return lc_(x.username) === t; })[0]; if (hit && out.indexOf(hit.username) < 0) out.push(hit.username); });
  return out;
}
/** Sửa được nhóm: PM · đầu mối · PO hỗ trợ · Teamlead cùng team với đầu mối (Q7 tạm: theo team của đầu mối). BLĐ chỉ xem. */
function canEditNhom_(u, n) {
  var r = s5Role_(u);
  if (r === 'PM') return true;
  if (r === 'BLĐ' || !n) return false;
  var me = lc_(u.username);
  if (lc_(n.dauMoi) === me || splitUsers_(n.hoTro).indexOf(me) >= 0) return true;
  if (u.role === 'Teamlead') { var dm = userOf_(n.dauMoi); return !!dm && lc_(dm.team) === lc_(u.team) && !!u.team; }
  return false;
}
function mustEdit_(u, n) { if (!canEditNhom_(u, n)) throw new Error('FORBIDDEN: không có quyền sửa nhóm ' + (n ? n.tenNhom : '')); }
function mustPM_(u) { if (!isPM_(u)) throw new Error('FORBIDDEN: chỉ PM chiến dịch'); }

// ── Đọc bảng → object khóa nội bộ (chuẩn hóa ngày/chuỗi) ──
var _FIELDS_ = { Nhom: 'NHOM', PhapNhan: 'PN', Action: 'ACTION', YeuCauDL: 'DATAREQ' };
function norm_(name, o) {
  S5S.TABLES[name].forEach(function (f) {
    var v = o[f.k];
    if (f.type === 'date' || f.fmt === 'date') o[f.k] = v instanceof Date || v ? dstr_(v) : '';
    else if (f.type === 'num' || f.type === 'pct' || (f.type === 'calc' && (f.fmt === 'pct' || f.fmt === 'x' || f.fmt === 'num'))) o[f.k] = v === '' || v === null || v === undefined ? '' : (isFinite(+v) ? +v : '');
    else if (f.k === 'duVay' || f.k === 'duBL' || f.k === 'duLC' || f.k === 'hmTong' || f.k === 'duTong') o[f.k] = v === '' || v === null || v === undefined ? '' : (isFinite(+v) ? +v : '');
    else o[f.k] = v instanceof Date ? dstr_(v) : str_(v);
  });
  return o;
}
function list_(name) { return rows_(name).map(function (r) { return norm_(name, S5S.fromDb(name, r)); }); }
function save_(name, list) { writeTable_(name, list.map(function (o) { return S5S.toDb(name, o); })); }

function rulesInit_() {
  var j = str_(config_()['RULES_JSON']);
  try { S5R.setThresholds(j ? JSON.parse(j) : null); } catch (e) { S5R.setThresholds(null); }
}
function round4_(x) { return x === null || x === undefined ? '' : Math.round(x * 10000) / 10000; }
/** Tính lại các cột máy (I, J, R, X, AB, AF, AI + nhãn máy) cho 1 pháp nhân. */
function computePN_(p) {
  var e = S5R.evalPN(p);
  p.hmTong = e.d.hmTong === null ? '' : e.d.hmTong; p.duTong = e.d.duTong === null ? '' : e.d.duTong;
  p.tyLeTsbd = round4_(e.d.tyLeTsbd); p.tyLeNnh = round4_(e.d.tyLeNnh); p.tyLeDtTT = round4_(e.d.tyLeDtTT); p.tuongXung = round4_(e.d.tuongXung);
  p.nhanMay = e.nhan; p.phanLoai = S5R.nhanHieuLuc(p, e);
  return e;
}
function groupLabels_(pns) {
  var m = {};
  pns.forEach(function (p) { (m[p.maNhom] = m[p.maNhom] || []).push(p.phanLoai || 'Chưa đánh giá'); });
  var out = {}; Object.keys(m).forEach(function (k) { out[k] = S5R.groupLabel(m[k]); });
  return out;
}
function mainCif_(pns, maNhom) {
  var best = null;
  pns.forEach(function (p) { if (p.maNhom === maNhom && (!best || (+p.duTong || 0) > (+best.duTong || 0))) best = p; });
  return best;
}
function normName_(s) { return lc_(s).replace(/\s+/g, ' '); }
function pad_(n, w) { return ('00000' + n).slice(-w); }

// ── API: tải toàn bộ (mọi người đăng nhập xem được — Q6: TT SPTD + anh Cường + BLĐ Khối) ──
function apiLoad_(u) {
  rulesInit_();
  var c = config_();
  var ky = list_('KyDuLieu').slice(-30).reverse();
  return {
    user: { username: u.username, displayName: u.displayName, role: u.role, team: u.team, s5Role: s5Role_(u) },
    users: usersDir_().map(function (x) { return { username: x.username, name: x.name, team: x.team }; }),
    config: { start: dstr_(c['Ngày bắt đầu chiến dịch']), pm: str_(c['PM']), bld: str_(c['BLĐ']), rules: str_(c['RULES_JSON']) },
    nhom: list_('Nhom'), pn: list_('PhapNhan'), action: list_('Action'), dl: list_('YeuCauDL'), ky: ky,
    version: APP_VERSION,
  };
}

var NHOM_EDIT_ = ['mien', 'tenNhom', 'dauMoi', 'cbo', 'ttDuLieu', 'uuTien', 'siteVisit', 'tienDo', 'vanDeBLD', 'ghiChu', 'hoTro', 'nguonTraNo', 'phuongAn'];
function checkSel_(f, v) {
  if (!v || f.type !== 'sel') return;
  var L = S5S.LISTS[f.opt];
  if (Array.isArray(L) && L.indexOf(v) < 0) throw new Error('Giá trị không hợp lệ ở "' + (f.t || f.db) + '": ' + v);
}

function apiSaveNhom_(u, b) {
  var inp = b.nhom || {};
  return withLock_(function () {
    var list = list_('Nhom'), F = S5S.byKey('Nhom');
    var ten = str_(inp.tenNhom); if (!ten) throw new Error('Thiếu tên nhóm KH.');
    var cur = inp.maNhom ? list.filter(function (n) { return n.maNhom === inp.maNhom; })[0] : null;
    if (inp.maNhom && !cur) throw new Error('Không thấy nhóm ' + inp.maNhom);
    var dup = list.filter(function (n) { return normName_(n.tenNhom) === normName_(ten) && (!cur || n.maNhom !== cur.maNhom); })[0];
    if (dup) throw new Error('Đã có nhóm cùng tên: ' + dup.maNhom + ' — ' + dup.tenNhom);
    if (cur) mustEdit_(u, cur); else if (s5Role_(u) === 'BLĐ') throw new Error('FORBIDDEN');
    var n = cur || { dauMoi: u.username };
    var dauMoiCu = cur ? cur.dauMoi : '';
    NHOM_EDIT_.forEach(function (k) {
      if (inp[k] === undefined) return;
      var v = k === 'hoTro' ? matchUsers_(inp[k]).join(', ') : str_(inp[k]);
      checkSel_(F[k], v);
      n[k] = v;
    });
    if (str_(inp.dauMoi)) { var dm = userOf_(inp.dauMoi); if (!dm) throw new Error('Đầu mối không có trong danh sách user SHTD: ' + inp.dauMoi); n.dauMoi = dm.username; }
    if (cur && lc_(dauMoiCu) !== lc_(n.dauMoi) && !isPM_(u) && u.role !== 'Teamlead') throw new Error('FORBIDDEN: chỉ PM/Teamlead đổi đầu mối nhóm');
    if (!n.maNhom) n.maNhom = 'S5-' + pad_(nextSeq_('NEXT_NHOM'), 3);   // cấp mã sau khi hợp lệ
    n.nguoiSua = u.username; n.ngaySua = nowIso_();
    if (!cur) list.push(n);
    save_('Nhom', list);
    log_(u, cur ? 'Sửa nhóm' : 'Tạo nhóm', n.maNhom, n.tenNhom);
    return { nhom: n };
  });
}

function apiDeleteNhom_(u, b) {
  mustPM_(u);
  return withLock_(function () {
    var list = list_('Nhom'), n = list.filter(function (x) { return x.maNhom === b.maNhom; })[0];
    if (!n) throw new Error('Không thấy nhóm');
    var pn = list_('PhapNhan'), act = list_('Action'), dl = list_('YeuCauDL');
    save_('Nhom', list.filter(function (x) { return x !== n; }));
    save_('PhapNhan', pn.filter(function (x) { return x.maNhom !== n.maNhom; }));
    save_('Action', act.filter(function (x) { return x.maNhom !== n.maNhom; }));
    save_('YeuCauDL', dl.filter(function (x) { return x.maNhom !== n.maNhom; }));
    log_(u, 'Xóa nhóm', n.maNhom, n.tenNhom);
    return { ok: true };
  });
}

var SYS_ = ['duVay', 'duBL', 'duLC', 'hangThauChi', 'binning'];
function apiSavePN_(u, b) {
  var inp = b.pn || {};
  rulesInit_();
  return withLock_(function () {
    var nhom = list_('Nhom'), pns = list_('PhapNhan'), F = S5S.byKey('PhapNhan');
    var cif = str_(inp.cif); if (!cif) throw new Error('Thiếu mã CIF.');
    var target = nhom.filter(function (n) { return n.maNhom === inp.maNhom; })[0];
    if (!target) throw new Error('Chọn nhóm KH cho pháp nhân.');
    mustEdit_(u, target);
    // Sửa: client gửi cifCu (CIF trước khi sửa). Không có cifCu = thêm mới → CIF đã tồn tại thì báo trùng.
    var cifCu = str_(b.cifCu);
    var cur = cifCu ? pns.filter(function (p) { return p.cif === cifCu; })[0] || null : null;
    if (cifCu && !cur) throw new Error('Không thấy pháp nhân CIF ' + b.cifCu);
    var other = pns.filter(function (p) { return p.cif === cif && p !== cur; })[0];
    if (other) throw new Error('CIF ' + cif + ' đã có ở nhóm ' + other.maNhom + ' (' + other.tenKH + ')');
    if (cur && cur.maNhom !== target.maNhom) mustEdit_(u, nhom.filter(function (n) { return n.maNhom === cur.maNhom; })[0]);
    var p = cur || {};
    var lockSys = !!(cur && cur.nguonSoDu) && !isPM_(u);
    S5S.editable('PhapNhan').forEach(function (k) {
      if (inp[k] === undefined || k === 'nguonSoDu' || k === 'nguoiSua') return;
      if (lockSys && SYS_.indexOf(k) >= 0) return;          // số hệ thống đã nạp từ nguồn → đầu mối không sửa
      var f = F[k], v = inp[k];
      if (f.type === 'num' || f.type === 'pct' || f.type === 'sys' && f.fmt !== 'text') v = v === '' || v === null ? '' : (isFinite(+v) ? +v : (function () { throw new Error('Số không hợp lệ ở "' + f.db + '": ' + v); })());
      else v = str_(v);
      if (f.type === 'user' && v) { var us = userOf_(v); if (!us) throw new Error('User không có trong SHTD: ' + v); v = us.username; }
      checkSel_(f, v);
      p[k] = v;
    });
    p.cif = cif;
    if (!p.dauMoi) p.dauMoi = target.dauMoi;
    if (!p.mien && target.mien) p.mien = target.mien;
    var e = computePN_(p);
    if (p.nhanChot && p.nhanChot !== e.nhan && !str_(p.lyDoGhiDe)) throw new Error('Nhãn chốt khác nhãn máy (' + e.nhan + ') → bắt buộc ghi lý do ghi đè.');
    if (p.nhanChot === e.nhan) { p.nhanChot = ''; p.lyDoGhiDe = ''; p.phanLoai = e.nhan; }
    p.ngayCapNhat = today_(); p.nguoiSua = u.username;
    if (!cur) pns.push(p);
    save_('PhapNhan', pns);
    log_(u, cur ? 'Sửa pháp nhân' : 'Thêm pháp nhân', cif, target.maNhom + ' · ' + p.phanLoai);
    return { pn: p, nhanNhom: groupLabels_(pns)[target.maNhom] };
  });
}

function apiDeletePN_(u, b) {
  return withLock_(function () {
    var pns = list_('PhapNhan'), p = pns.filter(function (x) { return x.cif === str_(b.cif); })[0];
    if (!p) throw new Error('Không thấy pháp nhân');
    mustEdit_(u, list_('Nhom').filter(function (n) { return n.maNhom === p.maNhom; })[0]);
    save_('PhapNhan', pns.filter(function (x) { return x !== p; }));
    log_(u, 'Xóa pháp nhân', p.cif, p.maNhom);
    return { ok: true };
  });
}

/** Lưu dòng Action Plan / Theo dõi dữ liệu (chung khuôn: id tự cấp, gắn nhóm, cột máy tự điền). */
function saveRow_(u, b, table, seqKey, prefix, inp, fill) {
  rulesInit_();
  return withLock_(function () {
    var nhom = list_('Nhom'), list = list_(table), F = S5S.byKey(table);
    var n = nhom.filter(function (x) { return x.maNhom === inp.maNhom; })[0];
    if (!n) throw new Error('Chọn nhóm KH.');
    mustEdit_(u, n);
    var cur = inp.id ? list.filter(function (x) { return x.id === inp.id; })[0] : null;
    if (inp.id && !cur) throw new Error('Không thấy dòng ' + inp.id);
    if (cur && cur.maNhom !== n.maNhom) mustEdit_(u, nhom.filter(function (x) { return x.maNhom === cur.maNhom; })[0]);
    var r = cur || {};
    S5S.editable(table).forEach(function (k) {
      if (inp[k] === undefined || k === 'id' || k === 'nguoiSua') return;
      var f = F[k], v = inp[k];
      if (f.type === 'num' || f.type === 'pct') v = v === '' || v === null ? '' : (isFinite(+v) ? +v : '');
      else v = str_(v);
      if (f.type === 'user' && v) { var us = userOf_(v); v = us ? us.username : v; }
      checkSel_(f, v);
      r[k] = v;
    });
    S5S.TABLES[table].filter(function (f) { return f.req && f.type !== 'calc'; }).forEach(function (f) { if (str_(r[f.k]) === '') throw new Error('Thiếu "' + f.t + '".'); });
    fill(r, n, list_('PhapNhan'));
    if (!r.id) r.id = prefix + pad_(nextSeq_(seqKey), 4);   // cấp mã SAU khi hợp lệ — lần lưu bị chặn không tiêu số
    r.ngayCapNhat = today_(); r.nguoiSua = u.username;
    if (!cur) list.push(r);
    save_(table, list);
    log_(u, (cur ? 'Sửa ' : 'Thêm ') + table, r.id, n.maNhom);
    return { row: r };
  });
}
function apiSaveAction_(u, b) {
  var inp = b.row || {};
  return saveRow_(u, b, 'Action', 'NEXT_HD', 'HD-', inp, function (r, n, pns) {
    r.hanhDong = S5S.LISTS.HANH_DONG[r.maHD] || '';
    r.tenNhom = n.tenNhom; r.ptkd = n.dauMoi;
    if (!r.cif) { var m = mainCif_(pns, n.maNhom); r.cif = m ? m.cif : ''; }
    r.phanLoai = groupLabels_(pns)[n.maNhom] || 'Chưa đánh giá';
    if (r.trangThai === 'Hoàn thành' && !r.ngayXong) r.ngayXong = today_();
    if (r.trangThai === 'Hoàn thành' && r.phanTram === '') r.phanTram = 1;
    if (r.phanTram !== '' && (r.phanTram < 0 || r.phanTram > 1)) throw new Error('% hoàn thành phải trong 0–100%.');
  });
}
function apiSaveDL_(u, b) {
  var inp = b.row || {};
  return saveRow_(u, b, 'YeuCauDL', 'NEXT_DL', 'DL-', inp, function (r, n) {
    if (!r.dauMoi) r.dauMoi = n.dauMoi;
    if (!r.ngayYC) r.ngayYC = today_();
    if (r.trangThai === 'Hoàn thành' && !r.ngayNhan) r.ngayNhan = today_();
  });
}
function delRow_(u, table, id) {
  return withLock_(function () {
    var list = list_(table), r = list.filter(function (x) { return x.id === str_(id); })[0];
    if (!r) throw new Error('Không thấy dòng');
    mustEdit_(u, list_('Nhom').filter(function (n) { return n.maNhom === r.maNhom; })[0]);
    save_(table, list.filter(function (x) { return x !== r; }));
    log_(u, 'Xóa ' + table, r.id, r.maNhom);
    return { ok: true };
  });
}
function apiDeleteAction_(u, b) { return delRow_(u, 'Action', b.id); }
function apiDeleteDL_(u, b) { return delRow_(u, 'YeuCauDL', b.id); }

// ── Nạp nguồn số dư (PM) — R4: dư nợ/BL/LC + hạng mô hình tự cập nhật theo CIF; tạo nhóm cho KH mới trong danh mục ──
function apiNapSoDu_(u, b) {
  mustPM_(u); rulesInit_();
  var rows = b.rows || [], ngay = str_(b.ngayDuLieu), loai = str_(b.loai) || 'CRM';
  if (!ngay) throw new Error('Thiếu ngày dữ liệu (ngày chốt số).');
  if (!rows.length) throw new Error('Tệp không có dòng CIF nào.');
  return withLock_(function () {
    var nhom = list_('Nhom'), pns = list_('PhapNhan'), byCif = {};
    pns.forEach(function (p) { byCif[p.cif] = p; });
    var nameIdx = {}; nhom.forEach(function (n) { nameIdx[normName_(n.tenNhom)] = n; });
    var ky = 'K' + pad_(nextSeq_('NEXT_KY'), 3), up = 0, mk = 0, miss = [], hist = [], tag = loai + ' ' + ngay;
    rows.forEach(function (r) {
      var cif = str_(r.cif); if (!cif) return;
      var p = byCif[cif];
      if (!p && b.taoMoi) {
        var who = matchUsers_(r.dauMoi);
        var ten = str_(r.tenKH) || cif, key = normName_(ten);
        if (nameIdx[key]) { ten = ten + ' (' + cif + ')'; key = normName_(ten); }
        var n = { maNhom: 'S5-' + pad_(nextSeq_('NEXT_NHOM'), 3), tenNhom: ten, mien: str_(r.mien), dauMoi: who[0] || '', hoTro: who.slice(1).join(', '),
          tienDo: 'Chưa bắt đầu', nguoiSua: u.username, ngaySua: nowIso_() };
        nhom.push(n); nameIdx[key] = n;
        p = { cif: cif, maNhom: n.maNhom, tenKH: str_(r.tenKH), dvkd: str_(r.dvkd), nganh: S5S.LISTS.NGANH.indexOf(str_(r.nganh)) >= 0 ? str_(r.nganh) : '',
          mien: str_(r.mien), dauMoi: n.dauMoi, quanHe: 'Pháp nhân chính' };
        pns.push(p); byCif[cif] = p; mk++;
      } else if (!p) { miss.push(cif); return; } else up++;
      SYS_.forEach(function (k) { var v = r[k]; if (v === undefined || v === null || v === '') return; p[k] = k === 'hangThauChi' || k === 'binning' ? str_(v) : +v; });
      if (!p.tenKH && r.tenKH) p.tenKH = str_(r.tenKH);
      if (!p.dvkd && r.dvkd) p.dvkd = str_(r.dvkd);
      p.nguonSoDu = tag;
      computePN_(p);
      hist.push({ ky: ky, cif: cif, duVay: r.duVay === undefined ? '' : r.duVay, duBL: r.duBL === undefined ? '' : r.duBL, duLC: r.duLC === undefined ? '' : r.duLC,
        hangThauChi: str_(r.hangThauChi), binning: str_(r.binning), nhomNo: str_(r.nhomNo), nhomNoCic: str_(r.nhomNoCic) });
    });
    save_('Nhom', nhom); save_('PhapNhan', pns);
    appendRows_('SoDu', hist.map(function (h) { return S5S.toDb('SoDu', h); }));
    appendRows_('KyDuLieu', [S5S.toDb('KyDuLieu', { ky: ky, ngayDuLieu: ngay, loai: loai, tep: str_(b.tep).slice(0, 120), soDong: rows.length, capNhat: up, taoMoi: mk,
      khongKhop: miss.length, nguoi: u.username, luc: nowIso_() })]);
    log_(u, 'Nạp nguồn số dư', ky, tag + ' · cập nhật ' + up + ' · tạo mới ' + mk + ' · không khớp ' + miss.length);
    return { ky: ky, capNhat: up, taoMoi: mk, khongKhop: miss };
  });
}

// ── Nạp file điều hành Excel đang điền tay (PM) — chuyển đợt 1 sang web, không nhập lại ──
function apiImportDH_(u, b) {
  mustPM_(u); rulesInit_();
  return withLock_(function () {
    var nhom = list_('Nhom'), pns = list_('PhapNhan'), act = list_('Action'), dl = list_('YeuCauDL');
    var FN = S5S.byKey('Nhom'), FP = S5S.byKey('PhapNhan');
    var idx = {}; nhom.forEach(function (n) { idx[normName_(n.tenNhom)] = n; });
    var cnt = { nhomMoi: 0, nhomSua: 0, pnMoi: 0, pnSua: 0, action: 0, dl: 0, boQua: [] };
    function grp(ten, dauMoiTxt) {
      var key = normName_(ten); if (!key) return null;
      if (idx[key]) return idx[key];
      var who = matchUsers_(dauMoiTxt);
      var n = { maNhom: 'S5-' + pad_(nextSeq_('NEXT_NHOM'), 3), tenNhom: str_(ten), dauMoi: who[0] || '', hoTro: who.slice(1).join(', '), nguoiSua: u.username, ngaySua: nowIso_() };
      nhom.push(n); idx[key] = n; cnt.nhomMoi++;
      return n;
    }
    function setIf(o, F, k, v) {
      if (v === undefined || v === null || str_(v) === '') return;
      var f = F[k]; if (!f) return;
      if (f.type === 'sel') { var L = S5S.LISTS[f.opt]; if (Array.isArray(L) && L.indexOf(str_(v)) < 0) { cnt.boQua.push(f.db + ': ' + str_(v).slice(0, 40)); return; } }
      if (f.type === 'user') { var w = matchUsers_(v); if (!w.length) { cnt.boQua.push(f.db + ': ' + str_(v).slice(0, 40)); return; } v = w[0]; }
      o[k] = f.type === 'num' || f.type === 'pct' || (f.type === 'sys' && f.fmt !== 'text') ? +v : str_(v);
    }
    (b.nhom || []).forEach(function (r) {
      var n = grp(r.tenNhom, r.dauMoi); if (!n) return;
      ['mien', 'cbo', 'ttDuLieu', 'uuTien', 'siteVisit', 'tienDo', 'vanDeBLD', 'ghiChu', 'dauMoi'].forEach(function (k) { setIf(n, FN, k, r[k]); });
      cnt.nhomSua++;
    });
    (b.pn || []).forEach(function (r) {
      var cif = str_(r.cif); if (!cif) return;
      var n = grp(r.tenNhom, r.dauMoi); if (!n) { cnt.boQua.push('CIF ' + cif + ': thiếu tên nhóm'); return; }
      var p = pns.filter(function (x) { return x.cif === cif; })[0];
      if (!p) { p = { cif: cif }; pns.push(p); cnt.pnMoi++; } else cnt.pnSua++;
      p.maNhom = n.maNhom;
      S5S.editable('PhapNhan').forEach(function (k) {
        if (k === 'cif' || k === 'maNhom' || k === 'nguonSoDu' || k === 'nguoiSua') return;
        if (SYS_.indexOf(k) >= 0 && p.nguonSoDu) return;      // đã có số nạp từ nguồn → giữ số nguồn
        setIf(p, FP, k, r[k]);
      });
      if (!p.dauMoi) p.dauMoi = n.dauMoi;
      if (!n.dauMoi && p.dauMoi) n.dauMoi = p.dauMoi;
      computePN_(p); p.ngayCapNhat = p.ngayCapNhat || today_(); p.nguoiSua = u.username;
    });
    var seenA = {}; act.forEach(function (a) { seenA[normName_(a.maNhom + '|' + a.maHD + '|' + a.bienPhap)] = 1; });
    (b.actions || []).forEach(function (r) {
      var n = nhom.filter(function (x) { return x.maNhom === str_(r.maNhom); })[0] || grp(r.tenNhom, r.ptkd);
      if (!n || !str_(r.bienPhap)) return;
      var k = normName_(n.maNhom + '|' + str_(r.maHD) + '|' + str_(r.bienPhap)); if (seenA[k]) return; seenA[k] = 1;
      var a = { id: 'HD-' + pad_(nextSeq_('NEXT_HD'), 4), maNhom: n.maNhom, tenNhom: n.tenNhom, ptkd: n.dauMoi };
      ['maHD', 'cif', 'ngayBatDau', 'bienPhap', 'mucTieu', 'chuTri', 'nguoiTN', 'phoiHop', 'ngayGiao', 'han', 'trangThai', 'phanTram', 'ngayXong', 'bangChung', 'vuongMac', 'capDuyet']
        .forEach(function (f) { setIf(a, S5S.byKey('Action'), f, r[f]); });
      a.hanhDong = S5S.LISTS.HANH_DONG[a.maHD] || ''; a.ngayCapNhat = today_(); a.nguoiSua = u.username;
      act.push(a); cnt.action++;
    });
    var seenD = {}; dl.forEach(function (d) { seenD[normName_(d.maNhom + '|' + d.loai + '|' + d.ngayYC + '|' + d.thongTin)] = 1; });
    (b.dl || []).forEach(function (r) {
      var n = grp(r.tenNhom, r.dauMoi); if (!n) return;
      var k = normName_(n.maNhom + '|' + str_(r.loai) + '|' + str_(r.ngayYC) + '|' + str_(r.thongTin)); if (seenD[k]) return; seenD[k] = 1;
      var d = { id: 'DL-' + pad_(nextSeq_('NEXT_DL'), 4), maNhom: n.maNhom };
      ['dauMoi', 'loai', 'donViSoHuu', 'dauMoiCC', 'ngayYC', 'han', 'ngayNhan', 'trangThai', 'mucAH', 'thongTin', 'nguon'].forEach(function (f) { setIf(d, S5S.byKey('YeuCauDL'), f, r[f]); });
      if (!d.dauMoi) d.dauMoi = n.dauMoi;
      d.ngayCapNhat = today_(); d.nguoiSua = u.username;
      dl.push(d); cnt.dl++;
    });
    var gl = groupLabels_(pns);
    act.forEach(function (a) { a.phanLoai = gl[a.maNhom] || 'Chưa đánh giá'; });
    save_('Nhom', nhom); save_('PhapNhan', pns); save_('Action', act); save_('YeuCauDL', dl);
    log_(u, 'Nạp file điều hành', str_(b.tep).slice(0, 120), JSON.stringify({ nhomMoi: cnt.nhomMoi, pnMoi: cnt.pnMoi, pnSua: cnt.pnSua, action: cnt.action, dl: cnt.dl, boQua: cnt.boQua.length }));
    cnt.boQua = cnt.boQua.slice(0, 50);
    return cnt;
  });
}

function apiSetConfig_(u, b) {
  mustPM_(u);
  var upd = {};
  Object.keys(b.updates || {}).forEach(function (k) {
    if (CONFIG_PM_EDITABLE.indexOf(k) < 0) throw new Error('Không sửa được khóa ' + k);
    var v = str_(b.updates[k]);
    if (k === 'RULES_JSON' && v) { try { JSON.parse(v); } catch (e) { throw new Error('RULES_JSON không phải JSON hợp lệ'); } }
    upd[k] = v;
  });
  return withLock_(function () { setConfig_(upd); log_(u, 'Sửa cấu hình', Object.keys(upd).join(', '), ''); return { ok: true }; });
}

function apiAudit_(u) {
  mustPM_(u);
  return { rows: rows_('NhatKy').slice(-300).reverse().map(function (r) { return { at: str_(r['Thời điểm'] instanceof Date ? r['Thời điểm'].toISOString() : r['Thời điểm']),
    who: str_(r['Người']), act: str_(r['Hành động']), target: str_(r['Đối tượng']), detail: str_(r['Chi tiết']) }; }) };
}

/** Nhật ký xem/xuất (DEC-20261022-01: nhật ký xem/xuất bắt buộc từ MVP). */
function apiLog_(u, b) {
  var what = str_(b.what).slice(0, 60);
  if (!/^(Xuất Excel|In A4|Xem nhóm|Xuất PDF)/.test(what)) throw new Error('Nhật ký không hợp lệ');
  log_(u, what, str_(b.target).slice(0, 120), '');
  return { ok: true };
}
