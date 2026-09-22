(function () {
  'use strict';

  var root = document.getElementById('app');
  var storageKey = 'fish-blind-pick-round-v1';
  var soundStorageKey = 'fish-blind-pick-sound-v1';
  var names = ['蓝队', '珊瑚队'];
  var game = loadGame() || FishGame.createGame();
  var activeRevealId = null;
  var modal = null;
  var revealTransition = false;
  var revealTransitionTimer = null;
  var soundAvailable = !!(window.AudioContext || window.webkitAudioContext);
  var soundEnabled = loadSoundEnabled();
  var audioContext = null;
  var audioOutput = null;

  function updateHeight() {
    document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
  }

  function isValidGame(value) {
    if (!value || !Array.isArray(value.fish) || value.fish.length !== 8) return false;
    if (['select', 'reveal', 'result'].indexOf(value.phase) < 0) return false;
    if (!Array.isArray(value.selected) || value.selected.length !== 2) return false;
    if (!Array.isArray(value.scores) || value.scores.length !== 2) return false;
    if (value.turn !== 0 && value.turn !== 1) return false;
    if (!Array.isArray(value.selected[0]) || !Array.isArray(value.selected[1])) return false;
    if (value.selected[0].length > 4 || value.selected[1].length > 4) return false;
    if (!Number.isInteger(value.scores[0]) || !Number.isInteger(value.scores[1])) return false;
    var assigned = [[], []];
    var totals = [0, 0];
    var revealedCount = 0;
    for (var i = 0; i < value.fish.length; i += 1) {
      var fish = value.fish[i];
      if (!fish || fish.id !== i || !Number.isInteger(fish.length) || fish.length < 1 || fish.length > 6) return false;
      if (fish.owner !== null && fish.owner !== 0 && fish.owner !== 1) return false;
      if (typeof fish.revealed !== 'boolean') return false;
      if (fish.revealed && fish.owner === null) return false;
      if (fish.owner !== null) assigned[fish.owner].push(i);
      if (fish.revealed) { totals[fish.owner] += fish.length; revealedCount += 1; }
    }
    for (var player = 0; player < 2; player += 1) {
      var picks = value.selected[player];
      if (picks.length !== assigned[player].length || totals[player] !== value.scores[player]) return false;
      for (var pick = 0; pick < picks.length; pick += 1) {
        if (!Number.isInteger(picks[pick]) || assigned[player].indexOf(picks[pick]) < 0) return false;
        if (picks.indexOf(picks[pick]) !== pick) return false;
      }
    }
    if (value.phase === 'select' && (revealedCount !== 0 || assigned[0].length + assigned[1].length === 8)) return false;
    if (value.phase !== 'select' && (assigned[0].length !== 4 || assigned[1].length !== 4)) return false;
    if (value.phase === 'reveal' && revealedCount === 8) return false;
    if (value.phase === 'result' && revealedCount !== 8) return false;
    if (value.phase === 'result') {
      var winner = value.scores[0] === value.scores[1] ? null : value.scores[0] > value.scores[1] ? 0 : 1;
      if (value.winner !== winner) return false;
    }
    return true;
  }

  function loadGame() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(storageKey));
      return isValidGame(saved) ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function saveGame() {
    try { window.localStorage.setItem(storageKey, JSON.stringify(game)); } catch (error) { /* The round still works without storage. */ }
  }

  function loadSoundEnabled() {
    try { return window.localStorage.getItem(soundStorageKey) !== 'off'; } catch (error) { return true; }
  }

  function saveSoundEnabled() {
    try { window.localStorage.setItem(soundStorageKey, soundEnabled ? 'on' : 'off'); } catch (error) { /* Sound still works without storage. */ }
  }

  function getAudioContext() {
    if (!soundAvailable || !soundEnabled) return null;
    try {
      if (!audioContext) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();
        audioOutput = audioContext.createGain();
        audioOutput.gain.value = 1;
        audioOutput.connect(audioContext.destination);
      }
      if (audioContext.state === 'suspended') {
        var resumed = audioContext.resume();
        if (resumed && resumed.catch) resumed.catch(function () {});
      }
      return audioContext;
    } catch (error) { return null; }
  }

  function playNote(context, pitch, delay, duration, volume, shape, pitchEnd) {
    var start = context.currentTime + delay;
    var oscillator = context.createOscillator();
    var envelope = context.createGain();
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(pitch, start);
    if (pitchEnd) oscillator.frequency.exponentialRampToValueAtTime(pitchEnd, start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(audioOutput);
    oscillator.onended = function () { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playSound(kind, value) {
    var context = getAudioContext();
    if (!context) return;
    try {
      if (kind === 'pick') {
        playNote(context, value === 1 ? 510 : 450, 0, .13, .045, 'sine', value === 1 ? 680 : 600);
      } else if (kind === 'ready') {
        playNote(context, 523, 0, .18, .035, 'triangle');
        playNote(context, 659, .1, .18, .035, 'triangle');
        playNote(context, 784, .2, .23, .04, 'triangle');
      } else if (kind === 'reveal') {
        playNote(context, 350 + value * 42, 0, .13, .05, 'sine', 280 + value * 38);
        playNote(context, 600 + value * 32, .085, .18, .033, 'triangle');
      } else if (kind === 'win') {
        playNote(context, 523, 0, .22, .035, 'triangle');
        playNote(context, 659, .1, .23, .037, 'triangle');
        playNote(context, 784, .2, .32, .04, 'triangle');
      } else if (kind === 'tie') {
        playNote(context, 587, 0, .2, .035, 'sine');
        playNote(context, 587, .16, .27, .035, 'sine');
      } else if (kind === 'toggle') {
        playNote(context, 720, 0, .13, .035, 'sine');
      }
    } catch (error) { /* Sound must never interrupt the round. */ }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    saveSoundEnabled();
    if (audioContext && audioOutput) {
      audioOutput.gain.setTargetAtTime(soundEnabled ? 1 : 0, audioContext.currentTime, .012);
    }
    render();
    var button = root.querySelector('[data-action="sound"]');
    if (button) button.focus();
    if (soundEnabled) playSound('toggle');
  }

  function headMarkup() {
    return '<svg viewBox="0 0 70 60" aria-hidden="true" focusable="false"><use xlink:href="#fish-head"></use></svg>';
  }

  function headerMarkup() {
    var soundButton = soundAvailable ? '<button class="small-button sound-button' + (soundEnabled ? '' : ' muted') +
      '" type="button" data-action="sound" aria-pressed="' + soundEnabled + '" aria-label="' +
      (soundEnabled ? '关闭音效' : '开启音效') + '">' + (soundEnabled ? '有声' : '静音') + '</button>' : '';
    return '<header class="topbar">' +
      '<div class="brand"><span class="brand-title">盲选小鱼</span><span class="brand-subtitle">鱼头先选，鱼身后看！</span></div>' +
      '<div class="top-actions">' + soundButton + '<button class="small-button" type="button" data-action="rules" aria-label="查看玩法">玩法</button>' +
      '<button class="small-button" type="button" data-action="restart" aria-label="重开本局">重开</button></div>' +
      '</header>';
  }

  function scoreTileMarkup(player, isSelection) {
    var value = isSelection ? game.selected[player].length + '/4 条' : game.scores[player] + ' 节';
    return '<div class="score-tile ' + (player === 0 ? 'blue' : 'coral') + '" aria-label="' + names[player] + value + '">' +
      '<span class="score-name">' + names[player] + (isSelection ? '已选' : '累计') + '</span>' +
      '<strong class="score-value">' + value + '</strong></div>';
  }

  function scoreboardMarkup(isSelection, extraClass) {
    return '<div class="scoreboard ' + (extraClass || '') + '">' + scoreTileMarkup(0, isSelection) + scoreTileMarkup(1, isSelection) + '</div>';
  }

  function statusMarkup() {
    var isSelection = game.phase === 'select';
    var player = game.turn;
    var count = game.selected[0].length + game.selected[1].length;
    var title = isSelection ? '轮到' + names[player] : '鱼都选好了！';
    var subtitle = isSelection ? '点一个还没有归属的鱼头' : '点开任意一条还没揭晓的小鱼';
    var number = isSelection ? game.selected[player].length + '/4' : game.fish.filter(function (fish) { return fish.revealed; }).length + '/8';
    var badge = isSelection ? (player === 0 ? 'blue' : 'coral') : 'both';
    var badgeText = isSelection ? (player === 0 ? '蓝' : '珊') : '鱼';
    return '<div class="turn-panel panel"><span class="turn-badge ' + badge + '">' + badgeText + '</span>' +
      '<span class="turn-copy"><strong class="turn-title">' + title + '</strong><span class="turn-subtitle">' + subtitle + '</span></span>' +
      '<strong class="turn-number">' + number + '</strong></div>' + scoreboardMarkup(isSelection, '') +
      '<span class="sr-only" aria-live="polite">已选 ' + count + ' 条</span>';
  }

  function fishCardMarkup(fish) {
    var selection = game.phase === 'select';
    var disabled = selection ? fish.owner !== null : fish.revealed;
    var ownerClass = fish.owner === null ? '' : fish.owner === 0 ? ' picked-blue' : ' picked-coral';
    var ownerMark = fish.owner === null ? '<span class="fish-mark">?</span>' :
      '<span class="fish-mark ' + (fish.owner === 0 ? 'blue' : 'coral') + '">' + (fish.owner === 0 ? '蓝' : '珊') + '</span>';
    var stateClass = selection ? '' : fish.revealed ? ' revealed' : ' reveal-pending';
    var stateMark = selection ? '' : fish.revealed ?
      '<span class="card-state done">✓ 已揭晓</span><span class="length-tag">' + fish.length + ' 节</span>' :
      '<span class="card-state pending">点开揭晓 ?</span>';
    var label = '第' + (fish.id + 1) + '条鱼，' + (fish.owner === null ? '未被选择' : names[fish.owner] + '已选') +
      (fish.revealed ? '，已揭晓' + fish.length + '节' : selection && fish.owner === null ? '，点按选择' : fish.owner !== null && !selection ? '，待揭晓，点按查看' : '');
    return '<button type="button" class="fish-card tone-' + fish.id + ownerClass + stateClass +
      '" data-action="fish" data-id="' + fish.id + '" aria-label="' + label + '"' + (disabled ? ' disabled' : '') + '>' +
      '<span class="fish-head">' + headMarkup() + '</span>' + ownerMark + stateMark + '</button>';
  }

  function boardMarkup() {
    var selection = game.phase === 'select';
    var cards = game.fish.map(fishCardMarkup).join('');
    var title = selection ? '挑你的小鱼' : '轮到揭晓啦';
    var subtitle = selection ? '每人选 4 条。颜色和表情不会暗示鱼身长度。' : '一次点开一条，看看这条鱼藏了几节身体。';
    return statusMarkup() +
      '<section class="section-heading"><h2 tabindex="-1">' + title + '</h2><p>' + subtitle + '</p></section>' +
      '<div class="fish-grid" role="group" aria-label="八条小鱼">' + cards + '</div>' +
      '<p class="board-note">' + (selection ? '选完 8 条鱼后，才能揭晓身体。' : '黄色标签可点开；灰色卡片表示已经揭晓。') + '</p>';
  }

  function detailMarkup() {
    var fish = game.fish[activeRevealId];
    var owner = fish.owner;
    var count = game.fish.filter(function (item) { return item.revealed; }).length;
    var segments = '';
    var dots = '';
    for (var i = 0; i < fish.length; i += 1) {
      segments += '<span class="segment" style="animation-delay:' + (i * 65) + 'ms"></span>';
      dots += '<i></i>';
    }
    var button = game.phase === 'result' ? '查看最终结果' : '继续揭晓';
    return '<p class="detail-step">第 ' + count + ' 条 / 共 8 条</p>' + scoreboardMarkup(false, 'detail-score') +
      '<section class="reveal-stage panel tone-' + fish.id + '">' +
      '<h2 class="reveal-owner">' + names[owner] + '的这条鱼</h2>' +
      '<div class="full-fish-wrap"><div class="full-fish"><span class="fish-head">' + headMarkup() + '</span>' +
      segments + '<span class="fish-tail" style="animation-delay:' + (fish.length * 65) + 'ms"></span></div></div>' +
      '<div class="segment-dots" aria-hidden="true">' + dots + '</div>' +
      '<strong class="reveal-number">+ ' + fish.length + ' 节！</strong>' +
      '<p class="reveal-caption">这条鱼的节数已经计入' + names[owner] + '</p></section>' +
      '<button class="big-button main-action" type="button" data-action="continue">' + button + '</button>';
  }

  function resultRowMarkup(player) {
    var values = game.selected[player].map(function (id) { return game.fish[id].length; });
    var color = player === 0 ? 'blue' : 'coral';
    return '<div class="result-card panel"><div class="result-card-head"><span class="result-team ' + color + '">' + names[player] + '</span>' +
      '<span class="result-numbers">' + values.join(' + ') + '</span></div>' +
      '<strong class="result-total">' + game.scores[player] + ' 节</strong></div>';
  }

  function resultMarkup() {
    var tie = game.winner === null;
    var title = tie ? '平局！两队一样长' : names[game.winner] + '赢啦！';
    var difference = Math.abs(game.scores[0] - game.scores[1]);
    var caption = tie ? '两边的小鱼都很争气，再来一局？' : '领先 ' + difference + ' 节，这局鱼群超给力！';
    var color = tie ? 'tie' : game.winner === 1 ? 'coral' : 'blue';
    return '<section class="result-banner panel ' + color + '"><h2>' + title + '</h2><p>' + caption + '</p></section>' +
      '<h3 class="result-heading">四条小鱼的身体节数</h3>' + resultRowMarkup(0) + resultRowMarkup(1) +
      '<button class="big-button result-footer" type="button" data-action="new-game">再玩一局</button>';
  }

  function modalMarkup() {
    if (!modal) return '';
    var body = modal === 'rules' ?
      '<h2 id="modal-title">怎么玩？</h2><p>两个人轮流选鱼，一人四条。选择时只能看到鱼头，身体节数藏起来。</p>' +
      '<p>八条都选好后，逐条点开看长度。各自四条鱼的节数相加，总数多的赢；一样多就平局。</p>' +
      '<p>鱼头的颜色和表情，与身体节数没有关系。</p>' +
      '<div class="modal-actions"><button type="button" class="big-button" data-action="close-modal">知道啦</button></div>' :
      '<h2 id="modal-title">重开这一局？</h2><p>现在的选择和已揭晓的结果会清空。</p>' +
      '<div class="modal-actions"><button type="button" class="big-button secondary" data-action="close-modal">继续这局</button>' +
      '<button type="button" class="big-button" data-action="confirm-restart">确认重开</button></div>';
    return '<div class="modal-layer" role="presentation"><div class="modal-backdrop" data-action="close-modal"></div>' +
      '<div class="modal-card panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">' + body + '</div></div>';
  }

  function transitionMarkup() {
    if (!revealTransition) return '';
    return '<div class="reveal-transition" role="dialog" aria-modal="true" aria-labelledby="transition-title">' +
      '<div class="transition-card panel"><div class="transition-fish tone-0" aria-hidden="true">' + headMarkup() + '</div>' +
      '<span class="transition-count">8 / 8 条已选好</span>' +
      '<h2 id="transition-title">准备揭晓！</h2><p>接下来，看看每条鱼藏了几节身体</p>' +
      '<button class="big-button" type="button" data-action="transition-next">立即揭晓</button></div></div>';
  }

  function finishRevealTransition() {
    if (!revealTransition) return;
    if (revealTransitionTimer !== null) window.clearTimeout(revealTransitionTimer);
    revealTransitionTimer = null;
    revealTransition = false;
    render();
    var heading = root.querySelector('.section-heading h2');
    if (heading) heading.focus();
  }

  function render() {
    var content = activeRevealId !== null ? detailMarkup() : game.phase === 'result' ? resultMarkup() : boardMarkup();
    root.innerHTML = '<main class="shell"><div class="screen"' + (revealTransition ? ' inert aria-hidden="true"' : '') + '>' +
      headerMarkup() + content + '</div>' + transitionMarkup() + '</main>' + modalMarkup();
    if (revealTransition) {
      var coveredButtons = root.querySelectorAll('.screen button');
      for (var i = 0; i < coveredButtons.length; i += 1) coveredButtons[i].tabIndex = -1;
    }
    if (modal) {
      var firstButton = root.querySelector('.modal-card button');
      if (firstButton) firstButton.focus();
    } else if (revealTransition) {
      var nextButton = root.querySelector('.transition-card button');
      if (nextButton) nextButton.focus();
    }
  }

  function newGame() {
    if (revealTransitionTimer !== null) window.clearTimeout(revealTransitionTimer);
    revealTransitionTimer = null;
    revealTransition = false;
    game = FishGame.createGame();
    activeRevealId = null;
    modal = null;
    saveGame();
    render();
  }

  root.addEventListener('click', function (event) {
    var target = event.target.closest('[data-action]');
    if (!target || !root.contains(target) || target.disabled) return;
    var action = target.getAttribute('data-action');
    if (action === 'sound') { toggleSound(); return; }
    if (action === 'transition-next') { finishRevealTransition(); return; }
    if (action === 'rules') { modal = 'rules'; render(); return; }
    if (action === 'close-modal') { modal = null; render(); return; }
    if (action === 'restart') {
      if (game.phase === 'result') newGame();
      else { modal = 'restart'; render(); }
      return;
    }
    if (action === 'confirm-restart' || action === 'new-game') { newGame(); return; }
    if (modal) return;
    if (action === 'continue') {
      activeRevealId = null;
      render();
      if (game.phase === 'result') playSound(game.winner === null ? 'tie' : 'win');
      return;
    }
    if (action === 'fish') {
      var id = Number(target.getAttribute('data-id'));
      var enteringReveal = false;
      var soundCue = '';
      var soundValue = 0;
      try {
        if (game.phase === 'select') {
          soundValue = game.turn;
          game = FishGame.selectFish(game, id);
          enteringReveal = game.phase === 'reveal';
          soundCue = enteringReveal ? 'ready' : 'pick';
        }
        else if (game.phase === 'reveal') {
          game = FishGame.revealFish(game, id);
          activeRevealId = id;
          soundCue = 'reveal';
          soundValue = game.fish[id].length;
        }
        else return;
      } catch (error) { return; }
      if (enteringReveal) revealTransition = true;
      saveGame();
      render();
      playSound(soundCue, soundValue);
      if (enteringReveal) {
        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        revealTransitionTimer = window.setTimeout(finishRevealTransition, reducedMotion ? 500 : 1750);
      }
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal) { modal = null; render(); }
  });
  window.addEventListener('resize', updateHeight);
  updateHeight();
  render();
}());
