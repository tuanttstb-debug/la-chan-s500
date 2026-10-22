'use strict';
/* Action Plan (A–V) + Theo dõi dữ liệu (A–M) — bảng toàn chiến dịch, lọc chuẩn Team + Nhân sự (theo đầu mối/hỗ trợ của nhóm). */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;

  function renderAction(host) {
    const M = st().S.M;
    host.innerHTML = `<div class="toolbar">${st().isBLD() ? '' : '<button class="btn pri" id="nA">+ Hành động</button>'}<span class="sp"></span>
      <span class="muted small">A1 tiếp tục HM · A2 duy trì + tăng giám sát · A3 thu hẹp dần · A4 thoái lui, thu hồi</span></div>`
      + K().filterBar('fAct', { nhan: true, search: 'Tìm nhóm, biện pháp, người chịu TN…', extra: `<select class="pf-select" id="aMa"><option value="">Mọi mã</option>${S5S.LISTS.MA_HD.map(c => `<option>${c}</option>`).join('')}</select><select class="pf-select" id="aTT"><option value="">Mọi trạng thái</option><option value="__open">Đang mở</option>${S5S.LISTS.TIEN_DO.map(c => `<option>${c}</option>`).join('')}</select><label class="small" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="aOD"> Chỉ quá hạn</label>` })
      + '<div class="card" id="aBody"></div>';
    if ($('nA')) $('nA').onclick = () => S5.forms.action(null, (M.groups.find(g => st().canEdit(g)) || {}).maNhom);
    const rows0 = M.actions.map(a => Object.assign({}, a, { nhan: a.nhanNhom, tenNhom: a.tenNhom, ps: a.g ? a.g.ps : [] }));
    const F = K().bindFilter('fAct', rows0, draw);
    ['aMa', 'aTT', 'aOD'].forEach(id => $(id).onchange = draw);
    function draw() {
      const ma = $('aMa').value, tt = $('aTT').value, od = $('aOD').checked;
      const rows = rows0.filter(a => F.match(a, a.bienPhap + ' ' + a.nguoiTN + ' ' + a.mucTieu) && (!ma || a.maHD === ma) && (!tt || (tt === '__open' ? a.open : a.trangThai === tt)) && (!od || a.overdue));
      S5.ui.table($('aBody'), rows, [
        { k: 'maHD', t: 'Mã', f: a => `<span class="code-a ${esc(a.maHD)}" title="${esc(a.hanhDong)}">${esc(a.maHD)}</span>` },
        { k: 'tenNhom', t: 'Nhóm KH', w: 180, f: a => `${K().nhan(a.nhan)}<br><b>${esc(a.tenNhom)}</b><span class="sub">${esc(a.maNhom)} · ${K().who(a.ptkd)}</span>` },
        { k: 'bienPhap', t: 'Biện pháp / mục tiêu', w: 280, f: a => `${esc(a.bienPhap)}${a.mucTieu ? `<span class="sub">→ ${esc(a.mucTieu)}</span>` : ''}${a.vuongMac ? `<span class="sub" style="color:var(--warning)">Vướng: ${esc(a.vuongMac)}</span>` : ''}` },
        { k: 'nguoiTN', t: 'Chịu TN / chủ trì', f: a => `${esc(a.nguoiTN)}<span class="sub">${esc([a.chuTri, a.phoiHop].filter(Boolean).join(' · '))}</span>` },
        { k: 'han', t: 'Hạn', f: a => `<span class="${a.overdue ? 'od' : ''}">${K().dmy(a.han)}</span>` },
        { k: 'trangThai', t: 'Trạng thái', f: a => `${esc(a.trangThai)}${a.overdue ? ' <span class="pill-n err">quá hạn</span>' : ''}` },
        { k: 'phanTram', t: '%', num: 1, f: a => (a.phanTram === '' ? '' : K().prog(a.phanTram)) },
        { k: 'bangChung', t: 'Bằng chứng', f: a => esc(a.bangChung).slice(0, 60) },
        { k: 'ngayCapNhat', t: 'Cập nhật', f: a => K().dm(a.ngayCapNhat) },
      ], { noSearch: true, pageSize: 100, sortKey: 'han', sortDir: 1, empty: 'Chưa có hành động khớp bộ lọc',
        rowClass: a => (a.g && st().canEdit(a.g) ? 'click' : ''), onRow: (a, tr) => { if (a.g && st().canEdit(a.g)) tr.onclick = () => S5.forms.action(M.actions.find(x => x.id === a.id)); } });
    }
    draw();
  }

  function renderDL(host) {
    const M = st().S.M;
    host.innerHTML = `<div class="toolbar">${st().isBLD() ? '' : '<button class="btn pri" id="nD">+ Yêu cầu dữ liệu</button>'}<span class="sp"></span><span class="muted small">Quản trị riêng dữ liệu chưa có: đơn vị sở hữu, đầu mối cung cấp, hạn, ảnh hưởng nếu thiếu.</span></div>`
      + K().filterBar('fDl', { nhan: true, search: 'Tìm nhóm, loại dữ liệu, đơn vị…', extra: `<select class="pf-select" id="dTT"><option value="__open">Chưa nhận</option><option value="">Tất cả</option>${S5S.LISTS.TIEN_DO.map(c => `<option>${c}</option>`).join('')}</select>` })
      + '<div class="card" id="dBody"></div>';
    if ($('nD')) $('nD').onclick = () => S5.forms.dl(null, (M.groups.find(g => st().canEdit(g)) || {}).maNhom);
    const rows0 = M.dls.map(x => Object.assign({}, x, { nhan: x.g ? x.g.nhan : 'Chưa đánh giá', tenNhom: x.g ? x.g.tenNhom : x.maNhom, ps: x.g ? x.g.ps : [] }));
    const F = K().bindFilter('fDl', rows0, draw);
    $('dTT').onchange = draw;
    function draw() {
      const tt = $('dTT').value;
      const rows = rows0.filter(x => F.match(x, x.loai + ' ' + x.donViSoHuu + ' ' + x.dauMoiCC + ' ' + x.thongTin) && (!tt || (tt === '__open' ? x.open : x.trangThai === tt)));
      S5.ui.table($('dBody'), rows, [
        { k: 'tenNhom', t: 'Nhóm KH', w: 180, f: x => `${K().nhan(x.nhan)}<br><b>${esc(x.tenNhom)}</b><span class="sub">${K().who(x.dauMoi)}</span>` },
        { k: 'loai', t: 'Loại dữ liệu', f: x => `<b>${esc(x.loai)}</b>${x.thongTin ? `<span class="sub">${esc(x.thongTin)}</span>` : ''}` },
        { k: 'donViSoHuu', t: 'Sở hữu / cung cấp', f: x => `${esc(x.donViSoHuu)}<span class="sub">${esc(x.dauMoiCC)}</span>` },
        { k: 'ngayYC', t: 'Yêu cầu', f: x => K().dm(x.ngayYC) },
        { k: 'han', t: 'Hạn', f: x => `<span class="${x.overdue ? 'od' : ''}">${K().dmy(x.han)}</span>` },
        { k: 'trangThai', t: 'Trạng thái', f: x => esc(x.trangThai) + (x.ngayNhan ? `<span class="sub">nhận ${K().dm(x.ngayNhan)}</span>` : '') },
        { k: 'mucAH', t: 'Ảnh hưởng', f: x => (x.mucAH === 'Trọng yếu' ? `<span class="chip err">${esc(x.mucAH)}</span>` : esc(x.mucAH)) },
        { k: 'nguon', t: 'Nguồn', f: x => esc(x.nguon).slice(0, 50) },
      ], { noSearch: true, pageSize: 100, sortKey: 'han', sortDir: 1, empty: 'Không có yêu cầu dữ liệu khớp bộ lọc',
        rowClass: x => (x.g && st().canEdit(x.g) ? 'click' : ''), onRow: (x, tr) => { if (x.g && st().canEdit(x.g)) tr.onclick = () => S5.forms.dl(M.dls.find(y => y.id === x.id)); } });
    }
    draw();
  }
  S5.views.action = { render: renderAction };
  S5.views.dulieu = { render: renderDL };
})();
