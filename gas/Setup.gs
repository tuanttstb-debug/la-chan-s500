// ── Setup.gs — khởi tạo 1 lần (chạy trong GAS editor bằng TK chủ) ──
// Trước khi chạy: Project Settings → Script Properties → AUTH_SECRET = giá trị AUTH_SECRET của GAS SHTD.
// setupAll(): tạo spreadsheet S500_DB (nếu chưa có) · đủ sheet + tiêu đề · Config mặc định · cột mã dạng chữ · khóa file riêng tư · trigger guard.
// Chạy lại an toàn: không xóa dữ liệu, chỉ bổ sung sheet/cột/khóa còn thiếu.

function setupAll() {
  var P = PropertiesService.getScriptProperties();
  if (!P.getProperty('AUTH_SECRET')) throw new Error('Thiếu Script Property AUTH_SECRET (lấy từ GAS SHTD).');
  var id = P.getProperty('DB_ID'), ss;
  if (id) ss = SpreadsheetApp.openById(id);
  else { ss = SpreadsheetApp.create('S500_DB — Lá chắn S-500 (KHÔNG CHIA SẺ)'); P.setProperty('DB_ID', ss.getId()); }

  var SC = schema_();
  Object.keys(SC).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name), H = SC[name];
    var cur = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
    if (!cur.filter(Boolean).length) sh.getRange(1, 1, 1, H.length).setValues([H]);
    else { var miss = H.filter(function (h) { return cur.indexOf(h) < 0; }); if (miss.length) sh.getRange(1, cur.length + 1, 1, miss.length).setValues([miss]); }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#EDE7F6');
  });
  var s1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);
  // Cột mã + ngày để dạng chữ (CIF giữ số 0 đầu, ngày không bị Sheets đổi múi giờ)
  [['Nhom', ['Mã nhóm', 'CIF chính', 'Ngày dữ liệu']], ['PhapNhan', ['Mã nhóm', 'CIF', 'Ngày rà soát', 'Ngày cập nhật', 'Hạng thấu chi']],
   ['Action', ['ID', 'Mã nhóm', 'CIF', 'Ngày bắt đầu đề xuất', 'Ngày giao', 'Hạn hoàn thành', 'Ngày hoàn thành', 'Ngày cập nhật']],
   ['YeuCauDL', ['ID', 'Mã nhóm', 'Ngày yêu cầu', 'Hạn cung cấp', 'Ngày nhận', 'Ngày cập nhật']], ['SoDu', ['Kỳ', 'CIF']], ['KyDuLieu', ['Kỳ', 'Ngày dữ liệu']]].forEach(function (x) {
    var sh = ss.getSheetByName(x[0]), H = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    x[1].forEach(function (h) { var c = H.indexOf(h) + 1; if (c > 0) sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@'); });
  });

  _tblCache_ = {};
  var have = {}; rows_('Config').forEach(function (r) { have[String(r['Khóa'])] = true; });
  var add = CONFIG_DEFAULTS.filter(function (r) { return !have[r[0]]; }).map(function (r) { return { 'Khóa': r[0], 'Giá trị': r[1], 'Mô tả': r[2] }; });
  appendRows_('Config', add);

  var g = enforcePrivate_();
  installGuardTrigger_();
  Logger.log('S500_DB: ' + ss.getUrl() + ' · chủ: ' + g.owner + ' · gỡ: ' + (g.removed.join(', ') || 'không'));
  return { dbId: ss.getId(), owner: g.owner, removed: g.removed, configAdded: add.length };
}

/** Kiểm nhanh sau khi cài: AUTH_SECRET đọc được, User_Master mở được, DB riêng tư. */
function checkSetup() {
  var out = { secret: !!PropertiesService.getScriptProperties().getProperty('AUTH_SECRET') };
  try { out.users = SpreadsheetApp.openById(USER_SPREADSHEET_ID).getSheetByName(USER_MASTER_SHEET).getLastRow() - 1; } catch (e) { out.users = 'LỖI: ' + e.message; }
  try { var f = DriveApp.getFileById(PropertiesService.getScriptProperties().getProperty('DB_ID')); out.sharing = String(f.getSharingAccess()); out.editors = f.getEditors().length; out.viewers = f.getViewers().length; } catch (e) { out.db = 'LỖI: ' + e.message; }
  Logger.log(JSON.stringify(out));
  return out;
}
