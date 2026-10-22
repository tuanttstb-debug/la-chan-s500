'use strict';
/* forms.js — hộp nhập: thông tin NHÓM (cột riêng sheet TH TT nhóm) · ACTION PLAN (A–V) · THEO DÕI DỮ LIỆU (A–M). */
(function () {
  const { esc } = S5.ui, K = () => S5.kit, st = () => S5.store;

  function modal(title, inner, onSave, opts) {
    opts = opts || {};
    const m = $('modal');
    m.innerHTML = `<div class="modal-card wide"><h3>${esc(title)}</h3>${opts.sub ? `<p class="muted small" style="margin-top:-4px">${opts.sub}</p>` : ''}<div id="mfrm">${inner}</div>
      <div class="row end" style="margin-top:14px">${opts.del ? '<button class="btn ghost" id="mDel" style="margin-right:auto">Xóa</button>' : ''}<button class="btn" id="mNo">Hủy</button><button class="btn pri" id="mOk">Lưu</button></div></div>`;
    m.classList.add('on');
    const close = () => { m.classList.remove('on'); m.innerHTML = ''; };
    $('mNo').onclick = close;
    m.onclick = e => { if (e.target === m) close(); };
    // onSave trả false = đã tự điều hướng (vd tạo nhóm mới → mở trang nhóm), không vẽ lại màn cũ
    $('mOk').onclick = async () => { $('mOk').disabled = true; try { const r = await onSave(K().readForm($('mfrm'))); close(); if (r !== false) { S5.keepScroll = true; S5.route(); } } catch (e) { S5.ui.toast(e.message, 'err'); } finally { if ($('mOk')) $('mOk').disabled = false; } };
    if (opts.del) $('mDel').onclick = async () => { const r = await S5.ui.ask('Xóa?', esc(opts.delMsg || 'Không hoàn tác.'), { yes: 'Xóa', danger: true }); if (!r.ok) return; try { await opts.del(); S5.keepScroll = true; S5.route(); } catch (e) { S5.ui.toast(e.message, 'err'); } };
    if (opts.after) opts.after($('mfrm'));
  }
  const F = (tbl, k) => S5S.byKey(tbl)[k];

  function nhom(g) {
    const canDM = st().isPM() || (st().S.user.role === 'Teamlead') || !g;
    const fld = (k, o) => K().field(F('Nhom', k), g ? g[k] : (k === 'dauMoi' ? st().S.user.username : ''), Object.assign({ cols: true }, o || {}));
    const inner = `<div class="fgrid">
      ${K().field(F('Nhom', 'tenNhom'), g ? g.tenNhom : '', { cols: true, wide: true, hint: 'Đặt thống nhất trong nhóm — vd tên pháp nhân chính rút gọn' })}
      ${canDM ? fld('dauMoi', { hint: 'Nhóm nhiều chi nhánh: PTKD quản lý pháp nhân nghĩa vụ lớn nhất làm đầu mối' }) : `<div class="ff"><label>PTKD/ PO đầu mối</label><div class="calc">${K().who(g.dauMoi)}</div><div class="hint">PM/Teamlead đổi đầu mối</div></div>`}
      <div class="ff"><label>PO/ nhân sự hỗ trợ <span class="col">bổ sung</span></label><input data-k="hoTro" value="${esc(g ? g.hoTro : '')}" placeholder="username, cách nhau dấu phẩy — vd AnhVTH3, NhungPTH7"><div class="hint">Người hỗ trợ được sửa nhóm như đầu mối</div></div>
      ${fld('mien')}${fld('cbo')}${fld('ttDuLieu')}${fld('tienDo')}${fld('uuTien')}${fld('siteVisit')}
      ${K().field(F('Nhom', 'nguonTraNo'), g ? g.nguonTraNo : '', { label: 'Nguồn trả nợ (bổ sung — cho one-pager BLĐ)', wide: true })}
      ${K().field(F('Nhom', 'vanDeBLD'), g ? g.vanDeBLD : '', { cols: true, wide: true })}
      ${K().field(F('Nhom', 'phuongAn'), g ? g.phuongAn : '', { label: 'Phương án dự kiến tiếp theo (bổ sung)', wide: true })}
      ${fld('ghiChu', { wide: true })}
    </div>`;
    modal(g ? 'Thông tin nhóm — ' + g.tenNhom : 'Nhóm KH mới', inner, async v => {
      if (!String(v.tenNhom || '').trim()) throw new Error('Nhập tên nhóm KH.');
      const r = await S5.save('save-nhom', { nhom: Object.assign({ maNhom: g ? g.maNhom : undefined }, v) }, g ? 'Đã lưu nhóm' : 'Đã tạo nhóm');
      if (!g && r && r.nhom) { S5.go('nhom', r.nhom.maNhom); return false; }
    }, { sub: 'Tổng dư nợ/BL/LC, pháp nhân chính, CIF, phân loại nhóm do máy tổng hợp từ các pháp nhân — không nhập tay.', after: f => { const x = f.querySelector('[data-k="tenNhom"]'); if (x) x.focus(); } });
    if (!g) { /* tạo mới → sau khi lưu chuyển tới trang nhóm */ }
  }

  function groupSelect(cur) {
    const L = st().S.M.groups.filter(x => st().canEdit(x));
    return `<div class="ff wide"><label>Nhóm KH <span class="req">*</span> <span class="col">C</span></label><select data-k="maNhom">${L.map(x => `<option value="${esc(x.maNhom)}" ${x.maNhom === cur ? 'selected' : ''}>${esc(x.tenNhom)} (${esc(x.maNhom)}) — ${esc(x.nhan)}</option>`).join('')}</select></div>`;
  }

  function action(a, maNhom) {
    const v = a || { maNhom, trangThai: 'Chưa bắt đầu', ngayBatDau: st().today(), ngayGiao: st().today() };
    const fld = (k, o) => K().field(F('Action', k), v[k], Object.assign({ cols: true }, o || {}));
    const inner = `<div class="fgrid">${groupSelect(v.maNhom)}
      <div class="ff"><label>Mã hành động <span class="req">*</span> <span class="col">A</span></label><select data-k="maHD">${S5S.LISTS.MA_HD.map(c => `<option value="${c}" ${v.maHD === c ? 'selected' : ''}>${c} — ${esc(S5S.LISTS.HANH_DONG[c])}</option>`).join('')}</select></div>
      ${fld('trangThai')}
      ${fld('bienPhap', { wide: true, rows: 2 })}${fld('mucTieu', { wide: true, rows: 2 })}
      ${fld('chuTri')}${fld('nguoiTN')}${fld('phoiHop')}${fld('capDuyet')}
      ${fld('ngayBatDau')}${fld('ngayGiao')}${fld('han')}${fld('phanTram')}${fld('ngayXong')}${fld('bangChung', { hint: 'Đường dẫn ổ chung \\\\ho-file01\\…\\HO SO RA SOAT — web không lưu tệp' })}
      ${fld('vuongMac', { wide: true, rows: 2 })}
    </div>`;
    modal(a ? 'Sửa hành động ' + a.id : 'Hành động mới', inner, async x => {
      await S5.save('save-action', { row: Object.assign({ id: a ? a.id : undefined }, x) }, 'Đã lưu hành động');
    }, { sub: 'Mỗi hành động một dòng; có người chịu trách nhiệm, hạn, bằng chứng đóng việc. Tên nhóm, CIF chính, PTKD, phân loại do máy điền.',
      del: a ? () => S5.save('delete-action', { id: a.id }, 'Đã xóa') : null });
  }

  function dl(x, maNhom) {
    const v = x || { maNhom, trangThai: 'Chờ dữ liệu', ngayYC: st().today() };
    const fld = (k, o) => K().field(F('YeuCauDL', k), v[k], Object.assign({ cols: true }, o || {}));
    const inner = `<div class="fgrid">${groupSelect(v.maNhom)}
      ${fld('loai')}${fld('trangThai')}${fld('donViSoHuu')}${fld('dauMoiCC')}${fld('dauMoi')}${fld('mucAH')}
      ${fld('ngayYC')}${fld('han')}${fld('ngayNhan')}${fld('nguon')}
      ${fld('thongTin', { wide: true, rows: 2 })}
    </div>`;
    modal(x ? 'Sửa yêu cầu dữ liệu ' + x.id : 'Yêu cầu bổ sung dữ liệu', inner, async o => {
      await S5.save('save-dl', { row: Object.assign({ id: x ? x.id : undefined }, o) }, 'Đã lưu');
    }, { sub: 'Ghi riêng từng dữ liệu chưa có: ai sở hữu, ai cung cấp, hạn, ảnh hưởng nếu thiếu.', del: x ? () => S5.save('delete-dl', { id: x.id }, 'Đã xóa') : null });
  }

  S5.forms = { nhom, action, dl, modal };
})();
