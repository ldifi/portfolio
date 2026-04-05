const links = Array.from(document.querySelectorAll('.nav__link[href^="#"]'));

links.forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (!href) return;
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveLink(a);
    history.replaceState(null, '', href);
  });
});

function setActiveLink(active) {
  links.forEach((l) => l.classList.toggle('nav__link--active', l === active));
}

// Set active link on load based on hash
const hash = window.location.hash;
if (hash) {
  const a = links.find((l) => l.getAttribute('href') === hash);
  if (a) setActiveLink(a);
}

const toTopLink = document.querySelector('.to-top');
if (toTopLink) {
  toTopLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const setToTopVisible = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (toTopLink.classList.contains('to-top--about')) {
      const hero = document.querySelector('.about-hero');
      const header = document.querySelector('.header');
      const headerH = header ? header.getBoundingClientRect().height : 72;
      let show = y > 48;
      if (hero) {
        const r = hero.getBoundingClientRect();
        /* Прошли блок героя: его низ выше зоны под шапкой либо заметно прокрутили */
        const heroEnded = r.bottom <= headerH + 24;
        const heroLeavingTop = r.top < 0;
        show = show || heroLeavingTop || heroEnded;
      }
      toTopLink.classList.toggle('to-top--visible', show);
    } else {
      toTopLink.classList.toggle('to-top--visible', y > 280);
    }
  };
  window.addEventListener('scroll', setToTopVisible, { passive: true });
  window.addEventListener('resize', setToTopVisible, { passive: true });
  setToTopVisible();
  requestAnimationFrame(setToTopVisible);
}

/* Полноэкранный просмотр фото на страницах кейсов */
const CASE_CLASSES = ['body--punk', 'body--creature', 'body--kolba', 'body--house', 'body--gnome'];

function isCaseProjectPage() {
  return CASE_CLASSES.some((c) => document.body.classList.contains(c));
}

function isLightboxExcludedImg(img) {
  if (img.closest('.punk-project-nav')) return true;
  if (img.closest('[class*="main__icons"]')) return true;
  return false;
}

