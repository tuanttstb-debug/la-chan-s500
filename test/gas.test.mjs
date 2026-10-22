// Test backend GAS (gas/*.gs) chạy trong giả lập Node — dữ liệu GIẢ hoàn toàn.
// Phủ: đăng nhập/SSO token · vai trò S-500 · quyền sửa nhóm · pháp nhân + nhãn tính ở server · khóa số hệ thống · ghi đè nhãn
//      · Action/Theo dõi dữ liệu · nạp nguồn số dư (tạo nhóm từ danh mục) · nạp file điều hành · cấu hình ngưỡng · Guard riêng tư · idempotency.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeEnv } from './gas_harness.mjs';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'sync_gas.mjs')], { stdio: 'inherit' });

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };

const USERS = [
  { username: 'admin1', displayName: 'Admin Giả', role: 'Admin', team: 'Số', password: 'a' },
  { username: 'pm1', displayName: 'PM Giả', role: 'User', team: 'QLDM', password: 'p' },
  { username: 'bld1', displayName: 'Lãnh Đạo Giả', role: 'User', team: 'BLĐ', password: 'b' },
  { username: 'tl_mn', displayName: 'Teamlead MN Giả', role: 'Teamlead', team: 'PTKD MN', password: 't' },
  { username: 'tl_mb', displayName: 'Teamlead MB Giả', role: 'Teamlead', team: 'PTKD MB', password: 't' },
  { username: 'u_mn', displayName: 'Đầu Mối MN Giả', role: 'User', team: 'PTKD MN', password: 'u' },
  { username: 'u_mn2', displayName: 'Đầu Mối MN Hai', role: 'User', team: 'PTKD MN', password: 'u' },
  { username: 'po1', displayName: 'PO Hỗ Trợ Giả', role: 'User', team: 'CV', password: 'u' },
  { username: 'off', displayName: 'Nghỉ Việc', role: 'User', team: 'CV', password: 'u', active: false },
];
const env = makeEnv({ users: USERS, props: { AUTH_SECRET: 'test-secret' } });
const st = env.ctx.setupAll();
ok(st.dbId && env.db(), 'setupAll tạo S500_DB');
ok(['Nhom', 'PhapNhan', 'Action', 'YeuCauDL', 'SoDu', 'KyDuLieu', 'NhatKy', 'Config'].every(n => env.db().sheet(n)), 'đủ 8 sheet');
ok(env.db().sheet('PhapNhan').data[0].length === env.ctx.S5S.dbHeaders('PhapNhan').length, 'tiêu đề PhapNhan khớp schema');
ok(env.triggers.some(t => t.getHandlerFunction() === 'guardDaily'), 'trigger guard 7h');
// PM = pm1 (đặt qua Config)
env.ctx.withLock_(() => env.ctx.setConfig_({ PM: 'pm1', 'BLĐ': 'bld1' }));

const tok = {};
for (const u of USERS.filter(x => x.active !== false)) { const r = env.call({ action: 'auth-login', username: u.username, password: u.password }); tok[u.username] = r.token; }
ok((() => { try { env.call({ action: 'auth-login', username: 'off', password: 'u' }); return false; } catch (e) { return /vô hiệu/.test(e.message); } })(), 'user nghỉ việc không đăng nhập được');
ok(env.call({ action: 'load', token: 'sai.token' }).error === 'AUTH_REQUIRED', 'token sai → AUTH_REQUIRED');
const C = (u, action, body = {}) => env.call({ action, token: tok[u], ...body });
const D = (u, action, body) => { const r = C(u, action, body); if (r.status !== 'ok') throw new Error(action + ' ' + u + ': ' + r.error); return r.data; };

// Vai trò
ok(D('admin1', 'load').user.s5Role === 'PM', 'Admin SHTD = PM');
ok(D('pm1', 'load').user.s5Role === 'PM', 'PM theo Config');
ok(D('bld1', 'load').user.s5Role === 'BLĐ', 'BLĐ theo Config');
ok(D('tl_mn', 'load').user.s5Role === 'Teamlead', 'Teamlead');
ok(D('u_mn', 'load').user.s5Role === 'Đầu mối', 'đầu mối');
ok(D('u_mn', 'load').users.length === 8, 'danh bạ user chỉ người Active');

