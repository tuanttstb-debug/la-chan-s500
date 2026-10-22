'use strict';
/* Cấu hình FE — Lá chắn S-500. GAS URL công khai nhưng mọi action dữ liệu đều cần token (gas/Code.gs). */
window.S5 = window.S5 || {};
S5.CONFIG = {
  VERSION: 'v0.1.0 (2026-10-22)',
  GAS_URL: 'https://script.google.com/macros/s/CHUA_DEPLOY/exec',   // điền sau khi deploy GAS (clasp deploy)
  AUTH_KEY: 's500_auth_v1',       // phiên riêng S-500 (chỉ token + thông tin user — KHÔNG lưu dữ liệu KH trên máy)
  SHTD_AUTH_KEY: 'shtd_auth_v1',  // phiên SHTD cùng origin tuanttstb-debug.github.io → SSO
  TIMEOUT_MS: 30000,
  READ_TIMEOUT_MS: 90000,
};
