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
