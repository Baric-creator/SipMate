import { TabList, TabListProps, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '../lib/supabase';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    const channel = supabase.channel('global-unread-count').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadUnreadCount).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadUnreadCount() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setUnreadCount(0); return; }
    const myId = session.user.id;
    const { data: conversations, error: conversationError } = await supabase.from('conversations').select('id').or(`user_one.eq.${myId},user_two.eq.${myId}`);
    if (conversationError || !conversations?.length) { setUnreadCount(0); return; }
    const conversationIds = conversations.map((item) => item.id);
    const { count, error } = await supabase.from('messages').select('*', { count: 'exact', head: true }).in('conversation_id', conversationIds).neq('sender_id', myId).is('read_at', null);
    if (error) { console.log('GLOBAL UNREAD ERROR:', error.message); return; }
    setUnreadCount(count ?? 0);
  }

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="discover" href="/" asChild><TabButton>🔥 {t('tabs.discover')}</TabButton></TabTrigger>
          <TabTrigger name="nearby" href="/nearby" asChild><TabButton>📍 {t('tabs.nearby')}</TabButton></TabTrigger>
          <TabTrigger name="cheers" href="/cheers" asChild><TabButton>🍻 {t('tabs.cheers')}</TabButton></TabTrigger>
          <TabTrigger name="chats" href="/chats" asChild>
            <TabButton>{unreadCount > 0 ? `💬 ${t('tabs.chat')} 🔴${unreadCount > 99 ? '99+' : unreadCount}` : `💬 ${t('tabs.chat')}`}</TabButton>
          </TabTrigger>
          <TabTrigger name="chat-detail" href="/chat" />
          <TabTrigger name="profile" href="/profile" asChild><TabButton>👤 {t('tabs.profile')}</TabButton></TabTrigger>
          <TabTrigger name="user-profile" href="/user-profile" />
          <TabTrigger name="edit-profile" href="/edit-profile" />
          <TabTrigger name="blocked-users" href="/blocked-users" />
          <TabTrigger name="language" href="/language" />
          <TabTrigger name="premium" href="/premium" />
          <TabTrigger name="delete-account" href="/delete-account" />
          <TabTrigger name="register" href="/register" />
          <TabTrigger name="login" href="/login" />
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type={isFocused ? 'backgroundSelected' : 'backgroundElement'} style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>{children}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>SipMate</ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: { position: 'absolute', width: '100%', padding: Spacing.three, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  innerContainer: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.five, borderRadius: Spacing.five, flexDirection: 'row', alignItems: 'center', flexGrow: 1, gap: Spacing.two, maxWidth: MaxContentWidth },
  brandText: { marginRight: 'auto' },
  pressed: { opacity: 0.7 },
  tabButtonView: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.three },
});
