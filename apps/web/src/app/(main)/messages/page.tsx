'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  listing: { id: string; title: string; media: Array<{ thumbnailUrl: string }> };
  otherUser: { id: string; displayName: string; avatarUrl: string | null };
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
}

export default function MessagesPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const selectedId = searchParams.get('id');

  useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);

  useEffect(() => {
    api.conversations.list()
      .then((res) => { const r = res as unknown as { data: Conversation[] }; setConversations(r.data ?? []); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto h-[calc(100dvh-64px)] flex border-x border-gray-100">
      {/* Conversation list */}
      <div className={`w-full lg:w-80 shrink-0 border-r border-gray-100 flex flex-col ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => <div key={i} className="animate-pulse flex gap-3"><div className="w-12 h-12 bg-gray-200 rounded-full" /><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-3 bg-gray-200 rounded w-1/2" /></div></div>)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
              <MessageSquare className="w-10 h-10" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : conversations.map((conv) => (
            <Link key={conv.id} href={`/messages?id=${conv.id}`}
              className={`flex gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedId === conv.id ? 'bg-blue-50' : ''}`}>
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                {conv.otherUser.avatarUrl ? <img src={conv.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" /> : conv.otherUser.displayName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <p className={`font-semibold text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{conv.otherUser.displayName}</p>
                  {conv.lastMessage && <p className="text-xs text-gray-400 shrink-0">{formatDistanceToNow(new Date(conv.lastMessage.createdAt))}</p>}
                </div>
                <p className="text-xs text-gray-400 truncate">{conv.listing.title}</p>
                {conv.lastMessage && (
                  <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                    {conv.lastMessage.senderId === user?.id ? 'You: ' : ''}{conv.lastMessage.body}
                  </p>
                )}
              </div>
              {conv.unreadCount > 0 && <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center shrink-0">{conv.unreadCount}</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* Thread panel (desktop) / empty state */}
      <div className={`flex-1 ${selectedId ? 'flex' : 'hidden lg:flex'} flex-col items-center justify-center text-gray-400 gap-2`}>
        {selectedId ? (
          <Link href={`/messages/${selectedId}`} className="lg:hidden flex items-center gap-2 text-blue-600">
            View thread <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        ) : (
          <>
            <MessageSquare className="w-12 h-12" />
            <p className="font-medium">Select a conversation</p>
          </>
        )}
      </div>
    </div>
  );
}