// Nhóm
const g1 = D('u_mn', 'save-nhom', { nhom: { tenNhom: 'Nhóm Giả Lập Alpha', mien: 'Nam', hoTro: 'PO1 + không_có' } }).nhom;
ok(g1.maNhom === 'S5-001' && g1.dauMoi === 'u_mn', 'tạo nhóm: mã S5-001, đầu mối = người tạo');
ok(g1.hoTro === 'po1', 'PO hỗ trợ khớp user thật, bỏ tên lạ');
ok(C('u_mn2', 'save-nhom', { nhom: { tenNhom: 'nhóm giả lập  ALPHA' } }).error.includes('cùng tên'), 'chặn trùng tên nhóm (không phân biệt hoa/khoảng trắng)');
ok(C('bld1', 'save-nhom', { nhom: { tenNhom: 'BLĐ tạo' } }).error === 'FORBIDDEN', 'BLĐ không tạo nhóm');
ok(C('u_mn2', 'save-nhom', { nhom: { maNhom: 'S5-001', tenNhom: 'Đổi tên', ghiChu: 'x' } }).error === 'FORBIDDEN', 'đầu mối khác không sửa nhóm người khác');
ok(C('po1', 'save-nhom', { nhom: { maNhom: 'S5-001', tenNhom: 'Nhóm Giả Lập Alpha', ghiChu: 'PO ghi' } }).status === 'ok', 'PO hỗ trợ sửa được');
ok(C('tl_mn', 'save-nhom', { nhom: { maNhom: 'S5-001', tenNhom: 'Nhóm Giả Lập Alpha', uuTien: 'P1 - Khẩn cấp' } }).status === 'ok', 'Teamlead cùng team đầu mối sửa được');
ok(C('tl_mb', 'save-nhom', { nhom: { maNhom: 'S5-001', tenNhom: 'Nhóm Giả Lập Alpha', uuTien: 'P2 - Cao' } }).error === 'FORBIDDEN', 'Teamlead khác team không sửa');
ok(C('u_mn', 'save-nhom', { nhom: { maNhom: 'S5-001', tenNhom: 'Nhóm Giả Lập Alpha', uuTien: 'P9' } }).error.includes('không hợp lệ'), 'droplist sai giá trị bị chặn');
ok(C('u_mn', 'save-nhom', { nhom: { maNhom: 'S5-001', tenNhom: 'Nhóm Giả Lập Alpha', dauMoi: 'u_mn2' } }).error === 'FORBIDDEN', 'đầu mối không tự chuyển nhóm cho người khác');
ok(D('pm1', 'save-nhom', { nhom: { maNhom: 'S5-001', tenNhom: 'Nhóm Giả Lập Alpha', dauMoi: 'U_MN' } }).nhom.dauMoi === 'u_mn', 'PM đổi đầu mối (chuẩn hóa username)');

// Pháp nhân — nhãn tính ở server, bỏ qua nhãn client gửi
const pnA = { maNhom: 'S5-001', cif: '00012345', tenKH: 'CTY GIA LAP A', dvkd: 'CN Giả', ngayRaSoat: '2026-10-22', nganh: 'Xây lắp',
  duVay: 300000, duBL: 200000, duLC: 10000, hmVay: 400000, tsbd: 255000, dtVat12: 1000000, nnhCic: 300000, bienDongDT: 0.1,
  dsGiaiNgan: 500000, dtTrucTiep: 450000, od2: 'Không', tyTrongDuNo: 0.2, tyTrongTsbd: 0.25, hangThauChi: 'AA', binning: 'Green', lyDo: 'Ổn', phanLoai: 'Đỏ' };
