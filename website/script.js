const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const form = document.getElementById('waitlist-form');
const status = document.getElementById('form-status');

if (form && status) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = new FormData(form).get('email');
    if (!email) return;
    status.textContent = '🍻 You’re on the preview list. Waitlist backend is being connected next.';
    form.reset();
  });
}