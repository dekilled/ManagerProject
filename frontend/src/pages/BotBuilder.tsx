import { useEffect, useState, useRef, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Save, Play, Power, Trash2, X, Bot, ArrowRight,
  MessageSquare, HelpCircle, GitBranch, Zap, List, StopCircle, PlayCircle,
  ChevronLeft,
} from 'lucide-react';
import { useStore } from '../store';
import { botsApi } from '../api';
import type { Bot as BotType, BotBlock, Connection, BlockType } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ─── Block config ────────────────────────────────────────────────────────────

const BLOCK_META: Record<BlockType, { label: string; color: string; bg: string; border: string; icon: React.ElementType; description: string }> = {
  start: { label: 'Início', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-400', icon: PlayCircle, description: 'Ponto de entrada do bot' },
  message: { label: 'Mensagem', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-400', icon: MessageSquare, description: 'Envia uma mensagem ao cliente' },
  question: { label: 'Pergunta', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-400', icon: HelpCircle, description: 'Faz uma pergunta e salva a resposta' },
  condition: { label: 'Condição', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-400', icon: GitBranch, description: 'Ramifica baseado em condição' },
  action: { label: 'Ação', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400', icon: Zap, description: 'Executa uma ação do sistema' },
  menu: { label: 'Menu', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-400', icon: List, description: 'Exibe menu de opções' },
  end: { label: 'Fim', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-400', icon: StopCircle, description: 'Encerra a conversa' },
};

const BLOCK_WIDTH = 200;
const BLOCK_HEIGHT = 80;

// ─── Palette item ─────────────────────────────────────────────────────────────

function PaletteItem({ type }: { type: BlockType }) {
  const meta = BLOCK_META[type];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { fromPalette: true, blockType: type },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing
        ${meta.bg} ${meta.border} ${meta.color} select-none`}
    >
      <meta.icon size={16} />
      <div>
        <p className="text-xs font-semibold">{meta.label}</p>
        <p className="text-xs opacity-70 hidden xl:block">{meta.description}</p>
      </div>
    </div>
  );
}

// ─── Canvas block ─────────────────────────────────────────────────────────────

interface CanvasBlockProps {
  block: BotBlock;
  selected: boolean;
  connecting: boolean;
  connectingFrom: { blockId: string; output: string } | null;
  onClick: () => void;
  onOutputClick: (output: string, e: React.MouseEvent) => void;
  onInputClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
}

function CanvasBlock({
  block,
  selected,
  connecting,
  connectingFrom,
  onClick,
  onOutputClick,
  onInputClick,
  onDelete,
}: CanvasBlockProps) {
  const meta = BLOCK_META[block.type];
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `canvas-${block.id}`,
    data: { fromCanvas: true, blockId: block.id },
  });

  const style = {
    position: 'absolute' as const,
    left: block.position.x,
    top: block.position.y,
    width: BLOCK_WIDTH,
    transform: CSS.Translate.toString(transform),
    zIndex: selected ? 20 : 10,
  };

  const outputs = getOutputs(block);
  const isConnectingTarget = connecting && connectingFrom?.blockId !== block.id;
  const isConnectingSource = connectingFrom?.blockId === block.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bot-block rounded-xl border-2 shadow-md select-none
        ${meta.bg} ${meta.border}
        ${selected ? 'selected' : ''}
        ${isConnectingTarget ? 'ring-2 ring-blue-400 cursor-pointer' : ''}
        ${isConnectingSource ? 'ring-2 ring-yellow-400' : ''}
      `}
      onClick={(e) => {
        if (connecting && isConnectingTarget) {
          onInputClick(e);
        } else {
          onClick();
        }
      }}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing border-b border-current/20"
        onClick={(e) => { if (!connecting) { e.stopPropagation(); onClick(); } }}
      >
        <meta.icon size={14} className={meta.color} />
        <span className={`text-xs font-bold ${meta.color} flex-1 truncate`}>{meta.label}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-400 hover:text-red-500"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 py-2 text-xs text-slate-600">
        {getBlockPreview(block)}
      </div>

      {/* Input port */}
      {block.type !== 'start' && (
        <div
          className="port-input absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-slate-400 cursor-pointer hover:border-blue-500 hover:bg-blue-50 z-20"
          onClick={(e) => { e.stopPropagation(); if (connecting) onInputClick(e); }}
          title="Entrada"
        />
      )}

      {/* Output ports */}
      {block.type !== 'end' && outputs.map((out, i) => (
        <div
          key={out.id}
          className="port-output absolute -bottom-2.5 w-4 h-4 rounded-full bg-white border-2 border-slate-400 cursor-pointer hover:border-green-500 hover:bg-green-50 z-20"
          style={{ left: outputs.length === 1 ? '50%' : `${(i + 1) * 100 / (outputs.length + 1)}%`, transform: 'translateX(-50%)' }}
          onClick={(e) => { e.stopPropagation(); onOutputClick(out.id, e); }}
          title={out.label}
        >
          {outputs.length > 1 && (
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap">
              {out.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function getOutputs(block: BotBlock): { id: string; label: string }[] {
  switch (block.type) {
    case 'condition':
      return [{ id: 'true', label: 'Sim' }, { id: 'false', label: 'Não' }];
    case 'menu': {
      const options = (block.config.options as string[]) || [];
      return options.map((opt, i) => ({ id: String(i), label: opt || `Opção ${i + 1}` }));
    }
    case 'end':
      return [];
    default:
      return [{ id: 'default', label: '' }];
  }
}

function getBlockPreview(block: BotBlock): string {
  switch (block.type) {
    case 'start': return 'Início da conversa';
    case 'message': return String(block.config.text || 'Sem texto') .slice(0, 60) + (String(block.config.text || '').length > 60 ? '...' : '');
    case 'question': return String(block.config.text || 'Sem pergunta').slice(0, 50) + '...';
    case 'condition': return `Se {${block.config.variable || 'var'}} ${block.config.operator || '='} "${block.config.value || ''}"`;
    case 'action': return `Ação: ${block.config.actionType || 'N/A'}`;
    case 'menu': {
      const opts = (block.config.options as string[]) || [];
      return opts.slice(0, 2).map((o, i) => `${i + 1}. ${o}`).join(', ') + (opts.length > 2 ? '...' : '');
    }
    case 'end': return String(block.config.message || 'Fim da conversa');
    default: return '';
  }
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropertiesPanel({
  block,
  onChange,
  onClose,
}: {
  block: BotBlock;
  onChange: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const meta = BLOCK_META[block.type];
  const [config, setConfig] = useState<Record<string, unknown>>(block.config);

  useEffect(() => {
    setConfig(block.config);
  }, [block.id]);

  const update = (key: string, value: unknown) => {
    const newCfg = { ...config, [key]: value };
    setConfig(newCfg);
    onChange(newCfg);
  };

  const renderFields = () => {
    switch (block.type) {
      case 'start':
        return <p className="text-xs text-slate-500">Este é o bloco de início. Não há configurações.</p>;

      case 'message':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mensagem</label>
            <textarea
              value={String(config.text || '')}
              onChange={e => update('text', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Digite a mensagem..."
            />
          </div>
        );

      case 'question':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Pergunta</label>
              <textarea
                value={String(config.text || '')}
                onChange={e => update('text', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Digite a pergunta..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Variável (para salvar resposta)</label>
              <input
                type="text"
                value={String(config.variableName || '')}
                onChange={e => update('variableName', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ex: nome, produto, problema"
              />
            </div>
          </>
        );

      case 'condition':
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Variável</label>
              <input
                type="text"
                value={String(config.variable || '')}
                onChange={e => update('variable', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="nome_variavel"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Operador</label>
              <select
                value={String(config.operator || 'equals')}
                onChange={e => update('operator', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="equals">igual a</option>
                <option value="not_equals">diferente de</option>
                <option value="contains">contém</option>
                <option value="greater_than">maior que</option>
                <option value="less_than">menor que</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Valor</label>
              <input
                type="text"
                value={String(config.value || '')}
                onChange={e => update('value', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="valor de comparação"
              />
            </div>
          </>
        );

      case 'action':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tipo de Ação</label>
            <select
              value={String(config.actionType || 'check_stock')}
              onChange={e => update('actionType', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="check_stock">Verificar Estoque</option>
              <option value="create_ticket">Criar Ticket de Suporte</option>
              <option value="lookup_customer">Buscar Cliente</option>
              <option value="send_email">Enviar E-mail</option>
            </select>
          </div>
        );

      case 'menu': {
        const options = (config.options as string[]) || [''];
        return (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Texto do menu</label>
              <textarea
                value={String(config.text || '')}
                onChange={e => update('text', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Escolha uma opção:"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Opções</label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-xs text-slate-400 w-5 mt-2 flex-shrink-0">{i + 1}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const newOpts = [...options];
                        newOpts[i] = e.target.value;
                        update('options', newOpts);
                      }}
                      className="flex-1 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Opção ${i + 1}`}
                    />
                    {options.length > 1 && (
                      <button
                        onClick={() => update('options', options.filter((_, j) => j !== i))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => update('options', [...options, ''])}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus size={12} /> Adicionar opção
                </button>
              </div>
            </div>
          </>
        );
      }

      case 'end':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mensagem de despedida</label>
            <textarea
              value={String(config.message || '')}
              onChange={e => update('message', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Obrigado pelo contato!"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-64 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
      <div className={`flex items-center justify-between p-4 border-b border-slate-200 ${meta.bg}`}>
        <div className="flex items-center gap-2">
          <meta.icon size={16} className={meta.color} />
          <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 p-4 space-y-4 overflow-auto text-xs">
        <div className="text-xs text-slate-400 font-mono">ID: {block.id.slice(0, 8)}...</div>
        {renderFields()}
      </div>
    </div>
  );
}

// ─── Test/Simulation chat ─────────────────────────────────────────────────────

interface ChatMessage {
  role: 'bot' | 'user';
  text: string;
}

function TestChat({ bot, onClose }: { bot: BotType; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [currentBlockId, setCurrentBlockId] = useState<string | null>(null);
  const [waitingInput, setWaitingInput] = useState<{ variableName?: string } | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [ended, setEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const addMsg = (role: 'bot' | 'user', text: string) =>
    setMessages(m => [...m, { role, text }]);

  const findBlock = useCallback((id: string) => bot.blocks.find(b => b.id === id), [bot.blocks]);

  const getNextBlock = useCallback((fromBlockId: string, fromOutput: string): BotBlock | null => {
    const conn = bot.connections.find(c => c.fromBlockId === fromBlockId && c.fromOutput === fromOutput);
    if (!conn) return null;
    return findBlock(conn.toBlockId) || null;
  }, [bot.connections, findBlock]);

  const processBlock = useCallback((block: BotBlock, vars: Record<string, string>) => {
    switch (block.type) {
      case 'start': {
        const next = getNextBlock(block.id, 'default');
        if (next) setTimeout(() => processBlock(next, vars), 300);
        break;
      }
      case 'message': {
        addMsg('bot', String(block.config.text || ''));
        const next = getNextBlock(block.id, 'default');
        if (next) setTimeout(() => processBlock(next, vars), 500);
        break;
      }
      case 'question': {
        addMsg('bot', String(block.config.text || ''));
        setCurrentBlockId(block.id);
        setWaitingInput({ variableName: block.config.variableName as string });
        break;
      }
      case 'condition': {
        const varName = String(block.config.variable || '');
        const op = String(block.config.operator || 'equals');
        const val = String(block.config.value || '');
        const actual = vars[varName] || '';
        let result = false;
        if (op === 'equals') result = actual === val;
        else if (op === 'not_equals') result = actual !== val;
        else if (op === 'contains') result = actual.includes(val);
        else if (op === 'greater_than') result = parseFloat(actual) > parseFloat(val);
        else if (op === 'less_than') result = parseFloat(actual) < parseFloat(val);
        const output = result ? 'true' : 'false';
        const next = getNextBlock(block.id, output);
        if (next) setTimeout(() => processBlock(next, vars), 300);
        break;
      }
      case 'action': {
        const actions: Record<string, string> = {
          check_stock: '[Sistema] Verificando estoque do produto...',
          create_ticket: '[Sistema] Ticket de suporte criado com sucesso!',
          lookup_customer: '[Sistema] Buscando dados do cliente...',
          send_email: '[Sistema] E-mail enviado com sucesso!',
        };
        addMsg('bot', actions[String(block.config.actionType || 'check_stock')] || '[Ação executada]');
        const next = getNextBlock(block.id, 'default');
        if (next) setTimeout(() => processBlock(next, vars), 600);
        break;
      }
      case 'menu': {
        const options = (block.config.options as string[]) || [];
        const text = String(block.config.text || 'Escolha uma opção:');
        const optText = options.map((o, i) => `${i + 1}. ${o}`).join('\n');
        addMsg('bot', `${text}\n${optText}`);
        setCurrentBlockId(block.id);
        setWaitingInput({});
        break;
      }
      case 'end': {
        addMsg('bot', String(block.config.message || 'Conversa encerrada.'));
        setEnded(true);
        setWaitingInput(null);
        break;
      }
    }
  }, [getNextBlock]);

  useEffect(() => {
    // Start simulation
    const startBlock = bot.blocks.find(b => b.type === 'start');
    if (startBlock) {
      processBlock(startBlock, {});
    } else {
      addMsg('bot', 'Bot sem bloco de início configurado.');
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !currentBlockId || !waitingInput || ended) return;

    addMsg('user', input.trim());
    const userInput = input.trim();
    setInput('');

    const block = findBlock(currentBlockId);
    if (!block) return;

    if (block.type === 'question' && waitingInput.variableName) {
      const newVars = { ...variables, [waitingInput.variableName]: userInput };
      setVariables(newVars);
      setWaitingInput(null);
      setCurrentBlockId(null);
      const next = getNextBlock(block.id, 'default');
      if (next) setTimeout(() => processBlock(next, newVars), 300);
    } else if (block.type === 'menu') {
      const options = (block.config.options as string[]) || [];
      const idx = parseInt(userInput) - 1;
      if (idx >= 0 && idx < options.length) {
        setWaitingInput(null);
        setCurrentBlockId(null);
        const next = getNextBlock(block.id, String(idx));
        if (next) setTimeout(() => processBlock(next, variables), 300);
      } else {
        addMsg('bot', `Por favor, escolha uma opção de 1 a ${options.length}.`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <div>
              <p className="font-semibold text-sm">{bot.name}</p>
              <p className="text-xs text-blue-200">Simulação de conversa</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 rounded-lg p-1">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'bot' && (
                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line
                ${msg.role === 'bot'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200 rounded-tl-sm'
                  : 'bg-blue-600 text-white rounded-tr-sm'
                }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {!waitingInput && !ended && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]"></span>
                </div>
              </div>
            </div>
          )}
          {ended && (
            <div className="text-center text-xs text-slate-400 py-2">— Conversa encerrada —</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={!waitingInput || ended}
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder={ended ? 'Conversa encerrada' : waitingInput ? 'Digite sua resposta...' : 'Aguardando bot...'}
            />
            <button
              onClick={handleSend}
              disabled={!waitingInput || ended || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Canvas drop zone ─────────────────────────────────────────────────────────

function CanvasDropZone({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'canvas' });
  return (
    <div
      ref={setNodeRef}
      className={`relative flex-1 bot-canvas overflow-auto min-h-full transition-colors ${isOver ? 'brightness-110' : ''}`}
      style={{ minWidth: 1200, minHeight: 900 }}
    >
      {children}
    </div>
  );
}

// ─── SVG Connections ──────────────────────────────────────────────────────────

function ConnectionLines({
  blocks,
  connections,
  onDelete,
}: {
  blocks: BotBlock[];
  connections: Connection[];
  onDelete: (id: string) => void;
}) {
  const blockMap = new Map(blocks.map(b => [b.id, b]));

  const getPortPos = (block: BotBlock, portType: 'input' | 'output', outputId: string) => {
    const outputs = getOutputs(block);
    if (portType === 'input') {
      return { x: block.position.x + BLOCK_WIDTH / 2, y: block.position.y };
    } else {
      const idx = outputs.findIndex(o => o.id === outputId);
      const pct = (idx + 1) / (outputs.length + 1);
      return { x: block.position.x + BLOCK_WIDTH * pct, y: block.position.y + BLOCK_HEIGHT };
    }
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: 1200, height: 900 }}
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
        </marker>
      </defs>
      {connections.map(conn => {
        const from = blockMap.get(conn.fromBlockId);
        const to = blockMap.get(conn.toBlockId);
        if (!from || !to) return null;
        const start = getPortPos(from, 'output', conn.fromOutput);
        const end = getPortPos(to, 'input', '');
        const cy = (end.y - start.y) / 2;
        const path = `M ${start.x} ${start.y} C ${start.x} ${start.y + cy} ${end.x} ${end.y - cy} ${end.x} ${end.y}`;
        return (
          <g key={conn.id}>
            <path
              d={path}
              stroke="#475569"
              strokeWidth="2"
              fill="none"
              markerEnd="url(#arrow)"
              className="pointer-events-stroke"
            />
            <path
              d={path}
              stroke="transparent"
              strokeWidth="12"
              fill="none"
              className="pointer-events-stroke cursor-pointer"
              style={{ pointerEvents: 'stroke' }}
              onClick={() => onDelete(conn.id)}
              title="Clique para remover"
            />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main BotBuilder ──────────────────────────────────────────────────────────

export default function BotBuilder() {
  const { bots, fetchBots } = useStore();
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<BotBlock[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ blockId: string; output: string } | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newBotModal, setNewBotModal] = useState(false);
  const [newBotForm, setNewBotForm] = useState({ name: '', description: '' });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    fetchBots();
  }, []);

  useEffect(() => {
    if (bots.length > 0 && selectedBotId === null) {
      loadBot(bots[0]);
    }
  }, [bots]);

  const loadBot = (bot: BotType) => {
    setSelectedBotId(bot.id);
    setBlocks(bot.blocks || []);
    setConnections(bot.connections || []);
    setSelectedBlock(null);
    setConnectingFrom(null);
  };

  const currentBot = bots.find(b => b.id === selectedBotId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over, delta } = event;

    if (!over) return;

    const activeData = active.data.current as { fromPalette?: boolean; fromCanvas?: boolean; blockType?: BlockType; blockId?: string };

    if (activeData?.fromPalette && over.id === 'canvas') {
      // Get canvas rect to compute drop position
      const canvasEl = canvasRef.current;
      const canvasRect = canvasEl?.getBoundingClientRect();

      // Estimate position from delta + initial offset
      // Since we don't have the absolute drop coordinate easily, use a default centered position with some offset
      const existingCount = blocks.length;
      const x = 50 + (existingCount % 4) * 230;
      const y = 50 + Math.floor(existingCount / 4) * 160;

      const newBlock: BotBlock = {
        id: `block-${uuidv4().slice(0, 8)}`,
        type: activeData.blockType!,
        position: { x, y },
        config: getDefaultConfig(activeData.blockType!),
      };
      setBlocks(b => [...b, newBlock]);
    } else if (activeData?.fromCanvas && over.id === 'canvas') {
      const blockId = activeData.blockId!;
      setBlocks(prev => prev.map(b => {
        if (b.id === blockId) {
          return {
            ...b,
            position: {
              x: Math.max(0, b.position.x + delta.x),
              y: Math.max(0, b.position.y + delta.y),
            },
          };
        }
        return b;
      }));
    }
  };

  function getDefaultConfig(type: BlockType): Record<string, unknown> {
    switch (type) {
      case 'message': return { text: 'Digite sua mensagem aqui' };
      case 'question': return { text: 'Qual é sua dúvida?', variableName: 'resposta' };
      case 'condition': return { variable: '', operator: 'equals', value: '' };
      case 'action': return { actionType: 'check_stock' };
      case 'menu': return { text: 'Escolha uma opção:', options: ['Opção 1', 'Opção 2'] };
      case 'end': return { message: 'Obrigado pelo contato! Até logo!' };
      default: return {};
    }
  }

  const handleOutputClick = (blockId: string, output: string) => {
    if (connectingFrom) {
      setConnectingFrom(null);
    } else {
      setConnectingFrom({ blockId, output });
    }
  };

  const handleInputClick = (targetBlockId: string) => {
    if (!connectingFrom) return;
    if (connectingFrom.blockId === targetBlockId) {
      setConnectingFrom(null);
      return;
    }

    // Check if connection already exists
    const exists = connections.some(
      c => c.fromBlockId === connectingFrom.blockId && c.fromOutput === connectingFrom.output && c.toBlockId === targetBlockId
    );
    if (exists) { setConnectingFrom(null); return; }

    // Remove existing connection from same output
    const filtered = connections.filter(
      c => !(c.fromBlockId === connectingFrom.blockId && c.fromOutput === connectingFrom.output)
    );

    const newConn: Connection = {
      id: `conn-${uuidv4().slice(0, 8)}`,
      fromBlockId: connectingFrom.blockId,
      fromOutput: connectingFrom.output,
      toBlockId: targetBlockId,
    };
    setConnections([...filtered, newConn]);
    setConnectingFrom(null);
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(b => b.filter(bl => bl.id !== blockId));
    setConnections(c => c.filter(cn => cn.fromBlockId !== blockId && cn.toBlockId !== blockId));
    if (selectedBlock === blockId) setSelectedBlock(null);
  };

  const deleteConnection = (connId: string) => {
    setConnections(c => c.filter(cn => cn.id !== connId));
  };

  const updateBlockConfig = (blockId: string, config: Record<string, unknown>) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, config } : b));
  };

  const saveBot = async () => {
    if (!currentBot) return;
    setSaving(true);
    try {
      await botsApi.update(currentBot.id, {
        ...currentBot,
        blocks,
        connections,
      });
      await fetchBots();
    } finally {
      setSaving(false);
    }
  };

  const toggleBotActive = async () => {
    if (!currentBot) return;
    await botsApi.toggle(currentBot.id);
    await fetchBots();
  };

  const createBot = async () => {
    if (!newBotForm.name) return;
    const bot = await botsApi.create(newBotForm);
    await fetchBots();
    loadBot(bot);
    setNewBotModal(false);
    setNewBotForm({ name: '', description: '' });
  };

  const deleteBot = async (id: number) => {
    await botsApi.delete(id);
    await fetchBots();
    setSelectedBotId(null);
    setBlocks([]);
    setConnections([]);
  };

  const selectedBlockData = blocks.find(b => b.id === selectedBlock);

  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] -m-6 overflow-hidden">
      {/* Left: Bot list + palette */}
      <div className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Bot list */}
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Meus Bots</span>
            <button
              onClick={() => setNewBotModal(true)}
              className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center hover:bg-blue-700"
            >
              <Plus size={12} />
            </button>
          </div>
          <div className="space-y-1">
            {bots.map(bot => (
              <div
                key={bot.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs
                  ${bot.id === selectedBotId ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                onClick={() => loadBot(bot)}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bot.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className="flex-1 truncate font-medium">{bot.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteBot(bot.id); }}
                  className="opacity-0 hover:opacity-100 text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            {bots.length === 0 && (
              <p className="text-xs text-slate-400 py-2 text-center">Nenhum bot</p>
            )}
          </div>
        </div>

        {/* Block palette */}
        <div className="flex-1 overflow-auto p-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Blocos</p>
          <div className="space-y-1.5">
            {(Object.keys(BLOCK_META) as BlockType[]).map(type => (
              <PaletteItem key={type} type={type} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Arraste blocos para o canvas. Clique nas portas para conectar.
          </p>
        </div>
      </div>

      {/* Center: canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        {currentBot && (
          <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-3 border-b border-gray-700">
            <span className="font-semibold text-sm truncate max-w-xs">{currentBot.name}</span>
            <div className={`w-2 h-2 rounded-full ${currentBot.active ? 'bg-green-500' : 'bg-slate-500'}`} />
            <span className="text-xs text-slate-400">{currentBot.active ? 'Ativo' : 'Inativo'}</span>
            <div className="flex-1" />
            {connectingFrom && (
              <span className="text-xs text-yellow-400 animate-pulse">
                Clique na entrada de outro bloco para conectar...
              </span>
            )}
            <button
              onClick={() => setConnectingFrom(null)}
              disabled={!connectingFrom}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-30"
            >
              <X size={12} /> Cancelar
            </button>
            <button
              onClick={toggleBotActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium
                ${currentBot.active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <Power size={12} /> {currentBot.active ? 'Desativar' : 'Ativar'}
            </button>
            <button
              onClick={() => setTestMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 font-medium"
            >
              <Play size={12} /> Testar
            </button>
            <button
              onClick={saveBot}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              <Save size={12} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}

        {/* Canvas */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            ref={canvasRef}
            className="flex-1 overflow-auto relative"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('.bot-block') === null) {
                setSelectedBlock(null);
                setConnectingFrom(null);
              }
            }}
          >
            <CanvasDropZone>
              <ConnectionLines
                blocks={blocks}
                connections={connections}
                onDelete={deleteConnection}
              />
              {blocks.map(block => (
                <CanvasBlock
                  key={block.id}
                  block={block}
                  selected={selectedBlock === block.id}
                  connecting={!!connectingFrom}
                  connectingFrom={connectingFrom}
                  onClick={() => {
                    setSelectedBlock(block.id);
                    setConnectingFrom(null);
                  }}
                  onOutputClick={(output, e) => {
                    e.stopPropagation();
                    handleOutputClick(block.id, output);
                  }}
                  onInputClick={(e) => {
                    e.stopPropagation();
                    handleInputClick(block.id);
                  }}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))}
              {!currentBot && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <Bot size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium opacity-50">Selecione ou crie um bot</p>
                  </div>
                </div>
              )}
            </CanvasDropZone>
          </div>
          <DragOverlay>
            {activeDragId && activeDragId.startsWith('palette-') && (
              <div className="px-3 py-2 bg-white rounded-lg border-2 border-blue-400 shadow-xl text-xs font-medium text-blue-700">
                Solte no canvas
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Right: Properties */}
      {selectedBlockData && (
        <PropertiesPanel
          block={selectedBlockData}
          onChange={cfg => updateBlockConfig(selectedBlockData.id, cfg)}
          onClose={() => setSelectedBlock(null)}
        />
      )}

      {/* Test mode */}
      {testMode && currentBot && (
        <TestChat
          bot={{ ...currentBot, blocks, connections }}
          onClose={() => setTestMode(false)}
        />
      )}

      {/* New bot modal */}
      {newBotModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Novo Bot</h3>
              <button onClick={() => setNewBotModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={newBotForm.name}
                  onChange={e => setNewBotForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do bot"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea
                  value={newBotForm.description}
                  onChange={e => setNewBotForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descrição do bot..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setNewBotModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={createBot}
                  disabled={!newBotForm.name}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  Criar Bot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
