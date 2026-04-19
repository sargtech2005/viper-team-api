/* ─── Nav Drawer ──────────────────────────────────────────────────────────── */
(function () {
  var toggle  = document.getElementById('drawerToggle');
  var drawer  = document.getElementById('navDrawer');
  var overlay = document.getElementById('drawerOverlay');
  var close   = document.getElementById('drawerClose');
  var hamb    = document.getElementById('drawerToggle'); // same element

  function openDrawer()  {
    if (!drawer) return;
    drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (hamb) hamb.classList.add('open');
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (hamb) hamb.classList.remove('open');
  }

  if (toggle)  toggle.addEventListener('click', openDrawer);
  if (close)   close.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });
})();

/* ─── Clipboard copy ──────────────────────────────────────────────────────── */
window.viperCopy = function (text, label) {
  label = label || 'Copied!';
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function () { viperToast(label, 'success', 2000); })
      .catch(function () { fallbackCopy(text, label); });
  } else {
    fallbackCopy(text, label);
  }
};
function fallbackCopy(text, label) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try {
    document.execCommand('copy');
    viperToast(label, 'success', 2000);
  } catch (e) {
    viperToast('Copy failed — please copy manually.', 'error');
  }
  document.body.removeChild(ta);
}

/* ─── Scroll-in animations ────────────────────────────────────────────────── */
if ('IntersectionObserver' in window) {
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-up').forEach(function (el) { observer.observe(el); });
}

/* ─── Smooth scroll anchors ───────────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

/* ─── Theme Toggle ────────────────────────────────────────────────────────── */
(function () {
  var DARK_ICON  = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>';
  var LIGHT_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  function getTheme()  { return localStorage.getItem('viper_theme') || 'dark'; }
  function setTheme(t) {
    localStorage.setItem('viper_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    // Update all toggle buttons on the page
    document.querySelectorAll('.theme-toggle').forEach(function(btn) {
      btn.innerHTML    = t === 'dark' ? DARK_ICON : LIGHT_ICON;
      btn.title        = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-label', btn.title);
    });
    // Update drawer label if present
    var lbl = document.getElementById('drawerThemeLabel');
    if (lbl) lbl.textContent = t === 'dark' ? 'Dark mode' : 'Light mode';
  }

  window.viperToggleTheme = function () {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  };

  // Init all buttons on page load
  document.addEventListener('DOMContentLoaded', function () {
    setTheme(getTheme());
  });
})();
