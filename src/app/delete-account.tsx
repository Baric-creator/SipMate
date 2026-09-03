import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { askConfirmation, showAlert } from '../lib/notify';
import { supabase } from '../lib/supabase';

const copy = {
  en: {
    title: 'Delete account',
    warning: 'This permanently deletes your SipMate account and profile data. This action cannot be undone.',
    button: 'DELETE MY ACCOUNT', deleting: 'DELETING...', cancel: 'CANCEL',
    confirmTitle: 'Delete SipMate account?',
    confirmMessage: 'This action is permanent. Your account cannot be restored after deletion.',
    confirmCancel: 'Cancel', confirmDelete: 'Delete',
    failed: 'Account deletion failed. Please try again.',
  },
  de: {
    title: 'Konto löschen',
    warning: 'Dadurch werden dein SipMate-Konto und deine Profildaten dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
    button: 'MEIN KONTO LÖSCHEN', deleting: 'WIRD GELÖSCHT...', cancel: 'ABBRECHEN',
    confirmTitle: 'SipMate-Konto löschen?',
    confirmMessage: 'Diese Aktion ist endgültig. Dein Konto kann nach dem Löschen nicht wiederhergestellt werden.',
    confirmCancel: 'Abbrechen', confirmDelete: 'Löschen',
    failed: 'Das Konto konnte nicht gelöscht werden. Bitte versuche es erneut.',
  },
  hr: {
    title: 'Izbriši račun',
    warning: 'Ovim se trajno brišu tvoj SipMate račun i podaci profila. Ovu radnju nije moguće poništiti.',
    button: 'IZBRIŠI MOJ RAČUN', deleting: 'BRISANJE...', cancel: 'ODUSTANI',
    confirmTitle: 'Izbrisati SipMate račun?',
    confirmMessage: 'Ova radnja je trajna. Nakon brisanja račun nije moguće vratiti.',
    confirmCancel: 'Odustani', confirmDelete: 'Izbriši',
    failed: 'Brisanje računa nije uspjelo. Pokušaj ponovno.',
  },
} as const;

export default function DeleteAccountScreen() {
  const { i18n } = useTranslation();
  const language = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[language] ?? copy.en;
  const [loading, setLoading] = useState(false);

  async function deleteAccount() {
    if (loading) return;

    const confirmed = await askConfirmation(
      text.confirmTitle,
      text.confirmMessage,
      text.confirmCancel,
      text.confirmDelete
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('delete-account');

      if (error) {
        console.log('DELETE ACCOUNT ERROR:', error.message);
        showAlert(text.failed);
        return;
      }

      await supabase.auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.log('DELETE ACCOUNT CRASH:', error);
      showAlert(text.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.warning}>{text.warning}</Text>
        <Pressable style={[styles.deleteButton, loading && styles.disabled]} onPress={deleteAccount} disabled={loading}>
          <Text style={styles.deleteText}>{loading ? text.deleting : text.button}</Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>{text.cancel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#09090B', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 500, backgroundColor: '#18181B', borderRadius: 28, borderWidth: 1, borderColor: '#3F3F46', padding: 28, alignItems: 'center' },
  icon: { fontSize: 48 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 14 },
  warning: { color: '#D4D4D8', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 14, marginBottom: 28 },
  deleteButton: { width: '100%', backgroundColor: '#DC2626', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  deleteText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  cancelButton: { width: '100%', marginTop: 14, borderWidth: 1, borderColor: '#52525B', borderRadius: 20, paddingVertical: 15, alignItems: 'center' },
  cancelText: { color: '#D4D4D8', fontWeight: '900', fontSize: 14 },
});
