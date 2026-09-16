import React, { useState } from 'react';
import { Send, Scale, ShieldCheck, Sparkles, BookOpen, MessageSquare } from 'lucide-react';
import { useAudit } from '../../context/AuditContext';
import { api } from '../../api/client';
import type { AskResponse } from '../../types';
import { marked } from 'marked';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: AskResponse;
}

export const CopilotTab: React.FC = () => {
  const { selectedDocument, openVerifier, openEvidenceModal, showToast } = useAudit();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    'Summarize the core purpose and key commercial terms of this agreement',
    'What are the termination conditions and notice periods?',
    'What are the payment terms, fee schedules, and penalties?',
    'What confidentiality obligations and survival periods exist?',
    'What are the indemnification obligations and liability caps?',
  ];

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: q,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.askQuestion(q, selectedDocument);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.answer,
        response: res,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-5">
      {/* Pane Header (Duck Creek Style) */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">
              Contract Intelligence Copilot
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Grounded Q&A
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ask any question in plain English. Answers are verified against exact contract language with page-level citations.
          </p>
        </div>
        <div className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium self-start sm:self-auto">
          Scope: <strong className="text-blue-700">{selectedDocument ? selectedDocument.replace(/\.pdf$/i, '') : 'All 257 Agreements'}</strong>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Suggested queries:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp)}
            className="px-3 py-1 text-xs bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-full text-slate-700 hover:text-blue-700 shadow-2xs transition-all cursor-pointer font-medium"
          >
            {qp.split(' ')[2] ? `${qp.split(' ')[2]} ${qp.split(' ')[3] || ''}` : qp}
          </button>
        ))}
      </div>

      {/* Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-[380px]">
        {messages.length === 0 ? (
          <div className="p-8 bg-white border border-slate-200 rounded-xl shadow-xs text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              How can I assist your contract review today?
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Inquire about cure periods, indemnity obligations, governing jurisdictions, or liability caps. Every claim is cross-referenced with exact page citations.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-xs bg-blue-600 text-white text-xs font-medium shadow-xs leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[96%] w-full p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                  {/* Assistant Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                      <Scale className="w-4 h-4" />
                      Auditor Legal Finding
                    </div>
                    {msg.response && (
                      <div className="flex items-center gap-2.5 text-xs text-slate-500">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10.5px]">
                          {msg.response.confidence || 'HIGH'} Confidence
                        </span>
                        {msg.response.latency_seconds && (
                          <span className="font-mono text-[11px] text-slate-400">
                            {msg.response.latency_seconds.toFixed(2)}s
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Markdown Content */}
                  <div
                    className="text-xs text-slate-800 leading-relaxed space-y-2 prose prose-slate max-w-none"
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                  />

                  {/* Cited Evidence Sources */}
                  {msg.response?.sources && msg.response.sources.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Cited Contract Sources ({msg.response.sources.length} chunks)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.response.sources.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              openEvidenceModal(
                                `${s.source} (Page ${s.page})`,
                                s.text
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700 transition-colors cursor-pointer"
                          >
                            <span className="text-blue-600 font-bold">p.{s.page}</span>
                            <span className="truncate max-w-[200px] text-slate-600">{s.source}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Verify With AI Action */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() =>
                        openVerifier(
                          `Response: ${msg.content.substring(0, 200)}...`,
                          msg.response?.sources?.map((s) => s.text) || msg.content
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verify Finding with Gemini
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2.5 p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></div>
            Searching contract chunks, ranking excerpts, and synthesizing grounded answer...
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="relative bg-white border border-slate-300 focus-within:border-blue-600 rounded-xl p-3 shadow-sm transition-all">
        <textarea
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask any contract question (e.g., 'What are the cure periods for a breach of contract?')..."
          rows={2}
          className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none resize-none pr-12 font-sans"
        />
        <button
          onClick={() => handleSend()}
          disabled={!inputQuery.trim() || loading}
          className="absolute right-3 bottom-3 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white transition-colors cursor-pointer shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
