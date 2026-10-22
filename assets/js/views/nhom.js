'use strict';
/* Danh mục nhóm KH — "TH TT nhom" tự tổng hợp: 1 dòng = 1 nhóm, tổng dư nợ/BL/LC từ pháp nhân (R3), nhãn nhóm = cao nhất (R5). */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;

  function render(host) {
    const M = st().S.M, canNew = !st().isBLD();
    host.innerHTML = `<div class="toolbar">
        ${canNew ? '<button class="btn pri" id="btnNew">+ Nhóm KH mới</button>' : ''}
        <button class="btn" id="btnXuat">⤓ Xuất Excel (đúng template file điều hành)</button>
        <span class="sp"></span><span class="muted small">Bấm 1 dòng để mở trang chi tiết nhóm (xem/in A4).</span>
      </div>` + K().filterBar('fNhom', { nhan: true, mien: true, search: 'Tìm nhóm, pháp nhân, CIF, ĐVKD…' }) + '<div class="card" id="nhBody"></div>';
    if ($('btnNew')) $('btnNew').onclick = () => S5.forms.nhom(null);
    $('btnXuat').onclick = () => S5.xio.exportTemplate(M.groups.filter(g => F.match(g)));
    const F = K().bindFilter('fNhom', M.groups, draw);
    function draw() {
      const rows = M.groups.filter(g => F.match(g));
      const sum = k => rows.reduce((s, g) => s + (g[k] || 0), 0);
      S5.ui.table($('nhBody'), rows, [
        { k: 'nhan', t: 'Nhãn', f: g => K().nhan(g.nhan), sort: g => S5R.SEV[g.nhan] },
        { k: 'tenNhom', t: 'Nhóm KH', w: 240, f: g => `<b>${esc(g.tenNhom)}</b><span class="sub">${esc(g.maNhom)} · ${g.ps.length} pháp nhân${g.dvkds.length ? ' · ' + esc(g.dvkds.slice(0, 3).join(', ')) : ''}</span>` },
        { k: 'tongNV', t: 'Tổng nghĩa vụ', num: 1, f: g => `<b>${K().ty(g.tongNV)}</b>` },
        { k: 'duNo', t: 'Dư nợ', num: 1, f: g => K().ty(g.duNo) },
        { k: 'bl', t: 'BL', num: 1, f: g => K().ty(g.bl) },
        { k: 'lc', t: 'LC', num: 1, f: g => K().ty(g.lc) },
        { k: 'dauMoi', t: 'Đầu mối', f: g => K().who(g.dauMoi) + (g.hoTro ? `<span class="sub">+ ${esc(st().splitUsers(g.hoTro).map(st().label).join(', '))}</span>` : ''), sort: g => st().label(g.dauMoi) },
        { k: 'uuTien', t: 'Ưu tiên', f: g => esc(g.uuTien ? g.uuTien.split(' - ')[0] : '') + (g.siteVisit === 'Có' ? ' <span class="chip org">Site visit</span>' : '') },
        { k: 'tienDo', t: 'Tiến độ', f: g => esc(g.tienDo || '—') },
        { k: 'doDu', t: 'Đủ dữ liệu', f: g => g.ps.length ? K().prog(g.doDu) : '<span class="muted small">chưa có pháp nhân</span>' },
        { k: 'actOpen', t: 'Hành động', f: g => `${g.acts.length ? g.actOpen + ' mở' : '<span class="muted">—</span>'}${g.actOverdue ? ` <span class="pill-n err">${g.actOverdue} quá hạn</span>` : ''}` },
      ], { noSearch: true, pageSize: 100, sortKey: 'nhan', sortDir: -1, empty: 'Không có nhóm nào khớp bộ lọc',
        tools: `<span class="muted small">Tổng nghĩa vụ <b>${K().ty(sum('tongNV'))}</b> · dư nợ ${K().ty(sum('duNo'))} · BL ${K().ty(sum('bl'))} · LC ${K().ty(sum('lc'))}</span>`,
        rowClass: () => 'click', onRow: (g, tr) => { tr.onclick = () => S5.go('nhom', g.maNhom); } });
    }
    draw();
  }
  S5.views.nhom = { render };
})();
