/**
 * matrix.js — Red Matrix rain backdrop
 * Singularity.io v3.0
 */

(function () {
  const CHARS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
  const COL_W = 18;
  const FONT_SIZE = 14;

  let canvas, ctx, drops = [], enabled = true, walletOn = false;
  let raf;

  function init() {
    canvas = document.createElement("canvas");
    canvas.id = "matrix-bg";
    document.body.prepend(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);

    const btn = document.getElementById("matrix-toggle");
    if (btn) {
      btn.classList.add("active");
      btn.addEventListener("click", toggle);
    }

    raf = requestAnimationFrame(tick);
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const cols = Math.ceil(canvas.width / COL_W);
    drops = Array.from({ length: cols }, () => Math.random() * -canvas.height / FONT_SIZE);
  }

  function toggle() {
    enabled = !enabled;
    const btn = document.getElementById("matrix-toggle");
    if (btn) btn.classList.toggle("active", enabled);
    if (!enabled) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    if (!enabled) return;

    // Fade trail
    ctx.fillStyle = "rgba(0,0,0,0.055)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
      const x  = i * COL_W;
      const y  = drops[i] * FONT_SIZE;

      // Head glyph — bright
      ctx.fillStyle = walletOn ? "#ff6b6b" : "#ff2222";
      ctx.fillText(ch, x, y);

      // Tail glyph — dimmer
      const tailY = (drops[i] - 1) * FONT_SIZE;
      ctx.fillStyle = walletOn
        ? `rgba(220,80,80,${0.35 + Math.random() * 0.25})`
        : `rgba(180,0,0,${0.3 + Math.random() * 0.2})`;
      ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, tailY);

      // Reset column
      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.6 + Math.random() * 0.4;
    }
  }

  // Public API
  window.setWalletConnected = function (v) { walletOn = !!v; };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
