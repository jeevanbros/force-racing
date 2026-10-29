/**
 * Force Racing — Caller Dialer Component Module
 * Standard: SpaceX Motorsport Telemetry Standards
 * Clean, modular, zero-dependency dialer integration.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CallerDialer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Crisp racing-spec phone handset SVG
  var CALLER_SVG = '<svg class="fr-caller-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>';

  /**
   * Cleans telephone numbers for use in tel: URI scheme
   * e.g., '+91 80083 91525' -> '+918008391525'
   */
  function cleanTel(raw) {
    if (!raw) return '';
    var trimmed = String(raw).trim();
    var hasPlus = trimmed.charAt(0) === '+';
    var digits = trimmed.replace(/\D/g, '');
    if (hasPlus) return '+' + digits;
    if (digits.length === 10) return '+91' + digits;
    return '+' + digits;
  }

  /**
   * Generates clean HTML for caller dialer component
   * @param {string} name - Organizer/team member name
   * @param {string} phone - Mobile number (e.g. '+91 80083 91525')
   * @param {Object} [options] - Configuration options
   * @param {string} [options.variant] - 'inline' | 'card' | 'button' | 'roster'
   * @param {string} [options.role] - Optional subtitle (e.g. 'Team Manager')
   * @param {string} [options.className] - Additional CSS class names
   * @returns {string} Safe HTML string
   */
  function render(name, phone, options) {
    options = options || {};
    var tel = cleanTel(phone);
    var safeName = String(name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    var safeRole = options.role ? String(options.role).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
    var label = options.role ? 'Call ' + safeName + ' (' + safeRole + ')' : 'Call ' + safeName;
    var extraClass = options.className ? ' ' + options.className : '';

    if (options.variant === 'card') {
      return (
        '<div class="fr-caller-card' + extraClass + '">' +
          '<div class="fr-caller-card-info">' +
            '<span class="fr-caller-name">' + safeName + '</span>' +
            (safeRole ? '<span class="fr-caller-role muted">' + safeRole + '</span>' : '') +
          '</div>' +
          '<a href="tel:' + tel + '" class="fr-caller-btn" aria-label="' + label + '" data-fr-caller>' +
            CALLER_SVG +
            '<span class="fr-caller-btn-text">Call Coordinator</span>' +
          '</a>' +
        '</div>'
      );
    }

    if (options.variant === 'button') {
      return (
        '<a href="tel:' + tel + '" class="fr-caller-btn' + extraClass + '" aria-label="' + label + '" data-fr-caller>' +
          CALLER_SVG +
          '<span>' + safeName + '</span>' +
        '</a>'
      );
    }

    // Default: 'inline' variant (Exact typography font name + crisp caller icon badge)
    return (
      '<a href="tel:' + tel + '" class="fr-caller-link' + extraClass + '" aria-label="' + label + '" data-fr-caller>' +
        '<span class="fr-caller-name">' + safeName + '</span>' +
        '<span class="fr-caller-icon-badge" aria-hidden="true">' + CALLER_SVG + '</span>' +
      '</a>'
    );
  }

  /**
   * Initializes tactile haptic feedback & auto-upgrades data-caller-dialer elements
   */
  function init() {
    // 1. Upgrade any DOM elements marked for dynamic caller generation
    var slots = document.querySelectorAll('[data-caller-dialer]');
    slots.forEach(function (el) {
      var name = el.getAttribute('data-name');
      var phone = el.getAttribute('data-phone');
      var variant = el.getAttribute('data-variant') || 'inline';
      var role = el.getAttribute('data-role') || '';
      if (name && phone) {
        el.outerHTML = render(name, phone, { variant: variant, role: role });
      }
    });

    // 2. Attach tactile haptic feedback on devices with vibration support
    document.addEventListener('click', function (e) {
      var target = e.target.closest('[data-fr-caller], .fr-caller-link, .fr-caller-btn, .fr-caller-icon-badge');
      if (target && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(12); // Crisp 12ms tactile racing feedback
        } catch (_) {}
      }
    }, { passive: true });
  }

  // Auto-init when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    CALLER_SVG: CALLER_SVG,
    cleanTel: cleanTel,
    render: render,
    init: init
  };
});
