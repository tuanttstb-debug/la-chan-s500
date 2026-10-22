/* schema.js — MỘT NGUỒN cho trường dữ liệu Lá chắn S-500 (trình duyệt + GAS qua tools/sync_gas.mjs).
 * Bám đúng file "File_dieu_hanh_chien_dich_La_Chan_S500.xlsx" (PM chị Dung, bản 21/10/2026):
 *   Phan loai KH (A–AL) · TH TT nhom (A–R) · Action_Plan (A–V) · Theo_doi_du_lieu (A–M).
 * Mỗi trường: k = khóa nội bộ · db = tên cột trong S500_DB (duy nhất) · x = cột Excel template · t = tiêu đề Excel (giữ nguyên chữ)
 *   type: text | long | num (triệu đồng) | pct (lưu số thập phân, nhập theo %) | date | sel (opt = tên danh mục) | user | calc | sys
 *   sys = số hệ thống (nạp từ nguồn CRM/mô hình — khóa với đầu mối khi đã có nguồn) · calc = máy tính, không nhập.
 *   g = nhóm hiển thị trên form · req = bắt buộc để tính "đủ dữ liệu".
 * Trường KHÔNG có trong template (ghi rõ "bổ sung"): mã nhóm, PO hỗ trợ, nguồn trả nợ, phương án tiếp theo, nhãn chốt/lý do ghi đè. */
