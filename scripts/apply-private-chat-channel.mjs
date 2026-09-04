import fs from 'node:fs';

const path = 'src/app/chat.tsx';
const source = fs.readFileSync(path, 'utf8');
const from = "    const channel = supabase.channel(`chat-${conversationId}`)\n";
const to = "    const channel = supabase.channel(`chat-${conversationId}`, { config: { private: true } })\n";

if (!source.includes(from)) throw new Error('chat channel marker not found');
if (source.indexOf(from) !== source.lastIndexOf(from)) throw new Error('chat channel marker is not unique');

fs.writeFileSync(path, source.replace(from, to));
console.log('updated src/app/chat.tsx to use a private Realtime channel');
