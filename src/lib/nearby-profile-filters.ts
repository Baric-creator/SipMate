import type { NearbyProfile } from './privacy-profile-api';

export type NearbyDisplayProfile = NearbyProfile & { distance: number };

export type NearbyFilterOptions = {
  drinkFilter: string;
  premiumActive: boolean;
  ageFilter: string;
  genderFilter: string;
};

export function filterNearbyProfiles(
  profiles: NearbyProfile[],
  { drinkFilter, premiumActive, ageFilter, genderFilter }: NearbyFilterOptions
): NearbyDisplayProfile[] {
  return profiles
    .map((person) => ({ ...person, distance: Number(person.distance_km) }))
    .filter((person) => drinkFilter === 'All' || person.currently_up_for === drinkFilter)
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
    .filter((person) => Number.isFinite(person.distance))
    .sort((a, b) => a.distance - b.distance);
}
