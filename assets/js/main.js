const slides = Array.from(document.querySelectorAll('.slide'));
    const scroller = document.getElementById('scroller');
    const dotsWrap = document.getElementById('dots');
    const prog = document.getElementById('prog');
    const brand = document.getElementById('brand');
    const count = document.getElementById('count');
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
    let swipePointerId = null;
    let swipeStartX = 0;
    let swipeStartY = 0;
    const coverFrames = Array.from(document.querySelectorAll('.cover-frame'));
    let coverIndex = Math.max(coverFrames.findIndex((frame) => frame.classList.contains('active')), 0);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      document.body.classList.add('motion-ready');
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

    slides.forEach((slide, index) => {
      const button = document.createElement('button');
      button.className = index === 0 ? 'dot active' : 'dot';
      button.dataset.i = index;
      button.title = slide.dataset.title || `Slide ${index + 1}`;
      button.setAttribute('aria-label', button.title);
      dotsWrap.appendChild(button);
    });

    const dots = Array.from(document.querySelectorAll('.dot'));

    const clickableImages = Array.from(scroller.querySelectorAll('img'));
    clickableImages.forEach((image) => {
      image.classList.add('zoomable');
      image.addEventListener('click', () => openLightbox(image));
    });

    function updateUI(index) {
      current = index;
      const slide = slides[index];
      const isLight = slide.dataset.light === 'true';
      const progress = total > 1 ? (index / (total - 1)) * 100 : 0;

      prog.style.width = `${progress}%`;
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
      brand.classList.toggle('on-light', isLight);
      count.classList.toggle('on-light', isLight);

      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('active', dotIndex === index);
        dot.classList.toggle('on-light', isLight);
      });
    }

    function getLightboxGroup(sourceImage) {
      const group = sourceImage.closest('.feature-media-pair, .project-preview, .cover-gallery');
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

    function openLightbox(sourceImage) {
      const source = sourceImage.currentSrc || sourceImage.getAttribute('src');
      if (!source) {
        return;
      }

      lightboxGallery = getLightboxGroup(sourceImage);
      lightboxIndex = Math.max(lightboxGallery.indexOf(sourceImage), 0);
      updateLightboxControls();
      setLightboxImage(lightboxIndex);

      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      lightboxGallery = [];
      lightboxIndex = 0;
      updateLightboxControls();
      lightboxImage.src = '';
      lightboxImage.alt = '';
      lightboxMeta.textContent = '';
    }

    function handleSwipeStart(event) {
      if (!lightbox.classList.contains('open') || lightboxGallery.length < 2) {
        return;
      }

      if (event.pointerType === 'mouse') {
        return;
      }

      swipePointerId = event.pointerId;
      swipeStartX = event.clientX;
      swipeStartY = event.clientY;
    }

    function handleSwipeEnd(event) {
      if (swipePointerId === null || event.pointerId !== swipePointerId) {
        return;
      }

      const deltaX = event.clientX - swipeStartX;
      const deltaY = event.clientY - swipeStartY;
      swipePointerId = null;

      if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
        if (deltaX < 0) {
          goNextLightboxImage();
        } else {
          goPrevLightboxImage();
        }
      }
    }

    function handleSwipeCancel() {
      swipePointerId = null;
    }

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
      { threshold: 0.6 }
    );

    slides.forEach((slide) => observer.observe(slide));

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        slides[Number(dot.dataset.i)].scrollIntoView({ behavior: 'smooth' });
      });
    });

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
      if (event.target === lightboxStage || event.target === lightboxStageInner) {
        closeLightbox();
      }
    });
    lightboxStage.addEventListener('pointerdown', handleSwipeStart, { passive: true });
    lightboxStage.addEventListener('pointerup', handleSwipeEnd, { passive: true });
    lightboxStage.addEventListener('pointercancel', handleSwipeCancel, { passive: true });
    lightboxStage.addEventListener('pointerleave', handleSwipeCancel, { passive: true });

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
          slides[current + 1].scrollIntoView({ behavior: 'smooth' });
        }
      }

      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        if (current > 0) {
          slides[current - 1].scrollIntoView({ behavior: 'smooth' });
        }
      }
    });

    if (slides.length > 0) {
      slides[0].classList.add('is-visible');
    }

    updateUI(0);
