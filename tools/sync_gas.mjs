// Đồng bộ lõi dùng chung trình duyệt ↔ GAS (1 nguồn): core/schema.js → gas/Schema.gs · core/rules.js → gas/Rules.gs.
// Chạy: node tools/sync_gas.mjs   (các test gọi tự động; BẮT BUỘC trước mỗi clasp push)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
for (const [src, dst] of [['schema.js', 'Schema.gs'], ['rules.js', 'Rules.gs']]) {
  const out = '// ⚠ FILE SINH TỰ ĐỘNG từ core/' + src + ' (node tools/sync_gas.mjs) — KHÔNG sửa tay.\n' + fs.readFileSync(path.join(ROOT, 'core', src), 'utf8');
  const p = path.join(ROOT, 'gas', dst);
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== out) { fs.writeFileSync(p, out); console.log('→ gas/' + dst + ' cập nhật'); }
}
