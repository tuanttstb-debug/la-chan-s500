'use strict';
/* Tổng quan — màn quản trị chiến dịch (R6 chị Nhung): danh mục + dư nợ/BL/LC · số nhóm Đỏ/Vàng/Xanh · biện pháp đang theo dõi
 * · phương án tiếp theo · tiêu chí kích hoạt · theo ĐVKD · tiến độ đầu mối. Lọc chuẩn Team + Nhân sự. */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;
  const NH = ['Đỏ', 'Vàng', 'Chưa đủ dữ liệu', 'Xanh', 'Chưa đánh giá'];
  const NGAN = { A1: 'Tiếp tục dùng HM', A2: 'Duy trì + tăng giám sát', A3: 'Thu hẹp dần', A4: 'Thoái lui, thu hồi' };

  function hero() {
    const w = st().week(), sg = st().stage(w), ky = st().S.data.ky[0];
    const cells = [];
    for (let i = 1; i <= 8; i++) { const s2 = st().stage(i); cells.push(`<div class="wk ${i < w ? 'done' : i === w ? 'now' : ''}"><b>Tuần ${i}</b><span class="st">${esc(s2.t)}</span></div>`); }
    return `<div class="hero">
      <div class="left"><div class="shield">🛡</div><div><h2>Chiến dịch Lá chắn S-500</h2>
        <div class="sub">${w <= 8 ? `Tuần ${w}/8 · <b>${esc(sg.t)}</b> — ${esc(sg.d)}` : 'Vận hành sau chiến dịch — giám sát định kỳ'} · ${ky ? 'Số liệu hệ thống ngày ' + K().dmy(ky.ngayDuLieu) + ' (' + esc(ky.loai) + ')' : 'Chưa nạp số liệu hệ thống'}</div></div></div>
      <div class="right no-print"><a class="btn sm" href="#/a4-tong">▤ A4 tổng cho BLĐ</a></div>
      <div class="weeks">${cells.join('')}</div>
    </div>`;
  }

  function render(host) {
    const M = st().S.M;
    host.innerHTML = hero() + K().filterBar('fTQ', { nhan: true, mien: true }) + '<div id="tqBody"></div>';
    const F = K().bindFilter('fTQ', M.groups, draw, {});
    function draw() {
      const G = M.groups.filter(g => F.match(g));
      const GN = M.groups.filter(g => F.match(g, '', true)); // cùng bộ lọc người/miền, bỏ lọc nhãn → mẫu số tiến độ
      const tot = k => G.reduce((s, g) => s + (g[k] || 0), 0);
      const by = l => G.filter(g => g.nhan === l);
      const gIds = new Set(G.map(g => g.maNhom));
      const A = M.actions.filter(a => gIds.has(a.maNhom)), P = M.pn.filter(p => gIds.has(p.maNhom));
      const daDG = GN.filter(g => g.daDanhGia).length;
      const card = l => { const L = by(l), v = L.reduce((s, g) => s + g.tongNV, 0); return `<div class="lcard ${K().cls(l)}" data-n="${esc(l)}"><div class="t">${esc(l)}</div><div class="v">${L.length}<small>nhóm</small></div><div class="s">${K().ty(v)} · ${tot('tongNV') ? Math.round(v / tot('tongNV') * 100) : 0}% nghĩa vụ</div></div>`; };

      const stackBy = (fn, total, fmt) => NH.map(l => { const v = by(l).reduce((s, g) => s + fn(g), 0); return v ? `<div class="${K().cls(l)}" style="flex:${v}" title="${esc(l)}: ${fmt(v)}">${v / (total || 1) >= 0.07 ? fmt(v) : ''}</div>` : ''; }).join('');

      // Tiêu chí kích hoạt (đếm pháp nhân)
      const tcStat = [1, 2, 3, 4, 5, 6, 7].map(id => { const c = { d: 0, v: 0, m: 0 }; P.forEach(p => { const x = p.e.tc[id - 1].nhan; if (x === 'Đỏ') c.d++; else if (x === 'Vàng') c.v++; else if (x === 'Thiếu') c.m++; }); return c; });
      const maxTc = Math.max(1, P.length);

      // Nhóm cần chú ý
      const hot = G.filter(g => g.nhan === 'Đỏ' || g.nhan === 'Vàng').slice(0, 12);
      const lyDoG = g => { const w = g.ps.find(p => p.nhan === g.nhan) || g.main; const t = g.doNgay.length ? 'Đỏ ngay: ' + g.doNgay.join('; ') : (w && w.lyDo) || (w ? w.e.tc.filter(c => c.nhan === 'Đỏ' || c.nhan === 'Vàng').map(c => c.ten + ' ' + c.nhan).join(' · ') : ''); return t; };

      // Ma trận biện pháp
      const STT = ['Chưa bắt đầu', 'Đang thực hiện', 'Chờ dữ liệu', 'Chờ phê duyệt', 'Hoàn thành'];
      const amx = ['A1', 'A2', 'A3', 'A4'].map(c => { const L = A.filter(a => a.maHD === c); return `<tr><td><span class="code-a ${c}" title="${esc(S5S.LISTS.HANH_DONG[c])}">${c}</span> ${esc(NGAN[c])}</td>${STT.map(s => { const n = L.filter(a => a.trangThai === s).length; return `<td class="${n ? '' : 'z'}">${n || '·'}</td>`; }).join('')}<td class="${L.filter(a => a.overdue).length ? 'od' : 'z'}">${L.filter(a => a.overdue).length || '·'}</td><td><b>${L.length}</b></td></tr>`; }).join('');
      const overdue = A.filter(a => a.overdue).sort((a, b) => (a.han || '').localeCompare(b.han || '')).slice(0, 8);

      // Phương án tiếp theo (Đỏ/Vàng trước)
      const pa = G.filter(g => (g.phuongAn || g.vanDeBLD)).slice(0, 8);

      // ĐVKD
      const dv = {};
      P.forEach(p => { const k = p.dvkd || '(chưa ghi ĐVKD)'; const o = dv[k] || (dv[k] = { k, n: 0, nv: 0, l: { 'Đỏ': 0, 'Vàng': 0, 'Xanh': 0, 'Khác': 0 } }); o.n++; o.nv += p.duTongN; o.l[p.nhan in o.l ? p.nhan : 'Khác']++; });
      const dvRows = Object.values(dv).sort((a, b) => b.l['Đỏ'] - a.l['Đỏ'] || b.nv - a.nv);

      // Đầu mối
      const dm = {};
      G.forEach(g => { const k = g.dauMoi || '(chưa giao)'; const o = dm[k] || (dm[k] = { k, n: 0, dg: 0, du: 0, ao: 0, nv: 0 }); o.n++; if (g.daDanhGia) o.dg++; o.du += g.doDu; o.ao += g.actOverdue; o.nv += g.tongNV; });
      const dmRows = Object.values(dm).sort((a, b) => a.dg / a.n - b.dg / b.n || b.n - a.n);

      $('tqBody').innerHTML = `
        <div class="kpis">
          ${S5.ui.kpi('Nhóm KH trong danh mục', `${G.length}`, `${P.length} pháp nhân · ${new Set(P.map(p => p.dvkd).filter(Boolean)).size} ĐVKD`, 'pri')}
          ${S5.ui.kpi('Tổng nghĩa vụ', K().ty(tot('tongNV'), 0), `Dư nợ ${K().ty(tot('duNo'), 0)} · BL ${K().ty(tot('bl'), 0)} · LC ${K().ty(tot('lc'), 0)}`)}
          ${S5.ui.kpi('Đã có nhãn Đỏ / Vàng / Xanh', `${daDG}/${GN.length}`, K().prog(GN.length ? daDG / GN.length : 0), 'accent')}
          ${S5.ui.kpi('Hành động đang theo dõi', `${A.filter(a => a.open).length}`, `<span class="${A.filter(a => a.overdue).length ? 'od' : ''}">${A.filter(a => a.overdue).length} quá hạn</span> · ${A.filter(a => a.trangThai === 'Hoàn thành').length} hoàn thành`, A.filter(a => a.overdue).length ? 'danger' : '')}
        </div>
        <div class="lcards">${NH.map(card).join('')}</div>
        <div class="grid g2">
          <div class="card"><h2>Cơ cấu rủi ro danh mục</h2>
            <div class="stack-row"><span>Theo nghĩa vụ</span><div class="stack">${stackBy(g => g.tongNV, tot('tongNV'), v => K().tyN(v) + ' tỷ') || '<div class="chua" style="flex:1">Chưa có dữ liệu</div>'}</div></div>
            <div class="stack-row"><span>Theo số nhóm</span><div class="stack">${stackBy(() => 1, G.length, v => v + ' nhóm') || '<div class="chua" style="flex:1">–</div>'}</div></div>
            <div class="legend">${NH.map(l => `<span><i class="${K().cls(l)}"></i>${esc(l)}</span>`).join('')}</div>
            <p class="muted small" style="margin:10px 0 0">Nhãn nhóm = nhãn cao nhất của các pháp nhân. "Chưa đủ dữ liệu" = còn tiêu chí chưa nhập nhưng chưa chạm Đỏ (chị Dung chốt 22/10).</p>
          </div>
          <div class="card"><h2>Tiêu chí kích hoạt cảnh báo <span class="muted small">(số pháp nhân)</span></h2>
            <div class="tcbars">${tcStat.map((c, i) => `<div class="tcbar"><span class="no">${i + 1}</span><div><div class="nm">${esc(S5R.TEN[i + 1])}</div><div class="bars"><div class="d" style="width:${c.d / maxTc * 100}%"></div><div class="v" style="width:${c.v / maxTc * 100}%"></div><div class="m" style="width:${c.m / maxTc * 100}%"></div></div></div><div class="cnt"><b style="color:var(--do)">${c.d} Đỏ</b> · <b style="color:var(--vang)">${c.v} Vàng</b> · ${c.m} chưa có</div></div>`).join('')}</div>
          </div>
        </div>
        <div class="card"><h2>Nhóm cần chú ý <span class="muted small">Đỏ → Vàng, theo quy mô nghĩa vụ</span><span class="sp"></span><a class="btn sm ghost no-print" href="#/nhom">Xem toàn danh mục →</a></h2>
          ${hot.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Nhãn</th><th>Nhóm KH</th><th class="num">Nghĩa vụ</th><th>Đầu mối</th><th>Lý do / rủi ro chính</th><th>Hành động</th><th>Tiến độ</th></tr></thead><tbody>
            ${hot.map(g => `<tr class="click" data-g="${esc(g.maNhom)}"><td>${K().nhan(g.nhan)}</td><td><b>${esc(g.tenNhom)}</b><span class="sub">${esc(g.maNhom)} · ${g.ps.length} pháp nhân · ${esc(g.dvkds.join(', '))}</span></td><td class="num"><b>${K().ty(g.tongNV)}</b></td><td>${K().who(g.dauMoi)}</td><td class="lydo">${esc(lyDoG(g)).slice(0, 220)}</td><td>${g.acts.length ? `${g.actOpen} mở${g.actOverdue ? ` · <span class="od">${g.actOverdue} quá hạn</span>` : ''}` : '<span class="od">Chưa có</span>'}</td><td>${esc(g.tienDo || '—')}</td></tr>`).join('')}
          </tbody></table></div>` : '<div class="empty-state"><div class="ic">🛡</div>Chưa có nhóm Đỏ/Vàng trong phạm vi lọc.</div>'}
        </div>
        <div class="grid g2">
          <div class="card"><h2>Biện pháp đang theo dõi</h2>
            <div class="amx-wrap"><table class="amx"><thead><tr><th>Mã hành động</th>${STT.map(s => `<th>${esc(s)}</th>`).join('')}<th>Quá hạn</th><th>Tổng</th></tr></thead><tbody>${amx}</tbody></table></div>
            ${overdue.length ? `<h3 style="margin-top:14px">Quá hạn cần xử lý</h3><table class="mini"><tbody>${overdue.map(a => `<tr><td><span class="code-a ${esc(a.maHD)}">${esc(a.maHD)}</span></td><td><b>${esc(a.tenNhom)}</b><span class="muted small"> — ${esc(a.bienPhap).slice(0, 90)}</span></td><td>${esc(a.nguoiTN)}</td><td class="od">${K().dmy(a.han)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted small" style="margin-top:12px">Không có hành động quá hạn.</p>'}
          </div>
          <div class="card"><h2>Phương án dự kiến tiếp theo & vấn đề xin BLĐ</h2>
            ${pa.length ? pa.map(g => `<div class="rbox ${g.vanDeBLD ? 'bld' : ''}"><div class="h"><span>${K().nhan(g.nhan)} <a href="#/nhom/${encodeURIComponent(g.maNhom)}">${esc(g.tenNhom)}</a></span><span>${K().ty(g.tongNV)}</span></div>
              ${g.phuongAn ? `<div class="txt">${esc(g.phuongAn)}</div>` : ''}${g.vanDeBLD ? `<div class="txt" style="margin-top:4px"><b>Xin BLĐ:</b> ${esc(g.vanDeBLD)}</div>` : ''}</div>`).join('') : '<p class="muted">Chưa nhóm nào ghi phương án/vấn đề xin BLĐ (ô "Phương án dự kiến tiếp theo" và "Vấn đề cần BLĐ quyết định" ở thông tin nhóm).</p>'}
          </div>
        </div>
        <div class="grid g2">
          <div class="card"><h2>Theo ĐVKD <span class="muted small">(pháp nhân)</span></h2>
            <div class="tblwrap" style="max-height:360px"><table class="tbl"><thead><tr><th>ĐVKD</th><th class="num">Pháp nhân</th><th class="num">Nghĩa vụ</th><th class="num">Đỏ</th><th class="num">Vàng</th><th class="num">Xanh</th><th class="num">Khác</th></tr></thead><tbody>
            ${dvRows.map(o => `<tr class="click" data-dv="${esc(o.k)}"><td><b>${esc(o.k)}</b></td><td class="num">${o.n}</td><td class="num">${K().ty(o.nv)}</td><td class="num" style="color:var(--do);font-weight:700">${o.l['Đỏ'] || ''}</td><td class="num" style="color:var(--vang);font-weight:700">${o.l['Vàng'] || ''}</td><td class="num" style="color:var(--xanh)">${o.l['Xanh'] || ''}</td><td class="num muted">${o.l['Khác'] || ''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">–</td></tr>'}
            </tbody></table></div></div>
          <div class="card"><h2>Tiến độ theo đầu mối</h2>
            <div class="tblwrap" style="max-height:360px"><table class="tbl"><thead><tr><th>Đầu mối</th><th class="num">Nhóm</th><th>Đã dán nhãn</th><th>Đủ dữ liệu</th><th class="num">Quá hạn</th></tr></thead><tbody>
            ${dmRows.map(o => `<tr><td>${o.k.startsWith('(') ? esc(o.k) : K().who(o.k)}</td><td class="num">${o.n}</td><td>${K().prog(o.dg / o.n)}</td><td>${K().prog(o.du / o.n)}</td><td class="num ${o.ao ? 'od' : 'muted'}">${o.ao || '·'}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">–</td></tr>'}
            </tbody></table></div></div>
        </div>`;
      $('tqBody').querySelectorAll('tr[data-g]').forEach(tr => tr.onclick = () => S5.go('nhom', tr.dataset.g));
      $('tqBody').querySelectorAll('tr[data-dv]').forEach(tr => tr.onclick = () => S5.go('dvkd', tr.dataset.dv));
      $('tqBody').querySelectorAll('.lcard').forEach(c => c.onclick = () => { const s = F.st.nhan; s.clear(); s.add(c.dataset.n); S5.kit.fstate.fNhom = S5.kit.fstate.fNhom || { nhan: new Set(), q: '', mien: '' }; S5.kit.fstate.fNhom.nhan = new Set([c.dataset.n]); S5.go('nhom'); });
    }
    draw();
  }
  S5.views.tongquan = { render };
})();
