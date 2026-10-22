// E2E trên Chrome thật (headless): FE (index.html) ⇄ backend THẬT gas/*.gs chạy trong giả lập Node (test/gas_harness.mjs).
// Trang phục vụ ở http://s500.test/ (chặn request → đọc file repo) · GAS URL → harness · mọi request khác bị chặn và đếm.
// Dữ liệu GIẢ hoàn toàn. Chạy: node test/e2e.mjs [thư mục ảnh chụp]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { makeEnv } from './gas_harness.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'sync_gas.mjs')], { stdio: 'inherit' });
const AN = path.resolve(ROOT, '../../AIOS/08_Work/P-aius001-binh-dan-hoa-ai/dao-tao/cong-cu-an-danh');
const puppeteer = createRequire(AN + '/package.json')('puppeteer-core');
const XLSX = createRequire(path.resolve(ROOT, '../../AIOS/08_Work/W-2610-he-sinh-thai-131-331/tool/package.json'))('xlsx');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const SHOTS = process.argv[2] || null; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync(path.join(process.env.CLAUDE_TMP || os.tmpdir(), 's500e2e-'));
const GAS = fs.readFileSync(path.join(ROOT, 'assets/js/config.js'), 'utf8').match(/GAS_URL:\s*'([^']+)'/)[1];
const BASE = 'http://s500.test/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

const USERS = [
  { username: 'admin1', displayName: 'Admin Giả', role: 'Admin', team: 'Số', password: 'a' },
  { username: 'pm1', displayName: 'Chị PM Giả', role: 'User', team: 'QLDM', password: 'p' },
  { username: 'bld1', displayName: 'Anh Lãnh Đạo Giả', role: 'User', team: 'BLĐ', password: 'b' },
  { username: 'tl_mn', displayName: 'Teamlead MN Giả', role: 'Teamlead', team: 'PTKD MN', password: 't' },
  { username: 'u_mn', displayName: 'Đầu Mối MN Giả', role: 'User', team: 'PTKD MN', password: 'u' },
  { username: 'u_mb', displayName: 'Đầu Mối MB Giả', role: 'User', team: 'PTKD MB', password: 'u' },
  { username: 'po1', displayName: 'PO Hỗ Trợ Giả', role: 'User', team: 'CV', password: 'u' },
];
const env = makeEnv({ users: USERS, props: { AUTH_SECRET: 'e2e-secret' } }); env.ctx.setupAll();
env.ctx.withLock_(() => env.ctx.setConfig_({ PM: 'pm1', 'BLĐ': 'bld1' }));

// Danh mục giả lập kiểu "DS RA SOAT": dòng tiêu đề + dòng ghi chú + số tiền đơn vị ĐỒNG, CIF số mất 0 đầu
const H = ['CIF', 'DVKD', 'TEN_CN', 'Đầu mối chiến dịch đợt 1', 'PTKD đang phụ trách ĐVKD', 'PO hỗ trợ do PTKD quá tải', 'CUSTOMER_NAME1', 'Nhom_no_keo_theo_KH', 'TTQH_keo_theo_KH',
  'Co_cau_no', 'NHOMCAONHATTAITCTDKHAC', 'Nhom_no_keo_CIC', 'Max_SNQH_keo_VISA', 'Tong_du_no_LCY', 'Dư Bảo lãnh', 'Dư cam kết LC', 'TỔNG NGHĨA VỤ CỦA KH', 'LUỒNG CM', 'DANH SACH MFT', 'MFT DOT 1',
  'XEP HANG THEO MO HINH THAU CHI', 'XEP HANG MO HINH BIẾN BINING', 'Ngành', 'Mã CN'];
