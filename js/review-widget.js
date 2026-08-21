/**
 * Un Click - Review Widget Module
 * Review system for business detail page (business.html)
 * Uses the global `api` object and `formatDate` from app.js
 */

(function () {
  'use strict';

  // ─── Constants ─────────────────────────────────────────────
  const STAR_FILLED = '#ffc107';
  const STAR_EMPTY = '#dee2e6';
  const STAR_HOVER = '#ffdb70';

  // ─── State ────────────────────────────────────────────────
  let businessId = null;
  let selectedRating = 0;
  let hoverRating = 0;
  let isSubmitting = false;

  // ─── XSS Prevention ───────────────────────────────────────
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Star HTML Generator ──────────────────────────────────
  function generateStarsHTML(rating, size = '1.1rem') {
    let html = '';
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        html += `<i class="fas fa-star" style="color:${STAR_FILLED};font-size:${size};"></i>`;
      } else if (i === fullStars + 1 && hasHalf) {
        html += `<i class="fas fa-star-half-alt" style="color:${STAR_FILLED};font-size:${size};"></i>`;
      } else {
        html += `<i class="far fa-star" style="color:${STAR_EMPTY};font-size:${size};"></i>`;
      }
    }
    return html;
  }

  // ─── Rating Distribution Bar HTML ─────────────────────────
  function generateDistributionHTML(distribution, totalRatings) {
    if (!distribution || totalRatings === 0) {
      return `
        <div class="reviews-distribution">
          <p class="reviews-distribution-empty">Aún no hay reseñas</p>
        </div>
      `;
    }

    let html = '<div class="reviews-distribution">';
    for (let i = 5; i >= 1; i--) {
      const count = distribution[i] || 0;
      const percentage = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
      html += `
        <div class="reviews-dist-row">
          <span class="reviews-dist-label">${i} <i class="fas fa-star" style="color:${STAR_FILLED};font-size:0.7rem;"></i></span>
          <div class="reviews-dist-bar-wrap">
            <div class="reviews-dist-bar" style="width:${percentage}%;"></div>
          </div>
          <span class="reviews-dist-count">${count}</span>
        </div>
      `;
    }
    html += '</div>';
    return html;
  }

  // ─── Single Review Card HTML ───────────────────────────────
  function generateReviewCardHTML(review) {
    const userName = review.user_name || 'Usuario Anónimo';
    const comment = review.comment || '';
    const date = review.created_at ? formatDate(review.created_at) : '';
    const avatarInitial = userName.charAt(0).toUpperCase();
    const avatarBg = stringToColor(userName);

    return `
      <div class="review-card">
        <div class="review-card-header">
          <div class="review-avatar" style="background-color:${avatarBg};">${escapeHTML(avatarInitial)}</div>
          <div class="review-card-info">
            <span class="review-user-name">${escapeHTML(userName)}</span>
            <div class="review-stars">${generateStarsHTML(review.rating, '0.85rem')}</div>
          </div>
          <span class="review-date">${escapeHTML(date)}</span>
        </div>
        ${comment ? `<p class="review-comment">${escapeHTML(comment)}</p>` : ''}
      </div>
    `;
  }

  // ─── Generate color from string for avatar ─────────────────
  function stringToColor(str) {
    const colors = [
      '#1a73e8', '#28a745', '#dc3545', '#ff6b35', '#6f42c1',
      '#17a2b8', '#e83e8c', '#fd7e14', '#20c997', '#6610f2'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // ─── Star Selector HTML (interactive) ──────────────────────
  function generateStarSelectorHTML() {
    let html = '<div class="review-star-selector" id="reviewStarSelector">';
    for (let i = 1; i <= 5; i++) {
      html += `<i class="far fa-star review-star-btn" data-rating="${i}" style="color:${STAR_EMPTY};font-size:1.6rem;cursor:pointer;"></i>`;
    }
    html += '</div>';
    return html;
  }

  // ─── Full Reviews Section HTML ────────────────────────────
  function generateReviewsSectionHTML(data) {
    const avgRating = data.average_rating || 0;
    const totalRatings = data.total_ratings || 0;
    const reviews = data.reviews || [];
    const distribution = data.rating_distribution || {};

    const reviewFormHTML = isAuthenticated()
      ? generateReviewFormHTML()
      : `
        <div class="review-login-prompt">
          <i class="fas fa-user-lock"></i>
          <p><a href="login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}">Inicia sesión</a> para escribir una reseña</p>
        </div>
      `;

    return `
      <section class="reviews-section" id="reviewsSection">
        <div class="reviews-container">
          <!-- Rating Summary -->
          <div class="reviews-summary">
            <div class="reviews-summary-left">
              <div class="reviews-average-rating">
                <span class="reviews-avg-number">${avgRating > 0 ? avgRating.toFixed(1) : '—'}</span>
                <span class="reviews-avg-label">de 5</span>
              </div>
              <div class="reviews-avg-stars">${generateStarsHTML(avgRating, '1.2rem')}</div>
              <span class="reviews-total">${totalRatings} ${totalRatings === 1 ? 'reseña' : 'reseñas'}</span>
            </div>
            <div class="reviews-summary-right">
              ${generateDistributionHTML(distribution, totalRatings)}
            </div>
          </div>

          <!-- Review Form -->
          <div class="reviews-form-section" id="reviewFormSection">
            <h3 class="reviews-form-title"><i class="fas fa-pen"></i> Escribir Reseña</h3>
            ${reviewFormHTML}
          </div>

          <!-- Review List -->
          <div class="reviews-list-section">
            <h3 class="reviews-list-title"><i class="fas fa-comments"></i> Reseñas</h3>
            <div class="reviews-list" id="reviewsList">
              ${reviews.length > 0
                ? reviews.map(r => generateReviewCardHTML(r)).join('')
                : '<div class="reviews-empty"><i class="far fa-comment-dots"></i><p>Aún no hay reseñas. ¡Sé el primero!</p></div>'
              }
            </div>
          </div>
        </div>
      </section>
    `;
  }

  // ─── Review Form HTML ─────────────────────────────────────
  function generateReviewFormHTML() {
    return `
      <div class="review-form" id="reviewForm">
        <div class="review-form-stars">
          <label>Calificación:</label>
          ${generateStarSelectorHTML()}
        </div>
        <div class="review-form-comment">
          <label for="reviewComment">Tu reseña:</label>
          <textarea
            id="reviewComment"
            class="review-textarea"
            placeholder="Cuéntanos tu experiencia con este negocio..."
            rows="4"
            maxlength="1000"
          ></textarea>
          <div class="review-char-count"><span id="reviewCharCount">0</span>/1000</div>
        </div>
        <button class="btn btn-primary btn-review-submit" id="reviewSubmitBtn" type="button">
          <i class="fas fa-paper-plane"></i> Publicar Reseña
        </button>
      </div>
    `;
  }

  // ─── Append Reviews Section to DOM ─────────────────────────
  function appendReviewsSection(html) {
    const businessContent = document.getElementById('businessContent');
    if (!businessContent) return;

    // Remove existing reviews section if any (to allow refresh)
    const existing = document.getElementById('reviewsSection');
    if (existing) existing.remove();

    // Append after business content
    businessContent.insertAdjacentHTML('afterend', html);

    // Inject CSS if not already present
    injectStyles();

    // Initialize interactive elements
    initStarSelector();
    initSubmitButton();
    initCharCounter();
  }

  // ─── Inject CSS Styles ──────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('reviewWidgetStyles')) return;

    const style = document.createElement('style');
    style.id = 'reviewWidgetStyles';
    style.textContent = `
      /* ── Reviews Section ─────────────────────────────── */
      .reviews-section {
        margin-top: 32px;
        padding: 24px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        border: 1px solid #e9ecef;
      }

      .reviews-container {
        max-width: 100%;
      }

      /* Summary */
      .reviews-summary {
        display: flex;
        gap: 32px;
        align-items: center;
        padding-bottom: 24px;
        margin-bottom: 24px;
        border-bottom: 1px solid #e9ecef;
        flex-wrap: wrap;
      }

      .reviews-summary-left {
        text-align: center;
        min-width: 120px;
        flex-shrink: 0;
      }

      .reviews-average-rating {
        display: flex;
        align-items: baseline;
        gap: 4px;
        justify-content: center;
      }

      .reviews-avg-number {
        font-size: 2.8rem;
        font-weight: 800;
        color: #1a1a2e;
        line-height: 1;
      }

      .reviews-avg-label {
        font-size: 0.9rem;
        color: #999;
      }

      .reviews-avg-stars {
        margin: 6px 0;
        display: flex;
        gap: 2px;
        justify-content: center;
      }

      .reviews-total {
        font-size: 0.85rem;
        color: #666;
      }

      .reviews-summary-right {
        flex: 1;
        min-width: 200px;
      }

      /* Distribution */
      .reviews-distribution {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .reviews-distribution-empty {
        text-align: center;
        color: #999;
        font-style: italic;
        padding: 12px;
      }

      .reviews-dist-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .reviews-dist-label {
        font-size: 0.8rem;
        color: #666;
        min-width: 30px;
        text-align: right;
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .reviews-dist-bar-wrap {
        flex: 1;
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;
      }

      .reviews-dist-bar {
        height: 100%;
        background: linear-gradient(90deg, #ffc107, #ffdb70);
        border-radius: 4px;
        transition: width 0.5s ease;
        min-width: 0;
      }

      .reviews-dist-count {
        font-size: 0.75rem;
        color: #999;
        min-width: 20px;
        text-align: right;
      }

      /* Form */
      .reviews-form-section {
        margin-bottom: 28px;
        padding-bottom: 24px;
        border-bottom: 1px solid #e9ecef;
      }

      .reviews-form-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .reviews-form-title i {
        color: #1a73e8;
        font-size: 0.95rem;
      }

      .review-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .review-form-stars {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .review-form-stars label {
        font-size: 0.88rem;
        font-weight: 600;
        color: #333;
        white-space: nowrap;
      }

      .review-star-selector {
        display: flex;
        gap: 6px;
      }

      .review-star-btn {
        transition: color 0.15s ease, transform 0.15s ease;
      }

      .review-star-btn:hover {
        transform: scale(1.15);
      }

      .review-form-comment {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .review-form-comment label {
        font-size: 0.88rem;
        font-weight: 600;
        color: #333;
      }

      .review-textarea {
        width: 100%;
        padding: 12px 14px;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        font-size: 0.9rem;
        font-family: inherit;
        color: #333;
        resize: vertical;
        min-height: 80px;
        max-height: 200px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        outline: none;
      }

      .review-textarea:focus {
        border-color: #1a73e8;
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.15);
      }

      .review-textarea::placeholder {
        color: #aaa;
      }

      .review-char-count {
        text-align: right;
        font-size: 0.75rem;
        color: #999;
      }

      .btn-review-submit {
        align-self: flex-start;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 24px;
        background: linear-gradient(135deg, #1a73e8, #4a90e8);
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        color: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
        box-shadow: 0 2px 8px rgba(26, 115, 232, 0.3);
      }

      .btn-review-submit:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(26, 115, 232, 0.4);
      }

      .btn-review-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      .btn-review-submit .spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: review-spin 0.6s linear infinite;
      }

      @keyframes review-spin {
        to { transform: rotate(360deg); }
      }

      /* Login prompt */
      .review-login-prompt {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px dashed #dee2e6;
      }

      .review-login-prompt i {
        font-size: 1.3rem;
        color: #1a73e8;
      }

      .review-login-prompt p {
        margin: 0;
        font-size: 0.88rem;
        color: #666;
      }

      .review-login-prompt a {
        color: #1a73e8;
        font-weight: 600;
        text-decoration: underline;
      }

      /* Review List */
      .reviews-list-section {
        margin-top: 0;
      }

      .reviews-list-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .reviews-list-title i {
        color: #1a73e8;
        font-size: 0.95rem;
      }

      .reviews-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 500px;
        overflow-y: auto;
        padding-right: 4px;
      }

      /* Scrollbar */
      .reviews-list::-webkit-scrollbar {
        width: 6px;
      }
      .reviews-list::-webkit-scrollbar-track {
        background: transparent;
      }
      .reviews-list::-webkit-scrollbar-thumb {
        background: #dee2e6;
        border-radius: 3px;
      }
      .reviews-list::-webkit-scrollbar-thumb:hover {
        background: #adb5bd;
      }

      /* Review Card */
      .review-card {
        padding: 16px;
        background: #fafbfc;
        border-radius: 10px;
        border: 1px solid #eef0f2;
        transition: box-shadow 0.2s ease;
      }

      .review-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .review-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }

      .review-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: 0.95rem;
        flex-shrink: 0;
      }

      .review-card-info {
        flex: 1;
        min-width: 0;
      }

      .review-user-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: #1a1a2e;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .review-stars {
        display: flex;
        gap: 1px;
        margin-top: 2px;
      }

      .review-date {
        font-size: 0.78rem;
        color: #999;
        white-space: nowrap;
      }

      .review-comment {
        margin: 8px 0 0 50px;
        font-size: 0.9rem;
        color: #444;
        line-height: 1.6;
        word-break: break-word;
      }

      /* Empty State */
      .reviews-empty {
        text-align: center;
        padding: 32px 16px;
        color: #999;
      }

      .reviews-empty i {
        font-size: 2.5rem;
        margin-bottom: 12px;
        opacity: 0.4;
        display: block;
      }

      .reviews-empty p {
        font-size: 0.9rem;
        margin: 0;
      }

      /* Rating error message */
      .review-error {
        font-size: 0.82rem;
        color: #dc3545;
        margin-top: -6px;
        display: none;
      }

      .review-error.visible {
        display: block;
      }

      /* ── Responsive ─────────────────────────────────── */
      @media (max-width: 600px) {
        .reviews-section {
          margin-top: 20px;
          padding: 16px;
        }

        .reviews-summary {
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }

        .reviews-summary-right {
          width: 100%;
        }

        .review-comment {
          margin-left: 0;
        }

        .review-card-header {
          gap: 8px;
        }

        .btn-review-submit {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Interactive Star Selector ─────────────────────────────
  function initStarSelector() {
    const selector = document.getElementById('reviewStarSelector');
    if (!selector) return;

    const stars = selector.querySelectorAll('.review-star-btn');

    stars.forEach(star => {
      // Hover preview
      star.addEventListener('mouseenter', function () {
        hoverRating = parseInt(this.dataset.rating);
        updateStarDisplay(stars, hoverRating);
      });

      // Click to set
      star.addEventListener('click', function () {
        selectedRating = parseInt(this.dataset.rating);
        updateStarDisplay(stars, selectedRating);
        // Hide any error
        const errorEl = document.getElementById('reviewRatingError');
        if (errorEl) errorEl.classList.remove('visible');
      });
    });

    // Reset on mouse leave (back to selected)
    selector.addEventListener('mouseleave', function () {
      hoverRating = 0;
      updateStarDisplay(stars, selectedRating);
    });
  }

  function updateStarDisplay(stars, rating) {
    stars.forEach(star => {
      const starVal = parseInt(star.dataset.rating);
      if (starVal <= rating) {
        star.className = 'fas fa-star review-star-btn';
        star.style.color = STAR_FILLED;
      } else {
        star.className = 'far fa-star review-star-btn';
        star.style.color = STAR_EMPTY;
      }
    });
  }

  // ─── Submit Button ─────────────────────────────────────────
  function initSubmitButton() {
    const submitBtn = document.getElementById('reviewSubmitBtn');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', submitReview);
  }

  // ─── Character Counter ────────────────────────────────────
  function initCharCounter() {
    const textarea = document.getElementById('reviewComment');
    const counter = document.getElementById('reviewCharCount');
    if (!textarea || !counter) return;

    textarea.addEventListener('input', function () {
      counter.textContent = this.value.length;
      if (this.value.length >= 950) {
        counter.style.color = '#dc3545';
      } else {
        counter.style.color = '#999';
      }
    });
  }

  // ─── Submit Review ────────────────────────────────────────
  async function submitReview() {
    if (isSubmitting || !businessId) return;

    const textarea = document.getElementById('reviewComment');
    const submitBtn = document.getElementById('reviewSubmitBtn');
    const errorEl = document.getElementById('reviewRatingError');

    // Validate rating
    if (selectedRating === 0) {
      // Create error element if not exists
      if (!errorEl) {
        const errorDiv = document.createElement('p');
        errorDiv.id = 'reviewRatingError';
        errorDiv.className = 'review-error visible';
        errorDiv.textContent = 'Selecciona una calificación';
        const starsWrap = document.querySelector('.review-form-stars');
        if (starsWrap) starsWrap.after(errorDiv);
      } else {
        errorEl.classList.add('visible');
      }
      return;
    }

    const comment = textarea ? textarea.value.trim() : '';
    const commentLength = comment.length;

    // Minimum comment length (optional, 0 means no comment required)
    // Allow empty comment since not required by the API

    // Set submitting state
    isSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Publicando...';
    }

    try {
      await api.post('/reviews', {
        business_id: parseInt(businessId),
        rating: selectedRating,
        comment: comment || null,
      });

      showToast('¡Reseña publicada exitosamente! 🎉', 'success');

      // Reset form
      selectedRating = 0;
      hoverRating = 0;
      if (textarea) textarea.value = '';
      const counter = document.getElementById('reviewCharCount');
      if (counter) counter.textContent = '0';

      // Refresh reviews
      await loadReviews();
    } catch (error) {
      // Handle duplicate review (409)
      if (error.message && (error.message.includes('Ya has dejado') || error.message.includes('409'))) {
        showToast('Ya has dejado una reseña para este negocio.', 'warning');
      } else if (error.message && (error.message.includes('deshabilitadas') || error.message.includes('403'))) {
        showToast('Las reseñas están deshabilitadas temporalmente.', 'error');
      } else {
        showToast('Error al publicar la reseña. Intenta nuevamente.', 'error');
        console.error('Review submit error:', error);
      }
    } finally {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Reseña';
      }
    }
  }

  // ─── Load Reviews from API ────────────────────────────────
  async function loadReviews() {
    if (!businessId) return;

    try {
      const data = await api.get(`/reviews?business_id=${businessId}`);
      appendReviewsSection(generateReviewsSectionHTML(data));
    } catch (error) {
      console.error('Error loading reviews:', error);
      // Show a minimal error section
      const businessContent = document.getElementById('businessContent');
      if (businessContent && !document.getElementById('reviewsSection')) {
        businessContent.insertAdjacentHTML('afterend', `
          <section class="reviews-section" id="reviewsSection">
            <div class="reviews-container">
              <div class="reviews-empty">
                <i class="fas fa-exclamation-circle"></i>
                <p>No se pudieron cargar las reseñas en este momento.</p>
              </div>
            </div>
          </section>
        `);
        injectStyles();
      }
    }
  }

  // ─── Initialize ───────────────────────────────────────────
  function init() {
    // Check if we're on business.html (has #businessContent element)
    const businessContent = document.getElementById('businessContent');
    if (!businessContent) return;

    // Get business_id from URL params
    const urlParams = new URLSearchParams(window.location.search);
    businessId = urlParams.get('id') || window.__BUSINESS_ID;

    if (!businessId) return;

    // Wait for business content to be visible, then load reviews
    // Use MutationObserver to detect when businessContent becomes visible
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (!businessContent.classList.contains('hidden')) {
            observer.disconnect();
            loadReviews();
          }
        }
      });
    });

    observer.observe(businessContent, { attributes: true });

    // If already visible (race condition), load immediately
    if (!businessContent.classList.contains('hidden')) {
      observer.disconnect();
      loadReviews();
    }

    // Fallback: load after a short delay regardless
    setTimeout(function () {
      if (!document.getElementById('reviewsSection') && !businessContent.classList.contains('hidden')) {
        loadReviews();
      }
    }, 2000);
  }

  // ─── Auto-init on DOMContentLoaded ────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
