import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { buildInviteUrl } from '../lib/growth-attribution';
import { showAlert } from '../lib/notify';
import { supabase } from '../lib/supabase';

const copy = {
  en: { title:'Invite friends', subtitle:'Share your personal SipMate link. When a friend joins through it, the referral stays attached to your account.', code:'YOUR INVITE CODE', share:'SHARE INVITE', back:'BACK', unavailable:'Your invite link is not available yet.' },
  de: { title:'Freunde einladen', subtitle:'Teile deinen persönlichen SipMate-Link. Wenn ein Freund darüber beitritt, bleibt die Empfehlung deinem Konto zugeordnet.', code:'DEIN EINLADUNGSCODE', share:'EINLADUNG TEILEN', back:'ZURÜCK', unavailable:'Dein Einladungslink ist noch nicht verfügbar.' },
  hr: { title:'Pozovi prijatelje', subtitle:'Podijeli svoj osobni SipMate link. Kad se prijatelj pridruži preko njega, referral ostaje povezan s tvojim računom.', code:'TVOJ POZIVNI KOD', share:'PODIJELI POZIV', back:'NATRAG', unavailable:'Tvoj pozivni link još nije dostupan.' },
} as const;

export default function InviteScreen() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] as keyof typeof copy;
  const text = copy[lang] ?? copy.en;
  const [inviteCode, setInviteCode] = useState('');
  const url = inviteCode ? buildInviteUrl(inviteCode) : '';

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('invite_code')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!active) return;
      if (error) console.log('INVITE CODE LOAD ERROR:', error.message);
      setInviteCode(data?.invite_code ?? '');
    })();
    return () => { active = false; };
  }, []);

  async function shareInvite() {
    if (!url) return showAlert(text.unavailable);
    const message = lang === 'de'
      ? `Komm zu SipMate 🍻 ${url}`
      : lang === 'hr'
        ? `Pridruži mi se na SipMateu 🍻 ${url}`
        : `Join me on SipMate 🍻 ${url}`;
    await Share.share({ title:'SipMate 🍻', message, url });
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.logo}>SipMate 🍻</Text>
        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.subtitle}>{text.subtitle}</Text>

        <View style={styles.codeCard}>
          <Text style={styles.label}>{text.code}</Text>
          <Text selectable style={styles.code}>{inviteCode || '—'}</Text>
          {!!url && <Text selectable style={styles.url}>{url}</Text>}
        </View>

        <Pressable style={styles.primary} onPress={() => void shareInvite()}>
          <Text style={styles.primaryText}>↗ {text.share}</Text>
        </Pressable>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← {text.back}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#09090B',alignItems:'center',padding:22,paddingTop:52},
 card:{width:'100%',maxWidth:640,backgroundColor:'#121215',borderWidth:1,borderColor:'#302326',borderRadius:26,padding:24},
 logo:{color:'#EF4444',fontSize:18,fontWeight:'900'},title:{color:'#FFF',fontSize:29,fontWeight:'900',marginTop:24},
 subtitle:{color:'#A1A1AA',fontSize:14,lineHeight:21,marginTop:8},
 codeCard:{backgroundColor:'#18181B',borderWidth:1,borderColor:'#3F3F46',borderRadius:20,padding:20,marginTop:24},
 label:{color:'#71717A',fontSize:10,fontWeight:'900',letterSpacing:1.2},
 code:{color:'#FFF',fontSize:24,fontWeight:'900',marginTop:9},url:{color:'#A1A1AA',fontSize:12,lineHeight:18,marginTop:10},
 primary:{marginTop:18,backgroundColor:'#DC2626',borderRadius:16,paddingVertical:15,alignItems:'center'},
 primaryText:{color:'#FFF',fontWeight:'900'},back:{marginTop:16,paddingVertical:13,alignItems:'center'},backText:{color:'#A1A1AA',fontWeight:'900'}
});
