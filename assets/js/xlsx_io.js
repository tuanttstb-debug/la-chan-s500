'use strict';
/* xlsx_io.js — Excel tại máy (SheetJS, không gửi tệp đi):
 *  ① đọc tệp nguồn số dư (CRM / danh mục KH rà soát / kết quả mô hình) → dò dòng tiêu đề + cột theo bí danh → các trường cần nạp;
 *  ② đọc FILE ĐIỀU HÀNH đang điền tay (đúng template: Phan loai KH · TH TT nhom · Action_Plan · Theo_doi_du_lieu) → chuyển vào web;
 *  ③ xuất Excel ĐÚNG TEMPLATE file điều hành (chạy song song Excel trong lúc chuyển). */
(function () {
  const fold = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const ALIAS = {
    cif: ['cif', 'ma cif', 'cif no', 'so cif', 'customer id', 'cif kh'],
    tenKH: ['customer name1', 'customer name', 'ten kh', 'ten khach hang'],
    dvkd: ['ten cn', 'dvkd', 'ten dvkd', 'chi nhanh', 'branch name'],
    duVay: ['tong du no lcy', 'du no', 'tong du no', 'du no vay', 'du no lcy'],
    duBL: ['du bao lanh', 'bao lanh', 'du bl'],
    duLC: ['du cam ket lc', 'lc', 'du lc', 'cam ket lc'],
    hangThauChi: ['xep hang theo mo hinh thau chi', 'hang thau chi', 'xep hang thau chi', 'hang mo hinh thau chi'],
    binning: ['xep hang mo hinh bien bining', 'xep hang mo hinh bien binning', 'binning', 'bien binning', 'ket qua binning'],
    nganh: ['nganh'],
    dauMoi: ['dau moi chien dich dot 1', 'dau moi', 'ptkd dau moi', 'po dau moi'],
    mien: ['mien', 'mien bac nam'],
    nhomNo: ['nhom no keo theo kh', 'nhom no'],
    nhomNoCic: ['nhom no keo cic'],
  };
  const LABEL = { cif: 'CIF', tenKH: 'Tên KH', dvkd: 'ĐVKD', duVay: 'Dư nợ', duBL: 'Dư bảo lãnh', duLC: 'Dư LC', hangThauChi: 'Hạng thấu chi', binning: 'Binning',
    nganh: 'Ngành (gợi ý)', dauMoi: 'Đầu mối', mien: 'Miền', nhomNo: 'Nhóm nợ TPB', nhomNoCic: 'Nhóm nợ CIC' };
  const MONEY = ['duVay', 'duBL', 'duLC'];

  async function readWb(file) { const buf = await file.arrayBuffer(); return XLSX.read(buf, { type: 'array', cellDates: true }); }
  function aoa(ws) { return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }); }

  /** Dò dòng tiêu đề (≤ 20 dòng đầu) có nhiều bí danh nhất và có CIF */
  function detect(rows) {
    let best = { score: 0, hr: -1, map: {} };
    for (let r = 0; r < Math.min(20, rows.length); r++) {
      // mỗi trường chọn cột khớp bí danh đứng TRƯỚC trong danh sách (vd TEN_CN tên chi nhánh ưu tiên hơn DVKD mã 3 chữ)
      const map = {}, rank = {}; let score = 0;
      rows[r].forEach((h, c) => {
        const f = fold(h); if (!f) return;
        // khớp CHÍNH XÁC trước (vd "Nhom_no_keo_CIC"), rồi mới khớp tiền tố ("nhom no …")
        let hit = null;
        for (const k of Object.keys(ALIAS)) { const i = ALIAS[k].indexOf(f); if (i >= 0) { hit = [k, i]; break; } }
        if (!hit) for (const k of Object.keys(ALIAS)) { const i = ALIAS[k].findIndex(a => a.length > 6 && f.startsWith(a)); if (i >= 0) { hit = [k, i + 100]; break; } }
        if (!hit) return;
        const [k, i] = hit;
        if (map[k] === undefined) { map[k] = c; rank[k] = i; score++; } else if (i < rank[k]) { map[k] = c; rank[k] = i; }
      });
      if (map.cif !== undefined && score > best.score) best = { score, hr: r, map };
    }
    return best;
  }
  const normCif = (v, pad) => { let s = String(v == null ? '' : v).trim(); if (/^\d+(\.0+)?$/.test(s)) { s = s.replace(/\.0+$/, ''); if (pad && s.length < 8) s = s.padStart(8, '0'); } return s; };
  function numv(v) {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const s = String(v).trim(); if (!s || /^#/.test(s)) return null;
    const x = +s.replace(/\s/g, '').replace(/,/g, ''); return Number.isFinite(x) ? x : null;
  }
  function guessUnit(rows, hr, map) {
    const v = []; for (let r = hr + 1; r < rows.length; r++) MONEY.forEach(k => { if (map[k] !== undefined) { const x = numv(rows[r][map[k]]); if (x) v.push(Math.abs(x)); } });
    v.sort((a, b) => a - b); const med = v.length ? v[Math.floor(v.length / 2)] : 0;
    return med > 1e7 ? 'dong' : 'trd';
  }
  /** → [{cif, ...}] theo map + đơn vị (đồng → chia 1e6 ra triệu đồng) */
  function extract(rows, hr, map, unit, pad) {
    const out = [], div = unit === 'dong' ? 1e6 : 1;
    for (let r = hr + 1; r < rows.length; r++) {
      const row = rows[r], cif = normCif(row[map.cif], pad);
      if (!cif || !/\d/.test(cif) || cif.length < 4) continue;
      const o = { cif };
      Object.keys(map).forEach(k => {
        if (k === 'cif' || map[k] === undefined || map[k] === '') return;
        let v = row[map[k]];
        if (MONEY.indexOf(k) >= 0) { const x = numv(v); o[k] = x === null ? null : Math.round(x / div * 1000) / 1000; }
        else { v = v instanceof Date ? v.toISOString().slice(0, 10) : String(v == null ? '' : v).trim(); if (/^#/.test(v)) v = ''; o[k] = v; }
      });
      if (o.binning) { const b = fold(o.binning); o.binning = b === 'green' ? 'Green' : b === 'amber' ? 'Amber' : b === 'red' ? 'Red' : o.binning; }
      out.push(o);
    }
    return out;
  }

  // ── File điều hành (template) ──
  const SHEETS = { pn: ['Phan loai KH', 6, 'PN'], nhom: ['TH TT nhom', 6, 'NHOM'], actions: ['Action_Plan', 5, 'ACTION'], dl: ['Theo_doi_du_lieu', 5, 'DATAREQ'] };
  const findSheet = (wb, name) => wb.SheetNames.find(n => fold(n) === fold(name));
  function cellVal(f, v) {
    if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    if (f.type === 'pct' || f.k === 'phanTram') {
      if (typeof v === 'string') { const m = v.replace(',', '.').match(/-?\d+(\.\d+)?/); if (!m) return ''; const x = +m[0]; return /%/.test(v) || Math.abs(x) > 1.5 ? x / 100 : x; }
      if (typeof v === 'number') return Math.abs(v) > 1.5 ? v / 100 : v;
    }
    if ((f.type === 'num' || f.type === 'sys') && f.fmt !== 'text') { const x = numv(v); return x === null ? '' : x; }
    return typeof v === 'string' ? v.trim() : v;
  }
  function parseDieuHanh(wb) {
    const out = { pn: [], nhom: [], actions: [], dl: [], thieuSheet: [] };
    Object.keys(SHEETS).forEach(key => {
      const [name, start, fields] = SHEETS[key], sn = findSheet(wb, name);
      if (!sn) { out.thieuSheet.push(name); return; }
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 'A', range: start - 1, raw: true, defval: '' });
      const F = S5S[fields].filter(f => f.x && f.type !== 'calc');
      rows.forEach(r => {
        const o = {};
        F.forEach(f => { const v = r[f.x]; if (v === '' || v === undefined || v === null) return; const k = f.k === 'maNhom' && key !== 'actions' ? 'tenNhom' : f.k; o[k] = cellVal(f, v); });
        if (key === 'actions') { if (r.D) o.tenNhom = String(r.D).trim(); if (r.F) o.ptkd = String(r.F).trim(); }
        if (key === 'nhom' && r.B) o.tenNhom = String(r.B).trim();
        if (key === 'pn' && o.cif !== undefined) o.cif = normCif(o.cif, true);
        if (Object.keys(o).length >= 2) out[key].push(o);
      });
    });
    return out;
  }

  // ── Xuất đúng template ──
  function exportTemplate(groups) {
    const st = S5.store, M = st.S.M, ids = new Set(groups.map(g => g.maNhom));
    const wb = XLSX.utils.book_new();
    const colIdx = x => XLSX.utils.decode_col(x);
    function sheet(title, note, headRow, fields, rows, val, extra) {
      const width = Math.max(...fields.filter(f => f.x).map(f => colIdx(f.x))) + 1;
      const A = [[title], [note], []];
      while (A.length < headRow - 1) A.push([]);
      const H = new Array(width).fill(''); fields.filter(f => f.x).forEach(f => { H[colIdx(f.x)] = f.t; });
      (extra || []).forEach(e => H.push(e[0]));
      A.push(H);
      rows.forEach(r => { const R = new Array(width).fill(''); fields.filter(f => f.x).forEach(f => { const v = val(r, f); R[colIdx(f.x)] = v === null || v === undefined ? '' : v; }); (extra || []).forEach(e => R.push(e[1](r))); A.push(R); });
      const ws = XLSX.utils.aoa_to_sheet(A);
      // định dạng % cho cột tỷ lệ
      fields.filter(f => f.x && (f.type === 'pct' || f.fmt === 'pct' || f.k === 'phanTram')).forEach(f => {
        for (let i = headRow; i < A.length; i++) { const ref = f.x + (i + 1), c = ws[ref]; if (c && c.t === 'n') c.z = '0.0%'; }
      });
      ws['!cols'] = H.map(h => ({ wch: Math.min(40, Math.max(10, String(h).length * 0.6)) }));
      return ws;
    }
    const PN = M.pn.filter(p => ids.has(p.maNhom));
    XLSX.utils.book_append_sheet(wb, sheet('PHIẾU SCREENING / ĐÁNH GIÁ SƠ BỘ', 'Xuất từ web Lá chắn S-500 ngày ' + st.today() + ' · ĐVT: triệu đồng · cột AI = nhãn hiệu lực (máy tính, hoặc nhãn chốt có lý do)', 5, S5S.PN, PN, (p, f) => {
      if (f.k === 'maNhom') return (M.gIdx[p.maNhom] || {}).tenNhom || p.maNhom;
      if (f.k === 'phanLoai') return p.nhan;
      if (f.type === 'calc') { const d = p.e.d; return { hmTong: d.hmTong, duTong: d.duTong, tyLeTsbd: d.tyLeTsbd, tyLeNnh: d.tyLeNnh, tyLeDtTT: d.tyLeDtTT, tuongXung: d.tuongXung, ngayCapNhat: p.ngayCapNhat }[f.k]; }
      if (f.type === 'user') return st.label(p[f.k]);
      return p[f.k] === '' ? '' : p[f.k];
    }, [['Mã nhóm (bổ sung)', p => p.maNhom], ['Nhãn máy (bổ sung)', p => p.e.nhan], ['Lý do ghi đè (bổ sung)', p => p.lyDoGhiDe || ''], ['Nguồn số dư (bổ sung)', p => p.nguonSoDu || '']]), 'Phan loai KH');
    XLSX.utils.book_append_sheet(wb, sheet('DANH MỤC NHÓM KHÁCH HÀNG S-500', 'Mỗi dòng = 01 nhóm KH · tổng dư nợ/BL/LC tự cộng từ pháp nhân (triệu đồng)', 5, S5S.NHOM, groups, (g, f) => ({
      mien: g.mien, tenNhom: g.tenNhom, phapNhanChinh: g.main ? g.main.tenKH : '', cifChinh: g.main ? g.main.cif : '', dauMoi: st.label(g.dauMoi), cbo: g.cbo,
      tongNV: g.tongNV, duNo: g.duNo, bl: g.bl, lc: g.lc, ngayDuLieu: g.ngayDuLieu, ttDuLieu: g.ttDuLieu, phanLoai: g.nhan, uuTien: g.uuTien, siteVisit: g.siteVisit, tienDo: g.tienDo, vanDeBLD: g.vanDeBLD, ghiChu: g.ghiChu,
    })[f.k], [['Mã nhóm (bổ sung)', g => g.maNhom], ['PO hỗ trợ (bổ sung)', g => g.hoTro || ''], ['Nguồn trả nợ (bổ sung)', g => g.nguonTraNo || ''], ['Phương án tiếp theo (bổ sung)', g => g.phuongAn || '']]), 'TH TT nhom');
    XLSX.utils.book_append_sheet(wb, sheet('ACTION PLAN & THEO DÕI BIỆN PHÁP', 'Mỗi hành động một dòng', 4, S5S.ACTION, M.actions.filter(a => ids.has(a.maNhom)), (a, f) => (f.k === 'phanLoai' ? a.nhanNhom : f.k === 'ptkd' ? st.label(a.ptkd) : a[f.k]), [['ID (bổ sung)', a => a.id]]), 'Action_Plan');
    XLSX.utils.book_append_sheet(wb, sheet('THEO DÕI YÊU CẦU BỔ SUNG DỮ LIỆU', '', 4, S5S.DATAREQ, M.dls.filter(x => ids.has(x.maNhom)), (x, f) => (f.k === 'maNhom' ? (x.g ? x.g.tenNhom : x.maNhom) : f.k === 'dauMoi' ? st.label(x.dauMoi) : x[f.k]), [['ID (bổ sung)', x => x.id]]), 'Theo_doi_du_lieu');
    const fn = 'S500_File_dieu_hanh_' + st.today().replace(/-/g, '') + '.xlsx';
    XLSX.writeFile(wb, fn);
    S5.kit.logView('Xuất Excel', groups.length + ' nhóm');
    S5.ui.toast('Đã xuất ' + fn + ' — ' + groups.length + ' nhóm, ' + PN.length + ' pháp nhân', 'ok');
  }

  S5.xio = { readWb, aoa, detect, extract, guessUnit, parseDieuHanh, exportTemplate, LABEL, ALIAS, fold, normCif };
})();
