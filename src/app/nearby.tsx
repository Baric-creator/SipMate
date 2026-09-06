import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '../lib/supabase';

export default function NearbyScreen() {
  const { t } = useTranslation();

  const [nearbyProfiles, setNearbyProfiles] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [maxDistance, setMaxDistance] =
    useState(10);

  const [drinkFilter, setDrinkFilter] =
    useState('All');

  const [isPremium, setIsPremium] =
    useState(false);

  const [
    showAdvancedFilters,
    setShowAdvancedFilters,
  ] = useState(false);

  const [ageFilter, setAgeFilter] =
    useState('All');

  const [
    genderFilter,
    setGenderFilter,
  ] = useState('All');

  const [
    showLocationChanger,
    setShowLocationChanger,
  ] = useState(false);

  const [customCity, setCustomCity] =
    useState('');

  const [
    customLatitude,
    setCustomLatitude,
  ] = useState<number | null>(null);

  const [
    customLongitude,
    setCustomLongitude,
  ] = useState<number | null>(null);

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const [
    showSkippedProfiles,
    setShowSkippedProfiles,
  ] = useState(false);

  const [
    skippedProfiles,
    setSkippedProfiles,
  ] = useState<any[]>([]);

  const [
    loadingSkipped,
    setLoadingSkipped,
  ] = useState(false);

  const drinkFilters = [
    {
      value: 'All',
      label: t('nearbyScreen.all'),
    },
    {
      value: '🍺 Beer',
      label: `🍺 ${t(
        'nearbyScreen.beer'
      )}`,
    },
    {
      value: '🍹 Cocktail',
      label: `🍹 ${t(
        'nearbyScreen.cocktail'
      )}`,
    },
    {
      value: '☕ Coffee',
      label: `☕ ${t(
        'nearbyScreen.coffee'
      )}`,
    },
    {
      value: '🥂 Drinks',
      label: `🥂 ${t(
        'nearbyScreen.drinks'
      )}`,
    },
    {
      value: '🎉 Hangout',
      label: `🎉 ${t(
        'nearbyScreen.hangout'
      )}`,
    },
  ];

  function translateActivity(
    activity: string | null
  ) {
    if (!activity) {
      return t(
        'nearbyScreen.readyForDrink'
      );
    }

    const translations: Record<
      string,
      string
    > = {
      '🍺 Beer': `🍺 ${t(
        'nearbyScreen.beer'
      )}`,
      '🍹 Cocktail': `🍹 ${t(
        'nearbyScreen.cocktail'
      )}`,
      '🍸 Cocktail': `🍸 ${t(
        'nearbyScreen.cocktail'
      )}`,
      '☕ Coffee': `☕ ${t(
        'nearbyScreen.coffee'
      )}`,
      '🥂 Drinks': `🥂 ${t(
        'nearbyScreen.drinks'
      )}`,
      '🎉 Hangout': `🎉 ${t(
        'nearbyScreen.hangout'
      )}`,
    };

    return (
      translations[activity] ??
      activity
    );
  }

  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) {
    const R = 6371;

    const dLat =
      ((lat2 - lat1) * Math.PI) /
      180;

    const dLon =
      ((lon2 - lon1) * Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(
        (lat1 * Math.PI) / 180
      ) *
        Math.cos(
          (lat2 * Math.PI) / 180
        ) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return R * c;
  }

  async function loadNearbyProfiles() {
    try {
      setLoading(true);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        console.log(
          'NEARBY: NO LOGGED USER'
        );
        return;
      }

      const {
        data: myProfile,
        error: myError,
      } = await supabase
        .from('profiles')
        .select('id, city, latitude, longitude, is_premium, premium_until')
        .eq('id', user.id)
        .single();

      if (myError) {
        console.log(
          'MY PROFILE ERROR:',
          myError.message
        );
        return;
      }

      const premiumActive =
        myProfile.is_premium === true &&
        (!myProfile.premium_until ||
          new Date(
            myProfile.premium_until
          ) > new Date());

      setIsPremium(premiumActive);

      console.log(
        'NEARBY PREMIUM:',
        premiumActive
      );

      if (
        myProfile.latitude == null ||
        myProfile.longitude == null
      ) {
        console.log(
          'MY LOCATION NOT SET'
        );
        return;
      }

      const {
        data: profiles,
        error,
      } = await supabase
        .from('profiles')
        .select('id, name, age, city, latitude, longitude, avatar_url, currently_up_for, is_active, gender')
        .neq('id', user.id);

      console.log(
        'NEARBY PROFILES:',
        profiles
      );

      if (error) {
        console.log(
          'NEARBY LOAD ERROR:',
          error.message
        );
        return;
      }

      const {
        data: blocks,
        error: blocksError,
      } = await supabase
        .from('blocks')
        .select(
          'blocker_id, blocked_id'
        )
        .or(
          `blocker_id.eq.${user.id},blocked_id.eq.${user.id}`
        );

      if (blocksError) {
        console.log(
          'BLOCKS LOAD ERROR:',
          blocksError.message
        );
      }

      const blockedUserIds =
        new Set(
          (blocks ?? []).map(
            (block) =>
              block.blocker_id ===
              user.id
                ? block.blocked_id
                : block.blocker_id
          )
        );

      const {
        data: skippedData,
        error: skippedError,
      } = await supabase
        .from('skipped_profiles')
        .select('skipped_user_id')
        .eq('user_id', user.id);

      if (skippedError) {
        console.log(
          'SKIPPED PROFILES ERROR:',
          skippedError.message
        );
      }

      const skippedUserIds =
        new Set(
          (skippedData ?? []).map(
            (item) =>
              item.skipped_user_id
          )
        );

      const originLatitude =
        isPremium &&
        customLatitude !== null
          ? customLatitude
          : myProfile.latitude;

      const originLongitude =
        isPremium &&
        customLongitude !== null
          ? customLongitude
          : myProfile.longitude;

      const profilesWithDistance =
        (profiles ?? [])
          .filter(
            (p) =>
              !blockedUserIds.has(
                p.id
              ) &&
              !skippedUserIds.has(
                p.id
              ) &&
              p.is_active === true &&
              p.latitude != null &&
              p.longitude != null
          )
          .map((p) => ({
            ...p,
            distance:
              calculateDistance(
                originLatitude,
                originLongitude,
                p.latitude,
                p.longitude
              ),
          }))
          .filter(
            (p) =>
              p.distance <=
              maxDistance
          )
          .filter(
            (p) =>
              drinkFilter ===
                'All' ||
              p.currently_up_for ===
                drinkFilter
          )
          .filter((p) => {
            if (
              !isPremium ||
              ageFilter === 'All'
            ) {
              return true;
            }

            if (p.age == null) {
              return false;
            }

            if (
              ageFilter === '18-25'
            ) {
              return (
                p.age >= 18 &&
                p.age <= 25
              );
            }

            if (
              ageFilter === '26-35'
            ) {
              return (
                p.age >= 26 &&
                p.age <= 35
              );
            }

            if (
              ageFilter === '36-45'
            ) {
              return (
                p.age >= 36 &&
                p.age <= 45
              );
            }

            if (
              ageFilter === '46+'
            ) {
              return p.age >= 46;
            }

            return true;
          })
          .filter((p) => {
            if (
              !isPremium ||
              genderFilter ===
                'All'
            ) {
              return true;
            }

            return (
              p.gender ===
              genderFilter
            );
          })
          .sort(
            (a, b) =>
              a.distance -
              b.distance
          );

      setNearbyProfiles(
        profilesWithDistance
      );
    } catch (error) {
      console.log(
        'NEARBY CRASH:',
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNearbyProfiles();
  }, [
    maxDistance,
    drinkFilter,
    ageFilter,
    genderFilter,
    customLatitude,
    customLongitude,
  ]);

  useEffect(() => {
    const channel = supabase
      .channel(
        'nearby-profile-status'
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          loadNearbyProfiles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  async function handleSkipProfile(
    skippedUserId: string
  ) {
    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { error } =
        await supabase
          .from(
            'skipped_profiles'
          )
          .upsert(
            {
              user_id: user.id,
              skipped_user_id:
                skippedUserId,
            },
            {
              onConflict:
                'user_id,skipped_user_id',
            }
          );

      if (error) {
        console.log(
          'SKIP PROFILE ERROR:',
          error.message
        );
        return;
      }

      setNearbyProfiles(
        (current) =>
          current.filter(
            (person) =>
              person.id !==
              skippedUserId
          )
      );
    } catch (error) {
      console.log(
        'SKIP PROFILE ERROR:',
        error
      );
    }
  }

  async function loadSkippedProfiles() {
    try {
      setLoadingSkipped(true);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const {
        data: skippedData,
        error: skippedError,
      } = await supabase
        .from('skipped_profiles')
        .select(
          'skipped_user_id, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (skippedError) {
        console.log(
          'LOAD SKIPPED ERROR:',
          skippedError.message
        );
        return;
      }

      const skippedIds =
        (skippedData ?? []).map(
          (item) =>
            item.skipped_user_id
        );

      if (
        skippedIds.length === 0
      ) {
        setSkippedProfiles([]);
        return;
      }

      const {
        data: profilesData,
        error: profilesError,
      } = await supabase
        .from('profiles')
        .select(
          'id, name, age, avatar_url, currently_up_for, gender'
        )
        .in('id', skippedIds);

      if (profilesError) {
        console.log(
          'SKIPPED PROFILE DATA ERROR:',
          profilesError.message
        );
        return;
      }

      const orderedProfiles =
        skippedIds
          .map((id) =>
            (
              profilesData ?? []
            ).find(
              (profile) =>
                profile.id === id
            )
          )
          .filter(Boolean);

      setSkippedProfiles(
        orderedProfiles
      );
    } catch (error) {
      console.log(
        'LOAD SKIPPED ERROR:',
        error
      );
    } finally {
      setLoadingSkipped(false);
    }
  }

  async function handleRestoreProfile(
    skippedUserId: string
  ) {
    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const { error } =
        await supabase
          .from(
            'skipped_profiles'
          )
          .delete()
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'skipped_user_id',
            skippedUserId
          );

      if (error) {
        console.log(
          'RESTORE PROFILE ERROR:',
          error.message
        );
        return;
      }

      setSkippedProfiles(
        (current) =>
          current.filter(
            (person) =>
              person.id !==
              skippedUserId
          )
      );

      await loadNearbyProfiles();
    } catch (error) {
      console.log(
        'RESTORE PROFILE ERROR:',
        error
      );
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.scrollContent
      }
      showsVerticalScrollIndicator={
        false
      }
    >
      <Text style={styles.title}>
        🍻 SipMate
      </Text>

      <Text
        style={styles.subtitle}
      >
        {t(
          'nearbyScreen.subtitle'
        )}
      </Text>

      <View
        style={
          styles.distanceFilters
        }
      >
        {[1, 5, 10, 25].map(
          (distance) => (
            <TouchableOpacity
              key={distance}
              style={[
                styles.distanceFilterButton,
                maxDistance ===
                  distance &&
                  styles.distanceFilterButtonActive,
              ]}
              onPress={() =>
                setMaxDistance(
                  distance
                )
              }
            >
              <Text
                style={[
                  styles.distanceFilterText,
                  maxDistance ===
                    distance &&
                    styles.distanceFilterTextActive,
                ]}
              >
                {distance} km
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <View
        style={
          styles.drinkFilters
        }
      >
        {drinkFilters.map(
          (item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.drinkFilterButton,
                drinkFilter ===
                  item.value &&
                  styles.drinkFilterButtonActive,
              ]}
              onPress={() =>
                setDrinkFilter(
                  item.value
                )
              }
            >
              <Text
                style={[
                  styles.drinkFilterText,
                  drinkFilter ===
                    item.value &&
                    styles.drinkFilterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.advancedFilterButton,
          isPremium &&
            styles.advancedFilterButtonPremium,
        ]}
        onPress={() => {
          if (!isPremium) {
            router.push(
              '/premium'
            );
            return;
          }

          setShowAdvancedFilters(
            (prev) => !prev
          );
        }}
      >
        <View>
          <Text
            style={
              styles.advancedFilterTitle
            }
          >
            💎{' '}
            {t(
              'nearbyScreen.advancedFilters'
            )}
          </Text>

          <Text
            style={
              styles.advancedFilterSubtitle
            }
          >
            {isPremium
              ? t(
                  'nearbyScreen.advancedPremium'
                )
              : t(
                  'nearbyScreen.advancedLocked'
                )}
          </Text>
        </View>

        <Text
          style={
            styles.advancedFilterArrow
          }
        >
          {isPremium
            ? '›'
            : '🔒'}
        </Text>
      </TouchableOpacity>

      {isPremium &&
        showAdvancedFilters && (
          <View
            style={
              styles.advancedPanel
            }
          >
            <Text
              style={
                styles.advancedPanelTitle
              }
            >
              💎{' '}
              {t(
                'nearbyScreen.premiumFilters'
              )}
            </Text>

            <Text
              style={
                styles.filterLabel
              }
            >
              {t(
                'nearbyScreen.age'
              )}
            </Text>

            <View
              style={
                styles.filterRow
              }
            >
              {[
                'All',
                '18-25',
                '26-35',
                '36-45',
                '46+',
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.filterChip,
                    ageFilter ===
                      item &&
                      styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setAgeFilter(
                      item
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      ageFilter ===
                        item &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {item ===
                    'All'
                      ? t(
                          'nearbyScreen.all'
                        )
                      : item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={
                styles.filterLabel
              }
            >
              {t(
                'nearbyScreen.gender'
              )}
            </Text>

            <View
              style={
                styles.filterRow
              }
            >
              {[
                {
                  value: 'All',
                  label: t(
                    'nearbyScreen.all'
                  ),
                },
                {
                  value: 'male',
                  label: `👨 ${t(
                    'nearbyScreen.men'
                  )}`,
                },
                {
                  value: 'female',
                  label: `👩 ${t(
                    'nearbyScreen.women'
                  )}`,
                },
                {
                  value: 'other',
                  label: `⚪ ${t(
                    'nearbyScreen.other'
                  )}`,
                },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.filterChip,
                    genderFilter ===
                      item.value &&
                      styles.filterChipActive,
                  ]}
                  onPress={() =>
                    setGenderFilter(
                      item.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      genderFilter ===
                        item.value &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={
                styles.filterLabel
              }
            >
              {t(
                'nearbyScreen.location'
              )}
            </Text>

            <TouchableOpacity
              style={
                styles.changeLocationButton
              }
              onPress={() =>
                setShowLocationChanger(
                  (prev) =>
                    !prev
                )
              }
            >
              <View>
                <Text
                  style={
                    styles.changeLocationTitle
                  }
                >
                  📍{' '}
                  {t(
                    'nearbyScreen.changeLocation'
                  )}
                </Text>

                <Text
                  style={
                    styles.changeLocationSubtitle
                  }
                >
                  {t(
                    'nearbyScreen.changeLocationSubtitle'
                  )}
                </Text>
              </View>

              <Text
                style={
                  styles.changeLocationArrow
                }
              >
                {showLocationChanger
                  ? '⌃'
                  : '›'}
              </Text>
            </TouchableOpacity>

            {showLocationChanger && (
              <View
                style={
                  styles.locationChangerBox
                }
              >
                <Text
                  style={
                    styles.locationChangerLabel
                  }
                >
                  {t(
                    'nearbyScreen.city'
                  )}
                </Text>

                <TextInput
                  style={
                    styles.locationInput
                  }
                  value={customCity}
                  onChangeText={
                    setCustomCity
                  }
                  placeholder={t(
                    'nearbyScreen.cityPlaceholder'
                  )}
                  placeholderTextColor="#52525B"
                />

                <TouchableOpacity
                  style={
                    styles.applyLocationButton
                  }
                  onPress={
                    async () => {
                      if (
                        !customCity.trim()
                      ) {
                        return;
                      }

                      try {
                        setLocationLoading(
                          true
                        );

                        const response =
                          await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
                              customCity.trim()
                            )}`
                          );

                        const results =
                          await response.json();

                        if (
                          !results ||
                          results.length ===
                            0
                        ) {
                          alert(
                            t(
                              'nearbyScreen.locationNotFound'
                            )
                          );
                          return;
                        }

                        const latitude =
                          Number(
                            results[0]
                              .lat
                          );

                        const longitude =
                          Number(
                            results[0]
                              .lon
                          );

                        setCustomLatitude(
                          latitude
                        );

                        setCustomLongitude(
                          longitude
                        );
                      } catch (
                        error
                      ) {
                        console.log(
                          'GEOCODING ERROR:',
                          error
                        );

                        alert(
                          t(
                            'nearbyScreen.locationError'
                          )
                        );
                      } finally {
                        setLocationLoading(
                          false
                        );
                      }
                    }
                  }
                >
                  <Text
                    style={
                      styles.applyLocationText
                    }
                  >
                    {locationLoading
                      ? t(
                          'nearbyScreen.findingLocation'
                        )
                      : t(
                          'nearbyScreen.useThisLocation'
                        )}
                  </Text>
                </TouchableOpacity>

                {customLatitude !==
                  null &&
                  customLongitude !==
                    null && (
                    <>
                      <Text
                        style={
                          styles.locationSuccess
                        }
                      >
                        ✓{' '}
                        {t(
                          'nearbyScreen.locationFound'
                        )}{' '}
                        {customCity}
                      </Text>

                      <Text
                        style={
                          styles.searchingAroundText
                        }
                      >
                        📍{' '}
                        {t(
                          'nearbyScreen.searchingAround'
                        )}{' '}
                        {customCity}
                      </Text>

                      <TouchableOpacity
                        style={
                          styles.useMyLocationButton
                        }
                        onPress={() => {
                          setCustomCity(
                            ''
                          );

                          setCustomLatitude(
                            null
                          );

                          setCustomLongitude(
                            null
                          );

                          setShowLocationChanger(
                            false
                          );
                        }}
                      >
                        <Text
                          style={
                            styles.useMyLocationText
                          }
                        >
                          {t(
                            'nearbyScreen.useMyLocationAgain'
                          )}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
              </View>
            )}

            <TouchableOpacity
              style={
                styles.skippedProfilesButton
              }
              onPress={() => {
                if (!isPremium) {
                  router.push(
                    '/premium'
                  );
                  return;
                }

                if (
                  !showSkippedProfiles
                ) {
                  loadSkippedProfiles();
                }

                setShowSkippedProfiles(
                  (prev) =>
                    !prev
                );
              }}
            >
              <View>
                <Text
                  style={
                    styles.skippedProfilesTitle
                  }
                >
                  ↩️{' '}
                  {t(
                    'nearbyScreen.skippedProfiles'
                  )}
                </Text>

                <Text
                  style={
                    styles.skippedProfilesSubtitle
                  }
                >
                  {t(
                    'nearbyScreen.skippedProfilesSubtitle'
                  )}
                </Text>
              </View>

              <Text
                style={
                  styles.skippedProfilesArrow
                }
              >
                {showSkippedProfiles
                  ? '⌃'
                  : '›'}
              </Text>
            </TouchableOpacity>

            {showSkippedProfiles && (
              <View
                style={
                  styles.skippedProfilesPanel
                }
              >
                {loadingSkipped ? (
                  <Text
                    style={
                      styles.skippedProfilesEmpty
                    }
                  >
                    {t(
                      'nearbyScreen.loadingSkipped'
                    )}
                  </Text>
                ) : skippedProfiles.length ===
                  0 ? (
                  <Text
                    style={
                      styles.skippedProfilesEmpty
                    }
                  >
                    {t(
                      'nearbyScreen.noSkippedProfiles'
                    )}
                  </Text>
                ) : (
                  skippedProfiles.map(
                    (person) => (
                      <View
                        key={
                          person.id
                        }
                        style={
                          styles.skippedProfileRow
                        }
                      >
                        <View
                          style={
                            styles.skippedProfileInfo
                          }
                        >
                          <Text
                            style={
                              styles.skippedProfileName
                            }
                          >
                            {person.name ??
                              t(
                                'nearbyScreen.userFallback'
                              )}
                            {person.age
                              ? `, ${person.age}`
                              : ''}
                          </Text>

                          <Text
                            style={
                              styles.skippedProfileActivity
                            }
                          >
                            {translateActivity(
                              person.currently_up_for
                            )}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() =>
                            handleRestoreProfile(
                              person.id
                            )
                          }
                        >
                          <Text
                            style={
                              styles.skippedProfileRestore
                            }
                          >
                            ↩️{' '}
                            {t(
                              'nearbyScreen.restore'
                            )}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )
                  )
                )}
              </View>
            )}

            <TouchableOpacity
              style={
                styles.resetFiltersButton
              }
              onPress={() => {
                setAgeFilter(
                  'All'
                );

                setGenderFilter(
                  'All'
                );
              }}
            >
              <Text
                style={
                  styles.resetFiltersText
                }
              >
                {t(
                  'nearbyScreen.resetFilters'
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      {loading ? (
        <Text
          style={styles.subtitle}
        >
          📍{' '}
          {t(
            'nearbyScreen.findingPeople'
          )}
        </Text>
      ) : nearbyProfiles.length ===
        0 ? (
        <Text
          style={styles.subtitle}
        >
          🍻{' '}
          {t(
            'nearbyScreen.nobodyNearby'
          )}
        </Text>
      ) : (
        nearbyProfiles.map(
          (person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname:
                    '/user-profile',
                  params: {
                    id: person.id,
                  },
                })
              }
            >
              <View
                style={
                  styles.profileInfo
                }
              >
                {person.avatar_url ? (
                  <Image
                    source={{
                      uri: `${person.avatar_url}${
                        person.avatar_url.includes(
                          '?'
                        )
                          ? '&'
                          : '?'
                      }refresh=${Date.now()}`,
                    }}
                    style={
                      styles.avatarImage
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={
                      styles.avatar
                    }
                  >
                    <Text
                      style={
                        styles.avatarText
                      }
                    >
                      {person.name
                        ?.charAt(0)
                        .toUpperCase() ||
                        '?'}
                    </Text>
                  </View>
                )}

                <View
                  style={
                    styles.nameArea
                  }
                >
                  <View
                    style={
                      styles.nameRow
                    }
                  >
                    <Text
                      style={
                        styles.name
                      }
                    >
                      {person.name ??
                        t(
                          'nearbyScreen.userFallback'
                        )}
                      {person.age
                        ? `, ${person.age}`
                        : ''}
                    </Text>

                    <View
                      style={
                        styles.activeBadge
                      }
                    >
                      <Text
                        style={
                          styles.activeBadgeText
                        }
                      >
                        ●{' '}
                        {t(
                          'nearbyScreen.active'
                        )}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.distance
                    }
                  >
                    📍{' '}
                    {person.distance <
                    1
                      ? `${Math.round(
                          person.distance *
                            1000
                        )} ${t(
                          'nearbyScreen.metersAway'
                        )}`
                      : `${person.distance.toFixed(
                          1
                        )} ${t(
                          'nearbyScreen.kilometersAway'
                        )}`}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.activityBox
                }
              >
                <Text
                  style={
                    styles.activityLabel
                  }
                >
                  {t(
                    'nearbyScreen.currentlyUpFor'
                  )}
                </Text>

                <Text
                  style={
                    styles.activity
                  }
                >
                  {translateActivity(
                    person.currently_up_for
                  )}
                </Text>
              </View>

              <Text
                style={
                  styles.openProfile
                }
              >
                {t(
                  'nearbyScreen.viewProfile'
                )}
              </Text>

              <TouchableOpacity
                style={
                  styles.skipButton
                }
                onPress={(
                  event
                ) => {
                  event.stopPropagation();
                  handleSkipProfile(
                    person.id
                  );
                }}
              >
                <Text
                  style={
                    styles.skipButtonText
                  }
                >
                  ✕{' '}
                  {t(
                    'nearbyScreen.skip'
                  )}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B',
    paddingTop: 60,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  logo: {
    color: '#A855F7',
    fontSize: 32,
    fontWeight: '900',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 0.3,
  },

  subtitle: {
    color: '#A1A1AA',
    fontSize: 15,
    marginTop: 8,
    marginBottom: 28,
  },

  card: {
    backgroundColor: '#18181B',
    padding: 18,
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },

  name: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  distance: {
    color: '#A1A1AA',
    marginTop: 3,
  },

  activityBox: {
    marginTop: 14,
    backgroundColor: '#202023',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: '#2F2F35',
  },

  activityLabel: {
    color: '#71717A',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  activity: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 5,
  },

  openProfile: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 12,
  },

  distanceFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 22,
  },

  distanceFilterButton: {
    backgroundColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },

  distanceFilterButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },

  distanceFilterText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
  },

  distanceFilterTextActive: {
    color: '#FFFFFF',
  },

  drinkFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 22,
  },

  drinkFilterButton: {
    backgroundColor: '#27272A',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },

  drinkFilterButtonActive: {
    backgroundColor: '#DC2626',
  },

  drinkFilterText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
  },

  drinkFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#450A0A',
    borderWidth: 2,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#27272A',
    borderWidth: 2,
    borderColor: '#DC2626',
  },

  nameArea: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  activeBadge: {
    marginLeft: 10,
    backgroundColor: '#052E16',
    borderWidth: 1,
    borderColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  activeBadgeText: {
    color: '#4ADE80',
    fontSize: 9,
    fontWeight: '900',
  },

  advancedFilterButton: {
    width: '100%',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 15,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  advancedFilterButtonPremium: {
    backgroundColor: '#1C1608',
    borderColor: '#FBBF24',
  },

  advancedFilterTitle: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  advancedFilterSubtitle: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 4,
  },

  advancedFilterArrow: {
    color: '#FBBF24',
    fontSize: 22,
    fontWeight: '900',
  },

  advancedPanel: {
    width: '100%',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },

  advancedPanelTitle: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  filterLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  filterChip: {
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },

  filterChipActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#FBBF24',
  },

  filterChipText: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '700',
  },

  filterChipTextActive: {
    color: '#09090B',
    fontWeight: '900',
  },

  resetFiltersButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },

  resetFiltersText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  changeLocationButton: {
    width: '100%',
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  changeLocationTitle: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '900',
  },

  changeLocationSubtitle: {
    color: '#71717A',
    fontSize: 10,
    marginTop: 3,
  },

  changeLocationArrow: {
    color: '#FBBF24',
    fontSize: 20,
    fontWeight: '900',
  },

  locationChangerBox: {
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },

  locationChangerLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 7,
  },

  locationInput: {
    width: '100%',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 14,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },

  applyLocationButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 10,
    alignItems: 'center',
  },

  applyLocationText: {
    color: '#09090B',
    fontSize: 11,
    fontWeight: '900',
  },

  locationSuccess: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },

  searchingAroundText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },

  useMyLocationButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3F3F46',
    alignItems: 'center',
  },

  useMyLocationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  skipButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },

  skipButtonText: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '900',
  },

  skippedProfilesButton: {
    width: '100%',
    backgroundColor: '#27272A',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  skippedProfilesTitle: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '900',
  },

  skippedProfilesSubtitle: {
    color: '#71717A',
    fontSize: 10,
    marginTop: 3,
  },

  skippedProfilesArrow: {
    color: '#FBBF24',
    fontSize: 20,
    fontWeight: '900',
  },

  skippedProfilesPanel: {
    backgroundColor: '#09090B',
    borderWidth: 1,
    borderColor: '#3F3F46',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
  },

  skippedProfilesEmpty: {
    color: '#A1A1AA',
    fontSize: 12,
  },

  skippedProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },

  skippedProfileInfo: {
    flex: 1,
    paddingRight: 12,
  },

  skippedProfileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  skippedProfileActivity: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 3,
  },

  skippedProfileRestore: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '900',
  },
});