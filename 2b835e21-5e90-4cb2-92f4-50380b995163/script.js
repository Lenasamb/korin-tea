(() => {
  "use strict";

  const FRAME_COUNT = 180;
  const FRAME_PATH = (index) => `frames/frame_${String(index).padStart(4, "0")}.webp`;

  const loader = document.querySelector("#loader");
  const loaderLabel = document.querySelector("#loader-label");
  const progress = document.querySelector(".loader-progress");
  const progressFill = document.querySelector("#loader-progress-fill");
  const percentLabel = document.querySelector("#loader-percent");
  const errorPanel = document.querySelector("#loader-error");
  const errorMessage = document.querySelector("#loader-error-message");
  const retryButton = document.querySelector("#retry-button");
  const site = document.querySelector("#site");
  const canvas = document.querySelector("#story-canvas");
  const track = document.querySelector("#story-track");
  const context = canvas.getContext("2d", { alpha: false });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let frames = [];
  let frameState = { index: 0 };
  let resizeFrame = 0;

  function updateProgress(loaded) {
    const percentage = Math.floor((loaded / FRAME_COUNT) * 100);
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

  async function preloadFrames() {
    loader.classList.remove("is-done");
    errorPanel.hidden = true;
    retryButton.disabled = true;
    loaderLabel.textContent = "Préparation de votre rituel";
    updateProgress(0);

    let loaded = 0;
    const errors = [];
    const imagePromises = Array.from({ length: FRAME_COUNT }, (_, index) =>
      loadFrame(index)
        .then((image) => {
          frames[index] = image;
          loaded += 1;
          updateProgress(loaded);
        })
        .catch((error) => {
          errors.push(error.message);
        })
    );

    await Promise.all(imagePromises);

    if (errors.length > 0) {
      showLoadError(errors);
      return;
    }

    if (!window.gsap || !window.ScrollTrigger) {
      showLoadError(["GSAP ou ScrollTrigger n’a pas pu être chargé. Vérifiez votre connexion puis réessayez."]);
      return;
    }

    initializeExperience();
  }

  function showLoadError(errors) {
    loaderLabel.textContent = "Le rituel n’a pas pu se charger";
    errorMessage.textContent = `${errors.length} ressource(s) indisponible(s). ${errors.slice(0, 2).join(" ")}`;
    errorPanel.hidden = false;
    retryButton.disabled = false;
  }

  function drawFrame() {
    const image = frames[Math.round(frameState.index)];
    if (!image || !canvas.width || !canvas.height) return;

    const dpr = window.devicePixelRatio || 1;
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
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      drawFrame();
    });
  }

  function initializeExperience() {
    gsap.registerPlugin(ScrollTrigger);
    resizeCanvas();

    gsap.to(frameState, {
      index: FRAME_COUNT - 1,
      ease: "none",
      onUpdate: drawFrame,
      scrollTrigger: {
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        scrub: reducedMotion.matches ? 0 : 1,
        invalidateOnRefresh: true,
      },
    });

    document.querySelectorAll(".story-scene").forEach((scene, index) => {
      if (reducedMotion.matches) return;
      const copy = scene.querySelector(".scene-copy");
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: scene,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      timeline
        .fromTo(
          copy,
          { autoAlpha: index === 0 ? 1 : 0, y: index === 0 ? 0 : 18 },
          { autoAlpha: 1, y: 0, duration: 0.24, ease: "none" }
        )
        .to(copy, { autoAlpha: 1, duration: 0.52, ease: "none" })
        .to(copy, { autoAlpha: 0, y: -12, duration: 0.24, ease: "none" });
    });

    window.addEventListener("resize", resizeCanvas, { passive: true });
    window.addEventListener("orientationchange", resizeCanvas, { passive: true });

    site.inert = false;
    site.classList.add("is-ready");
    loader.classList.add("is-done");
    ScrollTrigger.refresh();
  }

  retryButton.addEventListener("click", () => {
    frames = [];
    preloadFrames();
  });

  preloadFrames();
})();
