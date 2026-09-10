// Configuration
const CONFIG = {
  frameCount: 240,
  framePrefix: 'frames/frame_',
  frameExtension: '.jpg',
  lerpFactor: 0.09, // Buttery smooth inertial lag
  maxDPR: 2         // Crispness + 60+ FPS performance
};

// DOM Elements
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const loader = document.getElementById('loader');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const header = document.getElementById('main-header');
const cardsContainer = document.getElementById('cards-container');
const prevCardBtn = document.getElementById('prev-card-btn');
const nextCardBtn = document.getElementById('next-card-btn');
const reservationModal = document.getElementById('reservation-modal');
const dishModal = document.getElementById('dish-modal');
const dateInput = document.getElementById('book-date');

// Mobile Drawer Elements
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileDrawer = document.getElementById('mobile-drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerCloseBtn = document.getElementById('drawer-close-btn');

// State
const images = [];
let loadedCount = 0;
let currentFrame = 0;
let targetFrame = 0;
let isAnimating = false;
let lastRenderedIndex = -1;

// Format frame filename: frame_0001.jpg
function getFramePath(index) {
  const paddedIndex = String(index).padStart(4, '0');
  return `${CONFIG.framePrefix}${paddedIndex}${CONFIG.frameExtension}`;
}

// Adjust canvas resolution for screen size and High-DPI
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  lastRenderedIndex = -1;
  renderFrame(Math.round(currentFrame));
}

// Draw frame centered & scaled (object-fit: cover)
function renderFrame(frameIndex) {
  const validIndex = Math.max(0, Math.min(CONFIG.frameCount - 1, frameIndex));
  const img = images[validIndex];

  if (!img || !img.complete || img.naturalWidth === 0) return;

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // Cover aspect ratio
  const hRatio = canvasWidth / imgWidth;
  const vRatio = canvasHeight / imgHeight;
  const ratio = Math.max(hRatio, vRatio);

  const renderWidth = imgWidth * ratio;
  const renderHeight = imgHeight * ratio;
  const offsetX = (canvasWidth - renderWidth) / 2;
  const offsetY = (canvasHeight - renderHeight) / 2;

  ctx.drawImage(img, 0, 0, imgWidth, imgHeight, offsetX, offsetY, renderWidth, renderHeight);
  lastRenderedIndex = validIndex;
}

// Calculate target frame from total page scroll
function updateScrollTarget() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (maxScroll <= 0) return;

  const scrollFraction = Math.max(0, Math.min(1, window.scrollY / maxScroll));
  targetFrame = scrollFraction * (CONFIG.frameCount - 1);

  // Navbar glassmorphism toggle
  if (window.scrollY > 40) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }

  // Trigger animation tick
  if (!isAnimating) {
    isAnimating = true;
    requestAnimationFrame(animationLoop);
  }
}

// Smooth LERP animation tick loop
function animationLoop() {
  const diff = targetFrame - currentFrame;
  currentFrame += diff * CONFIG.lerpFactor;

  const frameToRender = Math.round(currentFrame);
  if (frameToRender !== lastRenderedIndex) {
    renderFrame(frameToRender);
  }

  // Snap to target if minimal difference
  if (Math.abs(diff) < 0.005) {
    currentFrame = targetFrame;
    renderFrame(Math.round(currentFrame));
    isAnimating = false;
    return;
  }

  requestAnimationFrame(animationLoop);
}

// Preload all frames asynchronously
function preloadFrames() {
  let loaded = 0;

  for (let i = 1; i <= CONFIG.frameCount; i++) {
    const img = new Image();
    const src = getFramePath(i);
    img.src = src;

    const onImageLoaded = () => {
      loaded++;
      const percent = Math.round((loaded / CONFIG.frameCount) * 100);
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (progressText) progressText.textContent = `${percent}%`;

      if (loaded === 1) {
        resizeCanvas();
      }

      if (loaded === CONFIG.frameCount) {
        setTimeout(() => {
          if (loader) loader.classList.add('loaded');
          resizeCanvas();
          updateScrollTarget();
        }, 300);
      }
    };

    img.onload = onImageLoaded;
    img.onerror = () => {
      onImageLoaded(); // Continue gracefully on single frame error
    };

    images.push(img);
  }
}

