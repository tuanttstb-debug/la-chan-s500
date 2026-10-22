// ── Lá chắn S-500 — cấu hình backend (GAS) ──
// Spreadsheet user DÙNG CHUNG với SHTD-Dashboard (+ AIUS, CN360): chỉ ĐỌC sheet User_Master để xác thực.
// DB riêng S500_DB tạo bởi setupAll() → ID lưu Script Property DB_ID. Chỉ TÀI KHOẢN CHỦ mở được file DB gốc (Guard.gs).
// Script Property bắt buộc: AUTH_SECRET = ĐÚNG giá trị AUTH_SECRET của GAS SHTD (token cấp bên nào cũng verify được → SSO).
// Ngoại lệ data-boundary: AIOS DEC-20261022-01 (mở rộng khuôn CN360 DEC-20261013-01).

var USER_SPREADSHEET_ID = '1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk';
var USER_MASTER_SHEET   = 'User_Master';
var APP_VERSION         = 's500-gas 0.1.0 (2026-10-22)';
var WRITE_LOCK_MS       = 25000;

// Tên sheet + cột. Bảng nghiệp vụ lấy từ core/schema.js (Schema.gs) — gọi trễ để không phụ thuộc thứ tự nạp file GAS.
function schema_() {
  return {
    Nhom:      S5S.dbHeaders('Nhom'),
    PhapNhan:  S5S.dbHeaders('PhapNhan'),
    Action:    S5S.dbHeaders('Action'),
    YeuCauDL:  S5S.dbHeaders('YeuCauDL'),
    SoDu:      S5S.dbHeaders('SoDu'),
    KyDuLieu:  S5S.dbHeaders('KyDuLieu'),
    NhatKy:    ['Thời điểm', 'Người', 'Vai trò', 'Team', 'Hành động', 'Đối tượng', 'Chi tiết'],
    Config:    ['Khóa', 'Giá trị', 'Mô tả'],
  };
}

// Vai trò S-500 (D06): PM (toàn quyền + nạp dữ liệu) · BLĐ (chỉ xem) · Teamlead (sửa/duyệt nhóm của team mình) · Đầu mối (sửa nhóm được giao).
// Admin SHTD luôn là PM. Danh sách username cách nhau dấu phẩy, không phân biệt hoa thường.
var CONFIG_DEFAULTS = [
  ['NEXT_NHOM', 1, 'Số thứ tự mã nhóm kế tiếp (S5-xxx) — máy tự tăng, không sửa tay'],
  ['NEXT_HD', 1, 'Số thứ tự hành động kế tiếp (HD-xxxx) — máy tự tăng'],
  ['NEXT_DL', 1, 'Số thứ tự yêu cầu dữ liệu kế tiếp (DL-xxxx) — máy tự tăng'],
  ['NEXT_KY', 1, 'Số thứ tự kỳ nạp kế tiếp — máy tự tăng'],
  ['PM', 'tuantt4,dungntp8,nhungpth7', 'Username PM/quản trị dữ liệu chiến dịch (PM chị Dung · chị Nhung nạp CRM hằng tháng · anh Tuân)'],
  ['BLĐ', 'cuongvm1', 'Username Ban lãnh đạo — chỉ xem dashboard + A4 (anh Cường; BLĐ Khối thêm khi có tài khoản SHTD)'],
  ['Ngày bắt đầu chiến dịch', '2026-10-20', 'Tuần 1 tính từ ngày này (kick-off 20/10/2026) — 8 tuần'],
  ['RULES_JSON', '', 'Để trống = ngưỡng mặc định core/rules.js. Điền JSON để đổi ngưỡng (vd {"tc4":[0.3,0.5]})'],
];
var CONFIG_PM_EDITABLE = ['PM', 'BLĐ', 'Ngày bắt đầu chiến dịch', 'RULES_JSON'];
