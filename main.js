const prompt = document.querySelector('#prompt');
const send = document.querySelector('#send');
const dialog = document.querySelector('#provider-dialog');
const form = document.querySelector('#provider-form');
const messages = document.querySelector('#messages');
const configKey = 'orion-provider-config';
let config = JSON.parse(localStorage.getItem(configKey) || 'null');
let history = [];

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

function providerDefaults(provider) {
  if (provider === 'openai') return { url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };
  if (provider === 'compatible') return { url: 'http://localhost:1234/v1', model: '' };
  return { url: 'http://localhost:11434', model: 'llama3.1' };
}

function updateProviderUI() {
  const connected = Boolean(config?.model);
  const type = config?.provider === 'ollama' ? 'Ollama local' : config?.provider === 'openai' ? 'OpenAI' : 'API compatível';
  document.querySelector('#model-label').textContent = connected ? `${type} · ${config.model}` : 'Configurar provedor';
  document.querySelector('#provider-model').textContent = connected ? config.model : 'Configure um provedor';
  document.querySelector('#provider-type').textContent = connected ? type : 'Ollama, OpenAI ou compatível';
  document.querySelector('#provider-state').textContent = connected ? 'Modelo conectado' : 'Nenhum modelo conectado';
  document.querySelector('#provider-ready').textContent = connected ? 'Pronto' : 'Offline';
  document.querySelector('#provider-dot').classList.toggle('is-offline', !connected);
}

function addMessage(role, content) {
  document.querySelector('#welcome').hidden = true;
  document.querySelector('#suggestions').hidden = true;
  const message = document.createElement('article');
  message.className = `message ${role}`;
  const name = role === 'user' ? 'Você' : config?.provider === 'ollama' ? 'Ollama' : 'Orion';
  message.innerHTML = `<div class="message-name">${name}</div><div class="message-content"></div>`;
  message.querySelector('.message-content').textContent = content;
  messages.append(message);
  message.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return message;
}

async function requestChat() {
  if (config.provider === 'ollama') {
    const response = await fetch(`${config.url.replace(/\/$/, '')}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.model, messages: history, stream: false }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível chamar o Ollama.');
    return data.message.content;
  }
  const response = await fetch(`${config.url.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}) }, body: JSON.stringify({ model: config.model, messages: history }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Não foi possível chamar o provedor.');
  return data.choices?.[0]?.message?.content || 'O provedor não retornou uma resposta.';
}

async function submitMessage(value = prompt.value) {
  const content = value.trim();
  if (!content) return;
  if (!config?.model) { openDialog(); return; }
  addMessage('user', content);
  history.push({ role: 'user', content });
  prompt.value = ''; resize(); send.disabled = true;
  const thinking = addMessage('assistant', 'Pensando…'); thinking.classList.add('thinking');
  try { const reply = await requestChat(); thinking.remove(); addMessage('assistant', reply); history.push({ role: 'assistant', content: reply }); }
  catch (error) { thinking.remove(); addMessage('assistant', `Não foi possível responder: ${error.message}`); }
  finally { send.disabled = false; prompt.focus(); }
}

send.addEventListener('click', () => submitMessage());

document.querySelector('.mobile-menu').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

function openDialog() {
  const defaults = providerDefaults(config?.provider || 'ollama');
  form.provider.value = config?.provider || 'ollama'; form.url.value = config?.url || defaults.url; form.model.value = config?.model || defaults.model; form.key.value = config?.key || '';
  document.querySelector('#connection-result').textContent = '';
  dialog.showModal();
}

form.provider.addEventListener('change', () => { const defaults = providerDefaults(form.provider.value); form.url.value = defaults.url; form.model.value = defaults.model; form.key.placeholder = form.provider.value === 'ollama' ? 'Não é necessária para Ollama local' : 'Cole sua chave de API'; });
form.addEventListener('submit', (event) => { event.preventDefault(); config = Object.fromEntries(new FormData(form)); localStorage.setItem(configKey, JSON.stringify(config)); updateProviderUI(); dialog.close(); });
document.querySelector('#model-select').addEventListener('click', openDialog);
document.querySelector('#change-provider').addEventListener('click', openDialog);
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#test-connection').addEventListener('click', async () => { const trial = Object.fromEntries(new FormData(form)); const result = document.querySelector('#connection-result'); result.textContent = 'Testando…'; try { const endpoint = trial.provider === 'ollama' ? '/api/tags' : '/models'; const response = await fetch(`${trial.url.replace(/\/$/, '')}${endpoint}`, { headers: trial.key ? { Authorization: `Bearer ${trial.key}` } : {} }); if (!response.ok) throw new Error(`HTTP ${response.status}`); result.textContent = 'Conexão realizada com sucesso.'; } catch (error) { result.textContent = `Falha na conexão: ${error.message}`; } });
document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => submitMessage(button.dataset.prompt)));
document.querySelector('.new-chat').addEventListener('click', () => { history = []; messages.replaceChildren(); document.querySelector('#welcome').hidden = false; document.querySelector('#suggestions').hidden = false; document.querySelector('#conversation-title').textContent = 'Nova conversa'; });
updateProviderUI();
