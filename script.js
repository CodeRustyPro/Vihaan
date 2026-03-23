const cursor = document.querySelector('.cursor-dot');
const glow = document.querySelector('.pointer-glow');
const hoverTargets = document.querySelectorAll('a, button, .tilt-card');
const revealItems = document.querySelectorAll('.reveal');
const depthItems = document.querySelectorAll('[data-depth]');
const tiltCards = Array.from(document.querySelectorAll('.tilt-card'));
const marquee = document.querySelector('[data-marquee]');
const horizontalSection = document.querySelector('.horizontal-gallery');
const track = document.querySelector('[data-gallery-track]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const activeTiltCards = new Set();

let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let scrollY = window.scrollY;
let lastScrollY = window.scrollY;
let marqueeOffset = 0;
let currentVelocity = 0;
let marqueeCycleWidth = marquee ? marquee.scrollWidth / 2 : 600;
let frameTick = 0;
let animationFrameId = 0;
let isAnimating = false;

function handlePointerMove(event) {
  pointerX = event.clientX;
  pointerY = event.clientY;

  if (cursor) {
    cursor.style.left = `${pointerX}px`;
    cursor.style.top = `${pointerY}px`;
  }

  if (glow) {
    glow.style.left = `${pointerX}px`;
    glow.style.top = `${pointerY}px`;
  }
}

if (!reducedMotion) {
  document.addEventListener('pointermove', handlePointerMove, { passive: true });
}

hoverTargets.forEach((target) => {
  target.addEventListener('pointerenter', () => {
    cursor?.classList.add('active');
  });

  target.addEventListener('pointerleave', () => {
    cursor?.classList.remove('active');
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  },
  {
    threshold: 0.15,
    rootMargin: '0px 0px -12% 0px'
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

if ('IntersectionObserver' in window) {
  const tiltObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeTiltCards.add(entry.target);
        } else {
          activeTiltCards.delete(entry.target);
          entry.target.style.transform = '';
        }
      });
    },
    {
      rootMargin: '250px 0px 250px 0px',
      threshold: 0
    }
  );

  tiltCards.forEach((card) => tiltObserver.observe(card));
} else {
  tiltCards.forEach((card) => activeTiltCards.add(card));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function updateHorizontalGallery() {
  if (!horizontalSection || !track) {
    return;
  }

  if (window.innerWidth <= 760) {
    track.style.transform = 'none';
    return;
  }

  const sectionTop = horizontalSection.offsetTop;
  const sectionHeight = horizontalSection.offsetHeight;
  const available = Math.max(sectionHeight - window.innerHeight, 1);
  const progress = clamp((scrollY - sectionTop) / available, 0, 1);
  const maxTranslate = Math.max(track.scrollWidth - window.innerWidth, 0);

  track.style.transform = `translate3d(${-progress * maxTranslate}px, 0, 0)`;
}

function animateFrame() {
  frameTick += 1;
  const depthRange = 40;
  const xRatio = pointerX / window.innerWidth - 0.5;
  const yRatio = pointerY / window.innerHeight - 0.5;

  if (!reducedMotion) {
    depthItems.forEach((node) => {
      const depth = Number(node.dataset.depth || 0);
      const x = xRatio * depthRange * depth;
      const y = (scrollY * depth * 0.08) + yRatio * depthRange * depth;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }

  if (marquee && !reducedMotion) {
    const delta = scrollY - lastScrollY;
    currentVelocity = currentVelocity * 0.9 + delta * 0.08;
    marqueeOffset -= 0.9 + currentVelocity;

    if (marqueeOffset <= -marqueeCycleWidth) {
      marqueeOffset = 0;
    }

    marquee.style.transform = `translate3d(${marqueeOffset}px, 0, 0)`;
  }

  if (!reducedMotion && window.innerWidth > 760 && frameTick % 2 === 0) {
    activeTiltCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = clamp((pointerY - cy) / 24, -9, 9);
      const ry = clamp((pointerX - cx) / 24, -9, 9);

      card.style.transform = `perspective(900px) rotateX(${-rx}deg) rotateY(${ry}deg)`;
    });
  }

  lastScrollY = scrollY;
  animationFrameId = requestAnimationFrame(animateFrame);
}

function startAnimationLoop() {
  if (isAnimating || reducedMotion) {
    return;
  }

  isAnimating = true;
  animationFrameId = requestAnimationFrame(animateFrame);
}

function stopAnimationLoop() {
  if (!isAnimating) {
    return;
  }

  cancelAnimationFrame(animationFrameId);
  isAnimating = false;
}

window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  updateHorizontalGallery();
}, { passive: true });

window.addEventListener('resize', () => {
  marqueeCycleWidth = marquee ? marquee.scrollWidth / 2 : 600;
  updateHorizontalGallery();
}, { passive: true });

updateHorizontalGallery();

if (reducedMotion) {
  depthItems.forEach((node) => {
    node.style.transform = '';
  });
  if (marquee) {
    marquee.style.transform = '';
  }
} else {
  startAnimationLoop();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAnimationLoop();
  } else {
    startAnimationLoop();
  }
});
