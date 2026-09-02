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
};

type GalleryPhoto = {
  id: string;
  photo_url: string;
  sort_order: number | null;
};

export default function EditProfileScreen() {
  const { t } = useTranslation();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');

  const [drink, setDrink] =
    useState('🍺 Beer');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [isActive, setIsActive] =
    useState(true);

  const [avatarUrl, setAvatarUrl] =
    useState<string | null>(null);

  const [profilePhotos, setProfilePhotos] =
    useState<GalleryPhoto[]>([]);

  const [
    uploadingAvatar,
    setUploadingAvatar,
  ] = useState(false);

  const drinks = [
    {
      value: '🍺 Beer',
      label: `🍺 ${t(
        'editProfileScreen.beer'
      )}`,
    },
    {
      value: '🍹 Cocktail',
      label: `🍹 ${t(
        'editProfileScreen.cocktail'
      )}`,
    },
    {
      value: '🍷 Wine',
      label: `🍷 ${t(
        'editProfileScreen.wine'
      )}`,
    },
    {
      value: '🥃 Whisky',
      label: `🥃 ${t(
        'editProfileScreen.whisky'
      )}`,
    },
    {
      value: '☕ Coffee',
      label: `☕ ${t(
        'editProfileScreen.coffee'
      )}`,
    },
  ];

  const genders = [
    {
      value: 'male',
      label: `👨 ${t(
        'editProfileScreen.male'
      )}`,
    },
    {
      value: 'female',
      label: `👩 ${t(
        'editProfileScreen.female'
      )}`,
    },
    {
      value: 'other',
      label: `⚪ ${t(
        'editProfileScreen.other'
      )}`,
    },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    console.log('EDIT PROFILE LOAD START');

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace('/login');
        return;
      }

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log(
          'LOCATION PERMISSION DENIED'
        );

        if (
          typeof window !== 'undefined'
        ) {
          window.alert(
            t(
              'editProfileScreen.locationPermissionRequired'
            )
          );
        }

        return;
      }

      const { data, error } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

      if (error) {
        console.log(
          'EDIT PROFILE LOAD ERROR:',
          error.message
        );
        return;
      }

      const loadedProfile =
        data as Profile;

      setProfile(loadedProfile);

      setName(
        loadedProfile.name ?? ''
      );

      setAge(
        loadedProfile.age
          ? String(loadedProfile.age)
          : ''
      );

      setCity(
        loadedProfile.city ?? ''
      );

      setBio(
        loadedProfile.bio ?? ''
      );

      setGender(
        loadedProfile.gender ?? ''
      );

      setDrink(
        loadedProfile.currently_up_for ??
          '🍺 Beer'
      );

      setIsActive(
        loadedProfile.is_active ?? true
      );

      setAvatarUrl(
        loadedProfile.avatar_url ?? null
      );

      const {
        data: photosData,
        error: photosError,
      } = await supabase
        .from('profile_photos')
        .select(
          'id, photo_url, sort_order'
        )
        .eq(
          'user_id',
          loadedProfile.id
        )
        .order('sort_order', {
          ascending: true,
        });

      if (photosError) {
        console.log(
          'PROFILE PHOTOS ERROR:',
          photosError.message
        );
      } else {
        setProfilePhotos(
          (photosData ??
            []) as GalleryPhoto[]
        );

        console.log(
          'PROFILE PHOTOS:',
          photosData ?? []
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!profile) {
      return;
    }

    if (!name.trim()) {
      if (
        typeof window !== 'undefined'
      ) {
        window.alert(
          t(
            'editProfileScreen.nameRequired'
          )
        );
      }

      return;
    }

    try {
      setSaving(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.log('NO LOGGED USER');
        return;
      }

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log(
          'LOCATION PERMISSION DENIED'
        );

        if (
          typeof window !== 'undefined'
        ) {
          window.alert(
            t(
              'editProfileScreen.locationPermissionRequired'
            )
          );
        }

        return;
      }

      const currentLocation =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.Balanced,
          }
        );

      const latitude =
        currentLocation.coords.latitude;

      const longitude =
        currentLocation.coords.longitude;

      console.log(
        'SAVING LOCATION:',
        {
          latitude,
          longitude,
        }
      );

      const reverseResponse =
        await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
        );

      const reverseData =
        await reverseResponse.json();

      console.log(
        'NOMINATIM RESULT:',
        reverseData
      );

