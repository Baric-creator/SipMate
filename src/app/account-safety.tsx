import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const copy={
 en:{title:'Account & Safety',subtitle:'Manage your account, privacy and safety controls in one place.',notifications:'Notifications',blocked:'Blocked users',guidelines:'Community Guidelines',privacy:'Privacy Policy',terms:'Terms of Use',invite:'Invite friends',delete:'Delete account',back:'BACK'},
 de:{title:'Konto & Sicherheit',subtitle:'Verwalte Konto, Datenschutz und Sicherheit an einem Ort.',notifications:'Benachrichtigungen',blocked:'Blockierte Nutzer',guidelines:'Community-Richtlinien',privacy:'Datenschutzerklärung',terms:'Nutzungsbedingungen',invite:'Freunde einladen',delete:'Konto löschen',back:'ZURÜCK'},
 hr:{title:'Račun i sigurnost',subtitle:'Upravljaj računom, privatnošću i sigurnošću na jednom mjestu.',notifications:'Obavijesti',blocked:'Blokirani korisnici',guidelines:'Pravila zajednice',privacy:'Pravila privatnosti',terms:'Uvjeti korištenja',invite:'Pozovi prijatelje',delete:'Izbriši račun',back:'NATRAG'}
} as const;

export default function AccountSafetyScreen(){
 const {i18n}=useTranslation();const lang=i18n.language?.split('-')[0] as keyof typeof copy;const t=copy[lang]??copy.en;
 const rows=[
  ['🔔',t.notifications,'/notification-settings'],
  ['🚫',t.blocked,'/blocked-users'],
  ['↗️',t.invite,'/invite'],
  ['🤝',t.guidelines,'/community-guidelines'],
  ['🔒',t.privacy,'/privacy'],
  ['📄',t.terms,'/terms'],
  ['⚠️',t.delete,'/delete-account'],
 ] as const;
 return <View style={s.screen}><ScrollView contentContainerStyle={s.content}>
  <Text style={s.logo}>SipMate 🍻</Text><Text style={s.title}>{t.title}</Text><Text style={s.subtitle}>{t.subtitle}</Text>
  <View style={s.card}>{rows.map(([icon,label,path],i)=><Pressable key={path} style={[s.row,i===rows.length-1&&s.last]} onPress={()=>router.push(path)}>
   <View style={s.left}><Text style={s.icon}>{icon}</Text><Text style={[s.label,path==='/delete-account'&&s.danger]}>{label}</Text></View><Text style={s.chev}>›</Text>
  </Pressable>)}</View>
  <Pressable style={s.back} onPress={()=>router.back()}><Text style={s.backText}>← {t.back}</Text></Pressable>
 </ScrollView></View>
}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:'#09090B'},content:{width:'100%',maxWidth:720,alignSelf:'center',padding:24,paddingTop:40,paddingBottom:80},
 logo:{color:'#EF4444',fontSize:17,fontWeight:'900'},title:{color:'#FFF',fontSize:29,fontWeight:'900',marginTop:22},
 subtitle:{color:'#A1A1AA',fontSize:14,lineHeight:21,marginTop:8,marginBottom:24},
 card:{backgroundColor:'#141417',borderWidth:1,borderColor:'#27272A',borderRadius:22,overflow:'hidden'},
 row:{minHeight:64,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#27272A'},
 last:{borderBottomWidth:0},left:{flexDirection:'row',alignItems:'center',gap:12},icon:{fontSize:18},label:{color:'#FFF',fontSize:14,fontWeight:'800'},
 danger:{color:'#F87171'},chev:{color:'#71717A',fontSize:26},back:{marginTop:18,paddingVertical:14,alignItems:'center'},backText:{color:'#A1A1AA',fontWeight:'900'}
});
