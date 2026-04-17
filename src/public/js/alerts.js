// Viper Alert System — replaces all browser alerts/confirms

(function () {
  const overlay    = document.getElementById('viperModal');
  const box        = document.getElementById('viperModalBox');
  const iconEl     = document.getElementById('viperModalIcon');
  const titleEl    = document.getElementById('viperModalTitle');
  const messageEl  = document.getElementById('viperModalMessage');
  const actAlert   = document.getElementById('viperModalActionsAlert');
  const actConfirm = document.getElementById('viperModalActionsConfirm');
  const okBtn      = document.getElementById('viperModalOk');
  const cancelBtn  = document.getElementById('viperModalCancel');
  const confirmBtn = document.getElementById('viperModalConfirm');

  const ICONS = {
    success: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', cls: 'modal-success', title: 'Success' },
    error:   { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', cls: 'modal-error', title: 'Error' },
    warning: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', cls: 'modal-warning', title: 'Warning' },
    info:    { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', cls: 'modal-info', title: 'Notice' },
    confirm: { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>', cls: 'modal-confirm', title: 'Are you sure?' },
  };

  function clearClasses() {
    box.classList.remove('modal-success','modal-error','modal-warning','modal-info','modal-confirm');
  }

  function openModal(type) {
    clearClasses();
    const cfg = ICONS[type] || ICONS.info;
    iconEl.innerHTML = cfg.svg;
    box.classList.add(cfg.cls);
    overlay.style.display = 'flex';
    requestAnimationFrame(() => box.classList.add('modal-show'));
  }

  function closeModal() {
    box.classList.remove('modal-show');
    setTimeout(() => {
      overlay.style.display = 'none';
      actAlert.style.display   = 'flex';
      actConfirm.style.display = 'none';
    }, 200);
  }

  window.viperAlert = function (msg, type = 'info', customTitle = null) {
    messageEl.textContent = msg;
    titleEl.textContent   = customTitle || ICONS[type]?.title || 'Notice';
    actAlert.style.display   = 'flex';
    actConfirm.style.display = 'none';
    openModal(type);
    return new Promise(resolve => { okBtn.onclick = () => { closeModal(); resolve(); }; });
  };

  window.viperConfirm = function (msg, customTitle = null) {
    messageEl.textContent = msg;
    titleEl.textContent   = customTitle || 'Are you sure?';
    actAlert.style.display   = 'none';
    actConfirm.style.display = 'flex';
    openModal('confirm');
    return new Promise(resolve => {
      confirmBtn.onclick = () => { closeModal(); resolve(true);  };
      cancelBtn.onclick  = () => { closeModal(); resolve(false); };
    });
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.style.display === 'flex') closeModal(); });

  // ─── Toasts ────────────────────────────────────────────────────────────────
  const TOAST_ICONS = {
    success: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  window.viperToast = function (msg, type = 'info', duration = 3200) {
    let container = document.getElementById('viperToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'viperToastContainer';
      container.className = 'viper-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `viper-toast viper-toast-${type}`;
    toast.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}<span>${msg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    setTimeout(() => { toast.classList.remove('toast-show'); setTimeout(() => toast.remove(), 280); }, duration);
  };
})();
