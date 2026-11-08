const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");

if (!reducedMotion.matches && finePointer.matches) {
  let frame = 0;
  let pointerX = 75;
  let pointerY = 35;

  const updateGlow = () => {
    document.documentElement.style.setProperty("--pointer-x", `${pointerX}%`);
    document.documentElement.style.setProperty("--pointer-y", `${pointerY}%`);
    frame = 0;
  };

  document.addEventListener("pointermove", (event) => {
    pointerX = (event.clientX / window.innerWidth) * 100;
    pointerY = (event.clientY / window.innerHeight) * 100;

    if (!frame) {
      frame = window.requestAnimationFrame(updateGlow);
    }
  }, { passive: true });

  document.documentElement.addEventListener("pointerleave", () => {
    pointerX = 75;
    pointerY = 35;

    if (!frame) {
      frame = window.requestAnimationFrame(updateGlow);
    }
  });
}
