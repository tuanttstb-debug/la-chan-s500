# TECH DEBT — Lá chắn S-500

- **TD-S500-01 (cao)** Dữ liệu KH thật trên Sheets TK cá nhân — ngoại lệ AIOS DEC-20261022-01, gộp rà cùng TD-CN360-01 mỗi `/monthly`; chuyển hạ tầng nội bộ khi IT cấp.
- **TD-S500-02** Mỗi lần lưu tải lại toàn bộ dữ liệu (đơn giản, khớp server) — ổn với ~60 nhóm/300 pháp nhân; > 1.000 dòng cần tải theo phần.
- **TD-S500-03** Nhật ký "Xem nhóm" ghi mỗi lần mở trang nhóm (appendRow) — theo dõi độ dài sheet NhatKy.
- **TD-S500-04** Q7 Teamlead theo team đầu mối là giả định — đổi ở `canEditNhom_` + `store.canEdit` nếu chị Dung chốt theo ngành.
