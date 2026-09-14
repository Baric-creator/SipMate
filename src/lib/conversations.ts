import { supabase } from './supabase';

export async function findOrCreateConversation(myId: string, otherId: string) {
  if (!myId || !otherId || myId === otherId) return null;

  const userOne = myId < otherId ? myId : otherId;
  const userTwo = myId < otherId ? otherId : myId;

  const findConversation = () =>
    supabase
      .from('conversations')
      .select('id')
      .eq('user_one', userOne)
      .eq('user_two', userTwo)
      .maybeSingle();

  const { data: existingConversation, error: findError } =
    await findConversation();

  if (findError) throw findError;
  if (existingConversation?.id) return existingConversation.id as string;

  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({ user_one: userOne, user_two: userTwo })
    .select('id')
    .single();

  if (!createError && newConversation?.id) {
    return newConversation.id as string;
  }

  if (createError?.code === '23505') {
    const { data: racedConversation, error: raceFindError } =
      await findConversation();

    if (raceFindError) throw raceFindError;
    if (racedConversation?.id) return racedConversation.id as string;
  }

  throw createError ?? new Error('Conversation could not be created.');
}
