const prompt = document.querySelector('#prompt');
const send = document.querySelector('#send');

function resize() {
  prompt.style.height = 'auto';
  prompt.style.height = `${Math.min(prompt.scrollHeight, 140)}px`;
}

prompt.addEventListener('input', resize);
prompt.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    send.click();
  }
});

send.addEventListener('click', () => {
  if (!prompt.value.trim()) return;
  prompt.value = '';
  resize();
  prompt.placeholder = 'Mensagem enviada — Orion está pensando...';
  setTimeout(() => { prompt.placeholder = 'Pergunte qualquer coisa ou peça para criar...'; }, 1800);
});

document.querySelector('.mobile-menu').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});