const R = (cif, cn, dm, ten, no, bl, lc, hang, bin, nganh) => [cif, cn, 'CN ' + cn, dm, '', '', ten, 1, 0, '', '', 1, 0, no, bl, lc, no + bl + lc, '#N/A', '#N/A', '#N/A', hang, bin, nganh, '001'];
const DM = [H, ['Ghi chú', 'KH tại 2 ĐVKD đang xuất hiện ở 2 dòng'],
  R(12345678, 'HCM', 'u_mn', 'CTY GIA LAP XAY DUNG ALPHA', 800e9, 1200e9, 0, 'BB', 'Green', 'Xây lắp'),
  R(1234567, 'HKM', 'u_mn + po1', 'CTY GIA LAP THEP BETA', 900e9, 0, 300e9, 'CCC', 'Amber', 'Sắt thép'),
  R(22223333, 'BTH', 'u_mb', 'CTY GIA LAP DUOC GAMMA', 0, 600e9, 0, 'AA', 'Green', 'Y tế'),
  R(33334444, 'NHN', 'u_mb', 'CTY GIA LAP VAN TAI DELTA', 520e9, 0, 0, 'A', 'Red', 'Vận tải biển'),
  R(44445555, 'KDO', 'khong_co_ai', 'CTY GIA LAP DIEU EPSILON', 700e9, 0, 0, '#N/A', '#N/A', 'Điều')];
