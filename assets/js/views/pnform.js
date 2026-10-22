'use strict';
/* Nhập/sửa PHÁP NHÂN = 1 dòng sheet "Phân loại KH" (A–AL, đủ trường theo template — R2).
 * Trái: form theo khối cột Excel (có chữ cột để đối chiếu). Phải: kết quả 7 tiêu chí + nhãn TÍNH NGAY khi gõ (R5).
 * Số hệ thống (dư nợ/BL/LC, hạng mô hình) đã nạp từ nguồn → khóa với đầu mối (R4). */
(function () {
  S5.views = S5.views || {};
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;
  const SYS = ['duVay', 'duBL', 'duLC', 'hangThauChi', 'binning'];

  function render(host, args) {
    const M = st().S.M, g = M.gIdx[args[0]], isNew = args[1] === 'moi';
    if (!g) { host.innerHTML = '<div class="alert warn">Không thấy nhóm. <a href="#/nhom">← Danh mục</a></div>'; return; }
    const cur = isNew ? null : st().S.data.pn.find(p => p.cif === args[1]);
    if (!isNew && !cur) { host.innerHTML = '<div class="alert warn">Không thấy pháp nhân. <a href="#/nhom/' + encodeURIComponent(g.maNhom) + '">← Nhóm</a></div>'; return; }
    if (!st().canEdit(g)) { host.innerHTML = '<div class="alert warn">Bạn chỉ có quyền xem nhóm này.</div>'; return; }
    const p0 = cur ? Object.assign({}, cur) : { maNhom: g.maNhom, mien: g.mien, dauMoi: g.dauMoi, ngayRaSoat: st().today(), quanHe: g.ps.length ? '' : 'Pháp nhân chính' };
    const lockSys = !!(cur && cur.nguonSoDu) && !st().isPM();
    $('pageTitle').textContent = isNew ? 'Thêm pháp nhân' : (cur.tenKH || cur.cif);
    $('pageSub').textContent = g.maNhom + ' · ' + g.tenNhom;

    const groups = [];
    S5S.PN.filter(f => f.g && f.k !== 'nguoiSua').forEach(f => { let G = groups.find(x => x.t === f.g); if (!G) groups.push(G = { t: f.g, f: [] }); G.f.push(f); });

    function fieldHtml(f, p) {
      const v = p[f.k] === undefined ? '' : p[f.k];
      const col = f.x ? `<span class="col">${f.x}</span>` : '';
      const lab = f.k === 'maNhom' ? 'Tên nhóm KH' : f.sub ? f.sub + ' — ' + f.t : String(f.t || f.db).trim();
      const req = f.req ? '<span class="req">*</span>' : '';
      if (f.k === 'maNhom') {
        const opts = M.groups.filter(x => st().canEdit(x)).map(x => `<option value="${esc(x.maNhom)}" ${x.maNhom === p.maNhom ? 'selected' : ''}>${esc(x.tenNhom)} (${esc(x.maNhom)})</option>`).join('');
        return `<div class="ff"><label>${lab} ${req}${col}</label><select data-k="maNhom">${opts}</select><div class="hint">Pháp nhân cùng nhóm tự cộng dồn lên dòng nhóm (sheet TH TT nhóm).</div></div>`;
      }
      if (f.type === 'calc') {
        if (['nhanMay', 'phanLoai', 'ngayCapNhat', 'nguonSoDu'].indexOf(f.k) >= 0) return '';
        return `<div class="ff"><label>${esc(lab)} ${col}</label><div class="calc" data-calc="${f.k}">–</div><div class="hint">Máy tính</div></div>`;
      }
      if (f.type === 'sys') {
        const locked = lockSys;
        let inp;
        if (f.k === 'binning') inp = `<select data-k="binning" ${locked ? 'disabled' : ''}><option value=""></option>${S5S.LISTS.BINNING.map(o => `<option ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
        else if (f.k === 'hangThauChi') inp = `<input data-k="hangThauChi" value="${esc(v)}" placeholder="vd AA, BBB, CCC" ${locked ? 'readonly' : ''}>`;
        else inp = `<div class="unit"><input type="number" step="any" data-k="${f.k}" value="${esc(v)}" ${locked ? 'readonly' : ''}><span>trđ</span></div>`;
        return `<div class="ff ${locked ? 'locked' : ''}"><label>${esc(lab)} ${req}${col}</label>${inp}<div class="hint">${locked ? '🔒 Nạp từ ' + esc(cur.nguonSoDu) + ' — PM cập nhật theo kỳ' : 'Số hệ thống — PM nạp theo kỳ; nhập tay nếu chưa có'}</div></div>`;
      }
      if (f.k === 'nhanChot') return `<div class="ff"><label>Nhãn chốt (ghi đè nhãn máy)</label><select data-k="nhanChot"><option value="">— Theo nhãn máy —</option>${['Xanh', 'Vàng', 'Đỏ'].map(o => `<option ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select><div class="hint">Chỉ dùng khi có căn cứ ngoài 7 tiêu chí; bắt buộc ghi lý do. Teamlead thấy cờ "ghi đè".</div></div>`;
      const opts = { cols: true, label: lab, rows: f.k === 'lyDo' ? 5 : 3 };
      if (f.k === 'od2') opts.hint = 'Tái diễn/chưa khắc phục → Đỏ ngay';
      if (f.k === 'bienDongDT') opts.hint = 'Nhập % (giảm ghi số âm, vd −15). Lũy kế đến quý gần nhất so cùng kỳ';
      if (f.k === 'tyTrongDuNo' || f.k === 'tyTrongTsbd') opts.hint = 'Nhập % theo CIC ≤ 30 ngày';
      if (f.k === 'nganh') opts.hint = 'Ngành do đầu mối chọn khi rà soát — "Xây lắp"/"Xây lắp Mass" dùng ngưỡng xây lắp';
      if (f.k === 'lyDo') opts.hint = 'Nêu rõ vấn đề/rủi ro + nguyên nhân với tiêu chí Vàng/Đỏ; 3 rủi ro chính';
      return K().field(f, v, opts).replace('<div class="ff', `<div data-ff="${f.k}" class="ff`);
    }

    host.innerHTML = `<div class="ed">
      <div id="frm">
        ${!isNew && lockSys ? `<div class="alert info no-print">Số dư nợ/BL/LC và hạng mô hình đã nạp từ <b>${esc(cur.nguonSoDu)}</b> — chỉ PM cập nhật theo kỳ. Anh/chị nhập phần rà soát.</div>` : ''}
        ${groups.map((G, i) => `<div class="fsec"><h3><span class="n">${i + 1}</span>${esc(G.t)}</h3><div class="body">${G.f.map(f => fieldHtml(f, p0)).join('')}</div></div>`).join('')}
      </div>
      <div class="sticky"><div class="resp" id="resp"></div>
        <div class="card" style="margin-top:12px"><div class="kv2"><b>Nhóm</b><span>${esc(g.tenNhom)}</span><b>Nhãn nhóm hiện tại</b><span>${K().nhan(g.nhan)}</span>${cur ? `<b>Cập nhật</b><span>${K().dmy(cur.ngayCapNhat)} · ${K().who(cur.nguoiSua)}</span>` : ''}</div></div>
      </div>
    </div>
    <div class="savebar"><span class="msg" id="missMsg"></span>
      ${!isNew ? '<button class="btn ghost" id="pnDel">Xóa pháp nhân</button>' : ''}
      <a class="btn ghost" href="#/nhom/${encodeURIComponent(g.maNhom)}">Hủy</a>
      <button class="btn" id="pnSaveNew">Lưu & thêm pháp nhân khác</button>
      <button class="btn pri" id="pnSave">Lưu</button></div>`;

    const frm = $('frm');
    function read() { const o = Object.assign({}, p0, K().readForm(frm)); return o; }
    function live() {
      const p = read(), e = S5R.evalPN(p), d = e.d, nh = S5R.nhanHieuLuc(p, e);
      const setC = (k, v) => { const el = frm.querySelector(`[data-calc="${k}"]`); if (el) el.innerHTML = v; };
      setC('hmTong', K().trd(d.hmTong) + ' <span class="muted small">trđ</span>'); setC('duTong', K().trd(d.duTong) + ' <span class="muted small">trđ</span>');
      setC('tyLeTsbd', K().pct(d.tyLeTsbd)); setC('tyLeNnh', K().pct(d.tyLeNnh) + ' ' + chipTc(e.tc[0]));
      setC('tyLeDtTT', K().pct(d.tyLeDtTT) + ' ' + chipTc(e.tc[1])); setC('tuongXung', K().lan(d.tuongXung) + ' ' + chipTc(e.tc[4]));
      const miss = S5S.PN.filter(f => f.req && f.type !== 'calc' && String(p[f.k] === undefined ? '' : p[f.k]).trim() === '');
      frm.querySelectorAll('[data-ff]').forEach(el => el.classList.toggle('empty-req', miss.some(f => f.k === el.dataset.ff)));
      $('missMsg').innerHTML = miss.length ? `Còn <b>${miss.length}</b> trường bắt buộc chưa nhập — vẫn lưu được (nhãn "Chưa đủ dữ liệu" tới khi đủ).` : '<span class="okc">✓ Đủ trường bắt buộc</span>';
      $('resp').innerHTML = `<div class="top"><div class="k">Phân loại (cột AI)</div>${K().nhan(nh, 'xl')}
          ${p.nhanChot && p.nhanChot !== e.nhan ? `<div class="nghieng" style="color:var(--accent)">Ghi đè · nhãn máy: <b>${esc(e.nhan)}</b></div>` : ''}
          ${e.nhan === 'Chưa đủ dữ liệu' && e.nghieng ? `<div class="nghieng">Phần đã có đang nghiêng <b>${esc(e.nghieng)}</b> · còn thiếu TC ${e.thieu.join(', ')}</div>` : ''}
          ${e.xayLap ? '<div class="nghieng">Áp ngưỡng ngành xây lắp</div>' : ''}</div>
        ${e.doNgay.length ? `<div class="donow" style="margin:10px 12px 0">⚠ Đỏ ngay: ${esc(e.doNgay.join(' · '))}</div>` : ''}
        <ul>${e.tc.map(c => `<li><span class="no">${c.id}</span><span><span class="nm">${esc(c.ten)}</span><span class="rl">${esc(c.chiTiet)}</span></span>${K().tcCell(c)}</li>`).join('')}</ul>
        <div class="foot">Đỏ ngay: thấu chi từ CCC trở xuống · binning Red · OD2 tái diễn. Còn lại: ≥2 Đỏ → Đỏ · còn thiếu → Chưa đủ dữ liệu · 1 Đỏ hoặc có Vàng → Vàng · đủ 7 Xanh → Xanh.</div>`;
    }
    const chipTc = c => `<span class="tc ${esc(c.nhan)}" style="display:inline-block;min-width:0;padding:1px 7px">${esc(c.nhan === 'Thiếu' ? '–' : c.nhan)}</span>`;
    frm.addEventListener('input', live); frm.addEventListener('change', live);
    live();

    let dirty = false; frm.addEventListener('input', () => { dirty = true; });
    async function save(next) {
      const p = read();
      if (!String(p.cif || '').trim()) { S5.ui.toast('Nhập mã CIF.', 'err'); frm.querySelector('[data-k="cif"]').focus(); return; }
      if (p.nhanChot && p.nhanChot !== S5R.evalPN(p).nhan && !String(p.lyDoGhiDe || '').trim()) { S5.ui.toast('Nhãn chốt khác nhãn máy → ghi lý do ghi đè.', 'err'); frm.querySelector('[data-k="lyDoGhiDe"]').focus(); return; }
      const body = {}; S5S.editable('PhapNhan').forEach(k => { if (k in p && k !== 'nguonSoDu' && k !== 'nguoiSua') body[k] = p[k]; });
      if (lockSys) SYS.forEach(k => delete body[k]);
      try {
        const r = await S5.save('save-pn', { pn: body, cifCu: cur ? cur.cif : undefined }, 'Đã lưu ' + (p.tenKH || p.cif) + ' — nhãn ' + r0(p));
        dirty = false;
        if (next) { S5.go('pn', p.maNhom, 'moi'); S5.route(); } else S5.go('nhom', r && r.pn ? r.pn.maNhom : p.maNhom);
      } catch (e) { S5.ui.toast(e.message, 'err'); }
    }
    const r0 = p => S5R.nhanHieuLuc(p, S5R.evalPN(p));
    $('pnSave').onclick = () => save(false);
    $('pnSaveNew').onclick = () => save(true);
    if ($('pnDel')) $('pnDel').onclick = async () => {
      const r = await S5.ui.ask('Xóa pháp nhân ' + (cur.tenKH || cur.cif) + '?', 'Xóa khỏi nhóm ' + esc(g.tenNhom) + '. Không hoàn tác.', { yes: 'Xóa', danger: true });
      if (!r.ok) return;
      try { await S5.save('delete-pn', { cif: cur.cif }, 'Đã xóa pháp nhân'); S5.go('nhom', g.maNhom); } catch (e) { S5.ui.toast(e.message, 'err'); }
    };
    window.onbeforeunload = () => (dirty ? 'Chưa lưu' : undefined);
    window.addEventListener('hashchange', () => { window.onbeforeunload = null; }, { once: true });
  }
  S5.views.pnform = { render };
})();