const detectedCity =
  reverseData?.address?.city ??
  reverseData?.address?.town ??
  reverseData?.address?.village ??
  reverseData?.address?.municipality ??
  reverseData?.address?.county ??
  reverseData?.address?.state ??
  (city.trim() || null);

      console.log(
        'DETECTED CITY:',
        detectedCity
      );

      const { error } =
        await supabase
          .from('profiles')
          .update({
            is_active: isActive,
            name: name.trim(),
            age: age.trim()
              ? Number(age)
              : null,
            city: detectedCity,
            bio: bio.trim(),
            gender:
              gender || null,
            currently_up_for:
              drink,
            latitude,
            longitude,
          })
          .eq(
            'id',
            session.user.id
          );

      if (error) {
        throw error;
      }

      console.log(
        'PROFILE UPDATED SUCCESSFULLY'
      );

      router.back();
    } catch (error: any) {
      console.log(
        'PROFILE SAVE ERROR:',
        error?.message ?? error
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActiveStatus() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      console.log('NO LOGGED USER');
      return;
    }

    const newValue = !isActive;

    setIsActive(newValue);

    const { error } =
      await supabase
        .from('profiles')
        .update({
          is_active: newValue,
        })
        .eq(
          'id',
          session.user.id
        );

    if (error) {
      console.log(
        'ACTIVE STATUS ERROR:',
        error.message
      );

      setIsActive(!newValue);
      return;
    }

    console.log(
      'ACTIVE STATUS UPDATED:',
      newValue
    );
  }

  async function pickAndUploadAvatar() {
    try {
      setUploadingAvatar(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          }
        );

      if (result.canceled) {
        return;
      }

      const image =
        result.assets[0];

      const response =
        await fetch(image.uri);

      if (!response.ok) {
        alert(
          t(
            'editProfileScreen.imageReadError'
          )
        );
        return;
      }

      const arrayBuffer =
        await response.arrayBuffer();

      const fileExt =
        image.fileName
          ?.split('.')
          .pop()
          ?.toLowerCase() ||
        'jpg';

      const filePath =
        `${session.user.id}/avatar.${fileExt}`;

      alert(
        t(
          'editProfileScreen.imageLoaded'
        )
      );

      const {
        data: uploadData,
        error: uploadError,
      } = await supabase.storage
        .from('avatars')
        .upload(
          filePath,
          arrayBuffer,
          {
            contentType:
              image.mimeType ||
              'image/jpeg',
            upsert: true,
          }
        );

      if (uploadError) {
        alert(
          `${t(
            'editProfileScreen.uploadError'
          )}: ${uploadError.message}`
        );

        console.log(
          'AVATAR UPLOAD ERROR:',
          uploadError
        );

        return;
      }

      alert(
        t(
          'editProfileScreen.uploadSuccessful'
        )
      );

      console.log(
        'UPLOAD DATA:',
        uploadData
      );

      const {
        data: publicUrlData,
      } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl =
        `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const {
        error: profileError,
      } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
        })
        .eq(
          'id',
          session.user.id
        );

      if (profileError) {
        alert(
          `${t(
            'editProfileScreen.profileError'
          )}: ${profileError.message}`
        );

        console.log(
          'AVATAR PROFILE ERROR:',
          profileError
        );

        return;
      }

      setAvatarUrl(publicUrl);

      console.log(
        'AVATAR UPLOADED:',
        publicUrl
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAddGalleryPhoto() {
    if (!profile?.id) {
      return;
    }

    if (!profile.is_premium) {
      router.push('/premium');
      return;
    }

    if (
      profilePhotos.length >= 6
    ) {
      alert(
        t(
          'editProfileScreen.galleryLimit'
        )
      );
      return;
    }

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          }
        );

      if (result.canceled) {
        return;
      }

      const asset =
        result.assets[0];

      const response =
        await fetch(asset.uri);

      const blob =
        await response.blob();

      const extension =
        asset.fileName
          ?.split('.')
          .pop() ||
        'jpg';

      const filePath =
        `${profile.id}/gallery-${Date.now()}.${extension}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from('avatars')
        .upload(
          filePath,
          blob,
          {
            contentType:
              asset.mimeType ||
              'image/jpeg',
            upsert: false,
          }
        );

      if (uploadError) {
        console.log(
          'GALLERY UPLOAD ERROR:',
          uploadError.message
        );

        alert(
          t(
            'editProfileScreen.galleryUploadError'
          )
        );

        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const {
        data: insertedPhoto,
        error: insertError,
      } = await supabase
        .from('profile_photos')
        .insert({
          user_id: profile.id,
          photo_url: publicUrl,
          sort_order:
            profilePhotos.length,
        })
        .select(
          'id, photo_url, sort_order'
        )
        .single();

      if (insertError) {
        console.log(
          'GALLERY INSERT ERROR:',
          insertError.message
        );

        alert(
          t(
            'editProfileScreen.gallerySaveError'
          )
        );

        return;
      }

      setProfilePhotos(
        (current) => [
          ...current,
          insertedPhoto as GalleryPhoto,
        ]
      );

      console.log(
        'GALLERY PHOTO ADDED:',
        insertedPhoto
      );
    } catch (error) {
      console.log(
        'ADD GALLERY PHOTO ERROR:',
        error
      );

      alert(
        t(
          'editProfileScreen.galleryAddError'
        )
      );
    }
  }

  async function handleDeleteGalleryPhoto(
    photo: GalleryPhoto
  ) {
    if (!profile?.id) {
      return;
    }

    try {
      const marker =
        '/storage/v1/object/public/avatars/';

      const markerIndex =
        photo.photo_url.indexOf(
          marker
        );

      let storagePath:
        | string
        | null = null;

      if (markerIndex !== -1) {
        storagePath =
          decodeURIComponent(
            photo.photo_url.substring(
              markerIndex +
                marker.length
            )
          );
      }

      console.log(
        'DELETE STORAGE PATH:',
        storagePath
      );

      const {
        error: dbError,
      } = await supabase
        .from('profile_photos')
        .delete()
        .eq('id', photo.id)
        .eq(
          'user_id',
          profile.id
        );

      if (dbError) {
        console.log(
          'GALLERY DELETE DB ERROR:',
          dbError.message
        );
        return;
      }

      if (storagePath) {
        const {
          error: storageError,
        } = await supabase.storage
          .from('avatars')
          .remove([storagePath]);

        if (storageError) {
          console.log(
            'GALLERY DELETE STORAGE ERROR:',
            storageError.message
          );
        }
      }

      setProfilePhotos(
        (current) =>
          current.filter(
            (item) =>
              item.id !== photo.id
          )
      );
    } catch (error) {
      console.log(
        'DELETE GALLERY PHOTO ERROR:',
        error
      );
    }
  }

  if (loading) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <Text
          style={
            styles.loadingText
          }
        >
          {t(
            'editProfileScreen.loadingProfile'
          )}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>
            SipMate 🍻
          </Text>

          <Text style={styles.title}>
            {t(
              'editProfileScreen.title'
            )}
          </Text>

          <Text
            style={styles.subtitle}
          >
            {t(
              'editProfileScreen.subtitle'
            )}
          </Text>
        </View>

        <View
          style={
            styles.avatarSection
          }
        >
          <View
            style={
              styles.avatarWrapper
            }
          >
            {avatarUrl ? (
              <Image
                source={{
                  uri: avatarUrl,
                }}
                style={
                  styles.avatarImage
                }
                resizeMode="cover"
              />
            ) : (
              <View
                style={
                  styles.avatarPlaceholder
                }
              >
                <Text
                  style={
                    styles.avatarPlaceholderText
                  }
                >
                  {name
                    ?.charAt(0)
                    .toUpperCase() ||
                    '?'}
                </Text>
              </View>
            )}
          </View>

          <View
            style={
              styles.gallerySection
            }
          >
            <Text
              style={
                styles.galleryTitle
              }
            >
              📸{' '}
              {t(
                'editProfileScreen.profileGallery'
              )}
            </Text>

            {profilePhotos.length >
              0 && (
              <View
                style={
                  styles.galleryGrid
                }
              >
                {profilePhotos.map(
                  (photo) => (
                    <View
                      key={
                        photo.id
                      }
                      style={
                        styles.galleryImageWrapper
                      }
                    >
                      <Image
                        source={{
                          uri: photo.photo_url,
                        }}
                        style={
                          styles.galleryImage
                        }
                        resizeMode="cover"
                      />

                      <TouchableOpacity
                        style={
                          styles.deletePhotoButton
                        }
                        onPress={() =>
                          handleDeleteGalleryPhoto(
                            photo
                          )
                        }
                      >
                        <Text
                          style={
                            styles.deletePhotoText
                          }
                        >
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.addPhotoButton,
                !profile?.is_premium &&
                  styles.addPhotoButtonLocked,
              ]}
              onPress={
                handleAddGalleryPhoto
              }
            >
              <Text
                style={
                  styles.addPhotoButtonText
                }
              >
                {profile?.is_premium
                  ? `＋ ${t(
                      'editProfileScreen.addPhoto'
                    )}`
                  : `🔒 ${t(
                      'editProfileScreen.addMorePhotos'
                    )}`}
              </Text>
            </TouchableOpacity>
          </View>

          <Pressable
            style={
              styles.avatarButton
            }
            onPress={
              pickAndUploadAvatar
            }
            disabled={
              uploadingAvatar
            }
          >
            <Text
              style={
                styles.avatarButtonText
              }
            >
              {uploadingAvatar
                ? t(
                    'editProfileScreen.uploading'
                  )
                : `📷 ${t(
                    'editProfileScreen.changeProfilePhoto'
                  )}`}
            </Text>
          </Pressable>
        </View>

        <View
          style={styles.formCard}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {t(
              'editProfileScreen.profileDetails'
            )}
          </Text>

          <Text
            style={styles.label}
          >
            {t(
              'editProfileScreen.name'
            )}
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t(
              'editProfileScreen.namePlaceholder'
            )}
            placeholderTextColor="#52525B"
            style={styles.input}
          />

          <Text
            style={styles.label}
          >
            {t(
              'editProfileScreen.age'
            )}
          </Text>

          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder={t(
              'editProfileScreen.agePlaceholder'
            )}
            placeholderTextColor="#52525B"
            keyboardType="numeric"
            style={styles.input}
          />

          <Text
            style={styles.label}
          >
            {t(
              'editProfileScreen.gender'
            )}
          </Text>

          <View
            style={
              styles.genderRow
            }
          >
            {genders.map(
              (item) => (
                <Pressable
                  key={
                    item.value
                  }
                  style={[
                    styles.genderButton,
                    gender ===
                      item.value &&
                      styles.genderButtonSelected,
                  ]}
                  onPress={() =>
                    setGender(
                      item.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender ===
                        item.value &&
                        styles.genderTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <Text
            style={styles.label}
          >
            {t(
              'editProfileScreen.city'
            )}
          </Text>

          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder={t(
              'editProfileScreen.cityPlaceholder'
            )}
            placeholderTextColor="#52525B"
            style={styles.input}
          />

          <Text
            style={styles.label}
          >
            {t(
              'editProfileScreen.aboutMe'
            )}
          </Text>

          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder={t(
              'editProfileScreen.bioPlaceholder'
            )}
            placeholderTextColor="#52525B"
            multiline
            style={[
              styles.input,
              styles.bioInput,
            ]}
          />
        </View>

        <View
          style={styles.formCard}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {t(
              'editProfileScreen.currentlyUpFor'
            )}
          </Text>

          <Text
            style={
              styles.sectionDescription
            }
          >
            {t(
              'editProfileScreen.currentlyUpForDescription'
            )}
          </Text>

          <View
            style={styles.drinks}
          >
            {drinks.map(
              (item) => (
                <Pressable
                  key={
                    item.value
                  }
                  style={[
                    styles.drinkButton,
                    drink ===
                      item.value &&
                      styles.drinkButtonSelected,
                  ]}
                  onPress={() =>
                    setDrink(
                      item.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.drinkText,
                      drink ===
                        item.value &&
                        styles.drinkTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </View>

        <View
          style={styles.formCard}
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            {t(
              'editProfileScreen.discoverStatus'
            )}
          </Text>

          <Text
            style={
              styles.sectionDescription
            }
          >
            {t(
              'editProfileScreen.discoverStatusDescription'
            )}
          </Text>

          <Pressable
            style={[
              styles.activeButton,
              isActive
                ? styles.activeButtonOn
                : styles.activeButtonOff,
            ]}
            onPress={
              toggleActiveStatus
            }
          >
            <Text
              style={[
                styles.activeButtonText,
                isActive
                  ? styles.activeButtonTextOn
                  : styles.activeButtonTextOff,
              ]}
            >
              {isActive
                ? `● ${t(
                    'editProfileScreen.active'
                  )}`
                : `● ${t(
                    'editProfileScreen.inactive'
                  )}`}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.saveButton,
            saving &&
              styles.saveButtonDisabled,
          ]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text
            style={
              styles.saveText
            }
          >
            {saving
              ? t(
                  'editProfileScreen.saving'
                )
              : t(
                  'editProfileScreen.saveProfile'
                )}
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.cancelButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.cancelText
            }
          >
            {t(
              'editProfileScreen.cancel'
            )}
          </Text>
        </Pressable>

        <Text
          style={styles.footer}
        >
          {t(
            'editProfileScreen.footer'
          )}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        '#09090B',
    },

    loadingScreen: {
      flex: 1,
      backgroundColor:
        '#09090B',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    loadingText: {
      color: '#A1A1AA',
      fontSize: 14,
    },

    container: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      paddingTop: 70,
      paddingHorizontal: 20,
      paddingBottom: 100,
    },

    header: {
      marginBottom: 26,
    },

    logo: {
      color: '#FFFFFF',
      fontSize: 26,
      fontWeight: '900',
    },

    title: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '900',
      marginTop: 28,
      letterSpacing: -0.5,
    },

    subtitle: {
      color: '#A1A1AA',
      fontSize: 14,
      lineHeight: 21,
      marginTop: 7,
    },

    avatarSection: {
      alignItems: 'center',
      marginBottom: 24,
    },

    avatarWrapper: {
      width: 126,
      height: 126,
      borderRadius: 63,
      borderWidth: 3,
      borderColor: '#DC2626',
      padding: 3,
      backgroundColor:
        '#18181B',
    },

    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 60,
    },

    avatarPlaceholder: {
      flex: 1,
      borderRadius: 60,
      backgroundColor:
        '#450A0A',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    avatarPlaceholderText: {
      color: '#FFFFFF',
      fontSize: 42,
      fontWeight: '900',
    },

    avatarButton: {
      marginTop: 14,
      backgroundColor:
        '#18181B',
      borderWidth: 1,
      borderColor: '#3F3F46',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 16,
    },

    avatarButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

    formCard: {
      backgroundColor:
        '#18181B',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: '#27272A',
      marginBottom: 14,
    },

    sectionTitle: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1,
    },

    sectionDescription: {
      color: '#71717A',
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
      marginBottom: 16,
    },

    label: {
      color: '#71717A',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.3,
      marginBottom: 7,
      marginTop: 17,
    },

    input: {
      backgroundColor:
        '#09090B',
      color: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#27272A',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
    },

    bioInput: {
      minHeight: 110,
      textAlignVertical:
        'top',
    },

    drinks: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },

    drinkButton: {
      backgroundColor:
        '#27272A',
      borderWidth: 1,
      borderColor: '#3F3F46',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      marginRight: 8,
      marginBottom: 8,
    },

    drinkButtonSelected: {
      backgroundColor:
        '#DC2626',
      borderColor: '#EF4444',
    },

    drinkText: {
      color: '#A1A1AA',
      fontSize: 13,
      fontWeight: '700',
    },

    drinkTextSelected: {
      color: '#FFFFFF',
      fontWeight: '900',
    },

    activeButton: {
      width: '100%',
      paddingVertical: 15,
      paddingHorizontal: 14,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
    },

    activeButtonOn: {
      backgroundColor:
        '#052E16',
      borderColor: '#22C55E',
    },

    activeButtonOff: {
      backgroundColor:
        '#27272A',
      borderColor: '#52525B',
    },

    activeButtonText: {
      fontSize: 12,
      fontWeight: '900',
    },

    activeButtonTextOn: {
      color: '#4ADE80',
    },

    activeButtonTextOff: {
      color: '#A1A1AA',
    },

    saveButton: {
      marginTop: 10,
      backgroundColor:
        '#DC2626',
      paddingVertical: 17,
      borderRadius: 20,
      alignItems: 'center',

      shadowColor: '#DC2626',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 5,
    },

    saveButtonDisabled: {
      opacity: 0.5,
    },

    saveText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    cancelButton: {
      marginTop: 10,
      paddingVertical: 15,
      alignItems: 'center',
    },

    cancelText: {
      color: '#71717A',
      fontSize: 13,
      fontWeight: '700',
    },

    footer: {
      color: '#52525B',
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '700',
      marginTop: 18,
    },

    genderRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },

    genderButton: {
      backgroundColor:
        '#27272A',
      borderWidth: 1,
      borderColor: '#3F3F46',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      marginRight: 8,
      marginBottom: 8,
    },

    genderButtonSelected: {
      backgroundColor:
        '#DC2626',
      borderColor: '#EF4444',
    },

    genderText: {
      color: '#A1A1AA',
      fontSize: 13,
      fontWeight: '700',
    },

    genderTextSelected: {
      color: '#FFFFFF',
      fontWeight: '900',
    },

    gallerySection: {
      width: '100%',
      marginTop: 18,
    },

    galleryTitle: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
      marginBottom: 10,
    },

    addPhotoButton: {
      backgroundColor:
        '#F59E0B',
      borderRadius: 16,
      paddingVertical: 13,
      alignItems: 'center',
    },

    addPhotoButtonLocked: {
      backgroundColor:
        '#27272A',
      borderWidth: 1,
      borderColor: '#F59E0B',
    },

    addPhotoButtonText: {
      color: '#09090B',
      fontSize: 11,
      fontWeight: '900',
    },

    galleryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },

    galleryImage: {
      width: '100%',
      height: '100%',
      borderRadius: 14,
      backgroundColor:
        '#27272A',
    },

    galleryImageWrapper: {
      width: 92,
      height: 92,
      marginRight: 8,
      marginBottom: 8,
      position: 'relative',
    },

    deletePhotoButton: {
      position: 'absolute',
      top: 5,
      right: 5,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor:
        '#DC2626',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    deletePhotoText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '900',
    },
  });