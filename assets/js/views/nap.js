'use strict';
/* Nạp & xuất dữ liệu.
 *  PM: ① Nạp nguồn số dư theo kỳ (CRM hằng tháng — chị Nhung; danh mục KH rà soát; kết quả mô hình thấu chi/binning) → cập nhật theo CIF (R4)
 *      ② Nạp file điều hành Excel đang điền tay (đợt 1) → không nhập lại.
 *  Mọi người: ③ Xuất Excel đúng template.  Tệp đọc TẠI MÁY — chỉ các cột đã chọn được gửi lên. */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store, X = () => S5.xio;

  function dropzone(id, text) { return `<label class="dz" id="${id}Dz"><input type="file" id="${id}" accept=".xlsx,.xls,.xlsm" hidden><div style="font-size:26px">⇪</div><div><b>${text}</b></div><div class="small">Kéo thả hoặc bấm để chọn · .xlsx — đọc tại máy, không tải tệp lên</div></label>`; }
  function wireDz(id, onFile) {
    const inp = $(id), dz = $(id + 'Dz');
    inp.onchange = () => inp.files[0] && onFile(inp.files[0]);
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) onFile(f); };
  }

  function render(host) {
    const pm = st().isPM(), ky = st().S.data.ky;
    host.innerHTML = `
      <div class="card"><h2>⤓ Xuất Excel đúng template file điều hành</h2>
        <p class="muted" style="margin-top:0">4 sheet <b>Phan loai KH · TH TT nhom · Action_Plan · Theo_doi_du_lieu</b> đúng cột A… như file chị Dung gửi 21/10 (thêm vài cột "bổ sung" ở cuối). Dùng để chạy song song/đối chiếu.</p>
        <button class="btn pri" id="xAll">Xuất toàn bộ danh mục</button></div>
      ${pm ? `
      <div class="card"><h2>① Nạp nguồn số dư theo kỳ <span class="chip">PM</span></h2>
        <p class="muted" style="margin-top:0">Tệp CRM (hằng tháng), danh mục KH rà soát, hoặc kết quả mô hình thấu chi / binning. Máy dò cột theo tên (CIF, Tong_du_no_LCY, Dư Bảo lãnh, Dư cam kết LC, XEP HANG…) — chỉnh lại được trước khi nạp.
        Số dư/hạng nạp xong <b>khóa với đầu mối</b> và lưu lịch sử theo kỳ.</p>
        ${dropzone('fSrc', 'Chọn tệp nguồn số dư')}
        <div id="srcPrev"></div></div>
      <div class="card"><h2>② Nạp file điều hành Excel đang điền tay <span class="chip">PM</span></h2>
        <p class="muted" style="margin-top:0">Chuyển kết quả đợt 1 (file <i>File_dieu_hanh_chien_dich_La_Chan_S500.xlsx</i> các đầu mối đã điền) vào web: nhóm theo <b>tên nhóm</b>, pháp nhân theo <b>CIF</b>, action/yêu cầu dữ liệu trùng sẽ bỏ qua. Số dư đã nạp từ nguồn được giữ nguyên.</p>
        ${dropzone('fDH', 'Chọn file điều hành (.xlsx)')}
        <div id="dhPrev"></div></div>` : '<div class="alert info">Nạp nguồn số dư và file điều hành do PM chiến dịch thực hiện.</div>'}
      <div class="card"><h2>Lịch sử kỳ nạp số dư</h2>
        ${ky.length ? `<table class="mini"><thead><tr><th>Kỳ</th><th>Ngày dữ liệu</th><th>Loại</th><th>Tệp</th><th>Dòng</th><th>Cập nhật</th><th>Tạo mới</th><th>Không khớp</th><th>Người nạp</th><th>Lúc</th></tr></thead><tbody>
        ${ky.map(k => `<tr><td>${esc(k.ky)}</td><td><b>${K().dmy(k.ngayDuLieu)}</b></td><td>${esc(k.loai)}</td><td>${esc(k.tep)}</td><td>${esc(k.soDong)}</td><td>${esc(k.capNhat)}</td><td>${esc(k.taoMoi)}</td><td>${esc(k.khongKhop)}</td><td>${K().who(k.nguoi)}</td><td>${esc(S5.ui.dt(k.luc))}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Chưa nạp kỳ nào.</p>'}
      </div>`;
    $('xAll').onclick = () => X().exportTemplate(st().S.M.groups);
    if (pm) { wireDz('fSrc', srcFile); wireDz('fDH', dhFile); }
  }

  async function srcFile(file) {
    let wb; try { wb = await X().readWb(file); } catch (e) { S5.ui.toast('Không đọc được tệp: ' + e.message, 'err'); return; }
    const sheets = wb.SheetNames.map(n => ({ n, rows: X().aoa(wb.Sheets[n]) })).map(s => Object.assign(s, X().detect(s.rows))).filter(s => s.hr >= 0);
    if (!sheets.length) { $('srcPrev').innerHTML = '<div class="alert err">Không thấy sheet nào có cột CIF trong 20 dòng đầu.</div>'; return; }
    sheets.sort((a, b) => b.score - a.score || b.rows.length - a.rows.length);
    let cur = sheets[0];
    const draw = () => {
      const unit = X().guessUnit(cur.rows, cur.hr, cur.map), H = cur.rows[cur.hr];
      const colOpts = sel => `<option value="">— bỏ qua —</option>` + H.map((h, i) => `<option value="${i}" ${String(sel) === String(i) ? 'selected' : ''}>${esc(XLSX.utils.encode_col(i))} · ${esc(String(h).slice(0, 40))}</option>`).join('');
      $('srcPrev').innerHTML = `<div style="margin-top:14px">
        <div class="row"><span class="fld"><span>Sheet</span><select id="sSheet">${sheets.map((s, i) => `<option value="${i}" ${s === cur ? 'selected' : ''}>${esc(s.n)} (${s.rows.length - s.hr - 1} dòng)</option>`).join('')}</select></span>
          <span class="fld"><span>Loại nguồn</span><select id="sLoai"><option>CRM</option><option>Danh mục KH rà soát</option><option>Mô hình thấu chi</option><option>Mô hình binning</option><option>Khác</option></select></span>
          <span class="fld"><span>Ngày dữ liệu (chốt số) *</span><input type="date" id="sNgay"></span>
          <span class="fld"><span>Đơn vị số tiền trong tệp</span><select id="sUnit"><option value="dong" ${unit === 'dong' ? 'selected' : ''}>đồng (chia 1.000.000)</option><option value="trd" ${unit === 'trd' ? 'selected' : ''}>triệu đồng</option></select></span>
          <label class="small" style="display:flex;gap:6px;align-items:center;margin-top:16px"><input type="checkbox" id="sPad" checked> Đệm CIF đủ 8 số</label>
          <label class="small" style="display:flex;gap:6px;align-items:center;margin-top:16px"><input type="checkbox" id="sNew"> Tạo nhóm mới cho CIF chưa có (danh mục ban đầu)</label></div>
        <h3>Cột nguồn → trường (máy dò sẵn, sửa nếu sai)</h3>
        <div class="mapgrid">${Object.keys(X().LABEL).map(k => `<span class="fld"><span>${esc(X().LABEL[k])}${k === 'cif' ? ' *' : ''}</span><select data-map="${k}">${colOpts(cur.map[k])}</select></span>`).join('')}</div>
        <div id="sPrevTbl" style="margin-top:12px"></div>
        <div class="row end"><button class="btn pri" id="sGo">Nạp vào hệ thống</button></div></div>`;
      const fname = file.name.toLowerCase();
      $('sLoai').value = /binn/.test(fname) ? 'Mô hình binning' : /thau ?chi|tha?u_?chi/.test(fname) ? 'Mô hình thấu chi' : /danh ?muc|ra ?soat/.test(fname) ? 'Danh mục KH rà soát' : 'CRM';
      const m = file.name.match(/(20\d\d)[-_.]?(\d\d)[-_.]?(\d\d)/); if (m) $('sNgay').value = m[1] + '-' + m[2] + '-' + m[3];
      $('sNew').checked = !st().S.data.pn.length;
      const prev = () => {
        document.querySelectorAll('[data-map]').forEach(s => { cur.map[s.dataset.map] = s.value === '' ? undefined : +s.value; });
        const rows = X().extract(cur.rows, cur.hr, cur.map, $('sUnit').value, $('sPad').checked);
        const have = new Set(st().S.data.pn.map(p => p.cif)), match = rows.filter(r => have.has(r.cif)).length;
        const ks = ['cif', 'tenKH', 'dvkd', 'duVay', 'duBL', 'duLC', 'hangThauChi', 'binning', 'dauMoi'].filter(k => k === 'cif' || cur.map[k] !== undefined);
        $('sPrevTbl').innerHTML = `<div class="alert ${match || $('sNew').checked ? 'info' : 'warn'}"><b>${rows.length}</b> dòng có CIF · <b>${match}</b> khớp pháp nhân đang có · ${rows.length - match} CIF chưa có${$('sNew').checked ? ' → <b>tạo nhóm mới</b>' : ' → bỏ qua (bật "Tạo nhóm mới" nếu đây là danh mục ban đầu)'}</div>
          <div class="tblwrap" style="max-height:260px"><table class="tbl"><thead><tr>${ks.map(k => `<th>${esc(X().LABEL[k])}${['duVay', 'duBL', 'duLC'].indexOf(k) >= 0 ? ' (trđ)' : ''}</th>`).join('')}<th></th></tr></thead><tbody>
          ${rows.slice(0, 12).map(r => `<tr>${ks.map(k => `<td class="${typeof r[k] === 'number' ? 'num' : ''}">${typeof r[k] === 'number' ? K().trd(r[k]) : esc(r[k] || '')}</td>`).join('')}<td>${have.has(r.cif) ? '<span class="chip ok">khớp</span>' : '<span class="chip gray">mới</span>'}</td></tr>`).join('')}
          </tbody></table></div>${rows.length > 12 ? `<p class="muted small">… và ${rows.length - 12} dòng nữa</p>` : ''}`;
        return rows;
      };
      $('srcPrev').querySelectorAll('select,input').forEach(el => { if (el.id !== 'sSheet') el.onchange = prev; });
      $('sSheet').onchange = () => { cur = sheets[+$('sSheet').value]; draw(); };
      prev();
      $('sGo').onclick = async () => {
        const rows = prev();
        if (!$('sNgay').value) { S5.ui.toast('Chọn ngày dữ liệu (ngày chốt số).', 'err'); $('sNgay').focus(); return; }
        if (cur.map.cif === undefined) { S5.ui.toast('Chọn cột CIF.', 'err'); return; }
        const ok = await S5.ui.ask('Nạp ' + rows.length + ' dòng?', `Loại <b>${esc($('sLoai').value)}</b> · ngày dữ liệu <b>${K().dmy($('sNgay').value)}</b> · đơn vị ${$('sUnit').value === 'dong' ? 'đồng → triệu đồng' : 'triệu đồng'}.<br>Số dư/hạng của CIF khớp sẽ được ghi đè theo kỳ này và khóa với đầu mối.`, { yes: 'Nạp' });
        if (!ok.ok) return;
        try {
          const r = await S5.save('nap-sodu', { rows, ngayDuLieu: $('sNgay').value, loai: $('sLoai').value, tep: file.name, taoMoi: $('sNew').checked });
          $('srcPrev').innerHTML = `<div class="alert ok">✓ Kỳ <b>${esc(r.ky)}</b>: cập nhật <b>${r.capNhat}</b> CIF · tạo mới <b>${r.taoMoi}</b> · không khớp <b>${r.khongKhop.length}</b>${r.khongKhop.length ? ': ' + esc(r.khongKhop.slice(0, 30).join(', ')) : ''}</div>`;
          S5.ui.toast('Đã nạp kỳ ' + r.ky, 'ok');
        } catch (e) { S5.ui.toast(e.message, 'err'); }
      };
    };
    draw();
  }

  async function dhFile(file) {
    let wb; try { wb = await X().readWb(file); } catch (e) { S5.ui.toast('Không đọc được tệp: ' + e.message, 'err'); return; }
    const d = X().parseDieuHanh(wb);
    const groups = new Set([].concat(d.nhom.map(x => x.tenNhom), d.pn.map(x => x.tenNhom)).filter(Boolean));
    const have = new Set(st().S.data.nhom.map(n => X().fold(n.tenNhom)));
    const moi = [...groups].filter(g => !have.has(X().fold(g)));
    $('dhPrev').innerHTML = `<div style="margin-top:14px">${d.thieuSheet.length ? `<div class="alert warn">Không thấy sheet: ${esc(d.thieuSheet.join(', '))} — không đúng template?</div>` : ''}
      <div class="kpis">${S5.ui.kpi('Nhóm (tên)', groups.size, moi.length + ' nhóm mới')}${S5.ui.kpi('Pháp nhân (CIF)', d.pn.length, '')}${S5.ui.kpi('Hành động', d.actions.length, '')}${S5.ui.kpi('Yêu cầu dữ liệu', d.dl.length, '')}</div>
      ${moi.length ? `<p class="small muted">Nhóm mới: ${esc(moi.slice(0, 20).join(' · '))}${moi.length > 20 ? '…' : ''}</p>` : ''}
      <div class="row end"><button class="btn pri" id="dhGo" ${d.pn.length + d.nhom.length + d.actions.length + d.dl.length ? '' : 'disabled'}>Nạp vào hệ thống</button></div></div>`;
    $('dhGo').onclick = async () => {
      const ok = await S5.ui.ask('Nạp file điều hành?', `${groups.size} nhóm · ${d.pn.length} pháp nhân · ${d.actions.length} hành động · ${d.dl.length} yêu cầu dữ liệu. Nhãn được tính lại theo quy tắc hiện hành.`, { yes: 'Nạp' });
      if (!ok.ok) return;
      try {
        const r = await S5.save('import-dh', { nhom: d.nhom, pn: d.pn, actions: d.actions, dl: d.dl, tep: file.name });
        $('dhPrev').innerHTML = `<div class="alert ok">✓ Nhóm mới ${r.nhomMoi} · pháp nhân mới ${r.pnMoi}, cập nhật ${r.pnSua} · hành động ${r.action} · yêu cầu dữ liệu ${r.dl}</div>${r.boQua.length ? `<div class="alert warn">Bỏ qua ${r.boQua.length} ô không hợp lệ (ngoài danh mục chọn / user không có trong SHTD): ${esc(r.boQua.slice(0, 15).join(' · '))}</div>` : ''}`;
      } catch (e) { S5.ui.toast(e.message, 'err'); }
    };
  }
  S5.views.nap = { render };
})();
