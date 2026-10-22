# Lá chắn S-500

Web quản trị vận hành **chiến dịch Lá chắn S-500** (TT SP & GP Tín dụng — Khối NHDN, TPBank): rà soát nhóm KHDN có tổng nghĩa vụ (dư nợ + bảo lãnh + LC) từ ~500 tỷ — nhập liệu theo đúng file điều hành Excel, **máy tự dán nhãn Xanh/Vàng/Đỏ** theo 7 tiêu chí, theo dõi Action Plan A1–A4 và dữ liệu còn thiếu, **A4 cho Ban lãnh đạo** (tổng chiến dịch · từng nhóm KH · theo ĐVKD). Đăng nhập bằng tài khoản SHTD.

> Repo public chỉ chứa code + dữ liệu GIẢ. Dữ liệu thật nằm ở Google Sheets riêng tư của TK chủ (xem `CLAUDE.md` § Dữ liệu).

## Thư mục
| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Vỏ trang (CSP chỉ cho phép gọi GAS) |
| `core/schema.js` | Trường dữ liệu = cột template (Phan loai KH A–AL · TH TT nhom A–R · Action_Plan A–V · Theo_doi_du_lieu A–M) + danh mục chọn |
| `core/rules.js` | 7 tiêu chí × 2 bộ ngưỡng (xây lắp / ngành khác) + quy tắc nhãn tổng + nhãn nhóm |
| `assets/js/` | `store.js` (mô hình chiến dịch) · `kit.js` (nhãn, tiền, bộ lọc) · `xlsx_io.js` (đọc nguồn / file điều hành, xuất template) · `views/*` (màn hình) |
| `assets/css/` | `tokens.css` + `app.css` (khuôn SHTD) · `s500.css` (nhãn, one-pager, in A4) |
| `gas/` | Backend Apps Script: `Code.gs` (cửa vào) · `Service.gs` (nghiệp vụ + quyền) · `Auth.gs` (SSO SHTD) · `Db.gs` · `Guard.gs` · `Setup.gs` · `Schema.gs`/`Rules.gs` (sinh tự động) |
| `test/` | `rules.test.mjs` (ngưỡng biên) · `gas.test.mjs` (backend giả lập) · `e2e.mjs` (Chrome thật + backend thật trong giả lập) |
| `tools/sync_gas.mjs` | Chép `core/schema.js`, `core/rules.js` → `gas/` |

## Màn hình
Tổng quan (quản trị) · Việc của tôi · Danh mục nhóm KH → trang nhóm (one-pager, in PDF) → form pháp nhân (7 tiêu chí tính tức thì) · Action Plan · Theo dõi dữ liệu · A4 tổng · A4 theo ĐVKD · Nạp & xuất dữ liệu (PM) · Quy tắc phân loại · Nhật ký (PM).

## Cài đặt backend (1 lần, TK chủ)
1. `cd gas && clasp push`.
2. GAS editor → Project Settings → Script Properties: `AUTH_SECRET` = đúng giá trị của GAS SHTD.
3. Chạy `setupAll` (cấp quyền Sheets/Drive) → tạo `S500_DB` riêng tư + trigger Guard 7h.
4. `clasp deploy` (Web app: Execute as Me · Anyone) → dán URL vào `assets/js/config.js` `GAS_URL`.

## Test
```
node test/rules.test.mjs && node test/gas.test.mjs && node test/e2e.mjs [thư mục ảnh]
```
