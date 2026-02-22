'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { format } from 'date-fns';

interface Message { id: string; body: string; senderId: string; createdAt: string; sender: { displayName: string } }
interface ConversationDetail { id: string; listing: { id: string; title: string; price: number | null; priceType: string }; buyer: { id: string; displayName: string }; seller: { id: string; displayName: string }; messages: Message[] }

export default function ChatThreadPage({ params }: { params: { id: string } }): JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);

  useEffect(() => {
    api.conversations.getById(params.id)
      .then((res) => {
        const r = res as unknown as { data: { conversation: ConversationDetail; messages: Message[] } };
        setConversation(r.data.conversation);
        setMessages(r.data.messages.reverse());
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [params.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (): Promise<void> => {
    const body = input.trim();
    if (!body || isSending) return;
    setInput('');
    setIsSending(true);
    try {
      const res = await api.conversations.sendMessage(params.id, { content: body });
      const r = res as unknown as { data: { message: Message } };
      setMessages((prev) => [...prev, r.data.message]);
    } catch {
      setInput(body);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); }
  };

  const hasSafetyKeyword = (text: string) => /zelle|cashapp|venmo|wire transfer|western union/i.test(text);
  const showWarning = messages.some(m => hasSafetyKeyword(m.body));

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100dvh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <Link href="/messages" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></Link>
        {conversation && (
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-sm">
              {conversation.buyer.id === user?.id ? conversation.seller.displayName : conversation.buyer.displayName}
            </p>
            <Link href={`/listings/${conversation.listing.id}`} className="text-xs text-blue-600 hover:underline truncate block">
              {conversation.listing.title}
            </Link>
          </div>
        )}
      </div>

      {/* Safety warning */}
      {showWarning && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-amber-700 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Be careful with payment requests outside this platform. We cannot protect you for external payments.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m) => {
          const isMe = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                <p className="text-sm leading-relaxed">{m.body}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{format(new Date(m.createdAt), 'h:mm a')}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white flex gap-3 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          style={{ maxHeight: 120 }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || isSending}
          className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 shrink-0">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