var S5S = (function () {
  var LISTS = {
    MIEN: ['Bắc', 'Nam'],
    OD2: ['Không', 'Có nhưng đã khắc phục, không tái diễn', 'Tái diễn hoặc chưa khắc phục dứt điểm'],
    BINNING: ['Green', 'Amber', 'Red'],
    NHAN: ['Xanh', 'Vàng', 'Đỏ', 'Chưa đủ dữ liệu', 'Chưa đánh giá'],
    MA_HD: ['A1', 'A2', 'A3', 'A4'],
    HANH_DONG: {
      A1: 'Tiếp tục sử dụng hạn mức được duyệt',
      A2: 'Duy trì nghĩa vụ tín dụng hiện tại và tăng cường giám sát',
      A3: 'Thu hẹp dần quy mô cấp tín dụng hiện tại',
      A4: 'Thoái lui và thu hồi dư nợ trong thời gian sớm nhất',
    },
    TIEN_DO: ['Chưa bắt đầu', 'Đang thực hiện', 'Chờ dữ liệu', 'Chờ phê duyệt', 'Hoàn thành', 'Quá hạn', 'Tạm dừng'],
    CO_KHONG: ['Có', 'Không', 'Chưa xác định'],
    TT_DU_LIEU: ['Đủ', 'Thiếu một phần', 'Chưa đủ', 'Đang xác minh'],
    UU_TIEN: ['P1 - Khẩn cấp', 'P2 - Cao', 'P3 - Bình thường'],
    LOAI_DL: ['Dư nợ cho vay', 'LC', 'Trái phiếu', 'Bảo lãnh', 'Ngoại bảng khác', 'Hạn mức chưa giải ngân', 'CIC/lịch sử trả nợ', 'BCTC/tài chính',
      'Dòng tiền/tài khoản', 'TSBĐ/pháp lý/định giá', 'Công nợ/tồn kho', 'Đáo hạn 12 tháng', 'Thông tin thị trường/pháp lý', 'Khác'],
    MUC_AH: ['Trọng yếu', 'Cao', 'Trung bình', 'Thấp'],
    // Ngành chuẩn — Drop list file điều hành (theo file team Tú)
    NGANH: ['Bất động sản', 'Bưu chính', 'Cà phê', 'Cao su', 'Cây trồng, lâm nghiệp khác', 'Chăn nuôi', 'Chưa phân loại', 'Cơ khí', 'Cơ sở hạ tầng', 'Cơ sở y tế',
      'Công ích/Phi chính phủ', 'Công nghệ thông tin', 'Da giày', 'Dệt may', 'Điện', 'Điện tử, điện lạnh', 'Điều', 'Đồ uống', 'Gạo', 'Giáo dục', 'Giấy và In ấn', 'Gỗ',
      'Hàng tiêu dùng, đồ gia dụng, thiết bị văn phòng', 'Hồ Tiêu', 'Hóa chất, Phân bón', 'Hoạt động dịch vụ tài chính', 'Khai khoáng', 'Khai thác, sản xuất Dầu khí',
      'Kinh doanh Dầu khí', 'Logistics và dịch vụ hỗ trợ', 'Lương thực thực phẩm', 'Lưu trú, ăn uống', 'Máy công trình', 'Năng lượng tái tạo', 'Nhựa', 'Nước', 'Ô tô',
      'Phát thanh, Truyền hình', 'Phương tiện/Vận tải (Ngoài ô tô) Đường bộ', 'Phương tiện/Vận tải Đường sắt và Hàng không', 'Sắt thép', 'Than', 'Thiết bị y tế', 'Thông tin',
      'Thức ăn chăn nuôi', 'Thủy hải sản', 'Tư vấn, cho thuê, thiết kế, khoa học công nghệ', 'Vận tải biển', 'Vật liệu xây dựng', 'Viễn thông', 'Vui chơi giải trí',
      'Xây lắp', 'Xây lắp Mass', 'Xi măng', 'Y tế', 'Khác'],
  };

  // ── Phân loại KH: 1 dòng = 1 pháp nhân (khóa CIF) ──
  var PN = [
    { k: 'mien', db: 'Miền', x: 'A', t: 'Miền (Bắc/ Nam)', type: 'sel', opt: 'MIEN', g: 'Định danh', req: 1 },
    { k: 'maNhom', db: 'Mã nhóm', x: 'B', t: 'Tên nhóm KH (do đầu mối nhóm đặt thống nhất', type: 'nhom', g: 'Định danh', req: 1 },
    { k: 'quanHe', db: 'Quan hệ trong nhóm', x: 'C', t: 'Mối quan hệ với nhóm liên quan (Công ty con/ công ty liên kết/ mối quan hệ với cá nhân chủ sở hữu …)', type: 'text', g: 'Định danh', ph: 'Pháp nhân chính / Công ty con / Công ty liên kết / Cùng chủ sở hữu…' },
    { k: 'tenKH', db: 'Tên KH', x: 'D', t: 'Tên KH', type: 'text', g: 'Định danh', req: 1 },
    { k: 'cif', db: 'CIF', x: 'E', t: 'Mã CIF', type: 'text', g: 'Định danh', req: 1, key: 1 },
    { k: 'dvkd', db: 'ĐVKD', x: 'F', t: 'Tên ĐVKD', type: 'text', g: 'Định danh', req: 1 },
    { k: 'dauMoi', db: 'Đầu mối', x: 'G', t: 'PTKD/ PO đầu mối', type: 'user', g: 'Định danh', req: 1 },
    { k: 'ngayRaSoat', db: 'Ngày rà soát', x: 'H', t: 'Ngày rà soát', type: 'date', g: 'Định danh', req: 1 },
    { k: 'hmTong', db: 'HM tổng', x: 'I', t: 'HM đang còn hiệu lực', type: 'calc', g: 'QHTD tại TPB', sub: 'Tổng nghĩa vụ' },
    { k: 'duTong', db: 'Dư nghĩa vụ tổng', x: 'J', t: 'Dư nghĩa vụ', type: 'calc', g: 'QHTD tại TPB', sub: 'Tổng nghĩa vụ' },
    { k: 'hmVay', db: 'HM vay', x: 'K', t: 'HM đang còn hiệu lực', type: 'num', g: 'QHTD tại TPB', sub: 'Dư nợ' },
    { k: 'duVay', db: 'Dư nợ vay', x: 'L', t: 'Dư nghĩa vụ', type: 'sys', g: 'QHTD tại TPB', sub: 'Dư nợ', req: 1 },
    { k: 'hmBL', db: 'HM BL', x: 'M', t: 'HM đang còn hiệu lực', type: 'num', g: 'QHTD tại TPB', sub: 'Dư bảo lãnh' },
    { k: 'duBL', db: 'Dư BL', x: 'N', t: 'Dư nghĩa vụ', type: 'sys', g: 'QHTD tại TPB', sub: 'Dư bảo lãnh', req: 1 },
    { k: 'hmLC', db: 'HM LC', x: 'O', t: 'HM đang còn hiệu lực', type: 'num', g: 'QHTD tại TPB', sub: 'Dư cam kết LC' },
    { k: 'duLC', db: 'Dư LC', x: 'P', t: 'Dư nghĩa vụ', type: 'sys', g: 'QHTD tại TPB', sub: 'Dư cam kết LC', req: 1 },
    { k: 'tsbd', db: 'TSBĐ chuẩn', x: 'Q', t: 'Tổng giá trị TSBĐ chuẩn ', type: 'num', g: 'QHTD tại TPB', req: 1 },
    { k: 'tyLeTsbd', db: 'TSBĐ/Tổng NV', x: 'R', t: 'Tỷ trọng Tổng giá trị TSBĐ chuẩn/ Tổng nghĩa vụ', type: 'calc', fmt: 'pct', g: 'QHTD tại TPB' },
    { k: 'linhVuc', db: 'Lĩnh vực hoạt động', x: 'S', t: 'Lĩnh vực hoạt động (nêu ngắn gọn HĐKD của KH)', type: 'long', g: 'Hoạt động kinh doanh' },
    { k: 'nganh', db: 'Ngành', x: 'T', t: 'Ngành (Nếu KH hoạt động đa lĩnh vực chọn theo tỷ trọng đóng góp DT lớn nhất)', type: 'sel', opt: 'NGANH', g: 'Hoạt động kinh doanh', req: 1 },
    { k: 'nganhKhac', db: 'Ngành khác', x: 'U', t: 'Trường hợp ngành khác ghi rõ ở đây', type: 'text', g: 'Hoạt động kinh doanh' },
    { k: 'dtVat12', db: 'DT VAT 12T', x: 'V', t: 'Doanh thu VAT 12 tháng gần nhất', type: 'num', g: 'Dữ liệu tài chính', req: 1 },
    { k: 'nnhCic', db: 'Nợ NH CIC', x: 'W', t: 'Tổng nợ ngắn hạn tại các TCTD theo CIC không quá 30 ngày so với ngày rà soát', type: 'num', g: 'Dữ liệu tài chính', req: 1 },
    { k: 'tyLeNnh', db: 'NNH/DT 12T', x: 'X', t: 'Tỷ lệ NNH/ DT 12T', type: 'calc', fmt: 'pct', g: 'Dữ liệu tài chính', tc: 1 },
    { k: 'bienDongDT', db: 'Biến động DT', x: 'Y', t: 'Biến động tổng DT VAT đến quý gần nhất so với cùng kỳ năm trước', type: 'pct', g: 'Dữ liệu tài chính', req: 1, tc: 7, signed: 1 },
    { k: 'dsGiaiNgan', db: 'DS giải ngân', x: 'Z', t: 'Doanh số giải ngân của KH tại TPB ', type: 'num', g: 'Dòng tiền (từ 01/01/2026)', req: 1 },
    { k: 'dtTrucTiep', db: 'DT trực tiếp', x: 'AA', t: 'Doanh thu trực tiếp (chỉ lấy các giao dịch từ đối tác, không bao gồm điều chuyển/ bên liên quan) về tài khoản TPB', type: 'num', g: 'Dòng tiền (từ 01/01/2026)', req: 1 },
    { k: 'tyLeDtTT', db: 'DT trực tiếp/DS GN', x: 'AB', t: 'Tỷ trọng DT trực tiếp/ DS giải ngân', type: 'calc', fmt: 'pct', g: 'Dòng tiền (từ 01/01/2026)', tc: 2 },
    { k: 'od2', db: 'OD2 12T', x: 'AC', t: 'KH từng phát sinh OD2 trở lên trong 12 T gần nhất ', type: 'sel', opt: 'OD2', g: 'QHTD tại các TCTD (CIC ≤ 30 ngày)', req: 1, tc: 3 },
    { k: 'tyTrongDuNo', db: 'Dư nợ TPB/CIC', x: 'AD', t: 'Tỷ trọng dư nợ của TPBank trên tổng dư nợ CIC', type: 'pct', g: 'QHTD tại các TCTD (CIC ≤ 30 ngày)', req: 1, tc: 4 },
    { k: 'tyTrongTsbd', db: 'TSBĐ TPB/CIC', x: 'AE', t: 'Tỷ trọng giá trị TSBĐ chuẩn đăng ký tại TPBank trên tổng TSBĐ chuẩn của khách hàng tại các TCTD theo CIC', type: 'pct', g: 'QHTD tại các TCTD (CIC ≤ 30 ngày)', req: 1 },
    { k: 'tuongXung', db: 'Tỷ lệ tương xứng', x: 'AF', t: 'Tỷ lệ tương xứng = Tỷ trọng dư nợ TPBank / Tỷ trọng TSBĐ TPBank', type: 'calc', fmt: 'x', g: 'QHTD tại các TCTD (CIC ≤ 30 ngày)', tc: 5 },
    { k: 'hangThauChi', db: 'Hạng thấu chi', x: 'AG', t: 'XEP HANG THEO MO HINH THAU CHI', type: 'sys', fmt: 'text', g: 'Xếp hạng mô hình', req: 1, tc: 6 },
    { k: 'binning', db: 'Binning', x: 'AH', t: 'XEP HANG MO HINH BIẾN BINING', type: 'sys', fmt: 'text', opt: 'BINNING', g: 'Xếp hạng mô hình', req: 1, tc: 6 },
    { k: 'phanLoai', db: 'Phân loại', x: 'AI', t: 'Phân loại Xanh/Vàng/Đỏ', type: 'calc', fmt: 'nhan', g: 'Kết luận' },
    { k: 'lyDo', db: 'Lý do & 3 rủi ro', x: 'AJ', t: 'Lý do phân loại & 3 rủi ro chính', type: 'long', g: 'Kết luận', req: 1 },
    { k: 'ngayCapNhat', db: 'Ngày cập nhật', x: 'AK', t: 'Ngày cập nhật', type: 'calc', fmt: 'date', g: 'Kết luận' },
    { k: 'ghiChu', db: 'Ghi chú', x: 'AL', t: 'Ghi chú/điểm cần xác minh', type: 'long', g: 'Kết luận' },
    // bổ sung (ngoài template)
    { k: 'nhanMay', db: 'Nhãn máy', type: 'calc', fmt: 'nhan', g: 'Kết luận', extra: 1 },
    { k: 'nhanChot', db: 'Nhãn chốt (ghi đè)', type: 'sel', opt: 'NHAN', g: 'Kết luận', extra: 1 },
    { k: 'lyDoGhiDe', db: 'Lý do ghi đè', type: 'long', g: 'Kết luận', extra: 1 },
    { k: 'nguonSoDu', db: 'Nguồn số dư', type: 'calc', g: 'QHTD tại TPB', extra: 1 },
    { k: 'nguoiSua', db: 'Người sửa', type: 'calc', extra: 1 },
  ];

  // ── TH TT nhom: 1 dòng = 1 nhóm KH (tổng hợp TỰ ĐỘNG từ pháp nhân + các cột riêng của nhóm) ──
  var NHOM = [
    { k: 'maNhom', db: 'Mã nhóm', t: 'Mã nhóm KH', type: 'calc', extra: 1, key: 1 },
    { k: 'mien', db: 'Miền', x: 'A', t: 'Miền (Bắc/ Nam)', type: 'sel', opt: 'MIEN' },
    { k: 'tenNhom', db: 'Tên nhóm', x: 'B', t: 'Tên nhóm KH (do đầu mối nhóm đặt thống nhất', type: 'text', req: 1 },
    { k: 'phapNhanChinh', db: 'Pháp nhân chính', x: 'C', t: 'Pháp nhân chính', type: 'calc' },
    { k: 'cifChinh', db: 'CIF chính', x: 'D', t: 'CIF', type: 'calc' },
    { k: 'dauMoi', db: 'Đầu mối', x: 'E', t: 'PTKD/ PO đầu mối', type: 'user', req: 1 },
    { k: 'cbo', db: 'CBO đầu mối', x: 'F', t: 'CBO đầu mối', type: 'text' },
    { k: 'tongNV', db: 'Tổng nghĩa vụ', x: 'G', t: 'Tổng nghĩa vụ', type: 'calc', fmt: 'num' },
    { k: 'duNo', db: 'Dư nợ', x: 'H', t: 'Dư nợ', type: 'calc', fmt: 'num' },
    { k: 'bl', db: 'BL', x: 'I', t: 'BL', type: 'calc', fmt: 'num' },
    { k: 'lc', db: 'LC', x: 'J', t: 'LC', type: 'calc', fmt: 'num' },
    { k: 'ngayDuLieu', db: 'Ngày dữ liệu', x: 'K', t: 'Ngày dữ liệu', type: 'calc', fmt: 'date' },
    { k: 'ttDuLieu', db: 'Trạng thái dữ liệu', x: 'L', t: 'Trạng thái dữ liệu tổng thể', type: 'sel', opt: 'TT_DU_LIEU' },
    { k: 'phanLoai', db: 'Phân loại nhóm', x: 'M', t: 'Phân loại nhóm KH', type: 'calc', fmt: 'nhan' },
    { k: 'uuTien', db: 'Ưu tiên deep dive', x: 'N', t: 'Ưu tiên deep dive', type: 'sel', opt: 'UU_TIEN' },
    { k: 'siteVisit', db: 'Site visit', x: 'O', t: 'Site visit?', type: 'sel', opt: 'CO_KHONG' },
    { k: 'tienDo', db: 'Tiến độ', x: 'P', t: 'Tiến độ tổng thể', type: 'sel', opt: 'TIEN_DO' },
    { k: 'vanDeBLD', db: 'Vấn đề cần BLĐ', x: 'Q', t: 'Vấn đề cần BLĐ quyết định', type: 'long' },
    { k: 'ghiChu', db: 'Ghi chú', x: 'R', t: 'Ghi chú', type: 'long' },
    // bổ sung
    { k: 'hoTro', db: 'PO hỗ trợ', t: 'PO/ nhân sự hỗ trợ', type: 'users', extra: 1 },
    { k: 'nguonTraNo', db: 'Nguồn trả nợ', t: 'Nguồn trả nợ (đã kiểm chứng / chưa)', type: 'long', extra: 1 },
    { k: 'phuongAn', db: 'Phương án tiếp theo', t: 'Phương án dự kiến tiếp theo', type: 'long', extra: 1 },
    { k: 'nguoiSua', db: 'Người sửa', type: 'calc', extra: 1 },
    { k: 'ngaySua', db: 'Ngày sửa', type: 'calc', extra: 1 },
  ];

  var ACTION = [
    { k: 'id', db: 'ID', t: 'ID', type: 'calc', extra: 1, key: 1 },
    { k: 'maHD', db: 'Mã hành động', x: 'A', t: 'Mã hành động', type: 'sel', opt: 'MA_HD', req: 1 },
    { k: 'hanhDong', db: 'Hành động quản trị', x: 'B', t: 'Hành động quản trị', type: 'calc' },
    { k: 'maNhom', db: 'Mã nhóm', x: 'C', t: 'Mã nhóm KH', type: 'nhom', req: 1 },
    { k: 'tenNhom', db: 'Tên nhóm/KH', x: 'D', t: 'Tên nhóm KH/ Tên KH', type: 'calc' },
    { k: 'cif', db: 'CIF', x: 'E', t: 'CIF KH/ CiF pháp nhân chính của nhóm', type: 'text' },
    { k: 'ptkd', db: 'PTKD', x: 'F', t: 'PTKD ', type: 'calc' },
    { k: 'phanLoai', db: 'Phân loại', x: 'G', t: 'Phân loại', type: 'calc', fmt: 'nhan' },
    { k: 'ngayBatDau', db: 'Ngày bắt đầu đề xuất', x: 'H', t: 'Ngày bắt đầu đề xuất hành động', type: 'date' },
    { k: 'bienPhap', db: 'Biện pháp', x: 'I', t: 'Hành động/biện pháp đề xuất', type: 'long', req: 1 },
    { k: 'mucTieu', db: 'Mục tiêu', x: 'J', t: 'Mục tiêu/kết quả cần đạt', type: 'long' },
    { k: 'chuTri', db: 'Đơn vị chủ trì', x: 'K', t: 'Đơn vị chủ trì', type: 'text' },
    { k: 'nguoiTN', db: 'Người chịu trách nhiệm', x: 'L', t: 'Người chịu trách nhiệm', type: 'text', req: 1 },
    { k: 'phoiHop', db: 'Đơn vị phối hợp', x: 'M', t: 'Đơn vị phối hợp', type: 'text' },
    { k: 'ngayGiao', db: 'Ngày giao', x: 'N', t: 'Ngày giao', type: 'date' },
    { k: 'han', db: 'Hạn hoàn thành', x: 'O', t: 'Hạn hoàn thành', type: 'date', req: 1 },
    { k: 'trangThai', db: 'Trạng thái', x: 'P', t: 'Trạng thái', type: 'sel', opt: 'TIEN_DO', req: 1 },
    { k: 'phanTram', db: '% hoàn thành', x: 'Q', t: '% hoàn thành', type: 'pct' },
    { k: 'ngayXong', db: 'Ngày hoàn thành', x: 'R', t: 'Ngày hoàn thành', type: 'date' },
    { k: 'bangChung', db: 'Bằng chứng', x: 'S', t: 'Bằng chứng/đường dẫn hồ sơ', type: 'text' },
    { k: 'vuongMac', db: 'Vướng mắc', x: 'T', t: 'Vướng mắc/đề xuất', type: 'long' },
    { k: 'capDuyet', db: 'Cấp phê duyệt', x: 'U', t: 'Cấp phê duyệt', type: 'text' },
    { k: 'ngayCapNhat', db: 'Ngày cập nhật', x: 'V', t: 'Ngày cập nhật', type: 'calc', fmt: 'date' },
    { k: 'nguoiSua', db: 'Người sửa', type: 'calc', extra: 1 },
  ];

  var DATAREQ = [
    { k: 'id', db: 'ID', t: 'ID', type: 'calc', extra: 1, key: 1 },
    { k: 'maNhom', db: 'Mã nhóm', x: 'A', t: 'Tên nhóm KH', type: 'nhom', req: 1 },
    { k: 'dauMoi', db: 'Đầu mối SPTD', x: 'B', t: 'Đầu mối của TT SPTD', type: 'user' },
    { k: 'loai', db: 'Loại dữ liệu', x: 'C', t: 'Loại dữ liệu cần bổ sung', type: 'sel', opt: 'LOAI_DL', req: 1 },
    { k: 'donViSoHuu', db: 'Đơn vị sở hữu', x: 'D', t: 'Đơn vị sở hữu dữ liệu', type: 'text' },
    { k: 'dauMoiCC', db: 'Đầu mối cung cấp', x: 'E', t: 'Đầu mối cung cấp', type: 'text' },
    { k: 'ngayYC', db: 'Ngày yêu cầu', x: 'F', t: 'Ngày yêu cầu', type: 'date' },
    { k: 'han', db: 'Hạn cung cấp', x: 'G', t: 'Hạn cung cấp', type: 'date' },
    { k: 'ngayNhan', db: 'Ngày nhận', x: 'H', t: 'Ngày nhận', type: 'date' },
    { k: 'trangThai', db: 'Trạng thái', x: 'I', t: 'Trạng thái', type: 'sel', opt: 'TIEN_DO', req: 1 },
    { k: 'mucAH', db: 'Mức ảnh hưởng', x: 'J', t: 'Mức độ ảnh hưởng nếu thiếu', type: 'sel', opt: 'MUC_AH' },
    { k: 'thongTin', db: 'Thông tin đã nhận/thiếu', x: 'K', t: 'Thông tin đã nhận/thiếu', type: 'long' },
    { k: 'nguon', db: 'Nguồn/bằng chứng', x: 'L', t: 'Nguồn/bằng chứng', type: 'text' },
    { k: 'ngayCapNhat', db: 'Ngày cập nhật', x: 'M', t: 'Ngày cập nhật', type: 'calc', fmt: 'date' },
    { k: 'nguoiSua', db: 'Người sửa', type: 'calc', extra: 1 },
  ];

  // Lịch sử số dư theo kỳ nạp (CIF × kỳ) — để so biến động giữa các kỳ
  var SODU = [
    { k: 'ky', db: 'Kỳ' }, { k: 'cif', db: 'CIF' }, { k: 'duVay', db: 'Dư nợ vay', type: 'num' }, { k: 'duBL', db: 'Dư BL', type: 'num' }, { k: 'duLC', db: 'Dư LC', type: 'num' },
    { k: 'hangThauChi', db: 'Hạng thấu chi' }, { k: 'binning', db: 'Binning' }, { k: 'nhomNo', db: 'Nhóm nợ TPB' }, { k: 'nhomNoCic', db: 'Nhóm nợ CIC' },
  ];
  var KY = [
    { k: 'ky', db: 'Kỳ' }, { k: 'ngayDuLieu', db: 'Ngày dữ liệu' }, { k: 'loai', db: 'Loại nguồn' }, { k: 'tep', db: 'Tệp' }, { k: 'soDong', db: 'Số dòng', type: 'num' },
    { k: 'capNhat', db: 'Số CIF cập nhật', type: 'num' }, { k: 'taoMoi', db: 'Số CIF tạo mới', type: 'num' }, { k: 'khongKhop', db: 'Không khớp', type: 'num' }, { k: 'nguoi', db: 'Người nạp' }, { k: 'luc', db: 'Lúc' },
  ];

  var TABLES = { PhapNhan: PN, Nhom: NHOM, Action: ACTION, YeuCauDL: DATAREQ, SoDu: SODU, KyDuLieu: KY };
  function dbHeaders(name) { return TABLES[name].filter(function (f) { return f.db; }).map(function (f) { return f.db; }); }
  function byKey(name) { var m = {}; TABLES[name].forEach(function (f) { m[f.k] = f; }); return m; }
  /** Dòng DB {db header: value} → object khóa nội bộ */
  function fromDb(name, row) { var o = {}; TABLES[name].forEach(function (f) { if (f.db) o[f.k] = row[f.db] === undefined ? '' : row[f.db]; }); return o; }
  function toDb(name, o) { var r = {}; TABLES[name].forEach(function (f) { if (f.db) r[f.db] = o[f.k] === undefined || o[f.k] === null ? '' : o[f.k]; }); return r; }
  /** Trường đầu mối được nhập (không calc, không sys) */
  function editable(name) { return TABLES[name].filter(function (f) { return f.type !== 'calc'; }).map(function (f) { return f.k; }); }

  return { LISTS: LISTS, PN: PN, NHOM: NHOM, ACTION: ACTION, DATAREQ: DATAREQ, SODU: SODU, KY: KY, TABLES: TABLES,
    dbHeaders: dbHeaders, byKey: byKey, fromDb: fromDb, toDb: toDb, editable: editable };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = S5S;
