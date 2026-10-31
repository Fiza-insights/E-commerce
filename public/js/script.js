document.addEventListener("DOMContentLoaded", function () {
  var header = document.querySelector(".site-header");

  window.addEventListener("scroll", function () {
    if (header) header.classList.toggle("scrolled", window.scrollY > 40);
  });

  var items = document.querySelectorAll(".section-title, .product-card");
  items.forEach(function (el, i) {
    el.classList.add("reveal");
    el.style.transitionDelay = (i % 4) * 120 + "ms";
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var el = entry.target;
        el.classList.add("show");
        observer.unobserve(el);
        setTimeout(function () {
          el.classList.remove("reveal", "show");
          el.style.transitionDelay = "";
        }, 1400);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(function (el) { observer.observe(el); });
});

/* ===== More animations ===== */
(function () {
  // Loading screen
  var loader = document.createElement("div");
  loader.id = "loader";
  loader.innerHTML = "<span>Lustre &amp; Light</span>";
  document.body.appendChild(loader);
  function hideLoader() { loader.classList.add("hide"); }
  window.addEventListener("load", function () { setTimeout(hideLoader, 800); });
  setTimeout(hideLoader, 2500);

  // Scroll progress bar
  var bar = document.createElement("div");
  bar.id = "progress";
  document.body.appendChild(bar);
  window.addEventListener("scroll", function () {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  });

  // Sparkles in hero
  var hero = document.querySelector(".hero");
  if (hero) {
    for (var i = 0; i < 22; i++) {
      var s = document.createElement("span");
      var size = 3 + Math.random() * 6;
      s.className = "sparkle";
      s.style.width = size + "px";
      s.style.height = size + "px";
      s.style.left = Math.random() * 100 + "%";
      s.style.bottom = Math.random() * 30 + "%";
      s.style.animationDuration = 4 + Math.random() * 5 + "s";
      s.style.animationDelay = Math.random() * 6 + "s";
      hero.appendChild(s);
    }
  }

  // 3D tilt on product cards
  document.querySelectorAll(".product-card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = "perspective(700px) rotateX(" + (-y * 8) + "deg) rotateY(" + (x * 8) + "deg) translateY(-6px)";
    });
    card.addEventListener("mouseleave", function () {
      card.style.transform = "";
    });
  });
})();
