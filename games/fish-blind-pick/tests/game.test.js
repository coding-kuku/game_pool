'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createGame, selectFish, revealFish } = require('../src/game.js');

function pickAll(state) {
  for (let id = 0; id < 8; id += 1) state = selectFish(state, id);
  return state;
}

test('starts with eight hidden, unclaimed fish and alternates four picks each', () => {
  const start = createGame({ rng: () => 0, firstPlayer: 1 });
  assert.equal(start.phase, 'select');
  assert.equal(start.turn, 1);
  assert.deepEqual(start.selected, [[], []]);
  assert.deepEqual(start.scores, [0, 0]);
  assert.equal(start.winner, null);
  assert.deepEqual(start.fish.map(fish => fish.id), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok(start.fish.every(fish => fish.length === 1 && fish.owner === null && !fish.revealed));

  let state = start;
  for (let id = 0; id < 8; id += 1) {
    const previous = state;
    state = selectFish(state, id);
    assert.equal(state.fish[id].owner, id % 2 === 0 ? 1 : 0);
    assert.equal(state.turn, id % 2 === 0 ? 0 : 1);
    assert.equal(state.phase, id === 7 ? 'reveal' : 'select');
    assert.equal(previous.fish[id].owner, null, 'selection leaves the previous state untouched');
  }
  assert.deepEqual(state.selected, [[1, 3, 5, 7], [0, 2, 4, 6]]);
  assert.equal(state.fish.filter(fish => fish.owner !== null).length, 8);
});

test('cannot reveal during selection, pick twice, or pick after selection ends', () => {
  const start = createGame({ rng: () => 0 });
  assert.throws(() => revealFish(start, 0), Error);
  const onePick = selectFish(start, 0);
  assert.throws(() => selectFish(onePick, 0), Error);
  assert.throws(() => selectFish(onePick, 9), Error);
  assert.equal(onePick.fish[0].owner, 0);
  assert.equal(onePick.selected[0].length, 1);
  const allPicked = pickAll(start);
  assert.throws(() => selectFish(allPicked, 0), Error);
  assert.equal(allPicked.phase, 'reveal');
});

test('reveals in any order, counts each length once, and awards the higher total', () => {
  const values = [0, 0, 0, 0, 0, 0, 0, 0.999999];
  let next = 0;
  let state = pickAll(createGame({ rng: () => values[next++] }));
  assert.equal(state.fish[7].length, 6);
  state = revealFish(state, 7);
  assert.deepEqual(state.scores, [0, 6]);
  assert.equal(state.phase, 'reveal');
  assert.throws(() => revealFish(state, 7), Error);
  for (let id = 6; id >= 0; id -= 1) state = revealFish(state, id);
  assert.deepEqual(state.scores, [4, 9]);
  assert.equal(state.phase, 'result');
  assert.equal(state.winner, 1);
  assert.ok(state.fish.every(fish => fish.revealed));
  assert.throws(() => revealFish(state, 0), Error);
});

test('equal totals end in a draw', () => {
  let state = pickAll(createGame({ rng: () => 0 }));
  for (let id = 0; id < 8; id += 1) state = revealFish(state, id);
  assert.deepEqual(state.scores, [4, 4]);
  assert.equal(state.winner, null);
  assert.equal(state.phase, 'result');
});

test('random draws map to lengths 1 through 6 and use exactly eight independent calls', () => {
  const values = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 0.999999, 0];
  let calls = 0;
  const state = createGame({ rng: () => values[calls++] });
  assert.equal(calls, 8);
  assert.deepEqual(state.fish.map(fish => fish.length), [1, 2, 3, 4, 5, 6, 6, 1]);
  for (const invalid of [-0.1, 1, Infinity, NaN, '0.5']) {
    assert.throws(() => createGame({ rng: () => invalid }), Error);
  }
  assert.throws(() => createGame({ firstPlayer: 2 }), Error);
});
