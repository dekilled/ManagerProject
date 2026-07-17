const prompt = document.querySelector('#prompt');
const send = document.querySelector('#send');
const dialog = document.querySelector('#provider-dialog');
const form = document.querySelector('#provider-form');
const messages = document.querySelector('#messages');
const configKey = 'orion-providers';
const settingsKey = 'orion-provider-settings';
let providers = JSON.parse(localStorage.getItem(configKey) || '[]');
const legacy = JSON.parse(localStorage.getItem('orion-provider-config') || 'null');
if (!providers.length && legacy?.model) providers = [{ ...legacy, id: crypto.randomUUID(), name: legacy.provider === 'ollama' ? 'Meu Ollama' : 'Meu provedor' }];
let settings = JSON.parse(localStorage.getItem(settingsKey) || 'null') || { activeId: providers[0]?.id || null, routing: 'manual' };
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
  if (provider === 'hermes') return { url: 'http://localhost:3000/v1', model: '' };
  if (provider === 'compatible') return { url: 'http://localhost:1234/v1', model: '' };
  return { url: 'http://localhost:11434', model: 'llama3.1' };
}

function updateProviderUI() {
  const config = providers.find((provider) => provider.id === settings.activeId);
  const connected = Boolean(config?.model);
  const type = config?.provider === 'ollama' ? 'Ollama local' : config?.provider === 'openai' ? 'OpenAI' : config?.provider === 'hermes' ? 'Hermes Agents Workspace' : 'API compatível';
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
  const active = providers.find((provider) => provider.id === settings.activeId);
  const name = role === 'user' ? 'Você' : active?.name || 'Orion';
  message.innerHTML = `<div class="message-name">${name}</div><div class="message-content"></div>`;
  renderContent(message.querySelector('.message-content'), content);
  messages.append(message);
  message.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return message;
}

function renderContent(container, content) {
  const parts = content.split(/```([\w+#.-]*)\n?([\s\S]*?)```/g);
  parts.forEach((part, index) => {
    if (index % 3 === 0 && part) { const text = document.createElement('p'); text.textContent = part; container.append(text); }
    if (index % 3 === 1) { const code = document.createElement('section'); code.className = 'code-block'; code.innerHTML = `<header><span>${part || 'texto'}</span><button type="button" class="copy-code">Copiar</button></header><pre><code></code></pre>`; code.querySelector('code').textContent = parts[index + 1] || ''; container.append(code); }
  });
}

async function requestChat(config) {
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
  if (!providers.length) { openDialog(); return; }
  addMessage('user', content);
  history.push({ role: 'user', content });
  prompt.value = ''; resize(); send.disabled = true;
  const thinking = addMessage('assistant', 'Pensando…'); thinking.classList.add('thinking');
  try { const candidates = settings.routing === 'auto' ? [...providers.sort((a, b) => a.id === settings.activeId ? -1 : b.id === settings.activeId ? 1 : 0)] : [providers.find((provider) => provider.id === settings.activeId)]; let reply; let lastError; for (const provider of candidates) { try { settings.activeId = provider.id; updateProviderUI(); reply = await requestChat(provider); break; } catch (error) { lastError = error; } } if (!reply) throw lastError || new Error('Nenhum provedor está disponível.'); thinking.remove(); addMessage('assistant', reply); history.push({ role: 'assistant', content: reply }); }
  catch (error) { thinking.remove(); addMessage('assistant', `Não foi possível responder: ${error.message}`); }
  finally { send.disabled = false; prompt.focus(); }
}

send.addEventListener('click', () => submitMessage());

document.querySelector('.mobile-menu').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

function openDialog() {
  renderProviderList();
  const config = providers.find((provider) => provider.id === settings.activeId);
  fillForm(config);
  document.querySelector('#connection-result').textContent = '';
  dialog.showModal();
}

