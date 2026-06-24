const form = document.getElementById('applicationForm');
const toast = document.getElementById('successToast');
const closeToast = document.getElementById('closeToast');
const apiUrl = form?.dataset.apiUrl || document.querySelector('meta[name="application-api-url"]')?.content || '/api/join-team';

let toastTimer;

function showToast(message, isError = false) {
  toast.hidden = false;
  toast.classList.toggle('error', isError);
  toast.querySelector('strong').textContent = isError ? 'Submission failed' : 'Application submitted';
  toast.querySelector('p').textContent = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 6000);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const age = Number(data.get('age'));
  const email = String(data.get('email') || '').trim();
  const fullName = String(data.get('fullName') || '').trim();

  if (!fullName) {
    showToast('Please enter your full name.', true);
    return;
  }

  if (!Number.isFinite(age) || age < 16 || age > 24) {
    showToast('Please enter an age between 16 and 24.', true);
    return;
  }

  if (!email) {
    showToast('Please enter a valid email address.', true);
    return;
  }

  const payload = {
    fullName,
    age,
    email,
    phone: String(data.get('phone') || '').trim(),
    location: String(data.get('location') || '').trim(),
    skillsInterests: String(data.get('skillsInterests') || '').trim(),
    motivation: String(data.get('motivation') || '').trim(),
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Something went wrong while submitting the form.');
    }

    showToast(
      result.message || 'Thanks for applying. We will review your application and contact you if selected.'
    );
    form.reset();
  } catch (error) {
    showToast(error.message || 'Unable to submit right now. Please try again.', true);
  }
});

closeToast.addEventListener('click', () => {
  toast.hidden = true;
  window.clearTimeout(toastTimer);
});
