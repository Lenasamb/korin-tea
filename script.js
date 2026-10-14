(() => {
  "use strict";

  const FRAME_COUNT = 72;
  const FRAME_PATH = (index) => `frames/frame_${String(index).padStart(4, "0")}.webp`;
  const INITIAL_FRAME_COUNT = 6;
  const PRELOAD_CONCURRENCY = 4;

  const loader = document.querySelector("#loader");
  const loaderLabel = document.querySelector("#loader-label");
  const progress = document.querySelector(".loader-progress");
  const progressFill = document.querySelector("#loader-progress-fill");
  const percentLabel = document.querySelector("#loader-percent");
  const errorPanel = document.querySelector("#loader-error");
  const errorMessage = document.querySelector("#loader-error-message");
  const retryButton = document.querySelector("#retry-button");
  const site = document.querySelector("#site");
  site.inert = true;
  const canvas = document.querySelector("#story-canvas");
  const track = document.querySelector("#story-track");
  const context = canvas.getContext("2d", { alpha: false });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let frames = [];
  let frameState = { index: 0 };
  let resizeFrame = 0;
  let settledCount = 0;

  function updateProgress(settled) {
    const percentage = Math.floor((settled / FRAME_COUNT) * 100);
    progress.setAttribute("aria-valuenow", String(percentage));
    progressFill.style.width = `${percentage}%`;
    percentLabel.textContent = `${percentage}%`;
  }

  function loadFrame(index) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        image.decode().then(
          () => resolve(image),
          () => reject(new Error(`L’image ${FRAME_PATH(index)} n’a pas pu être décodée.`))
        );
      };
      image.onerror = () => reject(new Error(`Image introuvable ou illisible : ${FRAME_PATH(index)}`));
      image.src = FRAME_PATH(index);
    });
  }

  async function loadFrames(start, end) {
    let nextIndex = start;
    const errors = [];

    async function worker() {
      while (nextIndex < end) {
        const index = nextIndex;
        nextIndex += 1;

        try {
          frames[index] = await loadFrame(index);
          if (Math.round(frameState.index) === index) drawFrame();
        } catch (error) {
          errors.push(error.message);
        } finally {
          settledCount += 1;
          updateProgress(settledCount);
        }
      }
    }

    const workerCount = Math.min(PRELOAD_CONCURRENCY, end - start);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return errors;
  }

  function showLoadError(errors) {
    loaderLabel.textContent = "Le rituel n’a pas pu se charger";
    errorMessage.textContent = `${errors.length} ressource(s) indisponible(s). ${errors.slice(0, 2).join(" ")}`;
    errorPanel.hidden = false;
    retryButton.disabled = false;
  }

  function drawFrame() {
    const requestedIndex = Math.round(frameState.index);
    let image = frames[requestedIndex];
    for (let distance = 1; !image && distance < FRAME_COUNT; distance += 1) {
      image = frames[requestedIndex - distance] || frames[requestedIndex + distance];
    }

    if (!image || !canvas.width || !canvas.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function resizeCanvas() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      drawFrame();
    });
  }

  function updateSceneVisibility() {
    document.querySelectorAll(".story-scene").forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
      scene.classList.toggle("is-visible", isVisible);
    });
  }

  function updateFrameFromScroll() {
    const totalScrollableHeight = Math.max(track.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / totalScrollableHeight, 0), 1);
    frameState.index = progress * (FRAME_COUNT - 1);
    drawFrame();
    updateSceneVisibility();
  }

  function initializeExperience() {
    resizeCanvas();
    updateFrameFromScroll();

    if (!reducedMotion.matches) {
      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          updateFrameFromScroll();
          ticking = false;
        });
      };

      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", () => {
        resizeCanvas();
        updateFrameFromScroll();
      }, { passive: true });
      window.addEventListener("orientationchange", () => {
        resizeCanvas();
        updateFrameFromScroll();
      }, { passive: true });
    }

    document.querySelectorAll(".story-scene").forEach((scene) => {
      scene.classList.add("is-visible");
    });

    site.inert = false;
    site.classList.add("is-ready");
    loader.classList.add("is-done");
  }

  async function preloadFrames() {
    loader.classList.remove("is-done");
    errorPanel.hidden = true;
    retryButton.disabled = true;
    loaderLabel.textContent = "Préparation de votre rituel";
    frames = new Array(FRAME_COUNT);
    settledCount = 0;
    updateProgress(0);

    const firstBatchEnd = Math.min(INITIAL_FRAME_COUNT, FRAME_COUNT);
    const initialErrors = await loadFrames(0, firstBatchEnd);
    initializeExperience();

    if (initialErrors.length > 0) {
      console.error("Certaines images initiales n’ont pas pu être chargées :", initialErrors);
    }

    const remainingErrors = await loadFrames(firstBatchEnd, FRAME_COUNT);
    if (remainingErrors.length > 0) {
      console.error("Certaines images de l’animation n’ont pas pu être chargées :", remainingErrors);
    }
  }

  retryButton.addEventListener("click", () => {
    frames = [];
    preloadFrames();
  });

  const contactForm = document.querySelector(".contact-form");
  if (contactForm) {
    const statusMessage = contactForm.querySelector(".form-status");

    contactForm.addEventListener("submit", () => {
      if (statusMessage) {
        statusMessage.hidden = false;
      }
    });
  }

  preloadFrames();
})();