let r = D('u_mn', 'save-pn', { pn: pnA });
ok(r.pn.phanLoai === 'Xanh' && r.pn.nhanMay === 'Xanh', 'đủ 7 Xanh → Xanh (bỏ nhãn client gửi "Đỏ")');
ok(r.pn.duTong === 510000 && r.pn.tyLeTsbd === 0.5 && r.pn.tyLeNnh === 0.3, 'cột máy J, R, X đúng');
ok(r.pn.mien === 'Nam' && r.pn.dauMoi === 'u_mn', 'miền + đầu mối kế thừa nhóm');
ok(r.nhanNhom === 'Xanh', 'nhãn nhóm trả về');
ok(env.db().sheet('PhapNhan').data[1][env.db().sheet('PhapNhan').data[0].indexOf('CIF')] === '00012345', 'CIF giữ số 0 đầu');
r = D('u_mn', 'save-pn', { pn: { ...pnA, cif: '00067890', tenKH: 'CTY GIA LAP B', duVay: 50000, duBL: 0, duLC: 0, binning: 'Red' } });
ok(r.pn.phanLoai === 'Đỏ' && r.nhanNhom === 'Đỏ', 'pháp nhân 2 binning Red → Đỏ ngay, nhóm Đỏ');
ok(C('u_mn', 'save-pn', { pn: { ...pnA, cif: '00067890', tenKH: 'trùng' } }).error.includes('đã có'), 'chặn CIF trùng');
ok(C('u_mn2', 'save-pn', { pn: { ...pnA, cif: '0001' } }).error === 'FORBIDDEN', 'người ngoài không thêm pháp nhân');
ok(C('u_mn', 'save-pn', { pn: { ...pnA, cif: '0002', maNhom: 'S5-999' } }).error.includes('Chọn nhóm'), 'nhóm không tồn tại');
ok(C('u_mn', 'save-pn', { pn: { ...pnA, cif: '0003', od2: 'Có' } }).error.includes('không hợp lệ'), 'OD2 ngoài droplist bị chặn');
ok(C('u_mn', 'save-pn', { pn: { ...pnA, cif: '0004', dtVat12: 'abc' } }).error.includes('Số không hợp lệ'), 'số sai bị chặn');
// Ghi đè nhãn
ok(C('u_mn', 'save-pn', { pn: { ...pnA, nhanChot: 'Vàng' }, cifCu: '00012345' }).error.includes('lý do'), 'ghi đè nhãn bắt buộc lý do');
r = D('u_mn', 'save-pn', { pn: { ...pnA, nhanChot: 'Vàng', lyDoGhiDe: 'Thông tin thị trường xấu' }, cifCu: '00012345' });
ok(r.pn.phanLoai === 'Vàng' && r.pn.nhanMay === 'Xanh', 'ghi đè: hiệu lực Vàng, máy vẫn Xanh');
r = D('u_mn', 'save-pn', { pn: { ...pnA, nhanChot: 'Xanh', lyDoGhiDe: '' }, cifCu: '00012345' });
ok(r.pn.nhanChot === '' && r.pn.phanLoai === 'Xanh', 'chốt trùng nhãn máy → bỏ ghi đè');

// Nạp nguồn số dư (PM)
ok(C('u_mn', 'nap-sodu', { ngayDuLieu: '2026-10-31', rows: [{ cif: '00012345' }] }).error === 'FORBIDDEN', 'chỉ PM nạp nguồn');
const nap = D('pm1', 'nap-sodu', { ngayDuLieu: '2026-10-31', loai: 'CRM', tep: 'gia_lap.xlsx', taoMoi: true, rows: [
  { cif: '00012345', duVay: 320000, duBL: 190000, duLC: 0, hangThauChi: 'BBB' },
  { cif: '00099999', tenKH: 'CTY GIA LAP MOI', dvkd: 'CN Mới', nganh: 'Sắt thép', dauMoi: 'u_mn2 + po1', duVay: 600000, duBL: 0, duLC: 5000, hangThauChi: 'CCC', binning: 'Amber' },
  { cif: '00088888', tenKH: 'CTY GIA LAP KHONG DAU MOI', duVay: 1000 },
] });
ok(nap.capNhat === 1 && nap.taoMoi === 2 && nap.khongKhop.length === 0, 'nạp: 1 cập nhật, 2 tạo mới');
let L = D('pm1', 'load');
const pA = L.pn.find(p => p.cif === '00012345');
ok(pA.duVay === 320000 && pA.hangThauChi === 'BBB' && pA.nguonSoDu === 'CRM 2026-10-31', 'số dư + hạng cập nhật theo CIF, ghi nguồn');
ok(pA.phanLoai === 'Vàng' && pA.lyDo === 'Ổn', 'nhãn tính lại sau nạp (BBB → Vàng), giữ trường đầu mối nhập');
const gMoi = L.nhom.find(n => n.tenNhom === 'CTY GIA LAP MOI');
ok(gMoi && gMoi.dauMoi === 'u_mn2' && gMoi.hoTro === 'po1', 'tạo nhóm từ danh mục: đầu mối + PO hỗ trợ tách từ "u_mn2 + po1"');
ok(L.pn.find(p => p.cif === '00099999').phanLoai === 'Đỏ', 'KH mới CCC → Đỏ ngay');
ok(L.ky.length === 1 && L.ky[0].capNhat === 1, 'ghi kỳ dữ liệu');
ok(env.db().table('SoDu').length === 3, 'lịch sử số dư theo kỳ');
// Khóa số hệ thống với đầu mối sau khi nạp
D('u_mn', 'save-pn', { pn: { ...pnA, duVay: 1, hangThauChi: 'AAA', lyDo: 'cập nhật' }, cifCu: '00012345' });
L = D('pm1', 'load');
ok(L.pn.find(p => p.cif === '00012345').duVay === 320000 && L.pn.find(p => p.cif === '00012345').hangThauChi === 'BBB', 'đầu mối không ghi đè số hệ thống đã nạp');
ok(L.pn.find(p => p.cif === '00012345').lyDo === 'cập nhật', '…nhưng vẫn sửa được trường rà soát');
ok(C('pm1', 'nap-sodu', { ngayDuLieu: '', rows: [{ cif: '1' }] }).error.includes('ngày dữ liệu'), 'nạp thiếu ngày dữ liệu bị chặn');
ok(D('pm1', 'nap-sodu', { ngayDuLieu: '2026-10-31', rows: [{ cif: 'X1' }] }).khongKhop[0] === 'X1', 'không bật tạo mới → báo CIF không khớp');

