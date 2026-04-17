// ─── Nav drawer (slide-in panel) ───────────────────────────────────────────
const navToggle  = document.getElementById('navToggle');
const navDrawer  = document.getElementById('navDrawer');
const navOverlay = document.getElementById('navOverlay');

function openNavDrawer() {
  navDrawer.classList.add('open');
  navOverlay.classList.add('open');
  navToggle.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeNavDrawer() {
  navDrawer.classList.remove('open');
  navOverlay.classList.remove('open');
  navToggle.classList.remove('open');
  document.body.style.overflow = '';
}

if (navToggle && navDrawer) {
  navToggle.addEventListener('click', () => {
    navDrawer.classList.contains('open') ? closeNavDrawer() : openNavDrawer();
  });
}
if (navOverlay) {
  navOverlay.addEventListener('click', closeNavDrawer);
}

// ─── Docs accordion — event delegation so it works regardless of load order ─
document.addEventListener('click', (e) => {
  // Endpoint card toggle
  const hdr = e.target.closest('.ep-header');
  if (hdr) {
    const card = hdr.closest('.ep-card');
    if (card) card.classList.toggle('open');
    return;
  }

  // Docs sidebar nav on mobile — close drawer after jump
  const dsBtn = e.target.closest('[data-jump]');
  if (dsBtn) {
    const id = dsBtn.dataset.jump;
    const el = id === 'top' ? document.body : document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // close mobile docs drawer if open
    const dd = document.getElementById('docsDrawer');
    const do_ = document.getElementById('docsOverlay');
    if (dd) dd.classList.remove('open');
    if (do_) do_.classList.remove('open');
    return;
  }
});

// ─── Admin sidebar drawer ─────────────────────────────────────────────────
window.toggleAdminDrawer = function() {
  const drawer  = document.getElementById('adminDrawer');
  const overlay = document.getElementById('adminOverlay');
  if (!drawer) return;
  const open = drawer.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
};
window.closeAdminDrawer = function() {
  const drawer  = document.getElementById('adminDrawer');
  const overlay = document.getElementById('adminOverlay');
  if (drawer)  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

// ─── Docs sidebar drawer (mobile) ────────────────────────────────────────
window.toggleDocsDrawer = function() {
  const drawer  = document.getElementById('docsDrawer');
  const overlay = document.getElementById('docsOverlay');
  if (!drawer) return;
  const open = drawer.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
};
window.closeDocsDrawer = function() {
  const drawer  = document.getElementById('docsDrawer');
  const overlay = document.getElementById('docsOverlay');
  if (drawer)  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

// ─── Global copy helper ────────────────────────────────────────────────────
window.viperCopy = (text, label = 'Copied!') => {
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => viperToast(label, 'success', 2000))
    .catch(() => {
      // Fallback for environments without clipboard API
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); viperToast(label, 'success', 2000); }
      catch { viperToast('Copy failed — please copy manually.', 'error'); }
      document.body.removeChild(ta);
    });
};

// ─── Scroll-in animation ───────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ─── Anchor smooth scroll ──────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});
