/**
 * @fileoverview Gallery interactive script for the Lumin Consultancy portal.
 * Controls background particle animations, mobile navigation drawer controls,
 * and the responsive image lightbox viewer with keyboard accessibility.
 *
 * @author Lumin Technical Team
 * @version 1.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
  // Automatically clear administrative session whenever navigating to public pages
  try {
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('adminLastActivity');
  } catch (_) {}

  // =========================================================================
  // Particle Mesh Animation on Hero Header
  // =========================================================================
  if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
      particles: {
        number: { value: 50, density: { enable: true, value_area: 800 } },
        color: { value: ['#3b82f6', '#60a5fa'] },
        shape: { type: 'circle' },
        opacity: { value: 0.4, random: false },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: '#3b82f6', opacity: 0.25, width: 1 },
        move: { enable: true, speed: 1.2, direction: 'none', random: true, out_mode: 'out' }
      },
      interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'grab' }, resize: true }
      },
      retina_detect: true
    });
  }

  // =========================================================================
  // Mobile Navigation Drawer Toggle & Controls
  // =========================================================================
  const menuBtn = document.getElementById('menu');
  const navMenu = document.getElementById('nav');

  if (menuBtn && navMenu) {
    const menuText = menuBtn.querySelector('.menu-text');

    /**
     * Opens the mobile navigation drawer.
     */
    function openMenu() {
      navMenu.classList.add('open');
      navMenu.classList.add('is-open');
      menuBtn.classList.add('is-active');
      menuBtn.setAttribute('aria-expanded', 'true');
      if (menuText) menuText.textContent = 'Close';
    }

    /**
     * Closes the mobile navigation drawer.
     */
    function closeMenu() {
      navMenu.classList.remove('open');
      navMenu.classList.remove('is-open');
      menuBtn.classList.remove('is-active');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (menuText) menuText.textContent = 'Menu';
    }

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.contains('open') || navMenu.classList.contains('is-open');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close when clicking any nav link
    navMenu.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        closeMenu();
      }
    });

    // Close when clicking outside the menu container
    document.addEventListener('click', (e) => {
      const isOpen = navMenu.classList.contains('open') || navMenu.classList.contains('is-open');
      if (isOpen && !navMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    });

    // Reset when resizing to desktop view
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) {
        closeMenu();
      }
    });
  }

  // =========================================================================
  // Sticky Header Dynamic Elevation Effect
  // =========================================================================
  const siteHeader = document.querySelector('header');
  if (siteHeader) {
    const onScroll = () => {
      if (window.scrollY > 10) {
        siteHeader.classList.add('is-scrolled');
      } else {
        siteHeader.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // =========================================================================
  // Full-Screen Image Lightbox Viewer
  // =========================================================================
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const cards = document.querySelectorAll('.gallery-card');

  // Attach click listener to each gallery thumbnail card
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const img = card.getAttribute('data-img');
      if (img && lightboxImg && lightbox) {
        lightboxImg.src = img;
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  /**
   * Closes the lightbox modal and restores body scroll behavior.
   */
  function closeLightbox() {
    if (lightbox) {
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lightboxImg) {
        lightboxImg.src = '';
      }
    }
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  // Close lightbox when clicking the backdrop overlay outside the image
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
        closeLightbox();
      }
    });
  }

  // Close lightbox on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('is-open')) {
      closeLightbox();
    }
  });
});