// Inline Table Booking Widget Handler
function handleInlineBooking() {
  const dateVal = document.getElementById('book-date').value || 'Tonight';
  const timeVal = document.getElementById('book-time').options[document.getElementById('book-time').selectedIndex].text;
  const guestsVal = document.getElementById('book-guests').options[document.getElementById('book-guests').selectedIndex].text;
  const areaVal = document.getElementById('book-area').value;

  const summaryEl = document.getElementById('summary-details');
  if (summaryEl) {
    summaryEl.textContent = `${guestsVal} • ${dateVal} • ${timeVal} • ${areaVal}`;
  }

  if (reservationModal) {
    reservationModal.classList.add('active');
  }
}

// Mobile Drawer Handlers
function openMobileDrawer() {
  if (mobileDrawer && drawerBackdrop) {
    mobileDrawer.classList.add('active');
    drawerBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileDrawer() {
  if (mobileDrawer && drawerBackdrop) {
    mobileDrawer.classList.remove('active');
    drawerBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Setup Pagination Dots for Swipable Carousel
function setupPagination(containerId, dotsContainerId, itemSelector) {
  const container = document.getElementById(containerId);
  const dotsContainer = document.getElementById(dotsContainerId);
  if (!container || !dotsContainer) return;

  function renderDots() {
    const items = container.querySelectorAll(`${itemSelector}:not(.hidden)`);
    dotsContainer.innerHTML = '';
    if (items.length <= 1) return;

    items.forEach((item, index) => {
      const dot = document.createElement('span');
      dot.className = `dot ${index === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Go to item ${index + 1}`);
      dot.addEventListener('click', () => {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
      dotsContainer.appendChild(dot);
    });
  }

  renderDots();

  // Update active dot on scroll
  container.addEventListener('scroll', () => {
    const items = container.querySelectorAll(`${itemSelector}:not(.hidden)`);
    const dots = dotsContainer.querySelectorAll('.dot');
    if (!items.length || !dots.length) return;

    let activeIndex = 0;
    const containerCenter = container.scrollLeft + container.offsetWidth / 2;

    items.forEach((item, idx) => {
      const itemLeft = item.offsetLeft - container.offsetLeft;
      const itemCenter = itemLeft + item.offsetWidth / 2;
      if (Math.abs(containerCenter - itemCenter) < item.offsetWidth / 2) {
        activeIndex = idx;
      }
    });

    dots.forEach((d, idx) => {
      if (idx === activeIndex) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });
  }, { passive: true });

  return renderDots;
}

// UI Interaction Handlers
function setupUIEvents() {
  // Set default booking date to today
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;
  }

  // Mobile Drawer Triggers
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', openMobileDrawer);
  }
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeMobileDrawer);
  }
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeMobileDrawer);
  }

  // Close drawer on link click
  document.querySelectorAll('.drawer-link, .drawer-reserve-btn').forEach(link => {
    link.addEventListener('click', () => {
      closeMobileDrawer();
    });
  });

  // Carousel buttons (Desktop / Tablet)
  if (prevCardBtn && nextCardBtn && cardsContainer) {
    prevCardBtn.addEventListener('click', () => {
      cardsContainer.scrollBy({ left: -380, behavior: 'smooth' });
    });

    nextCardBtn.addEventListener('click', () => {
      cardsContainer.scrollBy({ left: 380, behavior: 'smooth' });
    });
  }

  // Setup Pagination Dots for Specials & Menu
  const refreshSpecialsDots = setupPagination('cards-container', 'specials-dots', '.dish-card');
  const refreshMenuDots = setupPagination('menu-items-grid', 'menu-dots', '.menu-item-row');

  // Modal Close Handlers
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-close')) {
        modal.classList.remove('active');
      }
    });
  });

  // Dish details popup
  document.querySelectorAll('.dish-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const dish = link.getAttribute('data-dish');
      const price = link.getAttribute('data-price');
      const cat = link.getAttribute('data-cat');
      const desc = link.getAttribute('data-desc');

      if (dishModal) {
        document.getElementById('dish-modal-cat').textContent = cat || 'SIGNATURE';
        document.getElementById('dish-modal-title').textContent = dish || 'Dish Detail';
        document.getElementById('dish-modal-desc').textContent = desc || '';
        document.getElementById('dish-modal-price').textContent = price || '';
        dishModal.classList.add('active');
      }
    });
  });

  // Category Filtering Tabs: brews, bites, mains, cocktails, desserts
  const tabButtons = document.querySelectorAll('.menu-category-tabs .tab-btn');
  const menuRows = document.querySelectorAll('.menu-item-row');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      menuRows.forEach(row => {
        const category = row.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      });

      // Refresh pagination dots for visible menu items
      if (refreshMenuDots) {
        refreshMenuDots();
      }

      // Recalculate scroll height after tab filtering changes
      updateScrollTarget();
    });
  });

  // Instagram Photo click preview
  document.querySelectorAll('.insta-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const caption = tile.querySelector('.insta-caption')?.textContent || 'THE SALT Moments';
      if (dishModal) {
        document.getElementById('dish-modal-cat').textContent = 'INSTAGRAM @THESALT.DINING';
        document.getElementById('dish-modal-title').textContent = caption;
        document.getElementById('dish-modal-desc').textContent = 'Captured live in our illuminated botanical garden patio and cocktail lounge.';
        document.getElementById('dish-modal-price').textContent = '✨ Chill Garden';
        dishModal.classList.add('active');
      }
    });
  });

  // ==========================================
  // THE SALT Concierge FAQ Chatbot Logic
  // ==========================================
  const chatbotWidget = document.getElementById('salt-chatbot-widget');
  const chatbotToggleBtn = document.getElementById('chatbot-toggle-btn');
  const chatbotCloseBtn = document.getElementById('chatbot-close-btn');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const chatbotInput = document.getElementById('chatbot-input');
  const faqChips = document.querySelectorAll('.faq-chip');

  if (chatbotToggleBtn && chatbotWidget) {
    chatbotToggleBtn.addEventListener('click', () => {
      chatbotWidget.classList.toggle('open');
      if (chatbotWidget.classList.contains('open') && chatbotInput) {
        setTimeout(() => chatbotInput.focus(), 200);
      }
    });
  }

  if (chatbotCloseBtn && chatbotWidget) {
    chatbotCloseBtn.addEventListener('click', () => {
      chatbotWidget.classList.remove('open');
    });
  }

  // FAQ Knowledge Base
  const FAQ_DATABASE = [
    {
      keywords: ['hour', 'time', 'open', 'close', 'timing', 'schedule', 'when'],
      response: `🕒 <strong>Operating Hours:</strong><br>
      • <strong>Tue – Thu:</strong> 5:00 PM – 11:00 PM<br>
      • <strong>Fri – Sat:</strong> 4:30 PM – Midnight<br>
      • <strong>Sun:</strong> 4:30 PM – 10:30 PM<br>
      • <strong>Mon:</strong> Reserved for Private Botanical Gatherings.`
    },
    {
      keywords: ['book', 'reserv', 'table', 'garden', 'patio', 'seat', 'party', 'outdoor'],
      response: `🌿 <strong>Table Reservations & Chill Garden:</strong><br>
      You can reserve an intimate table under our illuminated canopies directly via our <a href="#reservations" onclick="document.getElementById('salt-chatbot-widget').classList.remove('open');">Reservation Form</a>, or give our host a call at <strong>+1 (555) 019-2834</strong>. Walk-ins are also warmly welcomed at our botanical garden bar!`
    },
    {
      keywords: ['locat', 'where', 'address', 'park', 'valet', 'direction', 'map'],
      response: `📍 <strong>Location & Valet:</strong><br>
      THE SALT is located at <strong>428 Grand Promenade, The Waterfront Quarter</strong>.<br>
      ✨ We provide <strong>complimentary valet parking</strong> right at our illuminated garden driveway for all dining guests.`
    },
    {
      keywords: ['menu', 'dish', 'food', 'signature', 'special', 'popular', 'burger', 'pasta', 'burrata', 'drink', 'cocktail', 'coffee', 'wine'],
      response: `🍽️ <strong>Signature Dishes & Drinks:</strong><br>
      • <strong>Smoked Truffle Tagliatelle</strong> ($24.00)<br>
      • <strong>Charred Burrata Bowl</strong> ($14.00)<br>
      • <strong>Signature Double Smash Burger</strong> ($18.00)<br>
      • <strong>Cinnamon Smoked Cortado</strong> ($8.00)<br>
      • <strong>Smoked Rosemary Mezcal Paloma</strong> ($18.00)<br>
      View all curated items in our <a href="#menu" onclick="document.getElementById('salt-chatbot-widget').classList.remove('open');">Full Menu</a>.`
    },
    {
      keywords: ['vegan', 'vegetarian', 'gluten', 'gf', 'diet', 'allergy', 'dairy', 'celiac', 'halal'],
      response: `🥗 <strong>Dietary & Allergy Options:</strong><br>
      Yes! We offer <strong>Gluten-Free</strong> artisan focaccia and pasta substitutions, vibrant <strong>Vegan/Vegetarian</strong> garden bowls, and dairy-free oat/almond cold brews. Please note any dietary preferences on your booking form.`
    },
    {
      keywords: ['dress', 'code', 'wear', 'outfit', 'attire'],
      response: `👔 <strong>Dress Code:</strong><br>
      Our atmosphere is <strong>Smart Casual / Elegant Relaxed</strong>. We welcome stylish evening wear suited for fine dining and relaxed garden patio gatherings.`
    }
  ];

  function appendChatMessage(sender, htmlContent) {
    if (!chatbotMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender}-msg`;
    msgDiv.innerHTML = `<div class="msg-bubble">${htmlContent}</div>`;
    chatbotMessages.appendChild(msgDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function getFaqAnswer(userText) {
    const cleanText = userText.toLowerCase();
    for (const item of FAQ_DATABASE) {
      if (item.keywords.some(keyword => cleanText.includes(keyword))) {
        return item.response;
      }
    }
    return `Thank you for asking! 🌿 For specific event inquiries, private dining packages, or tailored requests, feel free to submit our <a href="#reservations" onclick="document.getElementById('salt-chatbot-widget').classList.remove('open');">Reservation Form</a> or reach our concierge directly at <strong>+1 (555) 019-2834</strong>.`;
  }

  window.handleChatSubmit = function() {
    if (!chatbotInput) return;
    const query = chatbotInput.value.trim();
    if (!query) return;

    // Add user message
    appendChatMessage('user', query);
    chatbotInput.value = '';

    // Simulate concierge typing response
    setTimeout(() => {
      const answer = getFaqAnswer(query);
      appendChatMessage('bot', answer);
    }, 400);
  };

  faqChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const question = chip.getAttribute('data-question') || chip.textContent;
      appendChatMessage('user', question);
      setTimeout(() => {
        const answer = getFaqAnswer(question);
        appendChatMessage('bot', answer);
      }, 350);
    });
  });

  // Mobile Bottom App Dock Handlers
  const dockBtnConcierge = document.getElementById('dock-btn-concierge');
  if (dockBtnConcierge && chatbotWidget) {
    dockBtnConcierge.addEventListener('click', (e) => {
      e.preventDefault();
      chatbotWidget.classList.toggle('open');
      if (chatbotWidget.classList.contains('open') && chatbotInput) {
        setTimeout(() => chatbotInput.focus(), 250);
      }
    });
  }

  // Active Bottom Dock highlighting on scroll
  const sections = document.querySelectorAll('section[id], footer[id]');
  const dockItems = document.querySelectorAll('.mobile-bottom-dock .dock-item');

  function updateDockActiveState() {
    const scrollPos = window.scrollY + 200;
    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        dockItems.forEach(item => {
          if (item.getAttribute('href') === `#${id}`) {
            item.classList.add('active');
          } else if (item.getAttribute('href')?.startsWith('#')) {
            item.classList.remove('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateDockActiveState, { passive: true });
}

// Event Listeners
window.addEventListener('resize', resizeCanvas, { passive: true });
window.addEventListener('scroll', updateScrollTarget, { passive: true });

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupUIEvents();
  preloadFrames();
});


