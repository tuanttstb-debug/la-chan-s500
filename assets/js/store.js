'use strict';
/* store.js — dữ liệu trong BỘ NHỚ trang (không localStorage/IndexedDB — DEC-20261022-01): tải từ GAS → mô hình chiến dịch.
 * Nhãn tính lại bằng core/rules.js (cùng lõi với server) để màn hình luôn khớp ngưỡng hiện hành. Đóng tab là hết dữ liệu trên máy. */
(function () {
  const S = { user: null, users: [], config: {}, data: null, M: null, loadedAt: null };
  const s = v => (v === null || v === undefined ? '' : String(v).trim());
  const n = v => (v === '' || v === null || v === undefined || !Number.isFinite(+v) ? null : +v);
  const lc = v => s(v).toLowerCase();
  const today = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.toISOString().slice(0, 10); };
  const DONE = ['Hoàn thành', 'Tạm dừng'];
  const SEV = S5R.SEV;
  const NHAN_ORDER = ['Đỏ', 'Vàng', 'Chưa đủ dữ liệu', 'Xanh', 'Chưa đánh giá'];

  function userOf(u) { const k = lc(u); return S.users.find(x => lc(x.username) === k) || null; }
  function label(u) { if (!s(u)) return '—'; const x = userOf(u); return PeopleFilter.label(x ? x.username : u, x ? x.name : ''); }
  function teamOf(u) { const x = userOf(u); return x ? x.team : ''; }
  const splitUsers = v => s(v).split(/[\s,;+/&]+/).filter(Boolean);

  function isOverdue(a, t) { return a.trangThai === 'Quá hạn' || (!!a.han && a.han < t && DONE.indexOf(a.trangThai) < 0); }

  /** Đầy đủ dữ liệu bắt buộc của 1 pháp nhân (để PM nhắc đúng người) */
  function missingFields(p) {
    return S5S.PN.filter(f => f.req && f.type !== 'calc').filter(f => s(p[f.k]) === '').map(f => f);
  }

  function compute(d) {
    const t = today();
    try { S5R.setThresholds(S.config.rules ? JSON.parse(S.config.rules) : null); } catch (e) { S5R.setThresholds(null); }
    const pn = d.pn.map(p => {
      const e = S5R.evalPN(p), nhan = S5R.nhanHieuLuc(p, e);
      const miss = missingFields(p);
      return Object.assign({}, p, { e, nhan, ghiDe: !!s(p.nhanChot) && p.nhanChot !== e.nhan, duTongN: n(e.d.duTong) || 0, miss, nguonNgay: (s(p.nguonSoDu).match(/\d{4}-\d{2}-\d{2}/) || [''])[0] });
    });
    const byNhom = {};
    pn.forEach(p => { (byNhom[p.maNhom] = byNhom[p.maNhom] || []).push(p); });
    const actions = d.action.map(a => Object.assign({}, a, { overdue: isOverdue(a, t), open: DONE.indexOf(a.trangThai) < 0 }));
    const dls = d.dl.map(x => Object.assign({}, x, { overdue: !!x.han && x.han < t && x.trangThai !== 'Hoàn thành', open: x.trangThai !== 'Hoàn thành' }));
    const groups = d.nhom.map(g => {
      const ps = (byNhom[g.maNhom] || []).slice().sort((a, b) => b.duTongN - a.duTongN);
      const sum = k => ps.reduce((x, p) => x + (n(p[k]) || 0), 0);
      const hm = ps.reduce((x, p) => x + (n(p.e.d.hmTong) || 0), 0);
      const nhan = ps.length ? S5R.groupLabel(ps.map(p => p.nhan)) : 'Chưa đánh giá';
      const acts = actions.filter(a => a.maNhom === g.maNhom), dl = dls.filter(x => x.maNhom === g.maNhom);
      const reqTotal = ps.length * S5S.PN.filter(f => f.req && f.type !== 'calc').length;
      const reqMiss = ps.reduce((x, p) => x + p.miss.length, 0);
      const ngay = ps.map(p => p.nguonNgay).filter(Boolean).sort().pop() || '';
      const main = ps[0] || null;
      const doNgay = [].concat(...ps.map(p => p.e.doNgay.map(r => (ps.length > 1 ? p.tenKH + ': ' : '') + r)));
      return Object.assign({}, g, {
        ps, nhan, main, team: teamOf(g.dauMoi), people: [g.dauMoi].concat(splitUsers(g.hoTro)),
        duNo: sum('duVay'), bl: sum('duBL'), lc: sum('duLC'), tongNV: sum('duVay') + sum('duBL') + sum('duLC'), hm, tsbd: sum('tsbd'),
        hmChuaGN: hm ? Math.max(0, hm - (sum('duVay') + sum('duBL') + sum('duLC'))) : null,
        dvkds: [...new Set(ps.map(p => p.dvkd).filter(Boolean))], nganh: main ? main.nganh : '', ngayDuLieu: ngay,
        acts, actOpen: acts.filter(a => a.open).length, actOverdue: acts.filter(a => a.overdue).length,
        dl, dlOpen: dl.filter(x => x.open).length,
        doDu: reqTotal ? 1 - reqMiss / reqTotal : 0, reqMiss, doNgay,
        daDanhGia: ps.length > 0 && ['Đỏ', 'Vàng', 'Xanh'].indexOf(nhan) >= 0,
      });
    }).sort((a, b) => (SEV[b.nhan] - SEV[a.nhan]) || (b.tongNV - a.tongNV));
    const gIdx = {}; groups.forEach(g => { gIdx[g.maNhom] = g; });
    actions.forEach(a => { const g = gIdx[a.maNhom]; a.g = g || null; a.nhanNhom = g ? g.nhan : a.phanLoai; a.team = g ? g.team : ''; a.people = g ? g.people : []; });
    dls.forEach(x => { const g = gIdx[x.maNhom]; x.g = g || null; x.team = g ? g.team : ''; x.people = g ? g.people.concat([x.dauMoi]) : [x.dauMoi]; });
    return { groups, gIdx, pn, actions, dls, today: t };
  }

  /** Tuần chiến dịch (kick-off 20/10/2026, 8 tuần) */
  function week() {
    const st = s(S.config.start) || '2026-10-20';
    const w = Math.floor((Date.parse(today()) - Date.parse(st)) / (7 * 864e5)) + 1;
    return Math.max(1, w);
  }
  const STAGES = [
    { w: [1, 1], t: 'Khởi động', d: 'Chốt kế hoạch, danh mục, phân công' },
    { w: [2, 3], t: 'Screening & dán nhãn', d: '7 tiêu chí · Xanh/Vàng/Đỏ toàn danh mục' },
    { w: [4, 5], t: 'Deep dive', d: 'Đỏ trọng yếu → Đỏ → Vàng' },
    { w: [6, 6], t: 'Site visit', d: 'Kiểm chứng thực địa theo rủi ro' },
    { w: [7, 8], t: 'Phương án A1–A4', d: 'Action plan · watchlist' },
  ];
  function stage(w) { return STAGES.find(x => w >= x.w[0] && w <= x.w[1]) || { t: 'Vận hành sau chiến dịch', d: 'Giám sát định kỳ' }; }

  async function load() {
    const r = await S5.net.call('load', {}, { timeoutMs: S5.CONFIG.READ_TIMEOUT_MS });
    S.user = r.user; S.users = r.users || []; S.config = r.config || {}; S.version = r.version;
    S.data = { nhom: r.nhom || [], pn: r.pn || [], action: r.action || [], dl: r.dl || [], ky: r.ky || [] };
    S.M = compute(S.data); S.loadedAt = new Date();
    return S;
  }

  const role = () => (S.user ? S.user.s5Role : '');
  const isPM = () => role() === 'PM';
  const isBLD = () => role() === 'BLĐ';
  /** Cùng luật canEditNhom_ ở server (FE chỉ để ẩn/hiện nút) */
  function canEdit(g) {
    if (!S.user || isBLD()) return false;
    if (isPM()) return true;
    if (!g) return true;
    const me = lc(S.user.username);
    if (lc(g.dauMoi) === me || splitUsers(g.hoTro).map(lc).indexOf(me) >= 0) return true;
    return S.user.role === 'Teamlead' && !!S.user.team && lc(teamOf(g.dauMoi)) === lc(S.user.team);
  }
  const mine = g => { const me = lc(S.user.username); return lc(g.dauMoi) === me || splitUsers(g.hoTro).map(lc).indexOf(me) >= 0; };

  S5.store = { S, load, compute, label, userOf, teamOf, week, stage, STAGES, role, isPM, isBLD, canEdit, mine, missingFields, NHAN_ORDER, today, splitUsers };
})();
