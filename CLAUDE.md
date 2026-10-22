# CLAUDE.md — Lá chắn S-500

Repo này theo chuẩn **AI OS Registry (Hub-and-Spoke)**. Tri thức dự án sống ở `AI_CONTEXT/`; danh mục trung tâm ở repo **AIOS** (`D:\Workspace\AIOS`). ID dự án: **PRJ-S500** · thẻ việc gốc: `AIOS/08_Work/W-2610-s500-la-chan/TASK.md`.

## Bắt đầu mỗi phiên (BẮT BUỘC)
1. `git pull`.
2. Đọc: `AI_CONTEXT/PROJECT_OVERVIEW.md` → `PROJECT_STATE.md` → `TODO_NEXT.md` → `SESSION_HANDOVER.md` (delta mới nhất trên cùng) → `TECH_DEBT.md`.
   Yêu cầu nghiệp vụ + phương án: `AIOS/08_Work/W-2610-s500-la-chan/YEU_CAU_VA_PHAN_TICH.md` (D01–D10 ở TASK.md).
3. **Không quét toàn repo** — bảng thư mục ở `README.md`.

## Quy tắc làm việc
- **Gate trước push / clasp push:** `node test/rules.test.mjs` + `node test/gas.test.mjs` + `node test/e2e.mjs` pass 100%.
- **Một nguồn:** `core/schema.js` (trường = cột template Excel) và `core/rules.js` (7 tiêu chí + quy tắc nhãn) dùng chung trình duyệt + GAS → `node tools/sync_gas.mjs` sinh `gas/Schema.gs`, `gas/Rules.gs` (KHÔNG sửa tay 2 file .gs này).
- Quy tắc nhãn do **PM chiến dịch (chị Dung)** chốt — đổi ngưỡng qua Config `RULES_JSON` (trang Quy tắc), đổi logic phải hỏi anh Tuân + cập nhật `test/rules.test.mjs`.
- **Quyền kiểm ở server** (`gas/Service.gs` `canEditNhom_`/`mustPM_`), FE chỉ ẩn/hiện. Bộ lọc người = chuẩn **Team + Nhân sự** (`assets/js/people-filter.js`, luật AIOS `02_Rules/ui-filter-standard.md`).
- Giao diện là ưu tiên số 1 (D08): theme SÁNG mặc định, in A4 bằng CSS `@media print` — sửa màn nào chụp lại ảnh E2E (`node test/e2e.mjs <thư mục ảnh>`) để soát.
- Kết thúc phiên: delta `SESSION_HANDOVER.md` 6 trường; cập nhật STATE/TODO/TECH_DEBT nếu đổi.

## Dữ liệu (đọc kỹ — ngoại lệ data-boundary AIOS DEC-20261022-01)
- Hệ thống **lưu dữ liệu khách hàng thật** (tên, CIF, nghĩa vụ, nhãn rủi ro) trên Sheets `S500_DB` của TK chủ — ngoại lệ có chủ đích theo khuôn CN360 (9 biện pháp). Không nới biện pháp nào khi chưa hỏi anh.
- **Repo GitHub public, CHỈ CODE:** không commit xlsx/pdf/msg/dữ liệu (`.gitignore`); test chỉ dùng dữ liệu GIẢ ("CTY GIA LAP …"); không chép tệp ở `D:\Công việc\Inbox\S500\` vào repo.
- FE không lưu dữ liệu KH vào localStorage/IndexedDB (chỉ phiên + tùy chọn giao diện). Tệp Excel đọc tại máy, chỉ gửi các cột cần.
- Chỉ TK chủ mở file DB: `Guard.gs` gỡ chia sẻ khi setup + 7h hằng ngày. Nhật ký xem/xuất bắt buộc (`apiLog_`).
- Hồ sơ rà soát (pháp lý, BCTC, CIC, sao kê) **không** tải lên — chỉ lưu đường dẫn ổ chung.

## Định danh registry
- AIOS: `04_Knowledge/projects/PRJ-S500.md` · `00_System/PORTFOLIO.md` · `08_Work/W-2610-s500-la-chan/`.
- Khuôn kỹ thuật chép từ `customer-network-360` (Auth/Db/Guard/harness) + `ai-usecase-platform` (people-filter).
