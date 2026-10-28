# TECH DEBT — Lá chắn S-500

- **TD-S500-05 (cao, 2026-10-28)** FE trượt WCAG AA + dark mode: `--text-3` #94A3B8 dùng cho chữ nội dung (2,56:1) · chữ trắng trên `--accent` cam (2,61) · `[data-theme=dark]` không đổi `--primary` → chữ tím 1,74 · stack font `'DM Sans', sans-serif, 'Segoe UI'` → thực tế Arial · nav-badge dùng accent thay danger · select lọc thiếu `aria-label` · không `:focus-visible`/reduced-motion. Chi tiết + cách sửa: `AIOS/08_Work/W-2610-s500-la-chan/ui-v2/PHUONG_AN_VA_KE_HOACH.md` §3 (Đợt 0, chờ anh duyệt sau UAT).

- **TD-S500-01 (cao)** Dữ liệu KH thật trên Sheets TK cá nhân — ngoại lệ AIOS DEC-20261022-01, gộp rà cùng TD-CN360-01 mỗi `/monthly`; chuyển hạ tầng nội bộ khi IT cấp.
- **TD-S500-02** Mỗi lần lưu tải lại toàn bộ dữ liệu (đơn giản, khớp server) — ổn với ~60 nhóm/300 pháp nhân; > 1.000 dòng cần tải theo phần.
- **TD-S500-03** Nhật ký "Xem nhóm" ghi mỗi lần mở trang nhóm (appendRow) — theo dõi độ dài sheet NhatKy.
- **TD-S500-04** Q7 Teamlead theo team đầu mối là giả định — đổi ở `canEditNhom_` + `store.canEdit` nếu chị Dung chốt theo ngành.