function initProjectLightbox() {
  if (!isCaseProjectPage()) return;

  const root = document.createElement('div');
  root.className = 'lightbox';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <button type="button" class="lightbox__backdrop" aria-label="Закрыть просмотр"></button>
    <button type="button" class="lightbox__close" aria-label="Закрыть">&times;</button>
    <div class="lightbox__frame">
      <div class="lightbox__stage">
        <div class="lightbox__pan">
          <img class="lightbox__img" alt="" />
        </div>
      </div>
      <div class="lightbox__zoom-col">
        <button type="button" class="lightbox__btn lightbox__btn--zoom-in" aria-label="Увеличить">+</button>
        <button type="button" class="lightbox__btn lightbox__btn--zoom-out" aria-label="Уменьшить">−</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const backdrop = root.querySelector('.lightbox__backdrop');
  const closeBtn = root.querySelector('.lightbox__close');
  const stage = root.querySelector('.lightbox__stage');
  const panEl = root.querySelector('.lightbox__pan');
  const lightboxImg = root.querySelector('.lightbox__img');
  const btnIn = root.querySelector('.lightbox__btn--zoom-in');
  const btnOut = root.querySelector('.lightbox__btn--zoom-out');

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let panning = false;
  let panLastX = 0;
  let panLastY = 0;

  function applyTransform() {
    panEl.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  function resetView() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function setScale(next) {
    const clamped = Math.min(4, Math.max(0.5, next));
    scale = clamped;
    if (scale <= 1.01) {
      tx = 0;
      ty = 0;
    }
    applyTransform();
  }

  function open(src, alt) {
    lightboxImg.src = src;
    lightboxImg.alt = alt || '';
    resetView();
    root.classList.add('lightbox--open');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    closeBtn.focus({ preventScroll: true });
  }

  /*
    Горизонтальный слайдер: setPointerCapture на контейнере часто гасит click по <img>.
    Открываем лайтбокс по pointerup, если это «тап» без заметного драга.
  */
  document.querySelectorAll('.punk-slider').forEach((slider) => {
    let dragging = false;
    let startX = 0;
    let scrollStart = 0;
    let pointerDownTarget = null;

    slider.addEventListener('pointerdown', (e) => {
      // На тач-устройствах `button` может быть не 0, поэтому проверяем только мышь.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      pointerDownTarget = e.target;
      dragging = true;
      startX = e.clientX;
      scrollStart = slider.scrollLeft;
      slider.classList.add('punk-slider--dragging');
      try {
        slider.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });

    slider.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      slider.scrollLeft = scrollStart - (e.clientX - startX);
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      slider.classList.remove('punk-slider--dragging');
      const dx = Math.abs(e.clientX - startX);
      const scrollDelta = Math.abs(slider.scrollLeft - scrollStart);
      const img = pointerDownTarget && pointerDownTarget.closest('img');
      pointerDownTarget = null;
      try {
        slider.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!img || isLightboxExcludedImg(img)) return;
      /* Тап без прокрутки — открыть просмотр */
      if (dx <= 10 && scrollDelta <= 10) {
        e.preventDefault();
        open(img.currentSrc || img.src, img.alt);
      }
    };

    slider.addEventListener('pointerup', endDrag);
    slider.addEventListener('pointercancel', endDrag);
  });

  function close() {
    root.classList.remove('lightbox--open');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    lightboxImg.removeAttribute('src');
    panning = false;
    root.classList.remove('lightbox--panning');
  }

  function onStagePointerDown(e) {
    if (e.button !== 0) return;
    if (scale <= 1.01) return;
    panning = true;
    panLastX = e.clientX;
    panLastY = e.clientY;
    root.classList.add('lightbox--panning');
    stage.setPointerCapture(e.pointerId);
  }

  function onStagePointerMove(e) {
    if (!panning) return;
    tx += e.clientX - panLastX;
    ty += e.clientY - panLastY;
    panLastX = e.clientX;
    panLastY = e.clientY;
    applyTransform();
  }

  function onStagePointerUp(e) {
    if (!panning) return;
    panning = false;
    root.classList.remove('lightbox--panning');
    try {
      stage.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  stage.addEventListener('pointerdown', onStagePointerDown);
  stage.addEventListener('pointermove', onStagePointerMove);
  stage.addEventListener('pointerup', onStagePointerUp);
  stage.addEventListener('pointercancel', onStagePointerUp);

  stage.addEventListener(
    'wheel',
    (e) => {
      if (!root.classList.contains('lightbox--open')) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      setScale(scale + delta);
    },
    { passive: false }
  );

  stage.addEventListener('dblclick', (e) => {
    if (e.target === lightboxImg || panEl.contains(e.target)) {
      resetView();
    }
  });

  btnIn.addEventListener('click', () => setScale(scale * 1.2));
  btnOut.addEventListener('click', () => setScale(scale / 1.2));

  backdrop.addEventListener('click', close);
  closeBtn.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (!root.classList.contains('lightbox--open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setScale(scale * 1.2);
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      setScale(scale / 1.2);
    }
  });

  document.querySelectorAll('main.page img').forEach((img) => {
    if (img.closest('.punk-slider')) {
      img.style.cursor = 'zoom-in';
      return;
    }
    img.addEventListener('click', (e) => {
      if (isLightboxExcludedImg(img)) return;
      e.preventDefault();
      open(img.currentSrc || img.src, img.alt);
    });
    img.style.cursor = 'zoom-in';
  });
}

initProjectLightbox();

// Зацикливание навигации "Следующий проект" (чтобы всегда был проект)
function initProjectNextCycle() {
  const nextLink = document.querySelector('.punk-project-nav__link--next');
  if (!nextLink) return;

  const cycle = ['punk.html', 'creature.html', 'kolba.html', 'house.html', 'gnome.html'];
  const body = document.body;

  let current = null;
  if (body.classList.contains('body--punk')) current = 'punk.html';
  if (body.classList.contains('body--creature')) current = 'creature.html';
  if (body.classList.contains('body--kolba')) current = 'kolba.html';
  if (body.classList.contains('body--house')) current = 'house.html';
  if (body.classList.contains('body--gnome')) current = 'gnome.html';

  if (!current) return;
  const idx = cycle.indexOf(current);
  if (idx < 0) return;

  const next = cycle[(idx + 1) % cycle.length];
  const nextUrl = `./${next}`;

  nextLink.href = nextUrl;
}

initProjectNextCycle();
