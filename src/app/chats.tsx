import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { supabase } from '../lib/supabase';

type ChatItem = {
  avatar_url: string | null;
  conversationId: string;
  userId: string;
  name: string;
  age: number | null;
  isActive: boolean;
  lastMessage: string;
  lastMessageTime: string | null;
  unreadCount: number;
};
export default function ChatsScreen() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);
  useEffect(() => {
  const channel = supabase
    .channel('chat-list-updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      () => {
        loadChats();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  async function loadChats() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const myId = session.user.id;

      // Sve moje conversations
      const { data: conversations, error: conversationError } =
        await supabase
          .from('conversations')
          .select('*')
          .or(`user_one.eq.${myId},user_two.eq.${myId}`)
          .order('created_at', { ascending: false });

      if (conversationError) {
        console.log(
          'CHATS CONVERSATIONS ERROR:',
          conversationError.message
        );
        return;
      }

      if (!conversations?.length) {
        setChats([]);
        return;
      }

      const otherUserIds = conversations.map((conversation) =>
        conversation.user_one === myId
          ? conversation.user_two
          : conversation.user_one
      );

      // Profili drugih ljudi
const { data: profiles, error: profileError } = await supabase
  .from('profiles')
  .select('id, name, age, is_active, avatar_url')
  .in('id', otherUserIds);

      if (profileError) {
        console.log(
          'CHATS PROFILES ERROR:',
          profileError.message
        );
        return;
      }

      const items: ChatItem[] = [];

      for (const conversation of conversations) {
        const otherUserId =
          conversation.user_one === myId
            ? conversation.user_two
            : conversation.user_one;

        const otherProfile = profiles?.find(
          (profile) => profile.id === otherUserId,         
        );

        // Zadnja poruka
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          const { count: unreadCount, error: unreadError } = await supabase
  .from('messages')
  .select('*', { count: 'exact', head: true })
  .eq('conversation_id', conversation.id)
  .neq('sender_id', myId)
  .is('read_at', null);

if (unreadError) {
  console.log('UNREAD COUNT ERROR:', unreadError.message);
}

items.push({
    unreadCount: unreadCount ?? 0,
  conversationId: conversation.id,
  userId: otherUserId,
  name: otherProfile?.name ?? 'SipMate User',
  age: otherProfile?.age ?? null,
  isActive: otherProfile?.is_active ?? false,
  lastMessage:
    lastMessage?.content ?? 'No messages yet 🍻',
  lastMessageTime:
    lastMessage?.created_at ?? null,
    avatar_url: otherProfile?.avatar_url ?? null,
});
      }

      // Najnoviji razgovor gore
      items.sort((a, b) => {
        const aTime = a.lastMessageTime
          ? new Date(a.lastMessageTime).getTime()
          : 0;

        const bTime = b.lastMessageTime
          ? new Date(b.lastMessageTime).getTime()
          : 0;

        return bTime - aTime;
      });

      setChats(items);
    } finally {
      setLoading(false);
    }
  }

function openChat(item: ChatItem) {
  console.log('OPEN CHAT PRESSED:', item);

  const url =
    `/chat?conversationId=${encodeURIComponent(item.conversationId)}` +
    `&id=${encodeURIComponent(item.userId)}` +
    `&name=${encodeURIComponent(item.name)}`;

  console.log('GOING TO:', url);

  router.push(url as any);
}

  function formatTime(value: string | null) {
    if (!value) return '';

    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>💬 Chats</Text>

        <Text style={styles.subtitle}>
          Your SipMate conversations
        </Text>

        {loading ? (
          <Text style={styles.emptyText}>
            Loading chats...
          </Text>
        ) : chats.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🍻</Text>

            <Text style={styles.emptyTitle}>
              No chats yet
            </Text>

            <Text style={styles.emptyText}>
              Get a mutual CHEERS to start chatting.
            </Text>
          </View>
        ) : (
chats.map((item) => (
<Pressable
  key={item.conversationId}
  style={[
    styles.chatCard,
    item.unreadCount > 0 && styles.chatCardUnread,
  ]}
  onPress={() => openChat(item)}
>
    {item.avatar_url ? (
      <Image
        source={{
          uri: `${item.avatar_url}${
            item.avatar_url.includes('?') ? '&' : '?'
          }refresh=${Date.now()}`,
        }}
        style={styles.chatAvatar}
        resizeMode="cover"
      />
    ) : (
      <View style={styles.chatAvatarFallback}>
        <Text style={styles.chatAvatarFallbackText}>
          {item.name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
    )}

    <View style={styles.chatContent}>
      <View style={styles.topRow}>
<Text
  style={[
    styles.name,
    item.unreadCount > 0 && styles.nameUnread,
  ]}
>
        </Text>

        <Text style={styles.timeText}>
          {formatTime(item.lastMessageTime)}
        </Text>
      </View>

      <View style={styles.bottomRow}>
<Text
  style={[
    styles.lastMessage,
    item.unreadCount > 0 && styles.lastMessageUnread,
  ]}
  numberOfLines={1}
>
          {item.lastMessage}
        </Text>

        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCount > 99
                ? '99+'
                : item.unreadCount}
            </Text>
          </View>
        )}
      </View>

      {item.isActive && (
        <Text style={styles.activeText}>
          ● ACTIVE
        </Text>
      )}
    </View>
  </Pressable>
))
)}

