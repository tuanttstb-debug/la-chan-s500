'use strict';
/* Báo cáo A4 cho Ban lãnh đạo (D07): A4 tổng chiến dịch · A4 theo ĐVKD. In → Lưu PDF. */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;
  const NH = ['Đỏ', 'Vàng', 'Chưa đủ dữ liệu', 'Xanh', 'Chưa đánh giá'];
  const foot = t => `<div class="op-foot"><span>Lá chắn S-500 · ${esc(t)} · in lúc ${new Date().toLocaleString('vi-VN')}</span><span>Nội bộ TPBank — cảnh báo chiến dịch, không thay phân loại nợ chính thức</span></div>`;
  const lyDo = g => { if (g.doNgay.length) return 'Đỏ ngay: ' + g.doNgay.join('; '); const w = g.ps.find(p => p.nhan === g.nhan) || g.main; return (w && w.lyDo) || (w ? w.e.tc.filter(c => c.nhan === 'Đỏ' || c.nhan === 'Vàng').map(c => c.ten + ' ' + c.nhan).join(' · ') : ''); };
  const nextAct = g => { const a = g.acts.filter(x => x.open).sort((x, y) => (x.han || '9').localeCompare(y.han || '9'))[0]; return a ? `<span class="code-a ${esc(a.maHD)}">${esc(a.maHD)}</span> ${esc(a.bienPhap).slice(0, 80)} <span class="${a.overdue ? 'od' : 'muted'}">(${K().dm(a.han)})</span>` : (g.phuongAn ? esc(g.phuongAn).slice(0, 90) : '<span class="od">Chưa có hành động</span>'); };

  function lcards(G) {
    const tot = G.reduce((s, g) => s + g.tongNV, 0);
    return `<div class="lcards">${NH.map(l => { const L = G.filter(g => g.nhan === l), v = L.reduce((s, g) => s + g.tongNV, 0); return `<div class="lcard ${K().cls(l)}" style="cursor:default"><div class="t">${esc(l)}</div><div class="v">${L.length}<small>nhóm</small></div><div class="s">${K().ty(v)} · ${tot ? Math.round(v / tot * 100) : 0}%</div></div>`; }).join('')}</div>`;
  }

  function renderTong(host) {
    const M = st().S.M, G = M.groups, w = st().week(), sg = st().stage(w), ky = st().S.data.ky[0];
    const tot = k => G.reduce((s, g) => s + (g[k] || 0), 0);
    const daDG = G.filter(g => g.daDanhGia).length, A = M.actions;
    const red = G.filter(g => g.nhan === 'Đỏ').slice(0, 10), yel = G.filter(g => g.nhan === 'Vàng').slice(0, 6);
    const bld = G.filter(g => g.vanDeBLD).slice(0, 5);
    const kpi = [
      ['Nhóm KH', G.length, `${M.pn.length} pháp nhân`], ['Tổng nghĩa vụ', K().tyN(tot('tongNV')) + ' tỷ', `Dư nợ ${K().tyN(tot('duNo'))} · BL ${K().tyN(tot('bl'))} · LC ${K().tyN(tot('lc'))}`],
      ['Đã có nhãn', `${daDG}/${G.length}`, G.length ? Math.round(daDG / G.length * 100) + '% danh mục' : ''],
      ['Hành động', `${A.filter(a => a.open).length} mở`, `${A.filter(a => a.overdue).length} quá hạn · ${A.filter(a => a.trangThai === 'Hoàn thành').length} xong`],
      ['Dữ liệu chờ', M.dls.filter(x => x.open).length, `${M.dls.filter(x => x.overdue).length} quá hạn`],
      ['Site visit', G.filter(g => g.siteVisit === 'Có').length, 'nhóm cần thăm thực địa'],
    ];
    host.innerHTML = `<div class="toolbar no-print"><span class="muted small">Trang in 1 tờ A4 dọc cho giao ban/BLĐ hằng tuần — số lấy thẳng từ dữ liệu đầu mối nhập.</span><span class="sp"></span><button class="btn org" id="pr">⎙ In / Lưu PDF</button></div>
      <div class="paper">
        <div class="op-head"><div><div class="brand-s">Báo cáo Ban lãnh đạo · Khối NHDN</div><div class="ttl">Chiến dịch Lá chắn S-500 — tuần ${Math.min(w, 8)}/8</div>
          <div class="meta"><span>Giai đoạn <b>${esc(sg.t)}</b></span><span>Ngày báo cáo <b>${K().dmy(st().today())}</b></span><span>Số liệu hệ thống <b>${ky ? K().dmy(ky.ngayDuLieu) + ' (' + esc(ky.loai) + ')' : 'chưa nạp'}</b></span></div></div>
          <div style="text-align:right;font-size:12px" class="muted">Tư lệnh: GĐTT SP&amp;GP Tín dụng<br>PM: Tham mưu trưởng chiến dịch</div></div>
        <div class="op-sec"><h4>Tổng quan danh mục</h4><div class="qm">${kpi.map((k, i) => `<div class="${i === 1 ? 'main' : ''}"><div class="k">${k[0]}</div><div class="v">${k[1]}</div><div class="k" style="font-weight:500">${k[2]}</div></div>`).join('')}</div></div>
        <div class="op-sec"><h4>Phân loại rủi ro (số nhóm · nghĩa vụ)</h4>${lcards(G)}</div>
        <div class="op-sec"><h4>Nhóm Đỏ — ${G.filter(g => g.nhan === 'Đỏ').length} nhóm${G.filter(g => g.nhan === 'Đỏ').length > 10 ? ' (10 lớn nhất)' : ''}</h4>
          ${red.length ? `<table class="mini"><thead><tr><th>Nhóm KH</th><th style="text-align:right">Nghĩa vụ</th><th>Lý do / rủi ro chính</th><th>Hành động gần nhất</th><th>Đầu mối</th></tr></thead><tbody>${red.map(g => `<tr><td><b>${esc(g.tenNhom)}</b><div class="muted small">${esc(g.dvkds.join(', '))}</div></td><td style="text-align:right;white-space:nowrap"><b>${K().ty(g.tongNV)}</b></td><td>${esc(lyDo(g)).slice(0, 160)}</td><td>${nextAct(g)}</td><td>${K().who(g.dauMoi)}</td></tr>`).join('')}</tbody></table>` : '<div class="txt empty">Chưa có nhóm Đỏ.</div>'}
        </div>
        ${yel.length ? `<div class="op-sec"><h4>Nhóm Vàng lớn nhất</h4><table class="mini"><tbody>${yel.map(g => `<tr><td><b>${esc(g.tenNhom)}</b></td><td style="text-align:right;white-space:nowrap">${K().ty(g.tongNV)}</td><td>${esc(lyDo(g)).slice(0, 140)}</td><td>${nextAct(g)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        ${bld.length ? `<div class="op-sec"><h4>Vấn đề xin Ban lãnh đạo quyết định</h4>${bld.map(g => `<div class="rbox bld"><div class="h"><span>${K().nhan(g.nhan)} ${esc(g.tenNhom)}</span><span>${K().ty(g.tongNV)}</span></div><div class="txt">${esc(g.vanDeBLD)}</div></div>`).join('')}</div>` : ''}
        ${foot('A4 tổng chiến dịch')}
      </div>`;
    $('pr').onclick = () => { K().logView('In A4 tổng', 'tuần ' + w); window.print(); };
  }

  function renderDvkd(host, args) {
    const M = st().S.M, all = [...new Set(M.pn.map(p => p.dvkd).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
    const sel = args[0] && all.indexOf(args[0]) >= 0 ? args[0] : '';
    host.innerHTML = `<div class="toolbar no-print"><select class="pf-select" id="dvSel" style="max-width:340px"><option value="">— Chọn ĐVKD —</option>${all.map(d => `<option ${d === sel ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select><span class="sp"></span>${sel ? '<button class="btn org" id="pr">⎙ In / Lưu PDF</button>' : ''}</div><div id="dvBody"></div>`;
    $('dvSel').onchange = () => S5.go('dvkd', $('dvSel').value);
    if (!sel) { $('dvBody').innerHTML = `<div class="card empty-state"><div class="ic">⌂</div>Chọn 1 ĐVKD để xem danh mục S-500 của chi nhánh: nhóm, nhãn, việc ĐVKD đang phải làm.</div>`; return; }
    const P = M.pn.filter(p => p.dvkd === sel), gIds = [...new Set(P.map(p => p.maNhom))], G = gIds.map(id => M.gIdx[id]).filter(Boolean);
    const A = M.actions.filter(a => gIds.indexOf(a.maNhom) >= 0 && a.open), D = M.dls.filter(x => gIds.indexOf(x.maNhom) >= 0 && x.open);
    const nv = P.reduce((s, p) => s + p.duTongN, 0);
    $('dvBody').innerHTML = `<div class="paper">
      <div class="op-head"><div><div class="brand-s">Lá chắn S-500 · Danh mục theo đơn vị kinh doanh</div><div class="ttl">${esc(sel)}</div>
        <div class="meta"><span><b>${P.length}</b> pháp nhân thuộc <b>${G.length}</b> nhóm</span><span>Nghĩa vụ tại ĐVKD <b>${K().ty(nv)}</b></span><span>Ngày <b>${K().dmy(st().today())}</b></span></div></div></div>
      <div class="op-sec"><h4>Pháp nhân tại ĐVKD</h4><table class="mini"><thead><tr><th>Nhãn</th><th>Pháp nhân</th><th>Nhóm KH</th><th style="text-align:right">Nghĩa vụ</th><th>Lý do / rủi ro chính</th><th>Đầu mối HO</th></tr></thead><tbody>
        ${P.sort((a, b) => S5R.SEV[b.nhan] - S5R.SEV[a.nhan] || b.duTongN - a.duTongN).map(p => `<tr><td>${K().nhan(p.nhan)}</td><td><b>${esc(p.tenKH)}</b><div class="muted small">CIF ${esc(p.cif)}</div></td><td>${esc((M.gIdx[p.maNhom] || {}).tenNhom || p.maNhom)}<div class="muted small">nhóm: ${esc((M.gIdx[p.maNhom] || {}).nhan || '')}</div></td><td style="text-align:right;white-space:nowrap">${K().ty(p.duTongN)}</td><td>${esc(p.lyDo || p.e.doNgay.join('; ')).slice(0, 150)}</td><td>${K().who(p.dauMoi)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="op-sec"><h4>Hành động đang mở của các nhóm</h4>${A.length ? `<table class="mini"><thead><tr><th>Mã</th><th>Nhóm</th><th>Biện pháp</th><th>Chủ trì / phối hợp</th><th>Hạn</th><th>Trạng thái</th></tr></thead><tbody>${A.map(a => `<tr><td><span class="code-a ${esc(a.maHD)}">${esc(a.maHD)}</span></td><td>${esc(a.tenNhom)}</td><td>${esc(a.bienPhap)}</td><td>${esc([a.chuTri, a.phoiHop].filter(Boolean).join(' / '))}</td><td class="${a.overdue ? 'od' : ''}">${K().dmy(a.han)}</td><td>${esc(a.trangThai)}</td></tr>`).join('')}</tbody></table>` : '<div class="txt empty">Không có hành động đang mở.</div>'}</div>
      ${D.length ? `<div class="op-sec"><h4>Dữ liệu ĐVKD cần cung cấp</h4><table class="mini"><thead><tr><th>Nhóm</th><th>Loại dữ liệu</th><th>Đầu mối cung cấp</th><th>Hạn</th><th>Ảnh hưởng</th></tr></thead><tbody>${D.map(x => `<tr><td>${esc((x.g || {}).tenNhom || x.maNhom)}</td><td>${esc(x.loai)}${x.thongTin ? `<div class="muted small">${esc(x.thongTin)}</div>` : ''}</td><td>${esc(x.dauMoiCC || x.donViSoHuu)}</td><td class="${x.overdue ? 'od' : ''}">${K().dmy(x.han)}</td><td>${esc(x.mucAH)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      ${foot('A4 ' + sel)}</div>`;
    $('pr').onclick = () => { K().logView('In A4 ĐVKD', sel); window.print(); };
  }
  S5.views.a4tong = { render: renderTong };
  S5.views.a4dvkd = { render: renderDvkd };
})();
