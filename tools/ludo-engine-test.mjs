// Ludo Himalaya — engine unit tests. Run: node tools/ludo-engine-test.mjs
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../public/arcade/src/games/ludo-engine.js', import.meta.url), 'utf8');
const E = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);

let pass = 0;
const failures = [];
function ok(cond, label, extra = '') {
  if (cond) {
    pass += 1;
    return;
  }
  failures.push(`${label}${extra ? ` — ${extra}` : ''}`);
}
function eq(actual, expected, label) {
  ok(
    JSON.stringify(actual) === JSON.stringify(expected),
    label,
    `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`,
  );
}
function make(options = {}, colors = ['red', 'yellow']) {
  return E.createGame({ colors, types: colors.map(() => 'human'), options });
}
function put(state, color, tokens) {
  const p = state.players.find((x) => x.color === color);
  p.tokens = tokens.slice();
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── board geometry ─────────────────────────────────────── */
eq(E.RING.length, 52, 'outer ring has 52 squares');
ok(new Set(E.RING.map(([x, y]) => `${x},${y}`)).size === 52, 'ring coordinates are unique');
ok(
  E.RING.every(([x, y]) => x >= 0 && x < 15 && y >= 0 && y < 15),
  'ring inside 15×15 board',
);
let diagonals = 0;
for (let i = 0; i < 52; i++) {
  const a = E.RING[i];
  const b = E.RING[(i + 1) % 52];
  const dx = Math.abs(a[0] - b[0]);
  const dy = Math.abs(a[1] - b[1]);
  ok(dx <= 1 && dy <= 1 && (dx === 1 || dy === 1), `ring step ${i}→${i + 1} touches`, JSON.stringify([a, b]));
  if (dx === 1 && dy === 1) diagonals += 1;
}
eq(diagonals, 4, 'the ring wraps four inner corners diagonally');
eq(E.SAFE_RINGS.length, 8, 'eight safe squares');
eq([...new Set(E.SAFE_RINGS)].length, 8, 'safe squares are distinct');
for (const color of E.COLORS) {
  eq(
    E.RING[E.START[color]].join(','),
    {
      red: '1,6',
      green: '8,1',
      yellow: '13,8',
      blue: '6,13',
    }[color],
    `${color} starts on its own square`,
  );
  const cells = [];
  for (let p = 0; p <= 55; p++) cells.push(E.cellAt(color, p).join(','));
  eq(new Set(cells).size, 56, `${color} path visits 56 distinct squares`);
  eq(
    E.cellAt(color, 51).join(','),
    E.HOME_COL[color][0].join(','),
    `${color} turns into its home column at 51`,
  );
  eq(E.cellAt(color, 55).join(','), E.HOME_COL[color][4].join(','), `${color} home column ends at 55`);
  eq(E.cellAt(color, 56).join(','), '7,7', `${color} finishes in the centre`);
  const before = E.cellAt(color, 50);
  const entry = E.cellAt(color, 51);
  ok(Math.abs(before[0] - entry[0]) + Math.abs(before[1] - entry[1]) === 1, `${color} 50→51 is orthogonal`);
  eq(E.BASE_SLOTS[color].length, 4, `${color} has four yard sockets`);
  eq(E.FINISH_SLOTS[color].length, 4, `${color} has four centre slots`);
}
for (let i = 1; i < 4; i++) {
  const prev = E.RING[(E.START[E.COLORS[i - 1]] + 0) % 52];
  const next = E.RING[E.START[E.COLORS[i]] % 52];
  ok(prev.join(',') !== next.join(','), 'start squares differ');
}

/* ── setup ──────────────────────────────────────────────── */
eq(
  E.createGame({ players: 2 }).players.map((p) => p.color),
  ['red', 'yellow'],
  '2 players are opposite',
);
eq(
  E.createGame({ players: 3 }).players.map((p) => p.color),
  ['red', 'green', 'yellow'],
  '3-player colour set',
);
eq(E.createGame({ players: 4 }).players.length, 4, '4-player game');
eq(
  E.createGame({ players: 2 }).players.map((p) => p.type),
  ['human', 'cpu'],
  'default CPU opponents',
);
eq(
  E.createGame({ players: 2, types: ['human', 'human'] }).players.map((p) => p.type),
  ['human', 'human'],
  'pass and play types',
);

/* ── opening: only a six leaves the yard ────────────────── */
let g = make();
let r = E.rollDice(g, 3);
eq(r.moves.length, 0, 'no move from the yard without a six');
eq(g.phase, 'no-move', 'no-move phase when nothing can move');
E.passTurn(g);
eq(g.turn, 1, 'turn passes after a dead roll');

g = make();
r = E.rollDice(g, 6);
eq(r.moves.length, 4, 'a six frees all four tokens');
eq(g.phase, 'choosing', 'awaiting a token choice');
let mv = E.commitMove(g, 0);
ok(mv.ok, 'opening move commits');
eq(g.players[0].tokens[0], 0, 'token enters on its start square');
eq(mv.extra, true, 'six earns another roll');
eq(g.turn, 0, 'same player keeps the turn after a six');
eq(g.phase, 'rolling', 'ready to roll again');

/* ── normal turn advances ───────────────────────────────── */
put(g, 'red', [0, -1, -1, -1]);
r = E.rollDice(g, 4);
eq(
  r.moves.map((m) => m.to),
  [4],
  'only the token on the board can move',
);
mv = E.commitMove(g, 0);
eq(mv.extra, false, 'no extra roll on a normal four');
eq(g.turn, 1, 'turn advances to yellow');
eq(g.players[0].tokens[0], 4, 'token advanced four');

/* ── captures ───────────────────────────────────────────── */
g = make();
put(g, 'red', [2, -1, -1, -1]);
put(g, 'yellow', [31, -1, -1, -1]); // yellow progress 31 → ring 5
eq(E.ringIndex('yellow', 31), 5, 'setup: yellow token on ring 5');
r = E.rollDice(g, 3);
eq(r.moves[0].captures.length, 1, 'landing on a rival captures it');
mv = E.commitMove(g, 0);
eq(
  mv.captures.map((c) => c.color),
  ['yellow'],
  'capture event names the rival',
);
eq(g.players[1].tokens[0], -1, 'captured token returns to the yard');
eq(mv.extra, true, 'capture earns another roll');
eq(g.players[0].captures, 1, 'capture counted for the player');

/* ── safe squares ───────────────────────────────────────── */
g = make();
put(g, 'red', [6, -1, -1, -1]);
put(g, 'yellow', [34, -1, -1, -1]); // yellow progress 34 → ring 8, a safe star
eq(E.ringIndex('yellow', 34), 8, 'setup: yellow on safe star');
r = E.rollDice(g, 2);
eq(r.moves[0].captures.length, 0, 'no capture on a safe square');
eq(r.moves[0].safe, true, 'destination flagged safe');
E.commitMove(g, 0);
eq(g.players[1].tokens[0], 34, 'rival shares the safe square');
eq(g.players[0].tokens[0], 8, 'mover lands on the star');

/* ── exact roll home ────────────────────────────────────── */
g = make();
put(g, 'red', [54, -1, -1, -1]);
r = E.rollDice(g, 3);
eq(r.moves.length, 0, 'overshooting home is illegal');
g.phase = 'rolling';
g.dice = null;
r = E.rollDice(g, 2);
eq(r.moves[0].to, 56, 'exact roll reaches the centre');
mv = E.commitMove(g, 0);
eq(mv.finished, true, 'finish is flagged');
eq(g.players[0].tokens[0], 56, 'token is home');
eq(mv.extra, true, 'reaching home earns another roll');
ok(g.phase !== 'over', 'one token home does not win');

g = make();
put(g, 'red', [55, -1, -1, -1]);
E.rollDice(g, 1);
E.commitMove(g, 0);
eq(g.players[0].tokens[0], 56, '55 + 1 finishes');

/* ── win, standings, save guard ─────────────────────────── */
g = make();
put(g, 'red', [56, 56, 56, 55]);
put(g, 'yellow', [56, 20, -1, -1]);
E.rollDice(g, 1);
mv = E.commitMove(g, 3);
eq(mv.won, true, 'four tokens home wins');
eq(g.phase, 'over', 'game ends on a win');
eq(g.winner, 'red', 'winner recorded');
const table = E.standings(g);
eq(table[0].color, 'red', 'winner tops the standings');
eq(table[0].home, 4, 'winner has four home');
eq(table[1].home, 1, 'standings sort by tokens home');
ok(E.isValidGame(JSON.parse(JSON.stringify(g))), 'finished game serialises cleanly');

/* ── three sixes ────────────────────────────────────────── */
g = make({ threeSixes: true });
E.rollDice(g, 6);
E.commitMove(g, 0);
E.rollDice(g, 6);
E.commitMove(g, 0);
r = E.rollDice(g, 6);
eq(r.forfeit, true, 'third consecutive six forfeits');
eq(g.phase, 'forfeit', 'forfeit phase set');
eq(E.legalMoves(g).length, 0, 'no move allowed after forfeit');
E.passTurn(g);
eq(g.turn, 1, 'forfeit passes the turn');

g = make({ threeSixes: false });
E.rollDice(g, 6);
E.commitMove(g, 0);
E.rollDice(g, 6);
E.commitMove(g, 0);
r = E.rollDice(g, 6);
eq(r.forfeit, false, 'rule can be switched off');
ok(r.moves.length > 0, 'third six still movable when the rule is off');

/* ── blockades ──────────────────────────────────────────── */
g = make({ blockades: true });
put(g, 'red', [5, 56, 56, 56]);
put(g, 'yellow', [36, 36, -1, -1]); // both on ring 10
eq(E.ringIndex('yellow', 36), 10, 'setup: blockade on ring 10');
r = E.rollDice(g, 6);
eq(r.moves.length, 0, 'a blockade cannot be passed');
eq(g.phase, 'no-move', 'blocked move is a dead roll');

g = make({ blockades: false });
put(g, 'red', [5, 56, 56, 56]);
put(g, 'yellow', [36, 36, -1, -1]);
r = E.rollDice(g, 6);
eq(r.moves.length, 1, 'without the rule the same move is legal');
eq(r.moves[0].to, 11, 'token passes the pair and lands beyond');

g = make({ blockades: true });
put(g, 'red', [4, 10, 10, 56]);
put(g, 'yellow', [-1, -1, -1, -1]);
r = E.rollDice(g, 6);
ok(
  r.moves.some((m) => m.token === 0 && m.to === 10),
  'your own pair does not block your token',
);

g = make({ blockades: true });
put(g, 'red', [4, 56, 56, 56]);
put(g, 'yellow', [36, 36, -1, -1]);
r = E.rollDice(g, 6);
eq(r.moves.length, 0, 'cannot land on an enemy blockade');

/* ── no legal move / turn order ─────────────────────────── */
g = make();
r = E.rollDice(g, 2);
eq(r.moves.length, 0, 'all tokens in the yard with a two is a dead roll');
E.passTurn(g);
eq(g.turn, 1, 'dead roll passes');
E.passTurn(g);
eq(g.turn, 0, 'turn order wraps');

/* ── CPU AI returns legal choices ───────────────────────── */
g = make();
E.rollDice(g, 6);
const pick = E.cpuPickMove(g, E.legalMoves(g), 'sharp');
ok(
  E.legalMoves(g).some((m) => m.token === pick.token),
  'CPU picks a legal token',
);
g.phase = 'rolling';
g.dice = null;
// capture is preferred over a plain move
put(g, 'red', [2, -1, -1, -1]);
put(g, 'yellow', [31, 28, -1, -1]);
g.turn = 0;
E.rollDice(g, 3);
const smart = E.cpuPickMove(g, E.legalMoves(g), 'sharp');
eq(smart.captures.length, 1, 'sharp CPU takes the capture');

/* ── random-game stress test ────────────────────────────── */
function playRandom(seed, opts = {}) {
  const rand = rng(seed);
  const state = E.createGame({
    colors: E.COLORS,
    types: ['cpu', 'cpu', 'cpu', 'cpu'],
    options: { blockades: seed % 3 === 0, threeSixes: seed % 2 === 0, autoSelect: true, ...opts },
  });
  let guard = 0;
  while (state.phase !== 'over' && guard < 8000) {
    guard += 1;
    if (state.phase === 'rolling') {
      E.rollDice(state, 1 + Math.floor(rand() * 6));
    } else if (state.phase === 'choosing') {
      const m = E.cpuPickMove(state, E.legalMoves(state), rand() < 0.3 ? 'easy' : 'sharp', rand);
      const res = E.commitMove(state, m.token);
      if (!res.ok) throw new Error(`seed ${seed}: CPU chose an illegal move`);
    } else {
      E.passTurn(state);
    }
    if (!E.isValidGame(state)) throw new Error(`seed ${seed}: invalid state at roll ${state.rolls}`);
    for (const p of state.players) {
      for (const t of p.tokens) {
        if (t < -1 || t > 56) throw new Error(`seed ${seed}: token out of range`);
      }
    }
  }
  return { state, guard };
}

let stressGames = 0;
let stressRolls = 0;
for (let seed = 1; seed <= 250; seed++) {
  const { state } = playRandom(seed);
  if (state.phase !== 'over') {
    failures.push(`stress seed ${seed} did not finish`);
    continue;
  }
  const winner = state.players.find((p) => p.color === state.winner);
  if (!winner || !winner.tokens.every((t) => t === 56)) {
    failures.push(`stress seed ${seed}: winner does not have four tokens home`);
  }
  stressGames += 1;
  stressRolls += state.rolls;
}
ok(stressGames === 250, '250 random games all finished', `${stressGames}/250`);
ok(
  stressRolls / Math.max(1, stressGames) < 800,
  'games finish in a sane number of rolls',
  `avg ${Math.round(stressRolls / Math.max(1, stressGames))}`,
);

/* ── save validation ────────────────────────────────────── */
g = make();
ok(E.isValidGame(g), 'fresh game is valid for saving');
const bad = JSON.parse(JSON.stringify(g));
bad.players[0].tokens[0] = 99;
ok(!E.isValidGame(bad), 'out-of-range token rejected');
const bad2 = JSON.parse(JSON.stringify(g));
bad2.v = 999;
ok(!E.isValidGame(bad2), 'wrong save version rejected');

/* ── report ─────────────────────────────────────────────── */
console.log(`\nLudo engine tests: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  FAIL ${f}`);
  process.exit(1);
}
console.log(
  `Stress: ${stressGames} random 4-CPU games, ${stressRolls} rolls, avg ${Math.round(stressRolls / stressGames)} rolls/game.`,
);
