(function () {
  'use strict';

  var FISH_COUNT = 8;
  var PICKS_PER_PLAYER = FISH_COUNT / 2;

  function fail(message) {
    throw new Error(message);
  }

  function createGame(options) {
    options = options || {};
    var rng = options.rng === undefined ? Math.random : options.rng;
    var firstPlayer = options.firstPlayer === undefined ? 0 : options.firstPlayer;

    if (typeof rng !== 'function') fail('rng must be a function');
    if (firstPlayer !== 0 && firstPlayer !== 1) fail('firstPlayer must be 0 or 1');

    var fish = [];
    for (var id = 0; id < FISH_COUNT; id += 1) {
      var value = rng();
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
        fail('rng must return a number in [0, 1)');
      }
      fish.push({ id: id, length: Math.floor(value * 6) + 1, owner: null, revealed: false });
    }

    return {
      phase: 'select',
      turn: firstPlayer,
      fish: fish,
      selected: [[], []],
      scores: [0, 0],
      winner: null
    };
  }

  function findFishIndex(state, id) {
    if (!state || !Array.isArray(state.fish)) fail('invalid game state');
    var index = state.fish.findIndex(function (item) { return item.id === id; });
    if (index < 0) fail('unknown fish id');
    return index;
  }

  function selectFish(state, id) {
    if (!state || state.phase !== 'select') fail('fish can only be selected in select phase');
    var index = findFishIndex(state, id);
    if (state.fish[index].owner !== null) fail('fish has already been selected');

    var player = state.turn;
    var selected = [state.selected[0].slice(), state.selected[1].slice()];
    if (selected[player].length >= PICKS_PER_PLAYER) fail('player already has four fish');

    selected[player].push(id);
    var fish = state.fish.slice();
    fish[index] = Object.assign({}, fish[index], { owner: player });

    return Object.assign({}, state, {
      phase: selected[0].length + selected[1].length === FISH_COUNT ? 'reveal' : 'select',
      turn: 1 - player,
      fish: fish,
      selected: selected
    });
  }

  function revealFish(state, id) {
    if (!state || state.phase !== 'reveal') fail('fish can only be revealed in reveal phase');
    var index = findFishIndex(state, id);
    var target = state.fish[index];
    if (target.owner === null) fail('fish has not been selected');
    if (target.revealed) fail('fish has already been revealed');

    var fish = state.fish.slice();
    fish[index] = Object.assign({}, target, { revealed: true });
    var scores = state.scores.slice();
    scores[target.owner] += target.length;
    var finished = fish.every(function (item) { return item.revealed; });

    return Object.assign({}, state, {
      phase: finished ? 'result' : 'reveal',
      fish: fish,
      scores: scores,
      winner: finished ? (scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1) : null
    });
  }

  var FishGame = { createGame: createGame, selectFish: selectFish, revealFish: revealFish };
  if (typeof window !== 'undefined') window.FishGame = FishGame;
  if (typeof module !== 'undefined' && module.exports) module.exports = FishGame;
}());
