// Field Journal — main.js
// Built up incrementally: intro unfold, sticky-stack, previews, outbound modal.

(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* -----------------------------------------
     Front Cover — intro unfold
  ----------------------------------------- */
  function initIntroUnfold() {
    const spacer = document.querySelector('.intro__spacer');
    const pin = document.querySelector('.intro__pin');
    const leftPanel = document.querySelector('.intro__panel--left');
    const rightPanel = document.querySelector('.intro__panel--right');

    if (!spacer || !pin || !leftPanel || !rightPanel) return;

    if (prefersReducedMotion.matches) {
      // Resting position: no transform applied, panels stay put.
      return;
    }

    const FADE_START = 0.72;
    const NARROW_BREAKPOINT = 720;
    let ticking = false;

    function update() {
      ticking = false;

      const rect = spacer.getBoundingClientRect();
      const maxScroll = spacer.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = maxScroll > 0 ? clamp(scrolled / maxScroll, 0, 1) : 0;

      const isNarrow = window.innerWidth < NARROW_BREAKPOINT;
      const shift = progress * 60; // percent
      const rotation = progress * 3; // degrees

      if (isNarrow) {
        leftPanel.style.transform = `translateY(-${shift}%) rotate(-${rotation}deg)`;
        rightPanel.style.transform = `translateY(${shift}%) rotate(${rotation}deg)`;
      } else {
        leftPanel.style.transform = `translateX(-${shift}%) rotate(-${rotation}deg)`;
        rightPanel.style.transform = `translateX(${shift}%) rotate(${rotation}deg)`;
      }

      const opacity = progress <= FADE_START
        ? 1
        : 1 - (progress - FADE_START) / (1 - FADE_START);
      pin.style.opacity = String(clamp(opacity, 0, 1));
      pin.style.pointerEvents = progress >= 1 ? 'none' : 'auto';
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* -----------------------------------------
     Field Notes — sticky-stack active highlight
  ----------------------------------------- */
  function initStackActiveState() {
    const cards = document.querySelectorAll('.project-card');
    if (!cards.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('active', entry.isIntersecting);
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );

    cards.forEach((card) => observer.observe(card));
  }

  /* -----------------------------------------
     Field Notes — hover/tap video & gif preview
  ----------------------------------------- */
  function initProjectPreviews() {
    const previews = document.querySelectorAll('[data-preview]');
    if (!previews.length) return;

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const openPreviews = new Set();

    previews.forEach((preview) => {
      const mediaType = preview.dataset.media;
      if (mediaType === 'none') return;

      const src = preview.dataset.src;
      const mediaEl = mediaType === 'video'
        ? preview.querySelector('.project-card__video')
        : preview.querySelector('.project-card__gif');

      if (!mediaEl) return;

      function loadMedia() {
        if (!mediaEl.getAttribute('src')) {
          mediaEl.src = src;
        }
      }

      function play() {
        loadMedia();
        preview.classList.add('is-playing');
        openPreviews.add(preview);
        if (mediaType === 'video') {
          mediaEl.play().catch(() => {});
        }
      }

      function stop() {
        preview.classList.remove('is-playing');
        openPreviews.delete(preview);
        if (mediaType === 'video') {
          mediaEl.pause();
          mediaEl.currentTime = 0;
          mediaEl.removeAttribute('src');
          mediaEl.load();
        }
      }

      if (!isTouch) {
        preview.addEventListener('mouseenter', play);
        preview.addEventListener('mouseleave', stop);
      } else {
        preview.setAttribute('tabindex', '0');
        preview.setAttribute('role', 'button');
        preview.setAttribute('aria-label', 'Play project preview');

        preview.addEventListener('click', (event) => {
          event.stopPropagation();
          if (preview.classList.contains('is-playing')) {
            stop();
            return;
          }
          openPreviews.forEach((openPreview) => {
            openPreview.dispatchEvent(new Event('preview-force-stop'));
          });
          play();
        });

        preview.addEventListener('preview-force-stop', stop);

        document.addEventListener('click', (event) => {
          if (!preview.contains(event.target) && preview.classList.contains('is-playing')) {
            stop();
          }
        });
      }
    });
  }

  /* -----------------------------------------
     Outbound-link confirmation modal
  ----------------------------------------- */
  function initOutboundModal() {
    const modal = document.getElementById('outbound-modal');
    const card = modal ? modal.querySelector('.modal-card') : null;
    const destEl = document.getElementById('outbound-modal-dest');
    const cancelBtn = document.getElementById('outbound-modal-cancel');
    const continueBtn = document.getElementById('outbound-modal-continue');
    const links = document.querySelectorAll('[data-outbound]');

    if (!modal || !card || !links.length) return;

    let triggerEl = null;
    let pendingUrl = null;

    function getFocusable() {
      return [cancelBtn, continueBtn];
    }

    function onKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = getFocusable();
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    function openModal(url, destLabel, trigger) {
      pendingUrl = url;
      triggerEl = trigger;
      destEl.textContent = destLabel;
      modal.hidden = false;
      document.body.classList.add('modal-open');
      cancelBtn.focus();
      document.addEventListener('keydown', onKeydown);
    }

    function closeModal() {
      modal.hidden = true;
      pendingUrl = null;
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeydown);
      if (triggerEl) triggerEl.focus();
    }

    links.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const destLabel = link.dataset.destLabel || 'this destination';
        openModal(link.href, destLabel, link);
      });
    });

    cancelBtn.addEventListener('click', closeModal);

    continueBtn.addEventListener('click', () => {
      if (pendingUrl) {
        window.open(pendingUrl, '_blank', 'noopener');
      }
      closeModal();
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initIntroUnfold();
    initStackActiveState();
    initProjectPreviews();
    initOutboundModal();
  });
})();
