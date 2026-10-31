/**
 * @fileoverview Main client-side script for the Lumin Consultancy public web portal.
 * Handles mobile navigation drawers, CTA event dispatching, form validation,
 * honeypot anti-spam submission, and AJAX communication with the backend REST API.
 *
 * @author Lumin Technical Team
 * @version 1.0.0
 */

document.addEventListener("DOMContentLoaded", () => {
  // Automatically clear administrative session whenever navigating to public pages
  try {
    sessionStorage.removeItem("adminLoggedIn");
    sessionStorage.removeItem("adminLastActivity");
  } catch (_) {}

  // =========================================================================
  // Mobile Navigation Drawer Toggle & Accessibility Controls
  // =========================================================================
  const menuBtn = document.getElementById("menu");
  const navMenu = document.getElementById("nav");

  if (menuBtn && navMenu) {
    const menuText = menuBtn.querySelector(".menu-text");

    /**
     * Opens the mobile slide-out navigation menu and updates ARIA states.
     */
    function openMenu() {
      navMenu.classList.add("open");
      navMenu.classList.add("is-open");
      menuBtn.classList.add("is-active");
      menuBtn.setAttribute("aria-expanded", "true");
      if (menuText) menuText.textContent = "Close";
    }

    /**
     * Closes the mobile navigation menu and restores default ARIA states.
     */
    function closeMenu() {
      navMenu.classList.remove("open");
      navMenu.classList.remove("is-open");
      menuBtn.classList.remove("is-active");
      menuBtn.setAttribute("aria-expanded", "false");
      if (menuText) menuText.textContent = "Menu";
    }

    // Toggle menu state on button click
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.contains("open") || navMenu.classList.contains("is-open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close when clicking any navigation link inside nav
    navMenu.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        closeMenu();
      }
    });

    // Close when clicking outside of the active menu container
    document.addEventListener("click", (e) => {
      const isOpen = navMenu.classList.contains("open") || navMenu.classList.contains("is-open");
      if (isOpen && !navMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        closeMenu();
      }
    });

    // Close menu when Escape key is pressed
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    });

    // Reset drawer state when window is resized past mobile threshold
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1024) {
        closeMenu();
      }
    });
  }

  // =========================================================================
  // Analytics & CTA Event Tracking Hook
  // =========================================================================
  /* CTA click tracking hook: wire to your analytics (e.g. gtag) here */
  document.querySelectorAll("[data-cta]").forEach(a => a.addEventListener("click", () => {
    if (window.gtag) gtag("event", "cta_click", { cta: a.dataset.cta });
  }));

  // =========================================================================
  // Consultation Enquiry Form Handling & AJAX Submission
  // =========================================================================
  const form = document.getElementById("enq");
  const msg = document.getElementById("msg");
  const send = document.getElementById("send");

  /**
   * Displays status or validation feedback messages to the user.
   * @param {string} t - Feedback text content.
   * @param {string} c - CSS class name ('ok' for success, 'err' for error).
   */
  const show = (t, c) => { if (msg) { msg.className = c; msg.textContent = t; } };

  /**
   * Safely reads and trims the value of an input element by ID.
   * @param {string} id - The DOM element ID.
   * @returns {string} Trimmed string value.
   */
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      show("", "");

      // Reset previous error highlights
      form.querySelectorAll("input, select, textarea").forEach(el => el.style.borderColor = "");

      // 1. Mandatory (* fields) validation
      const nameEl = document.getElementById("name");
      const orgEl = document.getElementById("org");
      const emailEl = document.getElementById("email");
      const phoneEl = document.getElementById("phone");

      if (!nameEl || !nameEl.value.trim()) {
        if (nameEl) { nameEl.style.borderColor = "#dc2626"; nameEl.focus(); }
        return show("Please enter your full Name.", "err");
      }

      if (!orgEl || !orgEl.value.trim()) {
        if (orgEl) { orgEl.style.borderColor = "#dc2626"; orgEl.focus(); }
        return show("Please enter your Organization or Laboratory name.", "err");
      }

      const emailVal = emailEl ? emailEl.value.trim() : "";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailVal || !emailRegex.test(emailVal)) {
        if (emailEl) { emailEl.style.borderColor = "#dc2626"; emailEl.focus(); }
        return show("Please enter a valid email address with domain extension (e.g. name@gmail.com).", "err");
      }

      let phoneVal = phoneEl ? phoneEl.value.trim() : "";
      const digitsOnly = phoneVal.replace(/\D/g, "");
      if (!phoneVal || digitsOnly.length < 10) {
        if (phoneEl) { phoneEl.style.borderColor = "#dc2626"; phoneEl.focus(); }
        return show("Please enter a valid 10-digit mobile phone number.", "err");
      }

      // Format Indian phone number with +91
      let phoneInput = phoneVal;
      if (digitsOnly.length === 10) {
        phoneInput = "+91 " + digitsOnly;
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
        phoneInput = "+91 " + digitsOnly.substring(1);
      } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        phoneInput = "+91 " + digitsOnly.substring(2);
      } else if (!phoneInput.startsWith("+") && digitsOnly.length >= 10) {
        phoneInput = "+91 " + digitsOnly;
      }

      const payload = {
        name: v("name"),
        organization: v("org"),
        designation: v("des"),
        email: v("email"),
        phone: phoneInput,
        sector: v("sector"),
        service: v("svc"),
        status: v("stat"),
        message: v("msgt"),
        preferred: v("pref"),
        website: (form.querySelector('[name="_honey"]') || {}).value || ""
      };

      if (send) {
        send.disabled = true;
        send.textContent = "Sending…";
      }

      try {
        const r = await fetch("/api/enquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.success) throw new Error(j.error || "");

        if (window.gtag) gtag("event", "enquiry_submitted");

        form.reset();
        if (send) {
          send.disabled = false;
          send.textContent = "Request a Consultation";
        }
        show("Thank you for your enquiry! We have received your request and our team will contact you shortly.", "ok");
        msg.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {
        if (send) {
          send.disabled = false;
          send.textContent = "Request a Consultation";
        }
        show(err.message || "We could not send your enquiry. Please try again shortly.", "err");
      }
    });
  }

  // =========================================================================
  // 8-Step Circular Approach Cycle Controller
  // =========================================================================
  const cycleContainer = document.getElementById("cycleContainer");
  if (cycleContainer) {
    const stepsData = [
      { step: 1, title: "Understand", desc: "Assess the laboratory's activities, scope and requirements." },
      { step: 2, title: "Plan", desc: "Establish a practical roadmap for compliance and accreditation." },
      { step: 3, title: "Develop", desc: "Build documentation, procedures and supporting quality systems." },
      { step: 4, title: "Implement", desc: "Support your team in putting the system into practice." },
      { step: 5, title: "Validate", desc: "Method validation, verification and measurement uncertainty." },
      { step: 6, title: "Audit", desc: "Conduct gap assessments and internal audits." },
      { step: 7, title: "Prepare", desc: "Prepare for assessment and address non-conformities." },
      { step: 8, title: "Improve", desc: "Support continual improvement and ongoing compliance." }
    ];

    let currentStep = 1;
    let autoPlayTimer = null;
    let isUserInteracting = false;

    const hubStepNum = document.getElementById("hubStepNum");
    const hubTitle = document.getElementById("hubTitle");
    const hubDesc = document.getElementById("hubDesc");
    const prevBtn = document.getElementById("prevStepBtn");
    const nextBtn = document.getElementById("nextStepBtn");
    const nodeWrappers = cycleContainer.querySelectorAll(".cycle-node-wrapper");
    const dotElements = cycleContainer.querySelectorAll(".hub-dot");

    function setActiveStep(num) {
      currentStep = num;
      const data = stepsData[num - 1];
      if (data) {
        if (hubStepNum) hubStepNum.textContent = `Step 0${data.step} of 08`;
        if (hubTitle) hubTitle.textContent = data.title;
        if (hubDesc) hubDesc.textContent = data.desc;
      }

      nodeWrappers.forEach(node => {
        const stepNum = parseInt(node.getAttribute("data-step"), 10);
        if (stepNum === num) {
          node.classList.add("is-active");
        } else {
          node.classList.remove("is-active");
        }
      });

      dotElements.forEach(dot => {
        const dotNum = parseInt(dot.getAttribute("data-dot"), 10);
        if (dotNum === num) {
          dot.classList.add("is-active");
        } else {
          dot.classList.remove("is-active");
        }
      });
    }

    nodeWrappers.forEach(node => {
      const stepNum = parseInt(node.getAttribute("data-step"), 10);
      node.addEventListener("mouseenter", () => {
        isUserInteracting = true;
        setActiveStep(stepNum);
      });
      node.addEventListener("click", () => {
        isUserInteracting = true;
        setActiveStep(stepNum);
      });
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          isUserInteracting = true;
          setActiveStep(stepNum);
        }
      });
    });

    dotElements.forEach(dot => {
      dot.addEventListener("click", () => {
        const dotNum = parseInt(dot.getAttribute("data-dot"), 10);
        isUserInteracting = true;
        setActiveStep(dotNum);
      });
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        isUserInteracting = true;
        let prev = currentStep - 1;
        if (prev < 1) prev = 8;
        setActiveStep(prev);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        isUserInteracting = true;
        let next = currentStep + 1;
        if (next > 8) next = 1;
        setActiveStep(next);
      });
    }

    // Auto-advance cycle every 4.5 seconds when not actively hovered
    function startAutoPlay() {
      stopAutoPlay();
      autoPlayTimer = setInterval(() => {
        if (!isUserInteracting) {
          let next = currentStep + 1;
          if (next > 8) next = 1;
          setActiveStep(next);
        }
      }, 4500);
    }

    function stopAutoPlay() {
      if (autoPlayTimer) clearInterval(autoPlayTimer);
    }

    cycleContainer.addEventListener("mouseenter", () => {
      isUserInteracting = true;
    });

    cycleContainer.addEventListener("mouseleave", () => {
      isUserInteracting = false;
    });

    startAutoPlay();
  }


  // =========================================================================
  // Industries & Areas Sliding Window Controller
  // =========================================================================
  const industryTrack = document.getElementById("industryTrack");
  if (industryTrack) {
    const prevBtn = document.getElementById("industryPrevBtn");
    const nextBtn = document.getElementById("industryNextBtn");
    const chips = document.querySelectorAll("#industryChips li");
    const cards = industryTrack.querySelectorAll(".industry-slide-card");
    const pagination = document.getElementById("industryPagination");
    const counter = document.getElementById("industryCounter");

    let isAutoPlaying = true;
    let autoSlideTimer = null;

    // Generate pagination dots
    if (pagination) {
      cards.forEach((_, idx) => {
        const dot = document.createElement("div");
        dot.className = `industry-slider-dot ${idx === 0 ? "is-active" : ""}`;
        dot.dataset.index = idx;
        dot.setAttribute("role", "button");
        dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
        dot.addEventListener("click", () => {
          isAutoPlaying = false;
          scrollToCard(idx);
        });
        pagination.appendChild(dot);
      });
    }

    const dots = pagination ? pagination.querySelectorAll(".industry-slider-dot") : [];

    function getCardWidth() {
      if (cards.length > 0) {
        return cards[0].offsetWidth + 24; // width + gap
      }
      return 320;
    }

    function scrollToCard(idx) {
      if (cards[idx]) {
        cards[idx].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        isAutoPlaying = false;
        industryTrack.scrollBy({ left: -getCardWidth(), behavior: "smooth" });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        isAutoPlaying = false;
        industryTrack.scrollBy({ left: getCardWidth(), behavior: "smooth" });
      });
    }

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        isAutoPlaying = false;
        const idx = parseInt(chip.getAttribute("data-index"), 10);
        scrollToCard(idx);
      });
    });

    // Update active states on scroll
    let scrollTimeout;
    industryTrack.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        updateActiveStates();
      }, 50);
    });

    function updateActiveStates() {
      const scrollLeft = industryTrack.scrollLeft;
      const cardWidth = getCardWidth();
      let activeIndex = Math.round(scrollLeft / cardWidth);
      activeIndex = Math.max(0, Math.min(activeIndex, cards.length - 1));

      // Update dots
      dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === activeIndex);
      });

      // Update chips
      chips.forEach((chip, i) => {
        chip.classList.toggle("is-active", i === activeIndex);
      });

      // Update button disabled states
      if (prevBtn) prevBtn.disabled = industryTrack.scrollLeft <= 8;
      if (nextBtn) nextBtn.disabled = industryTrack.scrollLeft >= industryTrack.scrollWidth - industryTrack.clientWidth - 8;

      // Update counter
      if (counter) {
        counter.textContent = `Sector ${activeIndex + 1} of ${cards.length}`;
      }
    }

    // Auto-advance sliding window
    function startAutoSlide() {
      stopAutoSlide();
      autoSlideTimer = setInterval(() => {
        if (isAutoPlaying) {
          const maxScroll = industryTrack.scrollWidth - industryTrack.clientWidth;
          if (industryTrack.scrollLeft >= maxScroll - 10) {
            industryTrack.scrollTo({ left: 0, behavior: "smooth" });
          } else {
            industryTrack.scrollBy({ left: getCardWidth(), behavior: "smooth" });
          }
        }
      }, 4800);
    }

    function stopAutoSlide() {
      if (autoSlideTimer) clearInterval(autoSlideTimer);
    }

    industryTrack.addEventListener("mouseenter", () => { isAutoPlaying = false; });
    industryTrack.addEventListener("mouseleave", () => { isAutoPlaying = true; });
    industryTrack.addEventListener("touchstart", () => { isAutoPlaying = false; }, { passive: true });

    startAutoSlide();
    updateActiveStates();
  }


  // =========================================================================
  // Services Suite Interactive Tabs & CTA Pre-selection Controller
  // =========================================================================
  const servicesTabs = document.getElementById("servicesTabs");
  const serviceCards = document.querySelectorAll(".service-card");

  if (servicesTabs && serviceCards.length > 0) {
    const tabButtons = servicesTabs.querySelectorAll(".services-tab-btn");

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter");

        // Update active tab button
        tabButtons.forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");

        if (filter === "all") {
          serviceCards.forEach(card => {
            card.classList.remove("is-hidden");
          });
        } else {
          serviceCards.forEach(card => {
            if (card.getAttribute("data-category") === filter) {
              card.classList.remove("is-hidden");
              card.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } else {
              card.classList.add("is-hidden");
            }
          });
        }
      });
    });
  }

  // Pre-select service in consultation form when clicking service CTA or SEO tag
  const svcSelect = document.getElementById("svc");
  const formMsg = document.getElementById("msgt");

  document.querySelectorAll("[data-service-select]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const selectedService = btn.getAttribute("data-service-select");
      if (svcSelect && selectedService) {
        // Attempt to find matching option
        for (let i = 0; i < svcSelect.options.length; i++) {
          if (svcSelect.options[i].text.toLowerCase().includes(selectedService.toLowerCase().slice(0, 15))) {
            svcSelect.selectedIndex = i;
            break;
          }
        }
      }
    });
  });

  document.querySelectorAll(".seo-tag-pill").forEach(pill => {
    pill.addEventListener("click", (e) => {
      const keyword = pill.getAttribute("data-keyword");
      if (formMsg && keyword) {
        if (!formMsg.value.includes(keyword)) {
          formMsg.value = `Inquiring about ${keyword}. ` + formMsg.value;
        }
      }
    });
  });

});
