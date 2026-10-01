document.addEventListener("DOMContentLoaded", () => {
  const section    = document.getElementById("experience");
  const carouselEl = document.getElementById("exp-carousel");
  const fader      = section && section.querySelector(".fader");
  const knob       = document.getElementById("fader-knob");
  if (!section || !carouselEl || !fader || !knob) return;
 
  const scale   = fader.querySelector(".fader-scale");
  const slides  = carouselEl.querySelectorAll(".carousel-item");
  const entries = section.querySelectorAll(".exp-entry");
  const N = slides.length;
  if (N === 0) return;
 
  const carousel = bootstrap.Carousel.getOrCreateInstance(carouselEl, {
    interval: false,
    wrap: false,
    touch: false,
    keyboard: false,
    pause: false
  });
 
  let t = 0;
  let current = -1;
  let dragging = false;
  let grabOffset = 0;
 
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
 
  /* Carousel */
  let sliding = false;
  let targetSlide = 0;
 
  carouselEl.addEventListener("slide.bs.carousel", () => { sliding = true; });
  carouselEl.addEventListener("slid.bs.carousel", e => {
    sliding = false;
    if (e.to !== targetSlide) carousel.to(targetSlide);
  });
 
  function showSlide(i) {
    targetSlide = i;
    if (!sliding) carousel.to(i);
  }
 
  function showEntry(i) {
    entries.forEach((el, k) => el.classList.toggle("active", k === i));
  }
 
  function geometry() {
    const knobH = knob.offsetHeight;
    return { knobH, travel: fader.clientHeight - knobH };
  }
 
  function buildScale() {
    if (!scale) return;
    const { knobH, travel } = geometry();
    const minorPerGap = 4;
    const steps = Math.max(1, (N - 1) * minorPerGap);
    scale.innerHTML = "";
 
    for (let k = 0; k <= steps; k++) {
      const y = knobH / 2 + (k / steps) * travel;
      const major = k % minorPerGap === 0;
 
      const tick = document.createElement("span");
      tick.className = "fader-tick" + (major ? " major" : "");
      tick.style.top = y + "px";
      scale.appendChild(tick);
 
      if (major) {
        const i = k / minorPerGap;
        const label = document.createElement("span");
        label.className = "fader-label";
        label.style.top = y + "px";
        label.dataset.index = i;
        label.textContent = (entries[i] && entries[i].dataset.year) || String(i + 1);
        scale.appendChild(label);
      }
    }
    markActiveLabel();
  }
 
  function markActiveLabel() {
    if (!scale) return;
    scale.querySelectorAll(".fader-label").forEach(l =>
      l.classList.toggle("active", Number(l.dataset.index) === current));
  }
 
  function render() {
    const { travel } = geometry();
    const ratio = N > 1 ? t / (N - 1) : 0;
    knob.style.transform = `translate(-50%, ${ratio * travel}px)`;
 
    const i = Math.round(t);
    if (i !== current) {
      current = i;
      showSlide(i);
      showEntry(i);
      markActiveLabel();
      fader.setAttribute("aria-valuenow", i);
      const year = entries[i] && entries[i].dataset.year;
      if (year) fader.setAttribute("aria-valuetext", year);
    }
  }
 
  function setSnap(on) { fader.classList.toggle("snap", on); }
 
  function goTo(i) {
    setSnap(true);
    t = clamp(Math.round(i), 0, N - 1);
    render();
  }
 
  function tFromPointer(clientY) {
    const r = fader.getBoundingClientRect();
    const { travel } = geometry();
    return clamp((clientY - r.top - grabOffset) / travel, 0, 1) * (N - 1);
  }
 
  fader.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    document.body.classList.add("fader-grabbing");
    fader.setPointerCapture(e.pointerId);
 
    if (e.target === knob) {
      grabOffset = e.clientY - knob.getBoundingClientRect().top;
      setSnap(false);
    } else {
      grabOffset = knob.offsetHeight / 2;
      setSnap(true);
    }
    t = tFromPointer(e.clientY);
    render();
  });
 
  fader.addEventListener("pointermove", e => {
    if (!dragging) return;
    setSnap(false);
    t = tFromPointer(e.clientY);
    render();
  });
 
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("fader-grabbing");
    goTo(t);
  }
  fader.addEventListener("pointerup", endDrag);
  fader.addEventListener("pointercancel", endDrag);
 
  fader.addEventListener("keydown", e => {
    const map = {
      ArrowUp: current - 1, ArrowLeft: current - 1, PageUp: current - 1,
      ArrowDown: current + 1, ArrowRight: current + 1, PageDown: current + 1,
      Home: 0, End: N - 1
    };
    if (e.key in map) {
      e.preventDefault();
      goTo(map[e.key]);
    }
  });
 
  let wheelAcc = 0, wheelLock = false;
  section.querySelector(".exp-carousel-box").addEventListener("wheel", e => {
    const dir = Math.sign(e.deltaY);
    const atEdge = (dir < 0 && current === 0) || (dir > 0 && current === N - 1);
    if (atEdge || dragging) return;
 
    e.preventDefault();
    if (wheelLock) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 40) {
      goTo(current + dir);
      wheelAcc = 0;
      wheelLock = true;
      setTimeout(() => (wheelLock = false), 550);
    }
  }, { passive: false });
 
  fader.setAttribute("aria-valuemin", 0);
  fader.setAttribute("aria-valuemax", N - 1);
 
  function layout() {
    setSnap(false);
    buildScale();
    render();
  }
 
  new ResizeObserver(layout).observe(fader);
  if (!knob.complete) knob.addEventListener("load", layout, { once: true });
  layout();
});
 