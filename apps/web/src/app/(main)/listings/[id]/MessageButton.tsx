'use client';

import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

interface Props { listingId: string; sellerId: string }

export default function MessageButton({ listingId, sellerId }: Props): JSX.Element {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleClick = async (): Promise<void> => {
    if (!isAuthenticated) { router.push('/login'); return; }
    try {
      const conv = await api.conversations.create({ listingId });
      const c = conv as unknown as { id: string };
      router.push(`/messages/${c.id}`);
    } catch (err: unknown) {
      // Conversation may already exist; navigate to messages
      router.push('/messages');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
    >
      <MessageCircle className="w-4 h-4" />
      Message Seller
    </button>
  );
}
