# PROJECT OVERVIEW — Lá chắn S-500 (PRJ-S500)

## Một dòng
Web quản trị vận hành chiến dịch Lá chắn S-500 (anh Cường phát động 10/10/2026, 8 tuần): đầu mối PTKD/PO nhập 4 sheet file điều hành trên web, máy dán nhãn Xanh/Vàng/Đỏ theo 7 tiêu chí, PM nạp số dư CRM hằng tháng, BLĐ xem tổng quan + A4.

## Người
- Chủ yêu cầu + nghiệm thu: chị Nhung (NhungPTH7) · PM chiến dịch: chị Dung (DungNTP8) · duyệt bản BLĐ: anh Cường (CuongVM1) · build: anh Tuân (TuanTT4).
- Người dùng: PTKD/PO đầu mối toàn TT SPTD · Teamlead · PM · BLĐ (TT SPTD, anh Cường, BLĐ Khối — Q6).

## Kiến trúc
FE tĩnh (GitHub Pages, khuôn SHTD) ⇄ GAS Web App (Execute as Me) ⇄ Sheets `S500_DB` (TK chủ, riêng tư, Guard). Đăng nhập dùng chung SHTD `User_Master` + `AUTH_SECRET` (SSO cùng origin github.io). Lõi `core/schema.js` + `core/rules.js` chạy cả FE và GAS.

## Bảng DB
Nhom · PhapNhan · Action · YeuCauDL · SoDu (lịch sử số dư theo kỳ) · KyDuLieu · NhatKy · Config.

## Vai trò (Config PM / BLĐ + Role SHTD)
PM (Admin SHTD hoặc trong danh sách PM): mọi quyền + nạp nguồn + cấu hình · BLĐ: chỉ xem · Teamlead: sửa nhóm có đầu mối cùng team (Q7 tạm) · Đầu mối/PO hỗ trợ: sửa nhóm được giao.

## Quyết định (chi tiết AIOS TASK.md)
D01 anh build, chị Nhung chủ yêu cầu · D02 dữ liệu thật theo DEC-20261022-01 · D03 spoke mới, SSO SHTD · D04 máy gợi ý + đầu mối ghi đè có lý do · D05 MVP 30/10 · D06 vai trò riêng S-500, PM nạp file theo kỳ · D07 3 loại A4 · D08 "Word A4 từng KH" = màn chi tiết + in PDF, giao diện ưu tiên số 1 · D09 được tạo repo/GAS · Q1–Q10 chị Dung trả lời 22/10.
