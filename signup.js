(() => {
  const form = document.getElementById('camper-check');
  const button = document.getElementById('continue');
  const status = document.getElementById('gate-status');
  const next = document.getElementById('next-step');
  const eligible = () => form.elements.damage.value === 'no' &&
    form.elements.clean.value === 'yes' && form.elements.rules.checked;
  function update() {
    const allowed = eligible();
    button.disabled = !allowed;
    next.hidden = true;
    const needsReview = form.elements.damage.value === 'yes' || form.elements.clean.value === 'no';
    status.textContent = needsReview
      ? 'Please contact the park at 479-641-0032 to discuss your camper before continuing.'
      : allowed ? 'You can continue to check availability.'
      : 'Answer both questions and agree to the park rules to continue.';
  }
  form.addEventListener('change', update);
  window.addEventListener('pageshow', update);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!eligible() || !form.reportValidity()) { update(); return; }
    next.hidden = false;
    document.getElementById('next-title').focus();
  });
  update();
})();
