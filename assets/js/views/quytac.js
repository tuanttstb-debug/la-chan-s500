'use strict';
/* Quy tắc phân loại (minh bạch cho đầu mối + BLĐ) · cấu hình (PM) · nhật ký (PM). Ngưỡng đọc thẳng từ core/rules.js đang áp. */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;
  const p = x => Math.round(x * 1000) / 10 + '%';

  function render(host) {
    const T = S5R.thresholds(), c = st().S.config;
    const rows = [
      [1, 'Đòn bẩy ngắn hạn', 'Dư nợ ngắn hạn các TCTD (CIC ≤ 30 ngày) / DT VAT 12T', `≤${p(T.tc1.xl[0])}`, `>${p(T.tc1.xl[0])}–${p(T.tc1.xl[1])}`, `>${p(T.tc1.xl[1])}`, `≤${p(T.tc1.khac[0])}`, `>${p(T.tc1.khac[0])}–${p(T.tc1.khac[1])}`, `>${p(T.tc1.khac[1])}`],
      [2, 'Luân chuyển dòng tiền qua TPB', 'DT trực tiếp về TPB / DS giải ngân TPB (từ 01/01/2026)', `≥${p(T.tc2[0])}`, `≥${p(T.tc2[1])}–<${p(T.tc2[0])}`, `<${p(T.tc2[1])}`],
      [3, 'Lịch sử tín dụng', 'Phát sinh OD2 trở lên trong 12 tháng', 'Không', 'Có, đã khắc phục, không tái diễn', 'Tái diễn / chưa khắc phục dứt điểm → ĐỎ NGAY'],
      [4, 'Tập trung tín dụng tại TPB', 'Dư nợ TPB / tổng dư nợ CIC', `≤${p(T.tc4[0])}`, `>${p(T.tc4[0])}–${p(T.tc4[1])}`, `>${p(T.tc4[1])}`],
      [5, 'Tương xứng tín dụng – TSBĐ', 'Tỷ trọng dư nợ TPB / tỷ trọng TSBĐ chuẩn TPB (HĐTG, BĐS, PTVT, MMTB)', `≤${T.tc5[0]} lần`, `>${T.tc5[0]}–${T.tc5[1]} lần`, `>${T.tc5[1]} lần`],
      [6, 'Xếp hạng mô hình', 'Thấu chi (hạng) · binning (màu) — lấy mức xấu hơn', 'A trở lên · Green', 'B đến dưới A · Amber', 'Từ CCC trở xuống · Red → ĐỎ NGAY'],
      [7, 'Biến động doanh thu', 'DT VAT lũy kế đến quý gần nhất vs cùng kỳ', `${p(T.tc7.xl.xanh[0])}…+${p(T.tc7.xl.xanh[1])}`, `giảm ≤${p(-T.tc7.xl.vang[0])} hoặc tăng ≤${p(T.tc7.xl.vang[1])}`, `giảm >${p(-T.tc7.xl.vang[0])} hoặc tăng >${p(T.tc7.xl.vang[1])}`, `tăng hoặc giảm ≤${p(-T.tc7.khac.xanh)}`, `giảm >${p(-T.tc7.khac.xanh)}–${p(-T.tc7.khac.vang)}`, `giảm >${p(-T.tc7.khac.vang)}`],
    ];
    const cell = (v, n) => `<td><span class="tc ${n}" style="display:inline-block">${esc(v)}</span></td>`;
    host.innerHTML = `
      <div class="card"><h2>Bộ 7 tiêu chí dán nhãn <span class="muted small">Kế hoạch final 21/10 · Phụ lục 1 — ngưỡng đang áp dụng${c.rules ? ' (đã chỉnh qua cấu hình)' : ''}</span></h2>
        <div class="tblwrap" style="max-height:none"><table class="tbl"><thead><tr><th>#</th><th>Tiêu chí</th><th>Cách tính</th><th>Xanh</th><th>Vàng</th><th>Đỏ</th><th>Ngành khác: Xanh</th><th>Vàng</th><th>Đỏ</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><b>${r[0]}</b></td><td><b>${esc(r[1])}</b></td><td class="lydo">${esc(r[2])}</td>${cell(r[3], 'Xanh')}${cell(r[4], 'Vàng')}${cell(r[5], 'Đỏ')}${r[6] ? cell(r[6], 'Xanh') + cell(r[7], 'Vàng') + cell(r[8], 'Đỏ') : '<td colspan="3" class="muted small">như xây lắp</td>'}</tr>`).join('')}
        </tbody></table></div>
        <p class="small muted">3 cột đầu áp cho ngành <b>${esc(T.xayLap.join(', '))}</b> (ngành do đầu mối chọn khi rà soát); tiêu chí 2–6 giống nhau cho mọi ngành. Thiếu dữ liệu hoặc không cùng cơ sở định giá → "chưa có", không mặc nhiên Xanh. Dòng tiền chỉ tính doanh thu trực tiếp từ đối tác (loại điều chuyển/bên liên quan).</p></div>
      <div class="grid g2">
        <div class="card"><h2>Quy tắc nhãn</h2><ol style="margin:0;padding-left:20px;line-height:1.8">
          <li>${K().nhan('Đỏ')} <b>ngay</b> nếu hạng thấu chi <b>từ CCC trở xuống</b>, hoặc binning <b>Red</b>, hoặc <b>OD2 tái diễn</b>/chưa khắc phục dứt điểm.</li>
          <li>${K().nhan('Đỏ')} nếu ≥ 2 tiêu chí Đỏ.</li>
          <li>${K().nhan('Chưa đủ dữ liệu')} nếu còn tiêu chí chưa có dữ liệu (chưa chạm Đỏ) — để thấy hồ sơ chưa làm xong.</li>
          <li>${K().nhan('Vàng')} nếu 1 tiêu chí Đỏ, hoặc không có Đỏ nhưng ≥ 1 Vàng.</li>
          <li>${K().nhan('Xanh')} chỉ khi cả 7 tiêu chí Xanh.</li>
          <li><b>Nhãn nhóm</b> = nhãn cao nhất của các pháp nhân trong nhóm.</li>
          <li>Đầu mối có thể <b>ghi đè</b> nhãn máy khi có căn cứ ngoài 7 tiêu chí — bắt buộc ghi lý do, hiện cờ "ghi đè" cho Teamlead/PM.</li></ol></div>
        <div class="card"><h2>Mã hành động & nhịp báo cáo</h2>
          <table class="mini"><tbody>${S5S.LISTS.MA_HD.map(m => `<tr><td><span class="code-a ${m}">${m}</span></td><td>${esc(S5S.LISTS.HANH_DONG[m])}</td></tr>`).join('')}</tbody></table>
          <p class="small" style="margin-top:12px">Nhịp cập nhật đề xuất: <b style="color:var(--do)">Đỏ hằng tuần</b> · <b style="color:var(--vang)">Vàng 2 tuần/lần</b> · <b style="color:var(--xanh)">Xanh hằng tháng</b>. Báo ngay khi có dấu hiệu dùng vốn sai mục đích, chứng từ bất thường, thiếu nguồn trả nợ đáo hạn lớn, TSBĐ suy giảm nghiêm trọng, KH không hợp tác kéo dài.</p></div>
      </div>
      ${st().isPM() ? `<div class="card"><h2>Cấu hình chiến dịch <span class="chip">PM</span></h2>
        <div class="fgrid">
          <div class="ff"><label>PM / quản trị dữ liệu (username, cách nhau dấu phẩy)</label><input id="cPM" value="${esc(c.pm)}"></div>
          <div class="ff"><label>Ban lãnh đạo — chỉ xem</label><input id="cBLD" value="${esc(c.bld)}"></div>
          <div class="ff"><label>Ngày bắt đầu chiến dịch (tuần 1)</label><input type="date" id="cStart" value="${esc(c.start)}"></div>
          <div class="ff wide"><label>Chỉnh ngưỡng (JSON — để trống = mặc định). Vd <code>{"tc4":[0.3,0.5]}</code></label><textarea id="cRules" rows="3">${esc(c.rules)}</textarea><div class="hint">Mặc định: ${esc(JSON.stringify(S5R.DEFAULT))}</div></div>
        </div><div class="row end"><button class="btn pri" id="cSave">Lưu cấu hình</button></div></div>` : ''}`;
    if ($('cSave')) $('cSave').onclick = async () => {
      const r = $('cRules').value.trim();
      if (r) { try { JSON.parse(r); } catch (e) { S5.ui.toast('JSON ngưỡng không hợp lệ', 'err'); return; } }
      try { await S5.save('set-config', { updates: { PM: $('cPM').value, 'BLĐ': $('cBLD').value, 'Ngày bắt đầu chiến dịch': $('cStart').value, RULES_JSON: r } }, 'Đã lưu cấu hình — nhãn tính lại theo ngưỡng mới'); S5.route(); }
      catch (e) { S5.ui.toast(e.message, 'err'); }
    };
  }

  async function renderLog(host) {
    host.innerHTML = '<div class="card" id="lg">Đang tải…</div>';
    try {
      const r = await S5.net.call('audit', {});
      S5.ui.table($('lg'), r.rows, [
        { k: 'at', t: 'Thời điểm', f: x => esc(S5.ui.dt(x.at)) }, { k: 'who', t: 'Người', f: x => K().who(x.who) }, { k: 'act', t: 'Hành động' }, { k: 'target', t: 'Đối tượng' }, { k: 'detail', t: 'Chi tiết', f: x => `<span class="small">${esc(x.detail)}</span>` },
      ], { pageSize: 100, placeholder: 'Tìm người, hành động…' });
    } catch (e) { $('lg').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  }
  S5.views.quytac = { render };
  S5.views.nhatky = { render: renderLog };
})();
