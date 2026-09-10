import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { showAlert } from '../lib/notify';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  city: string | null;
  currently_up_for: string | null;
  gender: string | null;
  is_premium: boolean | null;
  premium_until: string | null;
  is_active: boolean | null;
  avatar_url: string | null;
  share_cheers_discord: boolean | null;
};

type GalleryPhoto = {
  id: string;
  photo_url: string;
  sort_order: number | null;
};

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [drink, setDrink] = useState('🍺 Beer');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<GalleryPhoto[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [shareCheersDiscord, setShareCheersDiscord] = useState(false);

  const drinks = [
    { value: '🍺 Beer', emoji: '🍺', label: t('editProfileScreen.beer') },
    { value: '🍹 Cocktail', emoji: '🍹', label: t('editProfileScreen.cocktail') },
    { value: '🍷 Wine', emoji: '🍷', label: t('editProfileScreen.wine') },
    { value: '🥃 Whisky', emoji: '🥃', label: t('editProfileScreen.whisky') },
    { value: '☕ Coffee', emoji: '☕', label: t('editProfileScreen.coffee') },
  ];

  const genders = [
    { value: 'male', label: `👨 ${t('editProfileScreen.male')}` },
    { value: 'female', label: `👩 ${t('editProfileScreen.female')}` },
    { value: 'other', label: `⚪ ${t('editProfileScreen.other')}` },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (error) {
        console.log('EDIT PROFILE LOAD ERROR:', error.message);
        return;
      }

      const loadedProfile = data as Profile;
      setProfile(loadedProfile);
      setName(loadedProfile.name ?? '');
      setAge(loadedProfile.age ? String(loadedProfile.age) : '');
      setCity(loadedProfile.city ?? '');
      setBio(loadedProfile.bio ?? '');
      setGender(loadedProfile.gender ?? '');
      setDrink(loadedProfile.currently_up_for ?? '🍺 Beer');
      setIsActive(loadedProfile.is_active ?? true);
      setAvatarUrl(loadedProfile.avatar_url ?? null);
      setShareCheersDiscord(loadedProfile.share_cheers_discord ?? false);

      const { data: photosData, error: photosError } = await supabase
        .from('profile_photos')
        .select('id, photo_url, sort_order')
        .eq('user_id', loadedProfile.id)
        .order('sort_order', { ascending: true });

      if (photosError) console.log('PROFILE PHOTOS ERROR:', photosError.message);
      else setProfilePhotos((photosData ?? []) as GalleryPhoto[]);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!profile) return;
    if (!name.trim()) {
      showAlert(t('editProfileScreen.nameRequired'));
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert(t('editProfileScreen.locationPermissionRequired'));
        return;
      }

      let latitude: number | null = null;
      let longitude: number | null = null;
      let detectedCity = city.trim() || null;

      try {
        let resolvedLocation = await Location.getLastKnownPositionAsync({
          maxAge: 120000,
          requiredAccuracy: 5000,
        });

        if (!resolvedLocation) {
          resolvedLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }

        latitude = resolvedLocation.coords.latitude;
        longitude = resolvedLocation.coords.longitude;

        try {
          const reverseResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            { headers: { 'User-Agent': 'SipMate/1.0' } }
          );
          if (reverseResponse.ok) {
            const reverseData = await reverseResponse.json();
            detectedCity = reverseData?.address?.city ?? reverseData?.address?.town ?? reverseData?.address?.village ??
              reverseData?.address?.municipality ?? reverseData?.address?.county ?? reverseData?.address?.state ?? detectedCity;
          }
        } catch (reverseError) {
          console.log('REVERSE GEOCODE ERROR:', reverseError);
        }
      } catch (locationError) {
        console.log('LOCATION FIX UNAVAILABLE:', locationError);

        if (detectedCity) {
          try {
            const searchResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(detectedCity)}`,
              { headers: { 'User-Agent': 'SipMate/1.0' } }
            );
            if (searchResponse.ok) {
              const results = await searchResponse.json();
              if (Array.isArray(results) && results[0]?.lat && results[0]?.lon) {
                latitude = Number(results[0].lat);
                longitude = Number(results[0].lon);
                console.log('LOCATION FALLBACK: using city coordinates for', detectedCity);
              }
            }
          } catch (geocodeError) {
            console.log('CITY GEOCODE FALLBACK ERROR:', geocodeError);
          }
        }

        if (latitude == null || longitude == null) {
          const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
          if (lastKnown) {
            latitude = lastKnown.coords.latitude;
            longitude = lastKnown.coords.longitude;
            console.log('LOCATION FALLBACK: using last known coordinates');
          }
        }

        if (latitude == null || longitude == null) {
          showAlert(t('editProfileScreen.locationUnavailableCityFallback'));
          return;
        }
      }

      const numericAge = age.trim() ? Number(age) : null;
      if (numericAge != null && (!Number.isFinite(numericAge) || numericAge < 18 || numericAge > 120)) {
        showAlert('Age must be between 18 and 120.');
        return;
      }

      const { error } = await supabase.from('profiles').update({
        is_active: isActive,
        name: name.trim(),
        age: numericAge,
        city: detectedCity,
        bio: bio.trim(),
        gender: gender || null,
        currently_up_for: drink,
        latitude,
        longitude,
        share_cheers_discord: shareCheersDiscord,
      }).eq('id', session.user.id);

      if (error) throw error;
      router.back();
    } catch (error: any) {
      console.log('PROFILE SAVE ERROR:', error?.message ?? error);
      showAlert(error?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActiveStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const newValue = !isActive;
    setIsActive(newValue);
    const { error } = await supabase.from('profiles').update({ is_active: newValue }).eq('id', session.user.id);
    if (error) {
      console.log('ACTIVE STATUS ERROR:', error.message);
      setIsActive(!newValue);
      showAlert(error.message);
    }
  }

  async function pickAndUploadAvatar() {
    try {
      setUploadingAvatar(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled) return;
      const image = result.assets[0];
      const response = await fetch(image.uri);
      if (!response.ok) {
        showAlert(t('editProfileScreen.imageReadError'));
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileExt = image.fileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${session.user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, arrayBuffer, {
        contentType: image.mimeType || 'image/jpeg', upsert: true,
      });

      if (uploadError) {
        console.log('AVATAR UPLOAD ERROR:', uploadError);
        showAlert(`${t('editProfileScreen.uploadError')}: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      const { error: profileError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      if (profileError) {
        showAlert(`${t('editProfileScreen.profileError')}: ${profileError.message}`);
        return;
      }
      setAvatarUrl(publicUrl);
    } catch (error: any) {
      console.log('AVATAR ERROR:', error);
      showAlert(error?.message ?? t('editProfileScreen.uploadError'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAddGalleryPhoto() {
    if (!profile?.id) return;
    if (!profile.is_premium) {
      router.push('/premium');
      return;
    }
    if (profilePhotos.length >= 6) {
      showAlert(t('editProfileScreen.galleryLimit'));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const extension = asset.fileName?.split('.').pop() || 'jpg';
      const filePath = `${profile.id}/gallery-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, {
        contentType: asset.mimeType || 'image/jpeg', upsert: false,
      });
      if (uploadError) {
        showAlert(t('editProfileScreen.galleryUploadError'));
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { data: insertedPhoto, error: insertError } = await supabase.from('profile_photos').insert({
        user_id: profile.id, photo_url: publicUrl, sort_order: profilePhotos.length,
      }).select('id, photo_url, sort_order').single();

      if (insertError) {
        await supabase.storage.from('avatars').remove([filePath]);
        showAlert(t('editProfileScreen.gallerySaveError'));
        return;
      }
      setProfilePhotos((current) => [...current, insertedPhoto as GalleryPhoto]);
    } catch (error) {
      console.log('ADD GALLERY PHOTO ERROR:', error);
      showAlert(t('editProfileScreen.galleryAddError'));
    }
  }

  async function handleDeleteGalleryPhoto(photo: GalleryPhoto) {
    if (!profile?.id) return;
    try {
      const marker = '/storage/v1/object/public/avatars/';
      const markerIndex = photo.photo_url.indexOf(marker);
      const storagePath = markerIndex !== -1
        ? decodeURIComponent(photo.photo_url.substring(markerIndex + marker.length).split('?')[0])
        : null;

      const { error: dbError } = await supabase.from('profile_photos').delete().eq('id', photo.id).eq('user_id', profile.id);
      if (dbError) throw dbError;
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from('avatars').remove([storagePath]);
        if (storageError) console.log('GALLERY DELETE STORAGE ERROR:', storageError.message);
      }
      setProfilePhotos((current) => current.filter((item) => item.id !== photo.id));
    } catch (error: any) {
      console.log('DELETE GALLERY PHOTO ERROR:', error);
      showAlert(error?.message ?? 'Could not delete photo.');
    }
  }

  if (loading) {
    return <View style={styles.loadingScreen}><Text style={styles.loadingText}>{t('editProfileScreen.loadingProfile')}</Text></View>;
  }

  return (
    <View style={styles.screen}>
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbTop]} />
      <View pointerEvents="none" style={[styles.ambientOrb, styles.ambientOrbLow]} />
      <View pointerEvents="none" style={styles.scanAccent} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>SipMate 🍻</Text>
          <Text style={styles.title}>{t('editProfileScreen.title')}</Text>
          <Text style={styles.subtitle}>{t('editProfileScreen.subtitle')}</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" /> : (
              <View style={styles.avatarPlaceholder}><Text style={styles.avatarPlaceholderText}>{name?.charAt(0).toUpperCase() || '?'}</Text></View>
            )}
          </View>

          <View style={styles.gallerySection}>
            <Text style={styles.galleryTitle}>📸 {t('editProfileScreen.profileGallery')}</Text>
            {profilePhotos.length > 0 && (
              <View style={styles.galleryGrid}>
                {profilePhotos.map((photo) => (
                  <View key={photo.id} style={styles.galleryImageWrapper}>
                    <Image source={{ uri: photo.photo_url }} style={styles.galleryImage} resizeMode="cover" />
                    <TouchableOpacity style={styles.deletePhotoButton} onPress={() => handleDeleteGalleryPhoto(photo)}>
                      <Text style={styles.deletePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity style={[styles.addPhotoButton, !profile?.is_premium && styles.addPhotoButtonLocked]} onPress={handleAddGalleryPhoto}>
              <Text style={styles.addPhotoButtonText}>
                {profile?.is_premium ? `＋ ${t('editProfileScreen.addPhoto')}` : `🔒 ${t('editProfileScreen.addMorePhotos')}`}
              </Text>
            </TouchableOpacity>
          </View>

          <Pressable style={styles.avatarButton} onPress={pickAndUploadAvatar} disabled={uploadingAvatar}>
            <Text style={styles.avatarButtonText}>{uploadingAvatar ? t('editProfileScreen.uploading') : `📷 ${t('editProfileScreen.changeProfilePhoto')}`}</Text>
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>{t('editProfileScreen.profileDetails')}</Text>
          <Text style={styles.label}>{t('editProfileScreen.name')}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={t('editProfileScreen.namePlaceholder')} placeholderTextColor="#52525B" style={styles.input} />
          <Text style={styles.label}>{t('editProfileScreen.age')}</Text>
          <TextInput value={age} onChangeText={setAge} placeholder={t('editProfileScreen.agePlaceholder')} placeholderTextColor="#52525B" keyboardType="numeric" style={styles.input} />
          <Text style={styles.label}>{t('editProfileScreen.gender')}</Text>
          <View style={styles.genderRow}>
            {genders.map((item) => (
              <Pressable key={item.value} style={[styles.genderButton, gender === item.value && styles.genderButtonSelected]} onPress={() => setGender(item.value)}>
                <Text style={[styles.genderText, gender === item.value && styles.genderTextSelected]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{t('editProfileScreen.city')}</Text>
          <TextInput value={city} onChangeText={setCity} placeholder={t('editProfileScreen.cityPlaceholder')} placeholderTextColor="#52525B" style={styles.input} />
          <Text style={styles.label}>{t('editProfileScreen.aboutMe')}</Text>
          <TextInput value={bio} onChangeText={setBio} placeholder={t('editProfileScreen.bioPlaceholder')} placeholderTextColor="#52525B" multiline style={[styles.input, styles.bioInput]} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>{t('editProfileScreen.currentlyUpFor')}</Text>
          <Text style={styles.sectionDescription}>{t('editProfileScreen.currentlyUpForDescription')}</Text>
          <View style={styles.drinks}>
            {drinks.map((item) => (
              <Pressable key={item.value} style={[styles.drinkButton, drink === item.value && styles.drinkButtonSelected]} onPress={() => setDrink(item.value)}>
                <Text style={styles.drinkEmoji}>{item.emoji}</Text>
                <Text style={[styles.drinkText, drink === item.value && styles.drinkTextSelected]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>{t('editProfileScreen.discoverStatus')}</Text>
          <Text style={styles.sectionDescription}>{t('editProfileScreen.discoverStatusDescription')}</Text>
          <Pressable style={[styles.activeButton, isActive ? styles.activeButtonOn : styles.activeButtonOff]} onPress={toggleActiveStatus}>
            <Text style={[styles.activeButtonText, isActive ? styles.activeButtonTextOn : styles.activeButtonTextOff]}>
              {isActive ? `● ${t('editProfileScreen.active')}` : `● ${t('editProfileScreen.inactive')}`}
            </Text>
          </Pressable>

          <View style={styles.discordShareBox}>
            <View style={styles.discordShareCopy}>
              <Text style={styles.discordShareTitle}>{t('editProfileScreen.discordCheersShareTitle')}</Text>
              <Text style={styles.discordShareDescription}>{t('editProfileScreen.discordCheersShareDescription')}</Text>
            </View>
            <Pressable
              style={[styles.discordShareToggle, shareCheersDiscord && styles.discordShareToggleOn]}
              onPress={() => setShareCheersDiscord((value) => !value)}
            >
              <Text style={[styles.discordShareToggleText, shareCheersDiscord && styles.discordShareToggleTextOn]}>
                {shareCheersDiscord ? t('editProfileScreen.on') : t('editProfileScreen.off')}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={saveProfile} disabled={saving}>
          <Text style={styles.saveText}>{saving ? t('editProfileScreen.saving') : t('editProfileScreen.saveProfile')}</Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}><Text style={styles.cancelText}>{t('editProfileScreen.cancel')}</Text></Pressable>
        <Text style={styles.footer}>{t('editProfileScreen.footer')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08090B' },
  ambientOrb: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(220,38,38,0.09)', shadowColor: '#EF4444', shadowOpacity: 0.18, shadowRadius: 44, shadowOffset: { width: 0, height: 0 }, elevation: 1 },
  ambientOrbTop: { width: 250, height: 250, top: -95, right: -125 },
  ambientOrbLow: { width: 220, height: 220, top: 520, left: -135, backgroundColor: 'rgba(127,29,29,0.07)' },
  scanAccent: { position: 'absolute', top: 112, right: 22, width: 62, height: 1, backgroundColor: 'rgba(248,113,113,0.32)' },
  loadingScreen: { flex: 1, backgroundColor: '#08090B', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#A1A1AA', fontSize: 14 },
  container: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingTop: 42, paddingHorizontal: 20, paddingBottom: 150 },
  header: { marginBottom: 26 },
  logo: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 18, letterSpacing: -0.5 },
  subtitle: { color: '#A1A1AA', fontSize: 14, lineHeight: 21, marginTop: 7 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { width: 118, height: 118, borderRadius: 59, borderWidth: 2, borderColor: '#4A2A2D', padding: 3, backgroundColor: '#121215', shadowColor: '#EF4444', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 60 },
  avatarPlaceholder: { flex: 1, borderRadius: 60, backgroundColor: '#450A0A', alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { color: '#FFFFFF', fontSize: 42, fontWeight: '900' },
  avatarButton: { marginTop: 14, backgroundColor: '#121215', borderWidth: 1, borderColor: '#34343A', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 18 },
  avatarButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  formCard: { backgroundColor: 'rgba(18,18,21,0.97)', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#2F2F34', marginBottom: 14, shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 2 },
  sectionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  sectionDescription: { color: '#71717A', fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 16 },
  label: { color: '#71717A', fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7, marginTop: 17 },
  input: { backgroundColor: '#0B0B0E', color: '#FFFFFF', borderWidth: 1, borderColor: '#34343A', borderRadius: 16, paddingHorizontal: 15, paddingVertical: 13, fontSize: 14 },
  bioInput: { minHeight: 110, textAlignVertical: 'top' },
  drinks: { flexDirection: 'row', flexWrap: 'wrap' },
  drinkButton: { backgroundColor: '#1B1B1F', borderWidth: 1, borderColor: '#303036', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  drinkEmoji: { fontSize: 16 },
  drinkButtonSelected: { backgroundColor: '#DC2626', borderColor: '#F87171', shadowColor: '#EF4444', shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  drinkText: { color: '#A1A1AA', fontSize: 13, fontWeight: '700', fontFamily: 'sans-serif' },
  drinkTextSelected: { color: '#FFFFFF' },
  activeButton: { width: '100%', paddingVertical: 15, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', borderWidth: 1 },
  activeButtonOn: { backgroundColor: '#052E16', borderColor: '#22C55E' },
  activeButtonOff: { backgroundColor: '#1B1B1F', borderColor: '#52525B' },
  activeButtonText: { fontSize: 12, fontWeight: '900' },
  activeButtonTextOn: { color: '#4ADE80' },
  activeButtonTextOff: { color: '#A1A1AA' },
  discordShareBox: { marginTop: 16, backgroundColor: '#111113', borderWidth: 1, borderColor: '#2F2F34', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  discordShareCopy: { flex: 1 },
  discordShareTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  discordShareDescription: { color: '#71717A', fontSize: 11, lineHeight: 16, marginTop: 4 },
  discordShareToggle: { minWidth: 54, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: '#1B1B1F', borderWidth: 1, borderColor: '#303036', alignItems: 'center' },
  discordShareToggleOn: { backgroundColor: '#5865F2', borderColor: '#818CF8' },
  discordShareToggleText: { color: '#A1A1AA', fontSize: 11, fontWeight: '900', fontFamily: 'sans-serif' },
  discordShareToggleTextOn: { color: '#FFFFFF' },
  saveButton: { marginTop: 10, backgroundColor: '#DC2626', paddingVertical: 17, borderRadius: 18, alignItems: 'center', borderWidth: 1, borderColor: '#F87171', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  cancelButton: { marginTop: 10, paddingVertical: 15, alignItems: 'center' },
  cancelText: { color: '#71717A', fontSize: 13, fontWeight: '700' },
  footer: { color: '#52525B', textAlign: 'center', fontSize: 11, fontWeight: '700', marginTop: 18 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap' },
  genderButton: { backgroundColor: '#1B1B1F', borderWidth: 1, borderColor: '#303036', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, marginRight: 8, marginBottom: 8 },
  genderButtonSelected: { backgroundColor: '#DC2626', borderColor: '#F87171', shadowColor: '#EF4444', shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  genderText: { color: '#A1A1AA', fontSize: 13, fontWeight: '700' },
  genderTextSelected: { color: '#FFFFFF', fontWeight: '900' },
  gallerySection: { width: '100%', marginTop: 18 },
  galleryTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginBottom: 10 },
  addPhotoButton: { backgroundColor: '#F59E0B', borderRadius: 18, paddingVertical: 13, alignItems: 'center' },
  addPhotoButtonLocked: { backgroundColor: '#1B1B1F', borderWidth: 1, borderColor: '#F59E0B' },
  addPhotoButtonText: { color: '#09090B', fontSize: 11, fontWeight: '900' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  galleryImage: { width: '100%', height: '100%', borderRadius: 14, backgroundColor: '#1B1B1F' },
  galleryImageWrapper: { width: 92, height: 92, marginRight: 8, marginBottom: 8, position: 'relative' },
  deletePhotoButton: { position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  deletePhotoText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});

