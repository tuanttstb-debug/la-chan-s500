'use strict';
/* app.js — vỏ ứng dụng: đăng nhập/SSO SHTD · sidebar (khuôn SHTD) · điều hướng hash · tải dữ liệu. */
(function () {
  const { esc, toast } = S5.ui;
  const V = () => S5.views;
  const VIEWS = [
    { id: 'tong-quan', t: 'Tổng quan', ic: '◧', v: () => V().tongquan },
    { id: 'cua-toi', t: 'Việc của tôi', ic: '✎', v: () => V().cuatoi, badge: 'mine', hide: () => S5.store.isBLD() },
    { sec: 'Nhập liệu & theo dõi' },
    { id: 'nhom', t: 'Danh mục nhóm KH', ic: '◉', v: () => V().nhom, sub: () => V().chitiet },
    { id: 'action', t: 'Action Plan', ic: '⚑', v: () => V().action, badge: 'overdue' },
    { id: 'du-lieu', t: 'Theo dõi dữ liệu', ic: '⧗', v: () => V().dulieu },
    { sec: 'Báo cáo Ban lãnh đạo' },
    { id: 'a4-tong', t: 'A4 tổng chiến dịch', ic: '▤', v: () => V().a4tong },
    { id: 'dvkd', t: 'A4 theo ĐVKD', ic: '⌂', v: () => V().a4dvkd },
    { sec: 'Quản trị' },
    { id: 'nap', t: 'Nạp & xuất dữ liệu', ic: '⇅', v: () => V().nap },
    { id: 'quy-tac', t: 'Quy tắc phân loại', ic: '☰', v: () => V().quytac },
    { id: 'nhat-ky', t: 'Nhật ký', ic: '⌚', v: () => V().nhatky, hide: () => !S5.store.isPM() },
    { id: 'pn', hidden: true, t: 'Pháp nhân', v: () => V().pnform },
  ];
  S5.go = (...parts) => { location.hash = '#/' + parts.filter(x => x !== undefined && x !== null && x !== '').map(encodeURIComponent).join('/'); };

  function theme(t) {
    if (t) S5.net.LS.set('s500_theme', t);
    document.documentElement.setAttribute('data-theme', S5.net.LS.get('s500_theme') || 'light');
  }
  $('btnTheme').onclick = () => theme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  theme();

  const dropSplash = () => { const sp = document.getElementById('bootSplash'); if (sp) sp.remove(); };
  function showLogin(msg) {
    dropSplash();
    $('app').style.display = 'none'; $('loginOverlay').style.display = '';
    $('lgErr').style.display = msg ? '' : 'none'; $('lgErr').textContent = msg || '';
    setTimeout(() => $('lgUser').focus(), 50);
  }
  S5.onAuthLost = () => { S5.store.S.data = null; showLogin('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); };
  $('loginForm').onsubmit = async e => {
    e.preventDefault();
    $('lgBtn').disabled = true; $('lgErr').style.display = 'none';
    try { await S5.net.login($('lgUser').value.trim(), $('lgPass').value); $('lgPass').value = ''; await start(); }
    catch (err) { $('lgErr').textContent = err.message; $('lgErr').style.display = ''; }
    finally { $('lgBtn').disabled = false; }
  };

  function badges() {
    const st = S5.store, M = st.S.M; if (!M) return {};
    const mineG = M.groups.filter(g => st.mine(g));
    return {
      mine: mineG.filter(g => g.reqMiss > 0 || g.actOverdue > 0 || !g.ps.length).length,
      overdue: M.actions.filter(a => a.overdue && (st.isPM() || st.isBLD() || st.canEdit(a.g))).length,
    };
  }
  function renderNav() {
    const S = S5.store.S, cur = (location.hash.split('/')[1] || 'tong-quan'), B = badges();
    $('nav').innerHTML = VIEWS.filter(x => !x.hidden && !(x.hide && x.hide())).map(x => x.sec ? `<div class="nav-section-label">${esc(x.sec)}</div>`
      : `<a class="nav-item ${cur === x.id || (x.id === 'nhom' && cur === 'pn') ? 'active' : ''}" href="#/${x.id}"><span class="nav-icon">${x.ic}</span><span class="nav-label">${esc(x.t)}</span>${x.badge && B[x.badge] ? `<span class="nav-badge" title="${x.badge === 'mine' ? 'Nhóm của bạn còn thiếu dữ liệu / có việc quá hạn' : 'Hành động quá hạn'}">${B[x.badge]}</span>` : ''}</a>`).join('');
    const u = S.user;
    $('userPill').innerHTML = u ? `<span class="avatar">${esc((u.displayName || u.username).split(' ').pop().slice(0, 2).toUpperCase())}</span><span class="user-meta"><b>${esc(PeopleFilter.label(u.username, u.displayName))}</b><small>${esc(u.s5Role)} · ${esc(u.team || '—')}</small></span><button class="btn sm ghost" id="btnLogout">Đăng xuất</button>` : '';
    if ($('btnLogout')) $('btnLogout').onclick = () => { S5.net.clearSession(); S5.store.S.data = null; showLogin(''); };
    const ky = S.data && S.data.ky[0];
    $('dbStatus').textContent = S.loadedAt ? 'Tải lúc ' + S.loadedAt.toLocaleTimeString('vi-VN') + (ky ? ' · số liệu ' + S5.kit.dmy(ky.ngayDuLieu) : '') : '–';
  }

  async function route() {
    if (!S5.store.S.data) return;
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const id = parts[0] || 'tong-quan';
    let Vw = VIEWS.find(x => x.id === id && !x.sec) || VIEWS[0];
    if (Vw.hide && Vw.hide()) Vw = VIEWS[0];
    const view = parts[1] && Vw.sub ? Vw.sub() : Vw.v();
    $('pageTitle').textContent = Vw.t; $('pageSub').textContent = '';
    renderNav();
    document.body.classList.remove('nav-open');
    const host = $('view'); host.innerHTML = '';
    try { await view.render(host, parts.slice(1)); } catch (err) { console.error(err); host.innerHTML = `<div class="alert err">Lỗi hiển thị: ${esc(err.message)}</div>`; }
    if (!S5.keepScroll) window.scrollTo(0, 0);
    S5.keepScroll = false;
  }
  S5.route = route;
  S5.refresh = async (silent) => {
    S5.ui.busy(!silent, 'Đang tải dữ liệu…');
    try { await S5.store.load(); S5.keepScroll = true; await route(); if (!silent) toast('Đã tải dữ liệu mới nhất', 'ok'); }
    catch (err) { if (err.code !== 'AUTH_REQUIRED') toast(err.message, 'err'); }
    finally { S5.ui.busy(false); }
  };
  /** Ghi → tải lại toàn bộ (dữ liệu nhỏ, bảo đảm nhãn/tổng nhóm luôn khớp server) */
  S5.save = async (action, payload, okMsg) => {
    S5.ui.busy(true, 'Đang lưu…');
    try { const r = await S5.net.write(action, payload); await S5.store.load(); if (okMsg) toast(okMsg, 'ok'); return r; }
    finally { S5.ui.busy(false); }
  };
  $('btnReload').onclick = () => S5.refresh();
  $('hamburger').onclick = () => document.body.classList.toggle('nav-open');
  $('sidebarOverlay').onclick = () => document.body.classList.remove('nav-open');
  window.addEventListener('hashchange', route);
  $('verBadge').textContent = 'Lá chắn S-500 ' + S5.CONFIG.VERSION;

  async function start() {
    dropSplash(); $('loginOverlay').style.display = 'none'; $('app').style.display = '';
    S5.ui.busy(true, 'Đang tải dữ liệu…');
    try { await S5.store.load(); window.__s5Ready = true; await route(); }
    catch (err) { if (err.code !== 'AUTH_REQUIRED') { $('view').innerHTML = `<div class="alert err">Không tải được dữ liệu: ${esc(err.message)} <button class="btn sm" id="retry">Thử lại</button></div>`; $('retry').onclick = () => start(); } }
    finally { S5.ui.busy(false); }
  }
  S5.views = S5.views || {};
  if (S5.net.session()) start(); else showLogin('');
})();