// Action Plan
ok(C('u_mn', 'save-action', { row: { maNhom: 'S5-001', maHD: 'A2', trangThai: 'Đang thực hiện', nguoiTN: 'u_mn', han: '2026-11-15' } }).error.includes('Thiếu'), 'action thiếu biện pháp bị chặn');
const a1r = C('u_mn', 'save-action', { row: { maNhom: 'S5-001', maHD: 'A2', bienPhap: 'Báo cáo dòng tiền hằng tháng', trangThai: 'Đang thực hiện', nguoiTN: 'u_mn', han: '2026-11-15', phanTram: 0.3 } });
const a1 = a1r.data.row;
ok(a1.id === 'HD-0001' && a1.hanhDong.includes('tăng cường giám sát') && a1.phanLoai === 'Đỏ' && a1.ptkd === 'u_mn', 'action: mã, tên hành động, nhãn nhóm, PTKD tự điền');
ok(a1.cif === '00012345', 'action: CIF = pháp nhân chính (nghĩa vụ lớn nhất)');
const a1b = D('u_mn', 'save-action', { row: { ...a1, trangThai: 'Hoàn thành', phanTram: '' } }).row;
ok(a1b.ngayXong && a1b.phanTram === 1, 'hoàn thành → tự điền ngày + 100%');
ok(C('u_mn', 'save-action', { row: { ...a1, phanTram: 2 } }).error.includes('0–100'), '% ngoài 0–100 bị chặn');
ok(C('u_mn2', 'save-action', { row: { ...a1, bienPhap: 'x' } }).error === 'FORBIDDEN', 'người ngoài không sửa action');
ok(C('bld1', 'delete-action', { id: 'HD-0001' }).error === 'FORBIDDEN', 'BLĐ không xóa');
// Theo dõi dữ liệu
const d1 = D('po1', 'save-dl', { row: { maNhom: 'S5-001', loai: 'BCTC/tài chính', trangThai: 'Chờ dữ liệu', donViSoHuu: 'ĐVKD' } }).row;
ok(d1.id === 'DL-0001' && d1.dauMoi === 'u_mn' && d1.ngayYC, 'yêu cầu dữ liệu: mã, đầu mối nhóm, ngày yêu cầu tự điền');

// Nạp file điều hành (Excel đợt 1 làm tay)
const im = D('pm1', 'import-dh', { tep: 'dieu_hanh.xlsx',
  nhom: [{ tenNhom: 'Nhóm Giả Lập Beta', dauMoi: 'U_MN2', mien: 'Bắc', uuTien: 'P2 - Cao', siteVisit: 'Có' }],
  pn: [{ tenNhom: 'Nhóm Giả Lập Beta', cif: '00055555', tenKH: 'CTY BETA', nganh: 'Than', duVay: 900000, od2: 'Tái diễn hoặc chưa khắc phục dứt điểm', dauMoi: 'u_mn2' },
       { tenNhom: 'Nhóm Giả Lập Alpha', cif: '00012345', lyDo: 'Từ Excel', duVay: 5, mien: 'Trung' }],
  actions: [{ tenNhom: 'Nhóm Giả Lập Beta', maHD: 'A3', bienPhap: 'Giảm hạn mức', han: '2026-12-01', trangThai: 'Chưa bắt đầu' },
           { tenNhom: 'Nhóm Giả Lập Beta', maHD: 'A3', bienPhap: 'Giảm hạn mức' }],
  dl: [{ tenNhom: 'Nhóm Giả Lập Beta', loai: 'CIC/lịch sử trả nợ', ngayYC: '2026-10-21', trangThai: 'Chờ dữ liệu' }] });
