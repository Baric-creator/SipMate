import fs from 'node:fs';

function replaceRange(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`${label}: start marker not found`);
  const end = source.indexOf(endMarker, start);
  if (end === -1) throw new Error(`${label}: end marker not found`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function replaceOnce(source, from, to, label) {
  const first = source.indexOf(from);
  if (first === -1) throw new Error(`${label}: text not found`);
  if (source.indexOf(from, first + from.length) !== -1) {
    throw new Error(`${label}: text is not unique`);
  }
  return source.slice(0, first) + to + source.slice(first + from.length);
}

function writeChanged(path, next) {
  const previous = fs.readFileSync(path, 'utf8');
  if (previous === next) throw new Error(`${path}: no changes produced`);
  fs.writeFileSync(path, next);
  console.log(`updated ${path}`);
}

// user-profile.tsx
{
  const path = 'src/app/user-profile.tsx';
  let source = fs.readFileSync(path, 'utf8');
  source = replaceOnce(
    source,
    "import { supabase } from '../lib/supabase';\n",
    "import { getCheersRelationship, getProfilePhotos, getPublicProfile } from '../lib/privacy-profile-api';\nimport { supabase } from '../lib/supabase';\n",
    'user-profile privacy import'
  );

  source = replaceRange(
    source,
    '  async function checkCheersStatus(targetUserId: string) {',
    '  async function loadUserProfile() {',
`  async function checkCheersStatus(targetUserId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return;

    if (session.user.id === targetUserId) {
      setCheersStatus('none');
      return;
    }

    try {
      setCheersStatus(await getCheersRelationship(targetUserId));
    } catch (error) {
      console.log('CHEERS STATUS ERROR:', error);
      setCheersStatus('none');
    }
  }

`,
    'user-profile cheers status'
  );

  source = replaceRange(
    source,
    "      const { data, error } = await supabase\n        .from('profiles')\n        .select('*')\n        .eq('id', targetId)\n        .maybeSingle();",
    '    } finally {',
`      try {
        const [data, photosData] = await Promise.all([
          getPublicProfile(targetId),
          getProfilePhotos(targetId),
        ]);

        setProfilePhotos(photosData as ProfilePhoto[]);
        setProfile(data as UserProfile | null);
        if (data?.id) await checkCheersStatus(data.id);
      } catch (profileError) {
        console.log('PROFILE LOAD ERROR:', profileError);
        setProfile(null);
        setProfilePhotos([]);
      }
`,
    'user-profile profile/photo load'
  );

  source = replaceRange(
    source,
    "    const { data: mutualCheers, error: mutualError } = await supabase\n      .from('cheers')",
    "    if (typeof window !== 'undefined') {\n      window.alert(`🍻 ${text.cheersSentTo} ${profile.name ?? text.userFallback}!`);\n    }",
`    try {
      const relationship = await getCheersRelationship(receiverId);
      if (relationship === 'mutual') {
        setCheersStatus('mutual');
        setShowMutualCheers(true);
        playCheersAnimation();
        return;
      }
      setCheersStatus('sent');
    } catch (relationshipError) {
      console.log('MUTUAL CHEERS ERROR:', relationshipError);
      return;
    }

`,
    'user-profile post-send relationship'
  );

  writeChanged(path, source);
}

// chat.tsx
{
  const path = 'src/app/chat.tsx';
  let source = fs.readFileSync(path, 'utf8');
  source = replaceOnce(
    source,
    "import { supabase } from '../lib/supabase';\n",
    "import { getPublicProfile } from '../lib/privacy-profile-api';\nimport { supabase } from '../lib/supabase';\n",
    'chat privacy import'
  );

  source = replaceRange(
    source,
    '  useEffect(() => {\n    if (!id) return;\n    async function loadOtherUser() {',
    '  useEffect(() => {\n    if (!id || !myUserId) return;',
`  useEffect(() => {
    if (!id) return;
    async function loadOtherUser() {
      try {
        const data = await getPublicProfile(String(id));
        setOtherUserActive(data?.is_active ?? false);
        setOtherAvatar(data?.avatar_url ?? null);
      } catch (error) {
        console.log('OTHER USER PROFILE ERROR:', error);
      }
    }
    loadOtherUser();
  }, [id]);

`,
    'chat other profile load'
  );

  source = replaceRange(
    source,
    "  useEffect(() => {\n    if (!id) return;\n    const channel = supabase.channel(`profile-status-${id}`)",
    '  useEffect(() => {\n    if (!conversationId) { setLoading(false); return; }',
    '',
    'chat target profile realtime removal'
  );

  writeChanged(path, source);
}

// nearby.tsx
{
  const path = 'src/app/nearby.tsx';
  let source = fs.readFileSync(path, 'utf8');
  source = replaceOnce(
    source,
    "import { supabase } from '../lib/supabase';\n",
    "import { getNearbyProfiles, getSkippedProfileSummaries } from '../lib/privacy-profile-api';\nimport { supabase } from '../lib/supabase';\n",
    'nearby privacy import'
  );

  source = replaceRange(
    source,
    '  function calculateDistance(',
    '  async function loadNearbyProfiles() {',
    '',
    'nearby client distance removal'
  );

  source = replaceRange(
    source,
    '  async function loadNearbyProfiles() {',
    '  useEffect(() => {\n    loadNearbyProfiles();',
`  async function loadNearbyProfiles() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('NEARBY: NO LOGGED USER');
        return;
      }

      const { data: myProfile, error: myError } = await supabase
        .from('profiles')
        .select('is_premium, premium_until')
        .eq('id', user.id)
        .single();

      if (myError) {
        console.log('MY PROFILE ERROR:', myError.message);
        return;
      }

      const premiumActive =
        myProfile.is_premium === true &&
        (!myProfile.premium_until || new Date(myProfile.premium_until) > new Date());
      setIsPremium(premiumActive);

      const profiles = await getNearbyProfiles({
        maxDistanceKm: maxDistance,
        customOriginLatitude: premiumActive ? customLatitude : null,
        customOriginLongitude: premiumActive ? customLongitude : null,
      });

      const filteredProfiles = profiles
        .map((person) => ({ ...person, distance: Number(person.distance_km) }))
        .filter(
          (person) =>
            drinkFilter === 'All' || person.currently_up_for === drinkFilter
        )
        .filter((person) => {
          if (!premiumActive || ageFilter === 'All') return true;
          if (person.age == null) return false;
          if (ageFilter === '18-25') return person.age >= 18 && person.age <= 25;
          if (ageFilter === '26-35') return person.age >= 26 && person.age <= 35;
          if (ageFilter === '36-45') return person.age >= 36 && person.age <= 45;
          if (ageFilter === '46+') return person.age >= 46;
          return true;
        })
        .filter((person) => {
          if (!premiumActive || genderFilter === 'All') return true;
          return person.gender === genderFilter;
        })
        .sort((a, b) => a.distance - b.distance);

      setNearbyProfiles(filteredProfiles);
    } catch (error) {
      console.log('NEARBY CRASH:', error);
      setNearbyProfiles([]);
    } finally {
      setLoading(false);
    }
  }

`,
    'nearby RPC load'
  );

  source = replaceRange(
    source,
    "  useEffect(() => {\n    const channel = supabase\n      .channel(\n        'nearby-profile-status'",
    '  async function handleSkipProfile(',
    '',
    'nearby broad profile realtime removal'
  );

  source = replaceRange(
    source,
    '  async function loadSkippedProfiles() {',
    '  async function handleRestoreProfile(',
`  async function loadSkippedProfiles() {
    try {
      setLoadingSkipped(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      const profiles = await getSkippedProfileSummaries();
      setSkippedProfiles(profiles);
    } catch (error) {
      console.log('LOAD SKIPPED ERROR:', error);
      setSkippedProfiles([]);
    } finally {
      setLoadingSkipped(false);
    }
  }

`,
    'nearby skipped summaries RPC'
  );

  writeChanged(path, source);
}