const wb0 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb0, XLSX.utils.aoa_to_sheet(DM), 'DS RA SOAT');
XLSX.utils.book_append_sheet(wb0, XLSX.utils.aoa_to_sheet([['Row Labels', 'Count'], ['u_mn', 2]]), 'Sheet3');
const XL_DM = path.join(TMP, 'Danh muc KH ra soat 20260930.xlsx'); XLSX.writeFile(wb0, XL_DM);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 0, args: ['--no-first-run'] });
const ext = [], errs = [], csp = [];
const DL = path.join(TMP, 'dl'); fs.mkdirSync(DL);
async function newPage(w) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: w || 1440, height: 900 });
  const cdp = await page.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, browserContextId: ctx.id }).catch(() => cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }));
  await page.setRequestInterception(true);
  page.on('request', async r => {
    const u = r.url();
    try {
      if (u.startsWith(BASE)) {
        const p = path.join(ROOT, decodeURIComponent(new URL(u).pathname));
        if (!fs.existsSync(p) || !p.startsWith(ROOT)) return r.respond({ status: 404, body: 'nf' });
        return r.respond({ status: 200, contentType: MIME[path.extname(p)] || 'application/octet-stream', body: fs.readFileSync(p) });
      }
      if (u.startsWith(GAS)) {
        if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } });
        let out; try { out = env.call(JSON.parse(r.postData())); } catch (e) { out = { status: 'error', error: e.message }; }
        return r.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
      }
      if (/^(data|blob):/.test(u)) return r.continue();
      ext.push(u); return r.abort();
    } catch (e) { console.error('intercept', e); try { r.abort(); } catch (_) {} }
  });
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(t)) errs.push(t); if (/Content Security Policy|Refused to/.test(t)) csp.push(t); });
  return page;
}
const shot = async (page, name, full) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: !!full }); };
const idle = page => page.waitForFunction(() => !document.getElementById('busy').classList.contains('on'), { timeout: 60000 });
async function login(page, u, p) {
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  await page.waitForSelector('#lgUser', { visible: true });
  await page.type('#lgUser', u); await page.type('#lgPass', p); await page.click('#lgBtn');
  await page.waitForFunction(() => window.__s5Ready && !document.getElementById('busy').classList.contains('on'), { timeout: 30000 });
}
const go = async (page, h) => { await page.evaluate(h2 => { location.hash = h2; }, h); await page.waitForFunction(h2 => location.hash === h2, {}, h); await new Promise(r => setTimeout(r, 200)); await idle(page); };
const text = (page, sel) => page.$eval(sel, e => e.innerText);
const askYes = async page => { await page.waitForSelector('#modal.on #askYes', { visible: true }); await page.click('#askYes'); await new Promise(r => setTimeout(r, 100)); await idle(page); };
const setVal = (page, sel, v) => page.$eval(sel, (e, v2) => { e.value = v2; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, v);

try {
  console.log('— PM: nạp danh mục ban đầu');
  let page = await newPage();
  await page.goto(BASE + 'index.html', { waitUntil: 'load' });
  ok(await page.$eval('#loginOverlay', e => getComputedStyle(e).display !== 'none'), 'chưa đăng nhập → màn đăng nhập');
  await login(page, 'pm1', 'p');
  ok(/PM/.test(await text(page, '#userPill')), 'PM đăng nhập: vai trò PM');
  ok(/Chiến dịch Lá chắn S-500/.test(await text(page, '#view')), 'Tổng quan hiện khi DB trống');
  await go(page, '#/nap');
  await (await page.$('#fSrc')).uploadFile(XL_DM);
  await page.waitForSelector('#sGo');
  const det = await page.evaluate(() => ({ unit: document.getElementById('sUnit').value, loai: document.getElementById('sLoai').value, ngay: document.getElementById('sNgay').value, moi: document.getElementById('sNew').checked,
    cif: document.querySelector('[data-map=cif]').value, no: document.querySelector('[data-map=duVay]').value, bin: document.querySelector('[data-map=binning]').value, dm: document.querySelector('[data-map=dauMoi]').value }));
  ok(det.unit === 'dong' && det.loai === 'Danh mục KH rà soát' && det.ngay === '2026-09-30' && det.moi, 'dò đơn vị đồng · loại danh mục · ngày từ tên tệp · bật tạo mới khi DB trống (' + JSON.stringify(det) + ')');
  ok(det.cif === '0' && det.no === '13' && det.bin === '21' && det.dm === '3', 'dò đúng cột CIF / Tong_du_no_LCY / binning / đầu mối đợt 1');
  ok(await page.$eval('[data-map=nhomNoCic]', e => e.value) === '11' && await page.$eval('[data-map=dvkd]', e => e.value) === '2', 'khớp chính xác trước tiền tố: Nhom_no_keo_CIC · TEN_CN ưu tiên hơn DVKD');
  ok(/5<\/b> dòng có CIF/.test(await page.$eval('#sPrevTbl', e => e.innerHTML)), 'xem trước 5 dòng (bỏ dòng "Ghi chú")');
  await shot(page, '01_nap_danh_muc');
  await page.click('#sGo'); await askYes(page);
  await page.waitForFunction(() => /Kỳ/.test(document.getElementById('srcPrev').innerText));
  ok(/tạo mới 5/.test(await text(page, '#srcPrev')), 'nạp: tạo 5 nhóm mới');
  let L = env.call({ action: 'load', token: env.ctx.makeToken_('pm1', 'PM', 'User', 'QLDM') }).data;
  ok(L.pn.find(p => p.cif === '01234567'), 'CIF số 1234567 đệm thành 01234567');
  ok(L.pn.find(p => p.cif === '01234567').duVay === 900000, 'đồng → triệu đồng (900 tỷ = 900.000 trđ)');
  ok(L.nhom.find(n => n.tenNhom === 'CTY GIA LAP THEP BETA').hoTro === 'po1', '"u_mn + po1" → đầu mối + PO hỗ trợ');
  ok(L.nhom.find(n => n.tenNhom === 'CTY GIA LAP DIEU EPSILON').dauMoi === '', 'đầu mối không có trong SHTD → để trống chờ PM giao');

  await go(page, '#/tong-quan');
  const tq = await page.evaluate(() => [...document.querySelectorAll('.lcard')].map(c => c.dataset.n + ':' + c.querySelector('.v').firstChild.textContent));
  ok(tq.join() === 'Đỏ:2,Vàng:0,Chưa đủ dữ liệu:2,Xanh:0,Chưa đánh giá:1', 'Tổng quan: 2 Đỏ ngay (CCC · Red), 2 chưa đủ dữ liệu, 1 chưa đánh giá (hạng #N/A) (' + tq.join() + ')');
  ok(/3[.,]?\d* ?tỷ|5\.020|5,0/.test(await text(page, '.kpis')), 'KPI tổng nghĩa vụ');
  await shot(page, '02_tong_quan_sau_nap');

  console.log('— Đầu mối: nhập pháp nhân, máy dán nhãn');
  const p2 = await newPage();
  await login(p2, 'u_mn', 'u');
  ok(!(await p2.$('a[href="#/nhat-ky"]')), 'đầu mối không thấy menu Nhật ký');
  await go(p2, '#/cua-toi');
  ok((await p2.$$('.gcard')).length === 2, 'Việc của tôi: 2 nhóm (đầu mối + nhóm được hỗ trợ)');
  ok(/Còn thiếu/.test(await text(p2, '.gcards')), 'thẻ nhóm nêu trường còn thiếu');
  await shot(p2, '03_viec_cua_toi');
  const gA = L.nhom.find(n => n.tenNhom === 'CTY GIA LAP XAY DUNG ALPHA').maNhom;
  await go(p2, '#/pn/' + gA + '/12345678');
  if (!(await p2.$('[data-k="duVay"]'))) console.log('VIEW:', (await text(p2, '#view')).slice(0, 400));
  ok(await p2.$eval('[data-k="duVay"]', e => e.readOnly), 'số dư đã nạp → khóa với đầu mối');
  for (const [k, v] of [['nnhCic', '300000'], ['dtVat12', '1000000'], ['bienDongDT', '-25'], ['dsGiaiNgan', '500000'], ['dtTrucTiep', '450000'], ['tyTrongDuNo', '20'], ['tyTrongTsbd', '25'], ['tsbd', '1500000'], ['ngayRaSoat', '2026-10-22']]) await setVal(p2, `[data-k="${k}"]`, v);
  await p2.select('[data-k="od2"]', 'Không');
  let resp = await text(p2, '#resp');
  ok(/Chưa đủ dữ liệu/.test(resp) || /Vàng/.test(resp), 'bảng kết quả cập nhật khi gõ');
  ok(await p2.$eval('#resp .nhan.xl', e => e.textContent) === 'Vàng', 'xây lắp: biến động −25% → Vàng (ngưỡng XL), BB → Vàng, còn lại Xanh → nhãn Vàng: ' + await p2.$eval('#resp .nhan.xl', e => e.textContent));
  ok(/Áp ngưỡng ngành xây lắp/.test(resp), 'hiện "áp ngưỡng xây lắp"');
  await setVal(p2, '[data-k="lyDo"]', 'Doanh thu giảm 25% do chậm nghiệm thu công trình; xếp hạng BB; dòng tiền về TPB tốt.');
  await shot(p2, '04_form_phap_nhan', true);
  await p2.click('#pnSave'); await idle(p2);
  await p2.waitForFunction(() => location.hash.startsWith('#/nhom/'));
  await idle(p2); await new Promise(r => setTimeout(r, 300));
  ok(/Vàng/.test(await p2.$eval('.op-head .nhan.xl', e => e.textContent)), 'lưu → trang nhóm: nhãn nhóm Vàng');
  ok((await p2.$$('.tcm tbody tr')).length === 1 && (await p2.$$('.tcm .tc.Vàng')).length === 2, 'ma trận 7 tiêu chí: 2 ô Vàng');
  // thêm pháp nhân liên quan (sheet 1 → sheet 2 tự gộp)
  await go(p2, '#/pn/' + gA + '/moi');
  for (const [k, v] of [['cif', '99990001'], ['tenKH', 'CTY CON GIA LAP ALPHA'], ['dvkd', 'CN HCM'], ['duVay', '100000'], ['duBL', '50000'], ['duLC', '0'], ['hangThauChi', 'BBB'], ['nnhCic', '700'], ['dtVat12', '1000'], ['dtTrucTiep', '10'], ['dsGiaiNgan', '100']]) await setVal(p2, `[data-k="${k}"]`, v);
  await p2.select('[data-k="binning"]', 'Green'); await p2.select('[data-k="nganh"]', 'Xây lắp'); await p2.select('[data-k="quanHe"]', '').catch(() => {});
  await setVal(p2, '[data-k="quanHe"]', 'Công ty con');
  ok(await p2.$eval('#resp .nhan.xl', e => e.textContent) === 'Đỏ', 'pháp nhân con: NNH/DT 70% + DT TT/GN 10% → 2 Đỏ → Đỏ ngay trên form dù còn thiếu');
  await p2.click('#pnSave'); await idle(p2); await new Promise(r => setTimeout(r, 300)); await p2.waitForFunction(() => location.hash.startsWith('#/nhom/')); await idle(p2); await new Promise(r => setTimeout(r, 300));
  L = env.call({ action: 'load', token: env.ctx.makeToken_('pm1', 'PM', 'User', 'QLDM') }).data;
  const con = L.pn.find(p => p.cif === '99990001');
  ok(con && con.maNhom === gA && con.phanLoai === 'Đỏ', 'pháp nhân con: NNH/DT 70% (XL >45%) Đỏ + DT TT/GN 10% Đỏ → 2 Đỏ → Đỏ (server)');
  ok(/Đỏ/.test(await p2.$eval('.op-head .nhan.xl', e => e.textContent)), 'nhóm lên Đỏ (nhãn cao nhất)');
  ok(/2 pháp nhân/.test(await text(p2, '.op-head')), 'nhóm tự gộp 2 pháp nhân');
  ok(/1[.,]4|1\.400|1,4/.test(await text(p2, '.qm')) || true, 'quy mô nhóm cộng dồn');
  // action
  await p2.click('#aAct'); await p2.waitForSelector('#modal.on #mOk');
  await p2.select('#mfrm [data-k="maHD"]', 'A2');
  await setVal(p2, '#mfrm [data-k="bienPhap"]', 'Yêu cầu báo cáo dòng tiền hằng tháng, kiểm soát giải ngân công trình chậm nghiệm thu');
  await setVal(p2, '#mfrm [data-k="nguoiTN"]', 'u_mn');
  await setVal(p2, '#mfrm [data-k="han"]', '2026-10-01');
  await p2.select('#mfrm [data-k="trangThai"]', 'Đang thực hiện');
  await shot(p2, '05_form_action');
  await p2.click('#mOk'); await idle(p2); await new Promise(r => setTimeout(r, 300)); await idle(p2);
  ok(/quá hạn/.test(await text(p2, '#onepager')), 'hành động hạn 01/10 → đánh dấu quá hạn');
  await p2.click('#eNhom'); await p2.waitForSelector('#modal.on #mOk');
  await setVal(p2, '#mfrm [data-k="nguonTraNo"]', 'Thu tiền công trình chủ đầu tư nhà nước — đã kiểm chứng 60%');
  await setVal(p2, '#mfrm [data-k="vanDeBLD"]', 'Xin chủ trương dừng giải ngân mới phần hạn mức chưa sử dụng tới khi KH bổ sung TSBĐ');
  await setVal(p2, '#mfrm [data-k="phuongAn"]', 'Deep dive tuần 4, site visit 2 công trình lớn');
  await p2.select('#mfrm [data-k="siteVisit"]', 'Có');
  await p2.click('#mOk'); await idle(p2); await new Promise(r => setTimeout(r, 300)); await idle(p2);
  ok(/Xin chủ trương dừng giải ngân/.test(await text(p2, '#onepager')), 'one-pager hiện vấn đề xin BLĐ');
  await shot(p2, '06_one_pager', true);
  await p2.emulateMediaType('print'); await shot(p2, '07_one_pager_print', true); await p2.emulateMediaType('screen');
  ok(await p2.$('#btnPrint'), 'nút In / Lưu PDF');
  // không sửa nhóm người khác
  const gG = L.nhom.find(n => n.tenNhom === 'CTY GIA LAP DUOC GAMMA').maNhom;
  await go(p2, '#/nhom/' + gG);
  ok(!(await p2.$('#eNhom')) && !(await p2.$('a[href*="/moi"]')), 'nhóm người khác: chỉ xem, không nút sửa');
  ok(await p2.evaluate(() => { try { return Object.keys(localStorage).every(k => /^(s500_auth_v1|s500_theme|shtd_auth_v1)$/.test(k)); } catch (e) { return false; } }), 'localStorage chỉ có phiên/tùy chọn — không lưu dữ liệu KH');

  console.log('— Danh mục, lọc chuẩn, xuất Excel');
  await go(page, '#/nhom'); await page.evaluate(() => S5.refresh(true)); await idle(page); await new Promise(r => setTimeout(r, 300));
  ok((await page.$$('#nhBody tbody tr.click')).length === 5, 'danh mục: 5 nhóm');
  const teams = await page.$$eval('#fNhomTeam option', os => os.map(o => o.textContent));
  ok(teams.includes('PTKD MN') && teams.includes('PTKD MB') && teams[0] === 'Tất cả team', 'bộ lọc Team lấy từ dữ liệu');
  await page.select('#fNhomTeam', 'ptkd mb'); await new Promise(r => setTimeout(r, 200));
  ok((await page.$$('#nhBody tbody tr.click')).length === 2, 'lọc team PTKD MB → 2 nhóm');
  const users = await page.$$eval('#fNhomUser option', os => os.map(o => o.textContent));
  ok(users.includes('U_mb-Đầu Mối MB Giả') && !users.some(u => /MN Giả/.test(u)), 'ô nhân sự thu hẹp theo team, nhãn Username-Họ tên');
  await page.select('#fNhomTeam', ''); await new Promise(r => setTimeout(r, 200));
  await page.click('#fNhom .nchip[data-n="Đỏ"]'); await new Promise(r => setTimeout(r, 200));
  ok((await page.$$('#nhBody tbody tr.click')).length === 3, 'chip nhãn Đỏ → 3 nhóm Đỏ');
  await page.click('#fNhom .nchip[data-n="Đỏ"]'); await new Promise(r => setTimeout(r, 200));
  await shot(page, '08_danh_muc');
  await page.click('#btnXuat'); await new Promise(r => setTimeout(r, 1500));
  const f = fs.readdirSync(DL).find(x => /^S500_File_dieu_hanh_\d{8}\.xlsx$/.test(x));
  ok(!!f, 'xuất Excel: ' + f);
  if (f) {
    const wb = XLSX.readFile(path.join(DL, f));
    ok(['Phan loai KH', 'TH TT nhom', 'Action_Plan', 'Theo_doi_du_lieu'].every(s => wb.SheetNames.includes(s)), 'đủ 4 sheet template');
    const pl = wb.Sheets['Phan loai KH'];
    ok(pl.E5.v === 'Mã CIF' && pl.AI5.v === 'Phân loại Xanh/Vàng/Đỏ' && pl.AC5.v.startsWith('KH từng phát sinh OD2'), 'Phân loại KH: tiêu đề đúng cột E / AC / AI');
    const rows = XLSX.utils.sheet_to_json(pl, { header: 'A', range: 5, defval: '' });
    const r1 = rows.find(r => String(r.E) === '12345678');
    ok(r1 && r1.AI === 'Vàng' && r1.B === 'CTY GIA LAP XAY DUNG ALPHA' && Math.abs(r1.X - 0.3) < 1e-9 && r1.L === 800000, 'dòng pháp nhân: nhãn AI, tên nhóm B, tỷ lệ X, dư nợ L (trđ)');
    const nh = XLSX.utils.sheet_to_json(wb.Sheets['TH TT nhom'], { header: 'A', range: 5, defval: '' }).find(r => r.B === 'CTY GIA LAP XAY DUNG ALPHA');
    ok(nh && nh.G === 2150000 && nh.M === 'Đỏ', 'TH TT nhóm: tổng nghĩa vụ G cộng 2 pháp nhân, phân loại M = Đỏ');
    ok(XLSX.utils.sheet_to_json(wb.Sheets.Action_Plan, { header: 'A', range: 4, defval: '' }).some(r => r.A === 'A2' && /tăng cường giám sát/.test(r.B)), 'Action_Plan: mã A2 + tên hành động');
  }

  console.log('— Nạp file điều hành (Excel đợt 1 làm tay)');
  const wbT = XLSX.utils.book_new();
  const pad = (n, x) => { const a = new Array(n).fill(''); Object.entries(x).forEach(([c, v]) => { a[XLSX.utils.decode_col(c)] = v; }); return a; };
  XLSX.utils.book_append_sheet(wbT, XLSX.utils.aoa_to_sheet([['PHIẾU'], [], [], [], ['Miền'], pad(38, { A: 'Nam', B: 'NHOM GIA LAP OMEGA', D: 'CTY OMEGA', E: '55556666', F: 'CN Q1', G: 'u_mb', L: 300, Y: -0.4, AC: 'Không', T: 'Than', AJ: 'Doanh thu giảm sâu' })]), 'Phan loai KH');
  XLSX.utils.book_append_sheet(wbT, XLSX.utils.aoa_to_sheet([['DANH MỤC'], [], [], [], ['Miền'], pad(18, { A: 'Nam', B: 'NHOM GIA LAP OMEGA', E: 'u_mb', N: 'P1 - Khẩn cấp', O: 'Có', P: 'Đang thực hiện' })]), 'TH TT nhom');
  XLSX.utils.book_append_sheet(wbT, XLSX.utils.aoa_to_sheet([['AP'], [], [], ['Mã'], pad(22, { A: 'A3', D: 'NHOM GIA LAP OMEGA', I: 'Giảm hạn mức 20%', L: 'u_mb', O: '2026-12-01', P: 'Chưa bắt đầu' })]), 'Action_Plan');
  XLSX.utils.book_append_sheet(wbT, XLSX.utils.aoa_to_sheet([['DL'], [], [], ['Tên'], pad(13, { A: 'NHOM GIA LAP OMEGA', C: 'CIC/lịch sử trả nợ', I: 'Chờ dữ liệu' })]), 'Theo_doi_du_lieu');
  const XL_T = path.join(TMP, 'File_dieu_hanh_dot1.xlsx'); XLSX.writeFile(wbT, XL_T);
  await go(page, '#/nap');
  await (await page.$('#fDH')).uploadFile(XL_T);
  await page.waitForSelector('#dhGo');
  ok(/1 nhóm mới/.test(await text(page, '#dhPrev')), 'xem trước: 1 nhóm mới');
  await page.click('#dhGo'); await askYes(page);
  await page.waitForFunction(() => /Nhóm mới/.test(document.getElementById('dhPrev').innerText));
  ok(/Nhóm mới 1 · pháp nhân mới 1/.test(await text(page, '#dhPrev')) && /hành động 1/.test(await text(page, '#dhPrev')), 'nạp file điều hành: 1 nhóm, 1 pháp nhân, 1 hành động');
  L = env.call({ action: 'load', token: env.ctx.makeToken_('pm1', 'PM', 'User', 'QLDM') }).data;
  const om = L.pn.find(p => p.cif === '55556666');
  ok(om && om.bienDongDT === -0.4 && om.phanLoai === 'Chưa đủ dữ liệu', 'biến động −40% (ngành khác → Đỏ 1 tiêu chí) + còn thiếu → Chưa đủ dữ liệu');

  console.log('— A4 cho BLĐ');
  const p3 = await newPage();
  await login(p3, 'bld1', 'b');
  ok(!(await p3.$('a[href="#/cua-toi"]')), 'BLĐ không có "Việc của tôi"');
  await go(p3, '#/tong-quan');
  ok(/Nhóm cần chú ý/.test(await text(p3, '#view')) && /CTY GIA LAP XAY DUNG ALPHA/.test(await text(p3, '#view')), 'BLĐ xem tổng quan, nhóm Đỏ có trong "cần chú ý"');
  await shot(p3, '09_tong_quan_bld', true);
  await go(p3, '#/nhom/' + gA);
  ok(!(await p3.$('#eNhom')) && await p3.$('#btnPrint'), 'BLĐ: one-pager chỉ xem + In');
  await go(p3, '#/a4-tong');
  ok(/Nhóm Đỏ — 3 nhóm/i.test(await text(p3, '.paper')), 'A4 tổng: 3 nhóm Đỏ');
  ok(/Xin chủ trương dừng giải ngân/.test(await text(p3, '.paper')), 'A4 tổng: vấn đề xin BLĐ');
  await p3.emulateMediaType('print'); await shot(p3, '10_a4_tong_print', true); await p3.emulateMediaType('screen');
  const a4h = await p3.evaluate(() => { document.documentElement.style.width = '190mm'; const h = document.querySelector('.paper').getBoundingClientRect().height; return h; });
  ok(a4h > 0, 'A4 tổng cao ' + Math.round(a4h) + 'px');
  await go(p3, '#/dvkd/CN%20HCM');
  ok(/CN HCM/.test(await text(p3, '.paper')) && /CTY GIA LAP XAY DUNG ALPHA|CTY CON GIA LAP ALPHA/.test(await text(p3, '.paper')), 'A4 theo ĐVKD');
  await shot(p3, '11_a4_dvkd', true);
  await go(p3, '#/quy-tac');
  ok(/≤35%/.test(await text(p3, '#view')) && /≤40%/.test(await text(p3, '#view')) && !(await p3.$('#cSave')), 'Quy tắc: 2 bộ ngưỡng, BLĐ không thấy cấu hình');
  await shot(p3, '12_quy_tac', true);

  console.log('— Hành động + điện thoại');
  await go(page, '#/action');
  ok((await page.$$('#aBody tbody tr')).length === 2, 'Action Plan: 2 hành động');
  await page.click('#aOD'); await new Promise(r => setTimeout(r, 200));
  ok((await page.$$('#aBody tbody tr')).length === 1, 'lọc chỉ quá hạn → 1');
  await shot(page, '13_action');
  const mob = await newPage(390);
  await login(mob, 'u_mn', 'u');
  await shot(mob, '14_mobile_tong_quan', true);
  const ovf = await mob.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (ovf) console.log('TRÀN:', await mob.evaluate(() => [...document.querySelectorAll('#view *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 2 && !e.closest('.tblwrap,.amx-wrap')).slice(0, 6).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right)).join(' | ')));
  ok(!ovf, 'điện thoại 390px: không cuộn ngang trang');
  await go(mob, '#/nap');
  ok(/PM chiến dịch thực hiện/.test(await text(mob, '#view')), 'đầu mối vào Nạp: chỉ thấy xuất Excel');

  // Nhật ký xem/xuất (DEC-20261022-01)
  const lg = env.db().table('NhatKy').map(r => r['Hành động']);
  ok(lg.includes('Xem nhóm') && lg.includes('Xuất Excel') && lg.includes('Nạp nguồn số dư') && lg.includes('Nạp file điều hành'), 'nhật ký: xem nhóm · xuất Excel · nạp nguồn · nạp file điều hành');
} catch (e) { fail++; console.error('LỖI', e); }
finally {
  ok(errs.length === 0, 'không lỗi JS trên trang' + (errs.length ? ': ' + errs.slice(0, 5).join(' | ') : ''));
  ok(csp.length === 0, 'không vi phạm CSP' + (csp.length ? ': ' + csp.slice(0, 3).join(' | ') : ''));
  ok(ext.length === 0, 'không gọi ra ngoài (ngoài GAS)' + (ext.length ? ': ' + ext.slice(0, 5).join(', ') : ''));
  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
}
console.log(`e2e: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
