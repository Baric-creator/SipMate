import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

const screens = [
  { name: 'chats', loader: 'loadChats', setter: 'setChats' },
  { name: 'cheers', loader: 'loadCheers', setter: 'setCheers' },
  { name: 'nearby', loader: 'loadNearbyProfiles', setter: 'setNearbyProfiles' },
];

// Execute the actual production handlers, with controlled network timing.
// This covers async state transitions, not native rendering or the Supabase server.
function compileScreen(screen) {
  const path = new URL('../src/app/' + screen.name + '.tsx', import.meta.url);
  const source = ts.createSourceFile(
    path.pathname, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX
  );
  const component = source.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text.endsWith('Screen')
  );
  assert.ok(component?.body, 'Screen component must exist');
  const loader = component.body.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === screen.loader
  );
  const focus = component.body.statements.find(
    (node) => ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(source) === 'useFocusEffect'
  );
  assert.ok(loader, 'Production loader must exist');
  assert.ok(focus, 'Production focus effect must exist');
  const memo = focus.expression.arguments[0];
  assert.ok(ts.isCallExpression(memo) && memo.expression.getText(source) === 'useCallback');
  const callback = memo.arguments[0];
  assert.ok(ts.isArrowFunction(callback));
  const compile = (node) => ts.transpileModule('(' + node.getText(source) + ')', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    fileName: screen.name + '-handler.ts',
  }).outputText;
  return { loader: compile(loader), focus: compile(callback) };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function until(predicate) {
  for (let step = 0; step < 100; step += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.fail('Expected async checkpoint was not reached');
}

function rows(screen, name) {
  if (screen.name === 'chats') {
    return [{ conversation_id: 'conversation-' + name, user_id: name, name }];
  }
  return [{ id: name, name, age: 25, distance_km: 1 }];
}

function result(screen, name) {
  return { data: rows(screen, name), error: null };
}

function harness(screen, compiled) {
  const state = { loading: true, items: [], writes: [], logs: [], authCalls: 0, dataCalls: 0 };
  const replies = [];
  const callbacks = [];
  const requests = [];
  const removedChannels = [];
  const clearedTimers = [];
  let authUser = { id: 'self' };
  const write = (key) => (value) => {
    state[key] = value;
    state.writes.push([key, value]);
  };
  const nextData = () => {
    state.dataCalls += 1;
    return replies.shift() ?? Promise.resolve(result(screen, 'initial'));
  };
  const profile = () => Promise.resolve({ data: { id: 'self', is_premium: false }, error: null });
  const auth = async () => {
    state.authCalls += 1;
    return { data: { user: authUser, session: authUser ? { user: authUser } : null } };
  };
  const channel = {
    on(_kind, _filter, callback) { callbacks.push(callback); return this; },
    subscribe() { return this; },
  };
  const context = createContext({
    [screen.name + 'RequestIdRef']: { current: 0 },
    [screen.name + 'UserIdRef']: { current: null },
    hasLoadedChatsRef: { current: false },
    hasLoadedCheersRef: { current: false },
    setLoading: write('loading'),
    [screen.setter]: write('items'),
    setIsPremium: write('premium'),
    setSkippedProfiles: write('skipped'),
    setCustomCity: write('city'),
    setCustomLatitude: write('latitude'),
    setCustomLongitude: write('longitude'),
    setNeedsLocation: write('needsLocation'),
    customLatitude: null, customLongitude: null,
    maxDistance: 10, drinkFilter: 'All', ageFilter: 'All', genderFilter: 'All',
    text: { userFallback: 'User', noMessages: 'No messages' },
    t: (key) => key,
    console: { log: (...args) => state.logs.push(args) },
    router: { replace: write('route') },
    setInterval: (callback) => { callbacks.push(callback); return callback; },
    clearInterval: (timer) => { clearedTimers.push(timer); },
    supabase: {
      auth: { getSession: auth, getUser: auth },
      channel: () => channel,
      removeChannel: async (removed) => { removedChannels.push(removed); },
      rpc: (name) => {
        if (name === 'get_my_profile_location') {
          return Promise.resolve({ data: [{ latitude: 0, longitude: 0 }], error: null });
        }
        if (name === 'get_my_premium_entitlement') {
          return Promise.resolve({ data: [{ is_premium: false }], error: null });
        }
        assert.ok(['get_chat_list', 'get_nearby_profiles'].includes(name));
        return nextData();
      },
      from: (table) => {
        let column;
        const query = {
          select() { return this; },
          eq(key) { column = key; return this; },
          in() { return nextData(); },
          single: profile,
          maybeSingle: profile,
          then(resolve, reject) {
            assert.equal(table, 'cheers');
            return Promise.resolve({
              data: column === 'sender_id' ? [{ receiver_id: 'other' }] : [],
              error: null,
            }).then(resolve, reject);
          },
        };
        return query;
      },
    },
  });
  const productionLoad = runInContext(compiled.loader, context);
  const load = (...args) => {
    const request = productionLoad(...args);
    requests.push(request);
    return request;
  };
  context[screen.loader] = load;
  return {
    state, callbacks, requests, removedChannels, clearedTimers, load,
    focus: runInContext(compiled.focus, context),
    enqueue: (reply) => replies.push(reply),
    signOut: () => { authUser = null; },
  };
}

for (const screen of screens) {
  const compiled = compileScreen(screen);
  const setup = () => harness(screen, compiled);

  test(screen.name + ': latest silent refresh ends overlapping foreground loading', async () => {
    const h = setup();
    const old = deferred();
    const latest = deferred();
    h.enqueue(old.promise);
    h.enqueue(latest.promise);
    const foreground = h.load(false);
    await until(() => h.state.dataCalls === 1);
    const background = h.load(true);
    await until(() => h.state.dataCalls === 2);
    latest.resolve(result(screen, 'latest'));
    await background;
    assert.equal(h.state.loading, false);
    assert.equal(h.state.items[0].name, 'latest');
    old.resolve(result(screen, 'old'));
    await foreground;
    assert.equal(h.state.items[0].name, 'latest');
  });

  test(screen.name + ': stale completion cannot end a newer pending load', async () => {
    const h = setup();
    const old = deferred();
    const latest = deferred();
    h.enqueue(old.promise);
    h.enqueue(latest.promise);
    const foreground = h.load(false);
    await until(() => h.state.dataCalls === 1);
    const background = h.load(true);
    await until(() => h.state.dataCalls === 2);
    old.resolve(result(screen, 'old'));
    await foreground;
    assert.equal(h.state.loading, true);
    assert.equal(h.state.items.length, 0);
    latest.resolve(result(screen, 'latest'));
    await background;
    assert.equal(h.state.loading, false);
    assert.equal(h.state.items[0].name, 'latest');
  });

  test(screen.name + ': standalone load completes and silent refresh does not flash a spinner', async () => {
    const h = setup();
    await h.load(false);
    assert.equal(h.state.loading, false);
    const pending = deferred();
    h.enqueue(pending.promise);
    const refresh = h.load(true);
    await until(() => h.state.dataCalls === 2);
    assert.equal(h.state.loading, false);
    assert.equal(h.state.items[0].name, 'initial');
    pending.resolve(result(screen, 'updated'));
    await refresh;
    assert.equal(h.state.loading, false);
    assert.equal(h.state.items[0].name, 'updated');
  });

  for (const failure of ['server error', 'transport rejection']) {
    test(screen.name + ': latest ' + failure + ' clears loading and preserves good data', async () => {
      const h = setup();
      await h.load();
      const old = deferred();
      const latest = deferred();
      h.enqueue(old.promise);
      h.enqueue(latest.promise);
      const foreground = h.load(false);
      await until(() => h.state.dataCalls === 2);
      const background = h.load(true);
      await until(() => h.state.dataCalls === 3);
      if (failure === 'server error') {
        latest.resolve({ data: null, error: { message: 'Test server failure' } });
      } else {
        latest.reject(new Error('Test transport failure'));
      }
      await assert.doesNotReject(background);
      assert.equal(h.state.loading, false);
      assert.equal(h.state.items[0].name, 'initial');
      assert.ok(h.state.logs.length > 0);
      old.resolve(result(screen, 'stale'));
      await foreground;
      assert.equal(h.state.items[0].name, 'initial');
    });
  }

  test(screen.name + ': blur invalidates pending responses and refocus recovers', async () => {
    const h = setup();
    const pending = deferred();
    h.enqueue(pending.promise);
    const cleanup = h.focus();
    await until(() => h.state.dataCalls === 1);
    cleanup();
    const writesAtBlur = h.state.writes.length;
    pending.resolve(result(screen, 'blurred'));
    await h.requests[0];
    assert.equal(h.state.writes.length, writesAtBlur);
    if (screen.name === 'nearby') assert.equal(h.clearedTimers.length, 1);
    else assert.equal(h.removedChannels.length, 1);
    const cleanupAgain = h.focus();
    await h.requests[1];
    assert.equal(h.state.loading, false);
    assert.equal(h.state.items[0].name, 'initial');
    cleanupAgain();
  });

  test(screen.name + ': callbacks from an old focus cannot restart work after blur or refocus', async () => {
    const h = setup();
    const cleanup = h.focus();
    await h.requests[0];
    const oldCallbacks = [...h.callbacks];
    assert.ok(oldCallbacks.length > 0);
    cleanup();
    const requestsAtBlur = h.requests.length;
    const authCallsAtBlur = h.state.authCalls;
    for (const callback of oldCallbacks) callback();
    assert.equal(h.requests.length, requestsAtBlur);
    assert.equal(h.state.authCalls, authCallsAtBlur);
    const pending = deferred();
    h.enqueue(pending.promise);
    const cleanupAgain = h.focus();
    await until(() => h.state.dataCalls === 2);
    for (const callback of oldCallbacks) callback();
    assert.equal(h.requests.length, requestsAtBlur + 1);
    pending.resolve(result(screen, 'refocused'));
    await h.requests.at(-1);
    assert.equal(h.state.items[0].name, 'refocused');
    assert.equal(h.state.loading, false);
    cleanupAgain();
  });

  test(screen.name + ': no-session refresh clears previous data and loading', async () => {
    const h = setup();
    await h.load();
    h.signOut();
    await h.load(true);
    assert.equal(h.state.items.length, 0);
    assert.equal(h.state.loading, false);
    if (screen.name !== 'chats') assert.equal(h.state.premium, false);
    else assert.equal(h.state.route, '/login');
  });
}