<Pressable
  style={styles.refreshButton}
  onPress={loadChats}
>
  <Text style={styles.refreshText}>
    ↻ Refresh
  </Text>
</Pressable>

</ScrollView>
</View>
);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },

  container: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },

  subtitle: {
    color: '#A1A1AA',
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
  },

  chatCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    padding: 16,
    borderRadius: 22,
    marginBottom: 12,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#3B0764',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  chatContent: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  lastMessage: {
    color: '#A1A1AA',
    fontSize: 14,
    marginTop: 6,
  },

  time: {
    color: '#71717A',
    fontSize: 12,
    marginLeft: 14,
  },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 80,
  },

  emptyEmoji: {
    fontSize: 58,
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 18,
  },

  emptyText: {
    color: '#71717A',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  refreshButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#27272A',
  },

  refreshText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  nameRow: {
  flexDirection: 'row',
  alignItems: 'center',
},

onlineDot: {
  width: 9,
  height: 9,
  borderRadius: 5,
  backgroundColor: '#22C55E',
  marginLeft: 8,
},
rightSide: {
  alignItems: 'flex-end',
  justifyContent: 'center',
  marginLeft: 14,
},

chatAvatar: {
  width: 52,
  height: 52,
  borderRadius: 26,
  marginRight: 12,
},

chatAvatarFallback: {
  width: 52,
  height: 52,
  borderRadius: 26,
  marginRight: 12,
  backgroundColor: '#5B21B6',
  alignItems: 'center',
  justifyContent: 'center',
},

chatAvatarFallbackText: {
  color: '#FFFFFF',
  fontSize: 20,
  fontWeight: '900',
},
topRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

bottomRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 5,
},

timeText: {
  color: '#71717A',
  fontSize: 11,
  marginLeft: 10,
},
unreadBadge: {
  minWidth: 22,
  height: 22,
  borderRadius: 11,
  paddingHorizontal: 6,
  backgroundColor: '#DC2626',
  alignItems: 'center',
  justifyContent: 'center',
},

unreadBadgeText: {
  color: '#FFFFFF',
  fontSize: 11,
  fontWeight: '900',
},

activeText: {
  color: '#22C55E',
  fontSize: 10,
  fontWeight: '800',
  marginTop: 5,
},
chatCardUnread: {
  borderWidth: 1,
  borderColor: '#DC2626',
},

nameUnread: {
  color: '#FFFFFF',
  fontWeight: '900',
},

lastMessageUnread: {
  color: '#FFFFFF',
  fontWeight: '800',
},
});