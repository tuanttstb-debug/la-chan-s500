'use strict';
/* Việc của tôi — nhóm tôi là đầu mối / hỗ trợ (Teamlead: thêm nhóm của team). Thẻ cho thấy còn thiếu gì, việc quá hạn, nút vào nhập nhanh. */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;

  function card(g) {
    const miss = {};
    g.ps.forEach(p => p.miss.forEach(f => { miss[f.k] = (miss[f.k] || 0) + 1; }));
    const missTxt = Object.keys(miss).slice(0, 6).map(k => S5S.byKey('PhapNhan')[k]).map(f => (f.sub ? f.sub + ' ' : '') + (f.db || f.t)).join(' · ');
    return `<div class="gcard ${K().cls(g.nhan)}">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div class="nm" data-open="${esc(g.maNhom)}">${esc(g.tenNhom)}</div>${K().nhan(g.nhan)}</div>
      <div class="row2"><span>${esc(g.maNhom)}</span><span><b>${K().ty(g.tongNV)}</b> nghĩa vụ</span><span>${g.ps.length} pháp nhân</span>${st().mine(g) ? '' : `<span>Đầu mối ${K().who(g.dauMoi)}</span>`}</div>
      ${g.ps.length ? K().prog(g.doDu) : '<div class="miss">Chưa có pháp nhân nào — thêm pháp nhân chính trước.</div>'}
      ${missTxt ? `<div class="miss">Còn thiếu: ${esc(missTxt)}${Object.keys(miss).length > 6 ? '…' : ''}</div>` : ''}
      <div class="row2">${g.actOverdue ? `<span class="od">${g.actOverdue} hành động quá hạn</span>` : ''}${g.dlOpen ? `<span>${g.dlOpen} dữ liệu đang chờ</span>` : ''}<span>Tiến độ: ${esc(g.tienDo || '—')}</span></div>
      <div class="acts"><a class="btn sm pri" href="#/pn/${encodeURIComponent(g.maNhom)}/moi">+ Pháp nhân</a>${g.ps.map(p => `<a class="btn sm" href="#/pn/${encodeURIComponent(g.maNhom)}/${encodeURIComponent(p.cif)}" title="Sửa ${esc(p.tenKH)}">✎ ${esc((p.tenKH || p.cif).slice(0, 22))}</a>`).slice(0, 3).join('')}<a class="btn sm ghost" href="#/nhom/${encodeURIComponent(g.maNhom)}">Xem A4</a></div>
    </div>`;
  }

  function render(host) {
    const M = st().S.M, u = st().S.user;
    const mine = M.groups.filter(g => st().mine(g));
    const team = u.role === 'Teamlead' ? M.groups.filter(g => !st().mine(g) && st().canEdit(g)) : [];
    const att = mine.filter(g => g.reqMiss || g.actOverdue || !g.ps.length).length;
    host.innerHTML = `
      <div class="kpis">
        ${S5.ui.kpi('Nhóm tôi phụ trách', mine.length, mine.length ? K().ty(mine.reduce((s, g) => s + g.tongNV, 0)) + ' nghĩa vụ' : '', 'pri')}
        ${S5.ui.kpi('Cần bổ sung', att, 'thiếu dữ liệu / quá hạn / chưa có pháp nhân', att ? 'accent' : '')}
        ${S5.ui.kpi('Đã có nhãn Đỏ/Vàng/Xanh', mine.filter(g => g.daDanhGia).length + '/' + mine.length, '')}
        ${S5.ui.kpi('Hành động quá hạn', mine.reduce((s, g) => s + g.actOverdue, 0), '', mine.reduce((s, g) => s + g.actOverdue, 0) ? 'danger' : '')}
      </div>
      <div class="toolbar"><button class="btn pri" id="nG">+ Nhóm KH mới (pháp nhân liên quan chưa có trong danh mục)</button><span class="sp"></span><span class="muted small">Quy trình: ① đọc báo cáo tái thẩm định, bổ sung pháp nhân liên quan → ② thu thập dữ liệu 7 tiêu chí → ③ nhập, máy dán nhãn → ④ hành động + dữ liệu còn thiếu</span></div>
      ${mine.length ? `<div class="gcards">${mine.map(card).join('')}</div>` : `<div class="card empty-state"><div class="ic">🛡</div>Chưa có nhóm nào giao cho bạn. PM phân công ở trang nhóm (đầu mối / PO hỗ trợ).</div>`}
      ${team.length ? `<h3 style="margin:22px 0 10px">Nhóm của team ${esc(u.team)} <span class="muted small">(Teamlead kiểm soát chất lượng)</span></h3><div class="gcards">${team.map(card).join('')}</div>` : ''}`;
    $('nG').onclick = () => S5.forms.nhom(null);
    host.querySelectorAll('[data-open]').forEach(el => el.onclick = () => S5.go('nhom', el.dataset.open));
  }
  S5.views.cuatoi = { render };
})();
