const slides = Array.from(document.querySelectorAll('.slide'));
    const scroller = document.getElementById('scroller');
    const dotsWrap = document.getElementById('dots');
    const prog = document.getElementById('prog');
    const brand = document.getElementById('brand');
    const count = document.getElementById('count');
    const mobileTitle = document.getElementById('mobile-title');
    const mobilePrev = document.getElementById('mobile-prev');
    const mobileNext = document.getElementById('mobile-next');
    const lightbox = document.getElementById('lightbox');
    const lightboxBackdrop = document.getElementById('lightbox-backdrop');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxMeta = document.getElementById('lightbox-meta');
    const lightboxStage = document.getElementById('lightbox-stage');
    const lightboxStageInner = document.getElementById('lightbox-stage-inner');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const total = slides.length;
    let current = 0;
    let lightboxGallery = [];
    let lightboxIndex = 0;
    let lightboxSourceImage = null;
    let lightboxCloseTimer = null;
    let swipePointerId = null;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let lbScale = 1;
    let lbX = 0;
    let lbY = 0;
    const LB_MAX_SCALE = 4;
    const LB_ZOOM_STEP = 1.28;
    const lbPointers = new Map();
    let lbPinchInitDist = 0;
    let lbPinchInitScale = 1;
    let lbPinchMidX = 0;
    let lbPinchMidY = 0;
    let lbPanOriginX = 0;
    let lbPanOriginY = 0;
    let lbPanOriginLbX = 0;
    let lbPanOriginLbY = 0;
    let lbWasPanning = false;
    const coverFrames = Array.from(document.querySelectorAll('.cover-frame'));
    let coverIndex = Math.max(coverFrames.findIndex((frame) => frame.classList.contains('active')), 0);
    const mobileMediaQuery = window.matchMedia('(max-width: 980px), (hover: none) and (pointer: coarse)');
    const isMobileLayout = mobileMediaQuery.matches;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && !isMobileLayout) {
      document.body.classList.add('motion-ready');
    } else {
      document.body.classList.remove('motion-ready');
    }

    function setCoverFrame(index) {
      if (coverFrames.length === 0) {
        return;
      }

      coverFrames.forEach((frame, frameIndex) => {
        frame.classList.toggle('active', frameIndex === index);
      });

      coverIndex = index;
    }

    function rotateCoverFrame() {
      if (coverFrames.length <= 1) {
        return;
      }

      setCoverFrame((coverIndex + 1) % coverFrames.length);
    }

    if (coverFrames.length > 1) {
      const coverSwapDelay = prefersReducedMotion ? 9000 : 5200;
      window.setInterval(rotateCoverFrame, coverSwapDelay);
    }

    if (dotsWrap) {
      slides.forEach((slide, index) => {
        const button = document.createElement('button');
        button.className = index === 0 ? 'dot active' : 'dot';
        button.dataset.i = index;
        button.title = slide.dataset.title || `Slide ${index + 1}`;
        button.setAttribute('aria-label', button.title);
        dotsWrap.appendChild(button);
      });
    }

    const dots = Array.from(document.querySelectorAll('.dot'));

    const clickableImages = Array.from(scroller.querySelectorAll('img'));
    clickableImages.forEach((image) => {
      image.classList.add('zoomable');
      image.addEventListener('click', () => openLightbox(image));
    });

    function updateUI(index) {
      current = index;
      const slide = slides[index];
      const title = slide.dataset.title || `Slide ${index + 1}`;
      const isLight = slide.dataset.light === 'true';
      const progress = total > 1 ? (index / (total - 1)) * 100 : 0;

      prog.style.width = `${progress}%`;
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

      if (mobileTitle) {
        mobileTitle.textContent = title;
      }

      if (mobilePrev) {
        mobilePrev.disabled = index === 0;
      }

      if (mobileNext) {
        mobileNext.disabled = index === total - 1;
      }

      brand.classList.toggle('on-light', isLight);
      count.classList.toggle('on-light', isLight);

      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === index);
        dot.classList.toggle('on-light', isLight);
      });
    }

    function goToSlide(index) {
      if (index < 0 || index >= total) {
        return;
      }

      slides[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function getLightboxGroup(sourceImage) {
      const group = sourceImage.closest('.wall, .feature-media-pair, .project-preview, .cover-gallery');
      if (!group) {
        return [sourceImage];
      }

      const images = Array.from(group.querySelectorAll('img'));
      return images.length > 0 ? images : [sourceImage];
    }

    function updateLightboxControls() {
      const hasGallery = lightboxGallery.length > 1;
      lightboxPrev.hidden = !hasGallery;
      lightboxNext.hidden = !hasGallery;
    }

    function setLightboxImage(index) {
      if (lightboxGallery.length === 0) {
        return;
      }

      const length = lightboxGallery.length;
      lightboxIndex = (index + length) % length;
      const sourceImage = lightboxGallery[lightboxIndex];
      const source = sourceImage.currentSrc || sourceImage.getAttribute('src');
      if (!source) {
        return;
      }

      const naturalWidth = sourceImage.naturalWidth;
      const naturalHeight = sourceImage.naturalHeight;
      const dimensions = naturalWidth && naturalHeight ? `${naturalWidth} x ${naturalHeight}` : '';
      const alt = sourceImage.alt || 'Imagem ampliada';
      const position = length > 1
        ? `${String(lightboxIndex + 1).padStart(2, '0')} / ${String(length).padStart(2, '0')} - `
        : '';

      lightboxImage.src = source;
      lightboxImage.alt = alt;
      lightboxMeta.textContent = dimensions ? `${position}${alt} / ${dimensions}` : `${position}${alt}`;
      lightboxStage.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      resetZoom();
    }

    function goPrevLightboxImage() {
      if (lightboxGallery.length > 1) {
        setLightboxImage(lightboxIndex - 1);
      }
    }

    function goNextLightboxImage() {
      if (lightboxGallery.length > 1) {
        setLightboxImage(lightboxIndex + 1);
      }
    }

    function resetLightboxImageStyle() {
      lightboxImage.style.transform = '';
      lightboxImage.style.transition = '';
      lightboxImage.style.opacity = '';
    }

    function openLightbox(sourceImage) {
      const source = sourceImage.currentSrc || sourceImage.getAttribute('src');
      if (!source) return;

      if (lightboxCloseTimer) {
        clearTimeout(lightboxCloseTimer);
        lightboxCloseTimer = null;
        lightbox.classList.remove('closing');
        resetLightboxImageStyle();
      }

      lightboxGallery = getLightboxGroup(sourceImage);
      lightboxIndex = Math.max(lightboxGallery.indexOf(sourceImage), 0);
      updateLightboxControls();
      setLightboxImage(lightboxIndex);
      lightboxSourceImage = sourceImage;

      const sourceRect = sourceImage.getBoundingClientRect();
      const screenCenterY = window.innerHeight / 2;
      const sourceCenterY = sourceRect.top + sourceRect.height / 2;
      const offsetY = Math.round((sourceCenterY - screenCenterY) * 0.18);

      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');

      if (prefersReducedMotion) return;

      requestAnimationFrame(() => {
        lightboxImage.style.transition = 'none';
        lightboxImage.style.transform = `translateY(${offsetY}px) scale(0.94)`;
        lightboxImage.style.opacity = '0';

        requestAnimationFrame(() => {
          lightboxImage.style.transition = 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease';
          lightboxImage.style.transform = '';
          lightboxImage.style.opacity = '';
        });
      });
    }

    function closeLightbox() {
      if (!lightbox.classList.contains('open')) return;

      const sourceImage = lightboxSourceImage;

      function doClose() {
        lightbox.classList.remove('open');
        lightbox.classList.remove('closing');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('lightbox-open');
        lightboxGallery = [];
        lightboxIndex = 0;
        lightboxSourceImage = null;
        lightboxCloseTimer = null;
        updateLightboxControls();
        lightboxImage.src = '';
        lightboxImage.alt = '';
        lightboxMeta.textContent = '';
        resetLightboxImageStyle();
      }

      if (!prefersReducedMotion && sourceImage) {
        const sourceRect = sourceImage.getBoundingClientRect();
        const screenCenterY = window.innerHeight / 2;
        const sourceCenterY = sourceRect.top + sourceRect.height / 2;
        const offsetY = Math.round((sourceCenterY - screenCenterY) * 0.18);

        lightbox.classList.add('closing');
        lightboxImage.style.transition = 'transform 300ms cubic-bezier(0.4, 0, 1, 1), opacity 200ms ease 80ms';
        lightboxImage.style.transform = `translateY(${offsetY}px) scale(0.94)`;
        lightboxImage.style.opacity = '0';

        lightboxCloseTimer = setTimeout(doClose, 300);
        return;
      }

      doClose();
    }

    function applyLbTransform() {
      lightboxImage.style.transform = (lbScale === 1 && lbX === 0 && lbY === 0)
        ? ''
        : `translate(${lbX}px, ${lbY}px) scale(${lbScale})`;
      lightboxStage.style.cursor = lbScale > 1 ? 'grab' : '';
    }

    function clampLbPan() {
      const maxX = Math.max(0, (lightboxImage.offsetWidth * lbScale - lightboxStage.clientWidth) / 2);
      const maxY = Math.max(0, (lightboxImage.offsetHeight * lbScale - lightboxStage.clientHeight) / 2);
      lbX = Math.max(-maxX, Math.min(maxX, lbX));
      lbY = Math.max(-maxY, Math.min(maxY, lbY));
    }

    function resetZoom() {
      lbScale = 1; lbX = 0; lbY = 0;
      lightboxImage.style.transform = '';
      lightboxStage.style.cursor = '';
    }

    function lbZoomAt(newScale, focalClientX, focalClientY) {
      const r = lightboxStage.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const ratio = newScale / lbScale;
      lbX = lbX * ratio + (focalClientX - cx) * (1 - ratio);
      lbY = lbY * ratio + (focalClientY - cy) * (1 - ratio);
      lbScale = newScale;
      clampLbPan();
      applyLbTransform();
    }

    function lbPointerDown(e) {
      if (!lightbox.classList.contains('open')) return;
      lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (lbPointers.size === 2) {
        const [p1, p2] = [...lbPointers.values()];
        lbPinchInitDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        lbPinchInitScale = lbScale;
        lbPinchMidX = (p1.x + p2.x) / 2;
        lbPinchMidY = (p1.y + p2.y) / 2;
      } else if (lbPointers.size === 1) {
        lbWasPanning = false;
        lbPanOriginX = e.clientX;
        lbPanOriginY = e.clientY;
        lbPanOriginLbX = lbX;
        lbPanOriginLbY = lbY;
        swipePointerId = e.pointerId;
        swipeStartX = e.clientX;
        swipeStartY = e.clientY;
      }
    }

    function lbPointerMove(e) {
      if (!lbPointers.has(e.pointerId)) return;
      lbPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (lbPointers.size >= 2) {
        const [p1, p2] = [...lbPointers.values()];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const newScale = Math.max(1, Math.min(LB_MAX_SCALE, lbPinchInitScale * dist / lbPinchInitDist));
        lbZoomAt(newScale, midX, midY);
      } else if (lbPointers.size === 1 && lbScale > 1) {
        lbWasPanning = true;
        lbX = lbPanOriginLbX + (e.clientX - lbPanOriginX);
        lbY = lbPanOriginLbY + (e.clientY - lbPanOriginY);
        clampLbPan();
        applyLbTransform();
      }
    }

    function lbPointerUp(e) {
      if (!lbPointers.has(e.pointerId)) return;

      if (lbScale <= 1 && !lbWasPanning && e.pointerType !== 'mouse'
          && lightboxGallery.length > 1 && swipePointerId === e.pointerId) {
        const deltaX = e.clientX - swipeStartX;
        const deltaY = e.clientY - swipeStartY;
        if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
          if (deltaX < 0) goNextLightboxImage();
          else goPrevLightboxImage();
        }
      }

      lbPointers.delete(e.pointerId);

      if (lbPointers.size === 1) {
        const [p] = [...lbPointers.values()];
        lbPanOriginX = p.x; lbPanOriginY = p.y;
        lbPanOriginLbX = lbX; lbPanOriginLbY = lbY;
      }
      if (lbPointers.size === 0) {
        swipePointerId = null;
        lbWasPanning = false;
      }
    }

    const observerOptions = isMobileLayout
      ? { threshold: 0.35, rootMargin: '-6% 0px -46% 0px' }
      : { threshold: 0.6 };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            updateUI(slides.indexOf(entry.target));
          } else {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      observerOptions
    );

    slides.forEach((slide) => observer.observe(slide));

    let scrollSyncRaf = 0;

    function syncCurrentSlideByScroll() {
      if (scrollSyncRaf) {
        return;
      }

      scrollSyncRaf = window.requestAnimationFrame(() => {
        scrollSyncRaf = 0;

        let closestIndex = current;
        let closestDistance = Number.POSITIVE_INFINITY;
        const topAnchor = isMobileLayout ? 72 : 0;

        slides.forEach((slide, index) => {
          const distance = Math.abs(slide.getBoundingClientRect().top - topAnchor);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        if (closestIndex !== current) {
          updateUI(closestIndex);
        }
      });
    }

    const scrollTarget = isMobileLayout ? window : scroller;
    scrollTarget.addEventListener('scroll', syncCurrentSlideByScroll, { passive: true });

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        goToSlide(Number(dot.dataset.i));
      });
    });

    if (mobilePrev) {
      mobilePrev.addEventListener('click', () => {
        goToSlide(current - 1);
      });
    }

    if (mobileNext) {
      mobileNext.addEventListener('click', () => {
        goToSlide(current + 1);
      });
    }

    lightboxBackdrop.addEventListener('click', closeLightbox);
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', (event) => {
      event.stopPropagation();
      goPrevLightboxImage();
    });
    lightboxNext.addEventListener('click', (event) => {
      event.stopPropagation();
      goNextLightboxImage();
    });
    lightboxStage.addEventListener('click', (event) => {
      if (lbScale > 1) return;
      if (event.target === lightboxStage || event.target === lightboxStageInner) {
        closeLightbox();
      }
    });

    lightboxStage.addEventListener('pointerdown', lbPointerDown);
    lightboxStage.addEventListener('pointermove', lbPointerMove, { passive: true });
    lightboxStage.addEventListener('pointerup', lbPointerUp);
    lightboxStage.addEventListener('pointercancel', (e) => { lbPointers.delete(e.pointerId); swipePointerId = null; });
    lightboxStage.addEventListener('pointerleave', (e) => { lbPointers.delete(e.pointerId); });

    lightboxStage.addEventListener('wheel', (e) => {
      if (!lightbox.classList.contains('open')) return;
      e.preventDefault();
      let newScale;
      if (e.deltaMode === 0) {
        // Trackpad (pixels) — zoom proporcional e suave
        newScale = lbScale * (1 - e.deltaY * 0.004);
      } else {
        // Mouse wheel (linhas/páginas) — step fixo por clique
        newScale = lbScale * (e.deltaY < 0 ? LB_ZOOM_STEP : 1 / LB_ZOOM_STEP);
      }
      lbZoomAt(Math.max(1, Math.min(LB_MAX_SCALE, newScale)), e.clientX, e.clientY);
    }, { passive: false });

    lightboxStage.addEventListener('mousedown', (e) => {
      if (!lightbox.classList.contains('open') || lbScale <= 1 || e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX, startY = e.clientY;
      const startLbX = lbX, startLbY = lbY;
      lightboxStage.style.cursor = 'grabbing';

      const onMove = (me) => {
        lbX = startLbX + (me.clientX - startX);
        lbY = startLbY + (me.clientY - startY);
        clampLbPan();
        applyLbTransform();
      };
      const onUp = () => {
        lightboxStage.style.cursor = lbScale > 1 ? 'grab' : '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    lightboxStageInner.addEventListener('dblclick', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (lbScale > 1) {
        lbScale = 1; lbX = 0; lbY = 0;
        lightboxImage.style.transition = 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)';
        applyLbTransform();
        setTimeout(() => { lightboxImage.style.transition = ''; }, 310);
      } else {
        lbZoomAt(2.5, e.clientX, e.clientY);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (lightbox.classList.contains('open')) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeLightbox();
          return;
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          goNextLightboxImage();
          return;
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goPrevLightboxImage();
        }
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        if (current < total - 1) {
          goToSlide(current + 1);
        }
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        if (current > 0) {
          goToSlide(current - 1);
        }
      }
    });

    if (slides.length > 0) {
      slides[0].classList.add('is-visible');
    }

    updateUI(0);
