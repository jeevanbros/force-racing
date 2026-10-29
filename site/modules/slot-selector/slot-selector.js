/**
 * Force Racing — Modular Slot Selector Component
 * SpaceX Standards: tactile 60fps micro-interaction, zero layout shift, accessibility.
 */
(function() {
  const SLOTS = [
    { id: 'slot-10-11', time: '10:00 – 11:00 AM', session: 'Morning Qual 1' },
    { id: 'slot-11-12', time: '11:00 – 12:00 PM', session: 'Morning Qual 2' },
    { id: 'slot-12-13', time: '12:00 – 01:00 PM', session: 'Midday Heat' },
    { id: 'slot-14-15', time: '02:00 – 03:00 PM', session: 'Afternoon Heat 1' },
    { id: 'slot-15-16', time: '03:00 – 04:00 PM', session: 'Afternoon Heat 2' },
    { id: 'slot-16-17', time: '04:00 – 05:00 PM', session: 'Sprint Shootout' }
  ];

  function initSlotSelector() {
    const containers = document.querySelectorAll('[data-slot-selector]');
    containers.forEach(container => {
      const form = container.closest('form');
      const targetInput = form ? form.querySelector('input[name="slot"]') || createHiddenSlotInput(form) : null;
      
      container.innerHTML = `
        <div class="slot-selector-container">
          <div class="slot-selector-header">
            <span class="slot-selector-label">SELECT PIT-LANE SLOT</span>
            <span class="slot-selector-status" id="slot-status-text">10 MIN HOT LAP</span>
          </div>
          <div class="slot-grid" role="radiogroup" aria-label="Sim Racing Track Slots">
            ${SLOTS.map((s, idx) => `
              <div class="slot-pill ${idx === 0 ? 'is-selected' : ''}" 
                   role="radio" 
                   tabindex="${idx === 0 ? '0' : '-1'}"
                   aria-checked="${idx === 0 ? 'true' : 'false'}"
                   data-slot-val="${s.time}">
                <span class="slot-time">${s.time.split(' – ')[0]}</span>
                <span class="slot-session">${s.session}</span>
                <span class="slot-pill-badge" aria-hidden="true"></span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      if (targetInput && SLOTS.length > 0) {
        targetInput.value = `${SLOTS[0].time} (${SLOTS[0].session})`;
      }

      const pills = container.querySelectorAll('.slot-pill');
      pills.forEach(pill => {
        pill.addEventListener('click', () => selectSlot(pill, pills, targetInput));
        pill.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            selectSlot(pill, pills, targetInput);
          }
        });
      });
    });
  }

  function selectSlot(selectedPill, allPills, targetInput) {
    allPills.forEach(p => {
      p.classList.remove('is-selected');
      p.setAttribute('aria-checked', 'false');
      p.setAttribute('tabindex', '-1');
    });

    selectedPill.classList.add('is-selected');
    selectedPill.setAttribute('aria-checked', 'true');
    selectedPill.setAttribute('tabindex', '0');
    selectedPill.focus();

    const slotVal = selectedPill.dataset.slotVal;
    const session = selectedPill.querySelector('.slot-session')?.textContent || '';
    if (targetInput) {
      targetInput.value = `${slotVal} (${session})`;
      targetInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function createHiddenSlotInput(form) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'slot';
    form.appendChild(input);
    return input;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSlotSelector);
  } else {
    initSlotSelector();
  }
})();
