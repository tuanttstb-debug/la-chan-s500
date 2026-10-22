'use strict';
/* kit.js — mảnh giao diện riêng S-500: nhãn Xanh/Vàng/Đỏ · tiền (đơn vị gốc triệu đồng) · ô tiêu chí · bộ lọc chuẩn Team + Nhân sự + nhãn. */
(function () {
  const { esc } = S5.ui;
  const CLS = { 'Đỏ': 'do', 'Vàng': 'vang', 'Xanh': 'xanh', 'Chưa đủ dữ liệu': 'thieu', 'Chưa đánh giá': 'chua' };
  const nhan = (l, size) => `<span class="nhan ${CLS[l] || 'chua'} ${size || ''}">${esc(l || 'Chưa đánh giá')}</span>`;
  const cls = l => CLS[l] || 'chua';
  const num = v => (v === '' || v === null || v === undefined || !Number.isFinite(+v) ? null : +v);
  /** triệu đồng → "1.234,5 tỷ" */
  const ty = (v, d) => { v = num(v); if (v === null) return '–'; return (v / 1000).toLocaleString('vi-VN', { maximumFractionDigits: d === undefined ? 1 : d }) + ' tỷ'; };
  const tyN = v => { v = num(v); return v === null ? '–' : (v / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }); };
  const trd = v => { v = num(v); return v === null ? '–' : Math.round(v).toLocaleString('vi-VN'); };
  const pct = (v, d) => { v = num(v); return v === null ? '–' : (v * 100).toLocaleString('vi-VN', { maximumFractionDigits: d === undefined ? 1 : d }) + '%'; };
  const lan = v => { v = num(v); return v === null ? '–' : v.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' lần'; };
  const dmy = s => { s = String(s || ''); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : s; };
  const dm = s => { s = String(s || ''); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(8, 10) + '/' + s.slice(5, 7) : s; };
  const who = u => esc(S5.store.label(u));

  /** Giá trị hiển thị của 1 tiêu chí */
  function tcVal(c) {
    if (c.val === null || c.val === undefined || c.val === '') return '';
    if (c.id === 5) return lan(c.val);
    if (c.id === 3 || c.id === 6) return String(c.val);
    const x = num(c.val); if (x === null) return String(c.val);
    return (c.id === 7 && x > 0 ? '+' : '') + pct(x);
  }
  const tcShort = { 3: v => (/^không/i.test(v) ? 'Không' : /tái diễn hoặc|chưa khắc phục/i.test(v) ? 'Tái diễn' : 'Đã khắc phục') };
  function tcCell(c) {
    if (c.nhan === 'Thiếu') return `<span class="tc Thiếu" title="${esc(c.ten)} — chưa có dữ liệu">chưa có</span>`;
    const v = tcVal(c), sh = tcShort[c.id] ? tcShort[c.id](String(c.val)) : v;
    return `<span class="tc ${esc(c.nhan)}" title="${esc(c.ten + ': ' + v + ' → ' + c.nhan + (c.chiTiet ? ' · ' + c.chiTiet : ''))}">${esc(sh)}<small>${esc(c.nhan)}</small></span>`;
  }

  const prog = (v, okAt) => { const p = Math.round((v || 0) * 100); return `<div class="prog"><div class="pb ${p >= (okAt || 100) ? 'ok' : ''}"><div style="width:${p}%"></div></div><span>${p}%</span></div>`; };

  /** Thanh lọc chuẩn: Team · Nhân sự (PeopleFilter) + chip nhãn + tìm. state: {nhan:Set, q} */
  function filterBar(id, opts) {
    opts = opts || {};
    return `<div class="fbar no-print" id="${id}">
      <span class="lbl">Lọc</span>
      <select class="pf-select pf-select--team" id="${id}Team"></select>
      <select class="pf-select" id="${id}User"></select>
      ${opts.mien ? `<select class="pf-select" id="${id}Mien"><option value="">Cả 2 miền</option><option>Bắc</option><option>Nam</option></select>` : ''}
      ${opts.nhan ? S5.store.NHAN_ORDER.map(l => `<span class="nchip on" data-n="${esc(l)}">${nhan(l)}</span>`).join('') : ''}
      ${opts.extra || ''}
      ${opts.search ? `<input class="search" id="${id}Q" placeholder="${esc(opts.search)}">` : ''}
    </div>`;
  }
  /** Gắn sự kiện thanh lọc → trả về hàm match(g) cho nhóm (theo team đầu mối + người: đầu mối/PO hỗ trợ). */
  function bindFilter(id, rows, onChange, opts) {
    opts = opts || {};
    const st = S5.kit.fstate[id] || (S5.kit.fstate[id] = { nhan: new Set(S5.store.NHAN_ORDER), q: '', mien: '' });
    const pf = PeopleFilter.bind({ team: id + 'Team', user: id + 'User', onChange });
    const people = [];
    rows.forEach(r => (r.people || []).forEach(u => { const x = S5.store.userOf(u); if (x) people.push({ username: x.username, name: x.name, team: x.team }); }));
    pf.setPeople(people);
    if (st.team) { const te = $(id + 'Team'); te.value = st.team; pf.refreshUsers(); }
    if (st.user) { const ue = $(id + 'User'); ue.value = st.user; }
    const host = $(id);
    host.querySelectorAll('.nchip').forEach(ch => {
      ch.classList.toggle('on', st.nhan.has(ch.dataset.n));
      ch.onclick = e => {
        const k = ch.dataset.n;
        if (e.shiftKey || e.ctrlKey || e.metaKey) { st.nhan.has(k) ? st.nhan.delete(k) : st.nhan.add(k); }
        else if (st.nhan.size === 1 && st.nhan.has(k)) S5.store.NHAN_ORDER.forEach(x => st.nhan.add(x));
        else { st.nhan.clear(); st.nhan.add(k); }
        host.querySelectorAll('.nchip').forEach(c => c.classList.toggle('on', st.nhan.has(c.dataset.n)));
        onChange();
      };
      ch.title = 'Bấm: chỉ xem nhãn này (bấm lại: xem tất cả) · Ctrl+bấm: chọn nhiều';
    });
    const q = $(id + 'Q'); if (q) { q.value = st.q; q.oninput = () => { st.q = q.value; onChange(); }; }
    const mi = $(id + 'Mien'); if (mi) { mi.value = st.mien; mi.onchange = () => { st.mien = mi.value; onChange(); }; }
    $(id + 'Team').addEventListener('change', () => { st.team = $(id + 'Team').value; st.user = $(id + 'User').value; });
    $(id + 'User').addEventListener('change', () => { st.user = $(id + 'User').value; });
    return {
      match(g, extraText, boQuaNhan) {
        if (!pf.match(g.team, g.people)) return false;
        if (!boQuaNhan && opts.nhanKey !== false && !st.nhan.has(g.nhan || 'Chưa đánh giá')) return false;
        if (st.mien && g.mien !== st.mien) return false;
        if (st.q) { const t = st.q.toLowerCase(); const hay = [g.tenNhom, g.maNhom, (g.ps || []).map(p => p.tenKH + ' ' + p.cif + ' ' + p.dvkd).join(' '), extraText || ''].join(' ').toLowerCase(); if (!hay.includes(t)) return false; }
        return true;
      },
      pf, st,
    };
  }

  /** Ô nhập theo schema (dùng cho form nhóm/action/dữ liệu) */
  function field(f, val, opts) {
    opts = opts || {};
    const id = 'f_' + f.k, v = val === undefined || val === null ? '' : val, req = f.req ? '<span class="req">*</span>' : '';
    const col = f.x && opts.cols ? `<span class="col">${f.x}</span>` : '';
    const lab = `<label for="${id}">${esc(opts.label || f.t)} ${req}${col}</label>`;
    const wide = f.type === 'long' || opts.wide ? ' wide' : '';
    let inp;
    if (f.type === 'sel') {
      const L = S5S.LISTS[f.opt];
      inp = `<select id="${id}" data-k="${f.k}"><option value=""></option>${(Array.isArray(L) ? L : Object.keys(L)).map(o => `<option ${String(v) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    } else if (f.type === 'user') {
      inp = `<select id="${id}" data-k="${f.k}"><option value=""></option>${userOptions(v)}</select>`;
    } else if (f.type === 'long') inp = `<textarea id="${id}" data-k="${f.k}" rows="${opts.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
    else if (f.type === 'date') inp = `<input type="date" id="${id}" data-k="${f.k}" value="${esc(String(v).slice(0, 10))}">`;
    else if (f.type === 'num') inp = `<div class="unit"><input type="number" step="any" id="${id}" data-k="${f.k}" value="${esc(v)}"><span>trđ</span></div>`;
    else if (f.type === 'pct') inp = `<div class="unit"><input type="number" step="any" id="${id}" data-k="${f.k}" data-pct="1" value="${v === '' ? '' : esc(+(+v * 100).toFixed(4))}"><span>%</span></div>`;
    else inp = `<input id="${id}" data-k="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}">`;
    return `<div class="ff${wide}">${lab}${inp}${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}</div>`;
  }
  function userOptions(cur) {
    const L = S5.store.S.users.slice().sort((a, b) => PeopleFilter.label(a.username, a.name).localeCompare(PeopleFilter.label(b.username, b.name), 'vi'));
    return L.map(u => `<option value="${esc(u.username)}" ${String(cur).toLowerCase() === u.username.toLowerCase() ? 'selected' : ''}>${esc(PeopleFilter.label(u.username, u.name))}${u.team ? ' · ' + esc(u.team) : ''}</option>`).join('');
  }
  /** Đọc giá trị các ô [data-k] trong host → object (pct chia 100) */
  function readForm(host) {
    const o = {};
    host.querySelectorAll('[data-k]').forEach(el => {
      let v = el.value;
      if (el.dataset.pct && v !== '') v = +v / 100;
      else if (el.type === 'number' && v !== '') v = +v;
      o[el.dataset.k] = v;
    });
    return o;
  }

  function logView(what, target) { S5.net.call('log', { what, target }).catch(() => {}); }

  S5.kit = { nhan, cls, ty, tyN, trd, pct, lan, dmy, dm, who, tcCell, tcVal, prog, filterBar, bindFilter, fstate: {}, field, userOptions, readForm, num, logView };
})();
