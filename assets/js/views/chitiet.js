'use strict';
/* Chi tiết nhóm KH = ONE-PAGER A4 (R7 + D08: "Word A4 từng KH" là màn xem chi tiết, xuất PDF bằng In).
 * Khuôn anh Cường: dư nợ · nguồn trả nợ · 3 rủi ro lớn nhất · hành động · quyết định cần xin + 7 tiêu chí từng pháp nhân. */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;
  const txt = (v, ph) => v ? `<div class="txt">${esc(v)}</div>` : `<div class="txt empty">${esc(ph || 'Chưa nhập')}</div>`;

  function render(host, args) {
    const M = st().S.M, g = M.gIdx[args[0]];
    if (!g) { host.innerHTML = '<div class="alert warn">Không thấy nhóm này (có thể đã bị xóa). <a href="#/nhom">← Danh mục</a></div>'; return; }
    $('pageTitle').textContent = g.tenNhom; $('pageSub').textContent = g.maNhom + ' · Danh mục nhóm KH';
    const can = st().canEdit(g), me = st().S.user;
    const tcHead = [1, 2, 3, 4, 5, 6, 7].map(i => `<th title="${esc(S5R.TEN[i])}">TC${i}<br><span style="font-weight:500">${esc(S5R.TEN[i])}</span></th>`).join('');
    const pnRows = g.ps.map(p => `<tr>
        <td><div class="nm">${esc(p.tenKH || '(chưa có tên)')}</div><div class="cf">CIF ${esc(p.cif)} · ${esc(p.quanHe || '—')} · ${esc(p.dvkd || '')}</div><div class="cf">Nghĩa vụ <b>${K().ty(p.duTongN)}</b>${p.nganh ? ' · ' + esc(p.nganh) : ''}${p.e.xayLap ? ' (ngưỡng xây lắp)' : ''}</div></td>
        ${p.e.tc.map(c => `<td>${K().tcCell(c)}</td>`).join('')}
        <td>${K().nhan(p.nhan)}${p.ghiDe ? `<div class="gd" title="Máy: ${esc(p.e.nhan)} · Lý do ghi đè: ${esc(p.lyDoGhiDe)}">ghi đè (máy: ${esc(p.e.nhan)})</div>` : ''}${p.nhan === 'Chưa đủ dữ liệu' && p.e.nghieng ? `<div class="cf">đang nghiêng ${esc(p.e.nghieng)}</div>` : ''}</td>
        ${can ? `<td class="no-print"><a class="btn sm ghost edit-x" href="#/pn/${encodeURIComponent(g.maNhom)}/${encodeURIComponent(p.cif)}">Sửa</a></td>` : ''}
      </tr>`).join('');
    const rr = g.ps.filter(p => p.lyDo || p.ghiChu);
    const acts = g.acts.slice().sort((a, b) => (a.open === b.open ? (a.han || '').localeCompare(b.han || '') : a.open ? -1 : 1));
    const qmCell = (k, v, sub, main) => `<div class="${main ? 'main' : ''}"><div class="k">${k}</div><div class="v">${v}${sub ? ` <small>${sub}</small>` : ''}</div></div>`;

    host.innerHTML = `
      <div class="toolbar no-print">
        <a class="btn ghost" href="#/nhom">← Danh mục</a>
        ${can ? `<button class="btn" id="eNhom">✎ Thông tin nhóm</button>
          <a class="btn pri" href="#/pn/${encodeURIComponent(g.maNhom)}/moi">+ Pháp nhân</a>
          <button class="btn" id="aAct">+ Hành động</button>
          <button class="btn" id="aDl">+ Yêu cầu dữ liệu</button>` : ''}
        <span class="sp"></span>
        ${st().isPM() ? '<button class="btn ghost" id="delG">Xóa nhóm</button>' : ''}
        <button class="btn org" id="btnPrint">⎙ In / Lưu PDF (A4)</button>
      </div>
      <div class="paper" id="onepager">
        <div class="op-head">
          <div>
            <div class="brand-s">Lá chắn S-500 · Hồ sơ nhóm khách hàng</div>
            <div class="ttl">${esc(g.tenNhom)}</div>
            <div class="meta"><span>Mã <b>${esc(g.maNhom)}</b></span><span>Đầu mối <b>${K().who(g.dauMoi)}</b></span>${g.hoTro ? `<span>Hỗ trợ <b>${esc(st().splitUsers(g.hoTro).map(st().label).join(', '))}</b></span>` : ''}${g.cbo ? `<span>CBO <b>${esc(g.cbo)}</b></span>` : ''}<span>Miền <b>${esc(g.mien || '—')}</b></span><span>ĐVKD <b>${esc(g.dvkds.join(', ') || '—')}</b></span></div>
            <div class="meta"><span>Tiến độ <b>${esc(g.tienDo || '—')}</b></span><span>Ưu tiên deep dive <b>${esc(g.uuTien || '—')}</b></span><span>Site visit <b>${esc(g.siteVisit || '—')}</b></span><span>Dữ liệu <b>${esc(g.ttDuLieu || '—')}</b></span><span>Số liệu hệ thống <b>${g.ngayDuLieu ? K().dmy(g.ngayDuLieu) : 'chưa nạp'}</b></span></div>
          </div>
          <div style="text-align:right">${K().nhan(g.nhan, 'xl')}<div class="muted small" style="margin-top:6px">${g.ps.length} pháp nhân</div></div>
        </div>

        <div class="op-sec"><h4>Quy mô nghĩa vụ tại TPBank (tỷ đồng)</h4>
          <div class="qm">${qmCell('Tổng nghĩa vụ', K().tyN(g.tongNV), 'tỷ', 1)}${qmCell('Dư nợ', K().tyN(g.duNo))}${qmCell('Dư bảo lãnh', K().tyN(g.bl))}${qmCell('Dư cam kết LC', K().tyN(g.lc))}
            ${qmCell('HM chưa sử dụng', g.hmChuaGN === null ? '–' : K().tyN(g.hmChuaGN), g.hm ? '/ HM ' + K().tyN(g.hm) : '')}${qmCell('TSBĐ chuẩn', K().tyN(g.tsbd), g.tongNV ? K().pct(g.tsbd / g.tongNV, 0) + ' NV' : '')}</div>
        </div>

        <div class="op-sec"><h4>Đánh giá 7 tiêu chí theo pháp nhân</h4>
          ${g.ps.length ? `<div style="overflow-x:auto"><table class="tcm"><thead><tr><th>Pháp nhân</th>${tcHead}<th>Nhãn</th>${can ? '<th class="no-print"></th>' : ''}</tr></thead><tbody>${pnRows}</tbody></table></div>`
            : `<div class="empty-state"><div class="ic">＋</div>Nhóm chưa có pháp nhân. ${can ? `<a class="btn sm pri" href="#/pn/${encodeURIComponent(g.maNhom)}/moi">Thêm pháp nhân đầu tiên</a>` : ''}</div>`}
          ${g.doNgay.length ? `<div class="donow">⚠ Đỏ ngay: ${esc(g.doNgay.join(' · '))}</div>` : ''}
        </div>

        <div class="op-sec cols2">
          <div><h4 style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--primary);margin:0 0 8px;font-weight:800">Lý do phân loại & 3 rủi ro chính</h4>
            ${rr.length ? rr.map(p => `<div class="rbox"><div class="h"><span>${esc(p.tenKH)}</span>${K().nhan(p.nhan)}</div>${txt(p.lyDo, 'Chưa ghi lý do')}${p.ghiChu ? `<div class="txt muted" style="margin-top:4px"><b>Cần xác minh:</b> ${esc(p.ghiChu)}</div>` : ''}${p.ghiDe ? `<div class="txt" style="margin-top:4px;color:var(--accent)"><b>Ghi đè nhãn:</b> ${esc(p.lyDoGhiDe)}</div>` : ''}</div>`).join('') : '<div class="txt empty">Chưa ghi lý do phân loại.</div>'}
          </div>
          <div>
            <div class="rbox"><div class="h">Nguồn trả nợ</div>${txt(g.nguonTraNo, 'Chưa ghi nguồn trả nợ')}</div>
            <div class="rbox bld"><div class="h">Vấn đề cần BLĐ quyết định</div>${txt(g.vanDeBLD, 'Không có / chưa ghi')}</div>
            <div class="rbox"><div class="h">Phương án dự kiến tiếp theo</div>${txt(g.phuongAn, 'Chưa ghi phương án')}</div>
          </div>
        </div>

        <div class="op-sec"><h4>Hành động quản trị (Action plan)</h4>
          ${acts.length ? `<table class="mini"><thead><tr><th>Mã</th><th>Biện pháp</th><th>Người chịu TN</th><th>Hạn</th><th>Trạng thái</th><th>%</th>${can ? '<th class="no-print"></th>' : ''}</tr></thead><tbody>
            ${acts.map(a => `<tr><td><span class="code-a ${esc(a.maHD)}" title="${esc(a.hanhDong)}">${esc(a.maHD)}</span></td><td>${esc(a.bienPhap)}${a.mucTieu ? `<div class="muted small">→ ${esc(a.mucTieu)}</div>` : ''}${a.vuongMac ? `<div class="small" style="color:var(--warning)">Vướng: ${esc(a.vuongMac)}</div>` : ''}</td><td>${esc(a.nguoiTN)}${a.chuTri ? `<div class="muted small">${esc(a.chuTri)}</div>` : ''}</td><td class="${a.overdue ? 'od' : ''}">${K().dmy(a.han)}</td><td>${esc(a.trangThai)}${a.overdue ? ' <span class="pill-n err">quá hạn</span>' : ''}</td><td>${a.phanTram === '' ? '' : K().pct(a.phanTram, 0)}</td>${can ? `<td class="no-print"><button class="btn sm ghost edit-x" data-a="${esc(a.id)}">Sửa</button></td>` : ''}</tr>`).join('')}
          </tbody></table>` : '<div class="txt empty">Chưa có hành động.</div>'}
        </div>

        ${g.dl.length ? `<div class="op-sec"><h4>Dữ liệu đang chờ bổ sung</h4><table class="mini"><thead><tr><th>Loại dữ liệu</th><th>Đơn vị sở hữu / đầu mối cung cấp</th><th>Hạn</th><th>Trạng thái</th><th>Ảnh hưởng</th>${can ? '<th class="no-print"></th>' : ''}</tr></thead><tbody>
          ${g.dl.map(x => `<tr><td>${esc(x.loai)}${x.thongTin ? `<div class="muted small">${esc(x.thongTin)}</div>` : ''}</td><td>${esc([x.donViSoHuu, x.dauMoiCC].filter(Boolean).join(' / '))}</td><td class="${x.overdue ? 'od' : ''}">${K().dmy(x.han)}</td><td>${esc(x.trangThai)}</td><td>${esc(x.mucAH)}</td>${can ? `<td class="no-print"><button class="btn sm ghost edit-x" data-d="${esc(x.id)}">Sửa</button></td>` : ''}</tr>`).join('')}
        </tbody></table></div>` : ''}

        ${g.ghiChu ? `<div class="op-sec"><h4>Ghi chú</h4>${txt(g.ghiChu)}</div>` : ''}
        <div class="op-foot"><span>Lá chắn S-500 · ${esc(g.maNhom)} · in lúc ${new Date().toLocaleString('vi-VN')} bởi ${esc(PeopleFilter.label(me.username, me.displayName))}</span><span>Nội bộ TPBank — cảnh báo chiến dịch, không thay phân loại nợ/quyết định tín dụng chính thức</span></div>
      </div>`;

    if ($('eNhom')) $('eNhom').onclick = () => S5.forms.nhom(g);
    if ($('aAct')) $('aAct').onclick = () => S5.forms.action(null, g.maNhom);
    if ($('aDl')) $('aDl').onclick = () => S5.forms.dl(null, g.maNhom);
    host.querySelectorAll('[data-a]').forEach(b => b.onclick = () => S5.forms.action(g.acts.find(a => a.id === b.dataset.a)));
    host.querySelectorAll('[data-d]').forEach(b => b.onclick = () => S5.forms.dl(g.dl.find(x => x.id === b.dataset.d)));
    $('btnPrint').onclick = () => { K().logView('In A4 nhóm', g.maNhom); window.print(); };
    if ($('delG')) $('delG').onclick = async () => {
      const r = await S5.ui.ask('Xóa nhóm ' + g.tenNhom + '?', `Xóa luôn <b>${g.ps.length} pháp nhân</b>, <b>${g.acts.length} hành động</b>, <b>${g.dl.length} yêu cầu dữ liệu</b> của nhóm. Không hoàn tác.`, { yes: 'Xóa vĩnh viễn', danger: true });
      if (!r.ok) return;
      try { await S5.save('delete-nhom', { maNhom: g.maNhom }, 'Đã xóa nhóm'); S5.go('nhom'); } catch (e) { S5.ui.toast(e.message, 'err'); }
    };
    K().logView('Xem nhóm', g.maNhom);
  }
  S5.views.chitiet = { render };
})();
