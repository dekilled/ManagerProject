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
const chatsKey = 'orion-chats';
let chats = JSON.parse(localStorage.getItem(chatsKey) || '[]');
let currentChatId = null;
let history = [];
let workspaceHandle = null;
let openFile = null;

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

function addMessage(role, content, shouldPersist = true) {
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
  if (shouldPersist) saveMessage(role, content);
  return message;
}

function persistChats() { localStorage.setItem(chatsKey, JSON.stringify(chats)); }
function createChat() { const chat = { id: crypto.randomUUID(), title: 'Nova conversa', messages: [], updatedAt: Date.now() }; chats.unshift(chat); currentChatId = chat.id; history = []; messages.replaceChildren(); document.querySelector('#welcome').hidden = false; document.querySelector('#suggestions').hidden = false; document.querySelector('#conversation-title').textContent = chat.title; persistChats(); renderChats(); }
function saveMessage(role, content) { const chat = chats.find((item) => item.id === currentChatId); if (!chat) return; chat.messages.push({ role, content }); if (role === 'user' && chat.title === 'Nova conversa') chat.title = content.slice(0, 38) + (content.length > 38 ? '…' : ''); chat.updatedAt = Date.now(); history = chat.messages.map(({ role: messageRole, content: messageContent }) => ({ role: messageRole, content: messageContent })); document.querySelector('#conversation-title').textContent = chat.title; persistChats(); renderChats(); }
function renderChats() { const list = document.querySelector('#chat-list'); list.replaceChildren(); [...chats].sort((a, b) => b.updatedAt - a.updatedAt).forEach((chat) => { const item = document.createElement('div'); item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`; item.innerHTML = `<button type="button" data-open-chat="${chat.id}">${chat.title}</button><button type="button" data-rename-chat="${chat.id}" aria-label="Editar título">✎</button><button type="button" data-delete-chat="${chat.id}" aria-label="Excluir conversa">×</button>`; list.append(item); }); }
function openChat(id) { const chat = chats.find((item) => item.id === id); if (!chat) return; currentChatId = id; history = chat.messages.map(({ role, content }) => ({ role, content })); messages.replaceChildren(); document.querySelector('#welcome').hidden = Boolean(chat.messages.length); document.querySelector('#suggestions').hidden = Boolean(chat.messages.length); document.querySelector('#conversation-title').textContent = chat.title; chat.messages.forEach(({ role, content }) => { const message = document.createElement('article'); message.className = `message ${role}`; message.innerHTML = `<div class="message-name">${role === 'user' ? 'Você' : 'Orion'}</div><div class="message-content"></div>`; renderContent(message.querySelector('.message-content'), content); messages.append(message); }); renderChats(); }

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
  prompt.value = ''; resize(); send.disabled = true;
  const thinking = addMessage('assistant', 'Pensando…', false); thinking.classList.add('thinking');
  try { const candidates = settings.routing === 'auto' ? [...providers.sort((a, b) => a.id === settings.activeId ? -1 : b.id === settings.activeId ? 1 : 0)] : [providers.find((provider) => provider.id === settings.activeId)]; let reply; let lastError; for (const provider of candidates) { try { settings.activeId = provider.id; updateProviderUI(); reply = await requestChat(provider); break; } catch (error) { lastError = error; } } if (!reply) throw lastError || new Error('Nenhum provedor está disponível.'); thinking.remove(); addMessage('assistant', reply); }
  catch (error) { thinking.remove(); addMessage('assistant', `Não foi possível responder: ${error.message}`); }
  finally { send.disabled = false; prompt.focus(); }
}

send.addEventListener('click', () => submitMessage());

document.querySelector('.mobile-menu').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

function showWorkspace() { document.querySelector('.chat').hidden = true; document.querySelector('.composer-wrap').hidden = true; document.querySelector('#workspace-view').hidden = false; document.querySelector('#workspace-view').classList.add('active'); }
function showChat() { document.querySelector('.chat').hidden = false; document.querySelector('.composer-wrap').hidden = false; document.querySelector('#workspace-view').hidden = true; }
document.querySelector('#open-workspace').addEventListener('click', (event) => { event.preventDefault(); showWorkspace(); });
document.querySelector('.active').addEventListener('click', (event) => { event.preventDefault(); showChat(); });

async function chooseWorkspace() { if (!window.showDirectoryPicker) { alert('Este navegador não oferece acesso a diretórios. Use Chrome, Edge ou outro navegador baseado em Chromium.'); return; } try { workspaceHandle = await window.showDirectoryPicker({ mode: 'readwrite' }); document.querySelector('#workspace-path').textContent = workspaceHandle.name; await renderWorkspace(); } catch (error) { if (error.name !== 'AbortError') alert(`Não foi possível abrir o diretório: ${error.message}`); } }
async function renderWorkspace() { const tree = document.querySelector('#workspace-files'); tree.replaceChildren(); if (!workspaceHandle) return; await renderDirectory(workspaceHandle, tree, ''); }
async function renderDirectory(directory, target, path) { const entries = []; for await (const entry of directory.values()) entries.push(entry); entries.sort((a, b) => Number(b.kind === 'directory') - Number(a.kind === 'directory') || a.name.localeCompare(b.name)); for (const entry of entries) { const row = document.createElement('div'); row.className = `workspace-entry ${entry.kind}`; row.textContent = `${entry.kind === 'directory' ? '▸' : '◻'} ${entry.name}`; row.dataset.path = `${path}/${entry.name}`; row.dataset.kind = entry.kind; row._handle = entry; target.append(row); if (entry.kind === 'directory') { const children = document.createElement('div'); children.className = 'workspace-children'; children.hidden = true; target.append(children); row.addEventListener('click', async () => { children.hidden = !children.hidden; row.textContent = `${children.hidden ? '▸' : '▾'} ${entry.name}`; if (!children.dataset.loaded) { await renderDirectory(entry, children, row.dataset.path); children.dataset.loaded = 'true'; } }); } else row.addEventListener('click', () => openWorkspaceFile(entry, row.dataset.path)); } }
async function openWorkspaceFile(handle, path) { const file = await handle.getFile(); openFile = { handle, path }; document.querySelector('#editor-title').textContent = path; document.querySelector('#file-editor').value = await file.text(); document.querySelector('#file-editor').disabled = false; document.querySelector('#save-file').disabled = false; document.querySelector('#delete-file').disabled = false; document.querySelector('#run-file').disabled = false; document.querySelector('#file-preview').srcdoc = ''; }
async function parentDirectory(path) { let current = workspaceHandle; for (const part of path.split('/').filter(Boolean).slice(0, -1)) current = await current.getDirectoryHandle(part); return current; }
async function createEntry(kind) { if (!workspaceHandle) return alert('Selecione um diretório primeiro.'); const name = prompt(`Nome d${kind === 'file' ? 'o arquivo' : 'a pasta'}:`); if (!name?.trim()) return; try { if (kind === 'file') { const directory = openFile ? await parentDirectory(openFile.path) : workspaceHandle; await directory.getFileHandle(name.trim(), { create: true }); } else await workspaceHandle.getDirectoryHandle(name.trim(), { create: true }); await renderWorkspace(); } catch (error) { alert(`Não foi possível criar: ${error.message}`); } }
async function saveFile() { if (!openFile) return; const writable = await openFile.handle.createWritable(); await writable.write(document.querySelector('#file-editor').value); await writable.close(); document.querySelector('#editor-title').textContent = `${openFile.path} ✓`; }
async function deleteFile() { if (!openFile || !confirm(`Excluir ${openFile.path}?`)) return; try { const directory = await parentDirectory(openFile.path); await directory.removeEntry(openFile.handle.name); openFile = null; document.querySelector('#file-editor').value = ''; document.querySelector('#file-editor').disabled = true; ['#save-file', '#delete-file', '#run-file'].forEach((selector) => { document.querySelector(selector).disabled = true; }); await renderWorkspace(); } catch (error) { alert(`Não foi possível excluir: ${error.message}`); } }
function runFile() { if (!openFile) return; const code = document.querySelector('#file-editor').value; const extension = openFile.handle.name.split('.').pop().toLowerCase(); const documentCode = extension === 'html' || extension === 'htm' ? code : extension === 'js' ? `<script>${code}</script>` : `<pre>${code.replace(/</g, '&lt;')}</pre>`; document.querySelector('#file-preview').srcdoc = documentCode; }
document.querySelector('#choose-workspace').addEventListener('click', chooseWorkspace);
document.querySelector('#refresh-workspace').addEventListener('click', renderWorkspace);
document.querySelector('#new-file').addEventListener('click', () => createEntry('file'));
document.querySelector('#new-folder').addEventListener('click', () => createEntry('folder'));
document.querySelector('#save-file').addEventListener('click', saveFile);
document.querySelector('#delete-file').addEventListener('click', deleteFile);
document.querySelector('#run-file').addEventListener('click', runFile);

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
document.querySelector('.new-chat').addEventListener('click', createChat);
document.querySelector('#chat-list').addEventListener('click', (event) => { const { openChat: openId, renameChat: renameId, deleteChat: deleteId } = event.target.dataset; if (openId) openChat(openId); if (renameId) { const chat = chats.find((item) => item.id === renameId); const title = window.prompt('Título da conversa', chat?.title); if (title?.trim()) { chat.title = title.trim(); persistChats(); renderChats(); if (renameId === currentChatId) document.querySelector('#conversation-title').textContent = chat.title; } } if (deleteId) { chats = chats.filter((item) => item.id !== deleteId); persistChats(); if (deleteId === currentChatId) createChat(); else renderChats(); } });
messages.addEventListener('click', async (event) => { if (!event.target.matches('.copy-code')) return; const code = event.target.closest('.code-block').querySelector('code').textContent; await navigator.clipboard.writeText(code); event.target.textContent = 'Copiado!'; setTimeout(() => { event.target.textContent = 'Copiar'; }, 1500); });
updateProviderUI();
if (chats.length) openChat(chats[0].id); else createChat();