function fillForm(config) { const defaults = providerDefaults(config?.provider || 'ollama'); const fields = form.elements; fields.id.value = config?.id || ''; fields.name.value = config?.name || ''; fields.provider.value = config?.provider || 'ollama'; fields.url.value = config?.url || defaults.url; fields.model.value = config?.model || defaults.model; fields.key.value = config?.key || ''; fields.routing.value = settings.routing; }
function persist() { localStorage.setItem(configKey, JSON.stringify(providers)); localStorage.setItem(settingsKey, JSON.stringify(settings)); }
function renderProviderList() { const list = document.querySelector('#provider-list'); list.replaceChildren(); providers.forEach((provider) => { const row = document.createElement('div'); row.className = `provider-row ${provider.id === settings.activeId ? 'selected' : ''}`; row.innerHTML = `<button type="button" data-select="${provider.id}">${provider.name}<small>${provider.model}</small></button><button type="button" data-edit="${provider.id}">Editar</button><button type="button" data-delete="${provider.id}" aria-label="Excluir ${provider.name}">×</button>`; list.append(row); }); }
form.provider.addEventListener('change', () => { const defaults = providerDefaults(form.provider.value); form.url.value = defaults.url; form.model.value = defaults.model; form.key.placeholder = form.provider.value === 'ollama' ? 'Não é necessária para Ollama local' : 'Cole sua chave de API'; });
form.addEventListener('submit', (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(form)); const provider = { ...data, id: data.id || crypto.randomUUID() }; delete provider.routing; const found = providers.findIndex((item) => item.id === provider.id); if (found >= 0) providers[found] = provider; else providers.push(provider); settings.activeId = provider.id; settings.routing = form.routing.value; persist(); updateProviderUI(); renderProviderList(); document.querySelector('#connection-result').textContent = 'Provedor salvo.'; });
document.querySelector('#model-select').addEventListener('click', openDialog);
document.querySelector('#change-provider').addEventListener('click', openDialog);
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#add-provider').addEventListener('click', () => fillForm());
document.querySelector('#provider-list').addEventListener('click', (event) => { const action = Object.keys(event.target.dataset)[0]; const id = event.target.dataset[action]; if (!id) return; if (action === 'select') { settings.activeId = id; persist(); updateProviderUI(); renderProviderList(); } if (action === 'edit') fillForm(providers.find((provider) => provider.id === id)); if (action === 'delete') { providers = providers.filter((provider) => provider.id !== id); if (settings.activeId === id) settings.activeId = providers[0]?.id || null; persist(); updateProviderUI(); renderProviderList(); fillForm(); } });
document.querySelector('#test-connection').addEventListener('click', async () => { const trial = Object.fromEntries(new FormData(form)); const result = document.querySelector('#connection-result'); result.textContent = 'Testando…'; try { const endpoint = trial.provider === 'ollama' ? '/api/tags' : '/models'; const response = await fetch(`${trial.url.replace(/\/$/, '')}${endpoint}`, { headers: trial.key ? { Authorization: `Bearer ${trial.key}` } : {} }); if (!response.ok) throw new Error(`HTTP ${response.status}`); result.textContent = 'Conexão realizada com sucesso.'; } catch (error) { result.textContent = `Falha na conexão: ${error.message}`; } });
document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => submitMessage(button.dataset.prompt)));
document.querySelector('.new-chat').addEventListener('click', () => { history = []; messages.replaceChildren(); document.querySelector('#welcome').hidden = false; document.querySelector('#suggestions').hidden = false; document.querySelector('#conversation-title').textContent = 'Nova conversa'; });
messages.addEventListener('click', async (event) => { if (!event.target.matches('.copy-code')) return; const code = event.target.closest('.code-block').querySelector('code').textContent; await navigator.clipboard.writeText(code); event.target.textContent = 'Copiado!'; setTimeout(() => { event.target.textContent = 'Copiar'; }, 1500); });
updateProviderUI();