ok(im.nhomMoi === 1 && im.pnMoi === 1 && im.pnSua === 1 && im.action === 1 && im.dl === 1, 'import: 1 nhóm mới, 1+1 pháp nhân, action trùng bị gộp');
ok(im.boQua.some(x => x.includes('Trung')), 'import: giá trị ngoài droplist báo bỏ qua');
L = D('pm1', 'load');
const beta = L.nhom.find(n => n.tenNhom === 'Nhóm Giả Lập Beta');
ok(beta.dauMoi === 'u_mn2' && beta.siteVisit === 'Có', 'import nhóm: đầu mối chuẩn hóa + cột nhóm');
ok(L.pn.find(p => p.cif === '00055555').phanLoai === 'Đỏ', 'import pháp nhân: tính nhãn (OD2 tái diễn → Đỏ)');
ok(L.pn.find(p => p.cif === '00012345').duVay === 320000 && L.pn.find(p => p.cif === '00012345').lyDo === 'Từ Excel', 'import không đè số hệ thống đã nạp, có cập nhật trường rà soát');
ok(L.action.find(a => a.maNhom === beta.maNhom).phanLoai === 'Đỏ', 'import action: nhãn nhóm');

// Cấu hình ngưỡng
ok(C('u_mn', 'set-config', { updates: { RULES_JSON: '{}' } }).error === 'FORBIDDEN', 'chỉ PM sửa cấu hình');
ok(C('pm1', 'set-config', { updates: { RULES_JSON: '{sai' } }).error.includes('JSON'), 'RULES_JSON sai bị chặn');
ok(C('pm1', 'set-config', { updates: { NEXT_NHOM: 1 } }).error.includes('Không sửa'), 'không sửa bộ đếm');
D('pm1', 'set-config', { updates: { RULES_JSON: '{"tc4":[0.1,0.15]}' } });
r = D('u_mn', 'save-pn', { pn: { ...pnA, cif: '00067890', tenKH: 'CTY GIA LAP B', duVay: 50000, duBL: 0, duLC: 0, binning: 'Green', hangThauChi: 'AA' }, cifCu: '00067890' });
ok(r.pn.phanLoai === 'Vàng', 'ngưỡng đổi qua Config áp ngay ở server (TC4 20% > 15% → Đỏ 1 tiêu chí → Vàng)');
D('pm1', 'set-config', { updates: { RULES_JSON: '' } });

// Idempotency + nhật ký + xóa
const req = { action: 'save-dl', token: tok.u_mn, reqId: 'r-same', row: { maNhom: 'S5-001', loai: 'Khác', trangThai: 'Chờ dữ liệu', thongTin: 'lặp' } };
env.call(req); env.call(req);
ok(D('pm1', 'load').dl.filter(x => x.thongTin === 'lặp').length === 1, 'retry cùng reqId không ghi lặp');
ok(C('u_mn', 'log', { what: 'Xóa sạch', target: 'x' }).status === 'error' && C('u_mn', 'log', { what: 'In A4 nhóm', target: 'S5-001' }).status === 'ok', 'nhật ký xem/xuất chỉ nhận loại hợp lệ');
ok(C('u_mn', 'audit').error === 'FORBIDDEN' && D('pm1', 'audit').rows.length > 5, 'nhật ký chỉ PM xem');
ok(C('u_mn', 'delete-nhom', { maNhom: 'S5-001' }).error === 'FORBIDDEN', 'chỉ PM xóa nhóm');
D('pm1', 'delete-nhom', { maNhom: beta.maNhom });
L = D('pm1', 'load');
ok(!L.nhom.find(n => n.maNhom === beta.maNhom) && !L.pn.find(p => p.cif === '00055555') && !L.action.find(a => a.maNhom === beta.maNhom), 'xóa nhóm kéo theo pháp nhân/action');

// Guard
env.fileOf(env.props.DB_ID).access = 'ANYONE_WITH_LINK'; env.fileOf(env.props.DB_ID).viewers.push('la@x.com');
const g = env.ctx.guardDaily();
ok(g.removed.length === 2 && env.fileOf(env.props.DB_ID).access === 'PRIVATE', 'Guard gỡ link + viewer lạ');

console.log(`gas.test: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
