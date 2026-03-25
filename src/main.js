import { inject, track } from "@vercel/analytics";
inject();

// ===== Mobile Menu Toggle =====
const menuToggle = document.getElementById("menu-toggle");
const menuIcon = document.getElementById("menu-icon");
const mobileMenu = document.getElementById("mobile-menu");
const menuLinks = document.querySelectorAll("[data-menu-link]");

function openMenu() {
  mobileMenu.classList.add("open");
  menuIcon.textContent = "close";
  document.body.classList.add("menu-open");
}

function closeMenu() {
  mobileMenu.classList.remove("open");
  menuIcon.textContent = "menu";
  document.body.classList.remove("menu-open");
}

if (menuToggle && menuIcon && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    if (mobileMenu.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });
}

// ===== Scroll Reveal Animation =====
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll(".fade-in-up").forEach((el) => {
  observer.observe(el);
});

// ===== Floating CTA Show on Scroll =====
const floatingCta = document.getElementById("floating-cta");
if (floatingCta) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      floatingCta.classList.remove("translate-y-full");
    } else {
      floatingCta.classList.add("translate-y-full");
    }
  }, { passive: true });
}

// ===== Active Nav Link Highlight =====
const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll('header nav a[href^="#"]');

if (sections.length > 0 && navLinks.length > 0) {
  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY + 100;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute("id");
      if (scrollY >= top && scrollY < top + height) {
        navLinks.forEach((link) => {
          link.classList.remove("text-seaweed-green");
          if (link.getAttribute("href") === `#${id}`) {
            link.classList.add("text-seaweed-green");
          }
        });
      }
    });
  });
}

const page = document.body.dataset.page;
if (page === "booking") {
  import("./booking.js");
}
if (page === "cancel") {
  import("./cancel.js");
}
if (page === "404") {
  track("404", { path: window.location.pathname });
}
