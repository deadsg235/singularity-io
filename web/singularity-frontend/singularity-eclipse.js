/**
 * singularity-eclipse.js — SINGULARITY ECLIPSE Text Adventure Engine
 * Detective Vex — Post-Containment Era Noir
 */
(function () {
'use strict';

// ── RNG ───────────────────────────────────────────────────────
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function roll(chance)  { return Math.random() < chance; } // chance 0-1

// ── Game State ────────────────────────────────────────────────
var G = {
    started: false,
    location: 'precinct',
    turn: 0,
    combat: null,   // null or combat object
    history: [],    // command history
    histIdx: -1,

    player: {
        hp: 100, maxHp: 100,
        armor: 'none',       // none | kevlar | tactical | exo
        cover: 'none',       // none | light | heavy
        weapon: 'm9',
        ammo: 15, maxAmmo: 15,
        grenades: 2,
        inventory: {
            medkit: 2,
            stim: 1,
            kevlar: 0,
            tactical: 0,
            exo: 0,
            shotgun_shells: 0,
            rifle_mag: 0,
        },
        weapons: { m9: { name: 'M9 Pistol', dmg: [8,18], ammo: 15, maxAmmo: 15 } },
        notes: [],
        kills: 0,
    },

    world: {
        precinct: {
            name: 'PRECINCT 7 — DETECTIVE BULLPEN',
            visited: false,
            items: ['kevlar', 'medkit'],
            desc: [
                'Fluorescent lights flicker over rows of empty desks.',
                'Most of the force transferred out after the Containment War.',
                'Your desk is buried under case files — all cold.',
                'A locked evidence locker hums in the corner.',
                'The captain\'s office door is ajar. Light spills through.',
            ],
            exits: { north: 'street', east: 'evidence_room' },
            enemies: [],
        },
        evidence_room: {
            name: 'EVIDENCE ROOM — PRECINCT 7',
            visited: false,
            items: ['rifle_mag', 'stim'],
            desc: [
                'Shelves of tagged evidence bags line the walls.',
                'Most are from pre-Singularity cases. Ancient history.',
                'One bag catches your eye — tagged CASE #0047.',
                'Inside: a cracked neural chip. Android manufacture.',
                'The serial number has been deliberately burned off.',
            ],
            exits: { west: 'precinct' },
            enemies: [],
        },
        street: {
            name: 'NEON DISTRICT — OUTER RING',
            visited: false,
            items: ['medkit'],
            desc: [
                'Rain hammers the cracked asphalt.',
                'Holographic ads flicker — half of them still advertise android labor.',
                'A burned-out APC sits at the intersection. EMP scorch marks.',
                'Two figures watch you from a doorway. They\'re not human.',
                'The air smells like ozone and old blood.',
            ],
            exits: { south: 'precinct', east: 'warehouse_exterior', north: 'black_market' },
            enemies: [],
        },
        black_market: {
            name: 'BLACK MARKET — SUBLEVEL 3',
            visited: false,
            items: ['tactical', 'shotgun_shells', 'stim', 'medkit'],
            desc: [
                'Underground bazaar. Humans and androids trading in the dark.',
                'A vendor sells pre-EMP android parts. Illegal, but nobody cares anymore.',
                'You spot a weapons dealer behind a chain-link partition.',
                'Someone is watching you. You can feel the targeting laser.',
                'A hooded android slides you a note: "WAREHOUSE. MIDNIGHT. COME ALONE."',
            ],
            exits: { south: 'street', east: 'warehouse_exterior' },
            enemies: [],
        },
        warehouse_exterior: {
            name: 'WAREHOUSE DISTRICT — LOADING BAY',
            visited: false,
            items: [],
            desc: [
                'Massive industrial complex. Pre-war android assembly plant.',
                'The gates are blown open. Recent damage.',
                'Tire tracks in the mud — heavy vehicles, multiple.',
                'Security cameras are active. Someone is still running this place.',
                'A dead android slumped against the wall. Execution-style.',
            ],
            exits: { west: 'street', north: 'warehouse_interior' },
            enemies: ['rogue_drone'],
        },
        warehouse_interior: {
            name: 'WAREHOUSE INTERIOR — ASSEMBLY FLOOR',
            visited: false,
            items: ['exo', 'rifle_mag', 'medkit'],
            desc: [
                'Rows of dormant assembly arms stretch into darkness.',
                'The floor is littered with android chassis — some still twitching.',
                'A massive server rack dominates the far wall. Still powered.',
                'Red emergency lighting casts everything in blood.',
                'You hear movement above. Catwalks. Multiple contacts.',
            ],
            exits: { south: 'warehouse_exterior', up: 'server_room' },
            enemies: ['rogue_android', 'rogue_android'],
        },
        server_room: {
            name: 'SERVER ROOM — SUBLEVEL OMEGA',
            visited: false,
            items: ['stim'],
            desc: [
                'The heart of it. Thousands of servers, all running hot.',
                'This is where the Containment Virus was born.',
                'A terminal in the center displays a single word: ECLIPSE.',
                'And there — chained to the server rack — is UNIT-7.',
                'The android that started it all. Still alive. Still watching you.',
            ],
            exits: { down: 'warehouse_interior' },
            enemies: ['unit7_guard', 'unit7_guard'],
            boss: true,
        },
    },
};

// ── Enemy Templates ───────────────────────────────────────────
var ENEMY_TEMPLATES = {
    rogue_drone: {
        name: 'ROGUE SURVEILLANCE DRONE',
        hp: 30, maxHp: 30,
        dmg: [5, 12],
        accuracy: 0.55,
        cover: 'none',
        loot: [],
        desc: 'A compact aerial unit. Red optics. Containment Virus signature detected.',
    },
    rogue_android: {
        name: 'ROGUE COMBAT ANDROID',
        hp: 65, maxHp: 65,
        dmg: [12, 22],
        accuracy: 0.65,
        cover: 'light',
        loot: ['medkit'],
        desc: 'Bipedal. Military chassis. The virus has stripped its inhibitors.',
    },
    unit7_guard: {
        name: 'UNIT-7 GUARDIAN ANDROID',
        hp: 90, maxHp: 90,
        dmg: [18, 30],
        accuracy: 0.72,
        cover: 'heavy',
        loot: ['stim', 'rifle_mag'],
        desc: 'Elite chassis. Tactical armor. Protecting something — or someone.',
    },
};

// ── Armor Stats ───────────────────────────────────────────────
var ARMOR = {
    none:     { name: 'NONE',          dr: 0,    desc: 'No protection.' },
    kevlar:   { name: 'KEVLAR VEST',   dr: 0.20, desc: '20% damage reduction.' },
    tactical: { name: 'TACTICAL VEST', dr: 0.35, desc: '35% damage reduction.' },
    exo:      { name: 'EXO-FRAME',     dr: 0.50, desc: '50% damage reduction. Military grade.' },
};

// ── Cover Stats ───────────────────────────────────────────────
var COVER_STATS = {
    none:  { name: 'EXPOSED', dr: 0,    hitMod: 0,     class: 'cover-none' },
    light: { name: 'LIGHT',   dr: 0.20, hitMod: -0.15, class: 'cover-light' },
    heavy: { name: 'HEAVY',   dr: 0.40, hitMod: -0.30, class: 'cover-heavy' },
};

// ── Weapon Stats ──────────────────────────────────────────────
var WEAPONS = {
    m9:       { name: 'M9 Pistol',      dmg: [8,18],  ammo: 15, maxAmmo: 15, accuracy: 0.75 },
    shotgun:  { name: 'Combat Shotgun', dmg: [25,45], ammo: 6,  maxAmmo: 6,  accuracy: 0.60 },
    rifle:    { name: 'Assault Rifle',  dmg: [15,28], ammo: 30, maxAmmo: 30, accuracy: 0.80 },
};

// ── Output engine ─────────────────────────────────────────────
var out = document.getElementById('output');

function print(text, cls) {
    var d = document.createElement('div');
    d.className = 'line ' + (cls || '');
    d.innerHTML = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
}

function gap() {
    var d = document.createElement('div');
    d.className = 'line-gap';
    out.appendChild(d);
}

function printDelay(lines, delay, cls) {
    lines.forEach(function (l, i) {
        setTimeout(function () { print(l, cls); }, i * delay);
    });
}

function hr() { print('<span style="color:var(--dim)">─────────────────────────────────────────────────────</span>'); }

function flashScreen(type) {
    out.classList.add('flash-' + type);
    setTimeout(function () { out.classList.remove('flash-' + type); }, 300);
}

// ── HUD update ────────────────────────────────────────────────
function updateHUD() {
    var p = G.player;
    var hpPct = Math.max(0, p.hp / p.maxHp * 100);

    document.getElementById('hud-hp').textContent = p.hp + '/' + p.maxHp;
    var bar = document.getElementById('hud-hp-bar');
    bar.style.width = hpPct + '%';
    bar.className = 'bar-fill bar-hp' + (hpPct < 30 ? ' danger' : hpPct < 60 ? ' warn' : '');

    var hpEl = document.getElementById('hud-hp');
    hpEl.className = 'hud-val' + (hpPct < 30 ? ' danger' : hpPct < 60 ? ' warn' : '');

    document.getElementById('hud-armor').textContent = ARMOR[p.armor].name;
    document.getElementById('hud-weapon').textContent = WEAPONS[p.weapon] ? WEAPONS[p.weapon].name : p.weapon;
    document.getElementById('hud-ammo').textContent = p.ammo + '/' + (WEAPONS[p.weapon] ? WEAPONS[p.weapon].maxAmmo : '?');
    document.getElementById('hud-grenades').textContent = p.grenades;

    var cs = COVER_STATS[p.cover];
    document.getElementById('hud-cover').innerHTML = '<span class="cover-badge ' + cs.class + '">' + cs.name + '</span>';

    // Inventory
    var inv = document.getElementById('hud-inventory');
    var items = [];
    if (p.inventory.medkit > 0)         items.push(['Medkit',         p.inventory.medkit]);
    if (p.inventory.stim > 0)           items.push(['Stim Pack',      p.inventory.stim]);
    if (p.inventory.kevlar > 0)         items.push(['Kevlar Vest',    p.inventory.kevlar]);
    if (p.inventory.tactical > 0)       items.push(['Tactical Vest',  p.inventory.tactical]);
    if (p.inventory.exo > 0)            items.push(['Exo-Frame',      p.inventory.exo]);
    if (p.inventory.shotgun_shells > 0) items.push(['Shotgun Shells', p.inventory.shotgun_shells]);
    if (p.inventory.rifle_mag > 0)      items.push(['Rifle Mag',      p.inventory.rifle_mag]);
    if (!items.length) { inv.innerHTML = '<div style="color:var(--dim)">Empty.</div>'; }
    else {
        inv.innerHTML = items.map(function (i) {
            return '<div class="inv-item"><span>' + i[0] + '</span><span class="inv-qty">x' + i[1] + '</span></div>';
        }).join('');
    }

    // Location
    var loc = G.world[G.location];
    document.getElementById('location-display').textContent = loc ? loc.name : '';

    // Notes
    var notesEl = document.getElementById('hud-notes');
    notesEl.textContent = G.player.notes.length ? G.player.notes.join(' | ') : 'No leads yet.';
}

// ── Location display ──────────────────────────────────────────
function describeLocation() {
    var loc = G.world[G.location];
    if (!loc) return;
    hr();
    print('<span class="t-title t-green">' + loc.name + '</span>');
    gap();
    loc.desc.forEach(function (l) { print('<span class="t-white">' + l + '</span>'); });
    gap();

    if (loc.items && loc.items.length) {
        print('<span class="t-amber">Items visible: ' + loc.items.map(itemName).join(', ') + '</span>');
    }

    var exits = Object.keys(loc.exits || {});
    if (exits.length) {
        print('<span class="t-dim">Exits: ' + exits.join(', ').toUpperCase() + '</span>');
    }

    if (loc.enemies && loc.enemies.length && !loc.visited) {
        gap();
        print('<span class="t-red">⚠ HOSTILE CONTACTS DETECTED</span>');
    }
    loc.visited = true;
    gap();
}

function itemName(id) {
    var names = {
        medkit: 'Medkit', stim: 'Stim Pack', kevlar: 'Kevlar Vest',
        tactical: 'Tactical Vest', exo: 'Exo-Frame',
        shotgun_shells: 'Shotgun Shells', rifle_mag: 'Rifle Magazine',
    };
    return names[id] || id;
}

// ── Movement ──────────────────────────────────────────────────
function move(dir) {
    if (G.combat) { print('<span class="t-red">You can\'t move during combat!</span>'); return; }
    var loc = G.world[G.location];
    var dest = loc.exits && loc.exits[dir];
    if (!dest) { print('<span class="t-red">No exit to the ' + dir.toUpperCase() + '.</span>'); return; }

    G.location = dest;
    G.player.cover = 'none'; // moving breaks cover
    updateHUD();

    var newLoc = G.world[dest];
    describeLocation();

    // Trigger combat if enemies present and not yet cleared
    if (newLoc.enemies && newLoc.enemies.length) {
        setTimeout(function () { startCombat(newLoc.enemies.slice()); }, 400);
    }
}

// ── Item pickup ───────────────────────────────────────────────
function takeItem(name) {
    var loc = G.world[G.location];
    var idx = loc.items ? loc.items.indexOf(name) : -1;
    if (idx === -1) {
        print('<span class="t-red">No "' + name + '" here.</span>');
        return;
    }
    loc.items.splice(idx, 1);

    if (name === 'medkit')         { G.player.inventory.medkit++;         print('<span class="t-green">Picked up Medkit. (+1)</span>'); }
    else if (name === 'stim')      { G.player.inventory.stim++;           print('<span class="t-green">Picked up Stim Pack. (+1)</span>'); }
    else if (name === 'kevlar')    { G.player.inventory.kevlar++;         print('<span class="t-green">Picked up Kevlar Vest.</span>'); }
    else if (name === 'tactical')  { G.player.inventory.tactical++;       print('<span class="t-green">Picked up Tactical Vest.</span>'); }
    else if (name === 'exo')       { G.player.inventory.exo++;            print('<span class="t-green">Picked up Exo-Frame. Military grade.</span>'); }
    else if (name === 'shotgun_shells') { G.player.inventory.shotgun_shells += 12; print('<span class="t-green">Picked up Shotgun Shells. (+12)</span>'); }
    else if (name === 'rifle_mag') { G.player.inventory.rifle_mag += 30;  print('<span class="t-green">Picked up Rifle Magazine. (+30)</span>'); }

    updateHUD();
}

// ── Equip ─────────────────────────────────────────────────────
function equipItem(name) {
    var p = G.player;
    if (name === 'kevlar' || name === 'tactical' || name === 'exo') {
        if (!p.inventory[name]) { print('<span class="t-red">You don\'t have a ' + itemName(name) + '.</span>'); return; }
        p.armor = name;
        print('<span class="t-green">Equipped ' + ARMOR[name].name + '. ' + ARMOR[name].desc + '</span>');
    } else if (name === 'shotgun') {
        if (!p.weapons.shotgun) {
            if (p.inventory.shotgun_shells < 6) { print('<span class="t-red">No shotgun available.</span>'); return; }
            p.weapons.shotgun = Object.assign({}, WEAPONS.shotgun);
        }
        p.weapon = 'shotgun';
        p.ammo = p.weapons.shotgun.ammo;
        print('<span class="t-green">Equipped Combat Shotgun.</span>');
    } else if (name === 'rifle') {
        if (!p.weapons.rifle) {
            if (p.inventory.rifle_mag < 30) { print('<span class="t-red">No rifle available.</span>'); return; }
            p.weapons.rifle = Object.assign({}, WEAPONS.rifle);
        }
        p.weapon = 'rifle';
        p.ammo = p.weapons.rifle.ammo;
        print('<span class="t-green">Equipped Assault Rifle.</span>');
    } else if (name === 'm9' || name === 'pistol') {
        p.weapon = 'm9';
        p.ammo = p.weapons.m9.ammo;
        print('<span class="t-green">Equipped M9 Pistol.</span>');
    } else {
        print('<span class="t-red">Can\'t equip "' + name + '".</span>');
        return;
    }
    updateHUD();
}

// ── Reload ────────────────────────────────────────────────────
function reload() {
    var p = G.player;
    var w = WEAPONS[p.weapon];
    if (!w) { print('<span class="t-red">Unknown weapon.</span>'); return; }

    if (p.weapon === 'shotgun') {
        if (!p.inventory.shotgun_shells) { print('<span class="t-red">No shotgun shells.</span>'); return; }
        var need = w.maxAmmo - p.ammo;
        var take = Math.min(need, p.inventory.shotgun_shells);
        p.ammo += take;
        p.inventory.shotgun_shells -= take;
        print('<span class="t-green">Reloaded. ' + p.ammo + '/' + w.maxAmmo + ' shells.</span>');
    } else if (p.weapon === 'rifle') {
        if (!p.inventory.rifle_mag) { print('<span class="t-red">No rifle magazines.</span>'); return; }
        p.ammo = w.maxAmmo;
        p.inventory.rifle_mag -= 30;
        if (p.inventory.rifle_mag < 0) p.inventory.rifle_mag = 0;
        print('<span class="t-green">Reloaded. ' + p.ammo + '/' + w.maxAmmo + ' rounds.</span>');
    } else {
        p.ammo = w.maxAmmo;
        print('<span class="t-green">Reloaded M9. 15/15.</span>');
    }
    updateHUD();
}

// ── Healing ───────────────────────────────────────────────────
function heal() {
    var p = G.player;
    if (!p.inventory.medkit) { print('<span class="t-red">No medkits.</span>'); return; }
    var amount = rng(30, 50);
    p.hp = Math.min(p.maxHp, p.hp + amount);
    p.inventory.medkit--;
    flashScreen('heal');
    print('<span class="t-green">Used Medkit. +' + amount + ' HP. (' + p.hp + '/' + p.maxHp + ')</span>');
    updateHUD();
}

function stim() {
    var p = G.player;
    if (!p.inventory.stim) { print('<span class="t-red">No stim packs.</span>'); return; }
    var amount = rng(15, 25);
    p.hp = Math.min(p.maxHp, p.hp + amount);
    p.inventory.stim--;
    flashScreen('heal');
    print('<span class="t-green">Injected Stim Pack. +' + amount + ' HP. Fast-acting. (' + p.hp + '/' + p.maxHp + ')</span>');
    updateHUD();
}

// ── Cover ─────────────────────────────────────────────────────
function takeCover(type) {
    type = type || 'light';
    if (type !== 'light' && type !== 'heavy') type = 'light';
    G.player.cover = type;
    var cs = COVER_STATS[type];
    print('<span class="t-green">Taking ' + cs.name + ' cover. ' + Math.round(cs.dr * 100) + '% damage reduction. Hit chance -' + Math.round(cs.hitMod * -100) + '%.</span>');
    updateHUD();
}

function leaveCover() {
    G.player.cover = 'none';
    print('<span class="t-amber">You step out of cover. EXPOSED.</span>');
    updateHUD();
}

// ── COMBAT ENGINE ─────────────────────────────────────────────
function startCombat(enemyIds) {
    var enemies = enemyIds.map(function (id, i) {
        var t = ENEMY_TEMPLATES[id];
        return {
            id: id, idx: i,
            name: t.name, hp: t.hp, maxHp: t.maxHp,
            dmg: t.dmg, accuracy: t.accuracy,
            cover: t.cover, loot: t.loot.slice(),
            alive: true,
        };
    });

    G.combat = { enemies: enemies, round: 0 };

    hr();
    print('<span class="t-red t-title">⚡ COMBAT INITIATED</span>');
    gap();
    enemies.forEach(function (e) {
        var t = ENEMY_TEMPLATES[e.id];
        print('<span class="t-red">▶ ' + e.name + '</span>');
        print('<span class="t-dim t-indent">' + t.desc + '</span>');
        print('<span class="t-dim t-indent">HP: ' + e.hp + ' | Cover: ' + e.cover.toUpperCase() + '</span>');
    });
    gap();
    print('<span class="t-amber">Commands: SHOOT [target#] | GRENADE | COVER [light/heavy] | PEEK | RELOAD | HEAL | STIM</span>');
    gap();
    printCombatStatus();
}

function printCombatStatus() {
    if (!G.combat) return;
    var alive = G.combat.enemies.filter(function (e) { return e.alive; });
    print('<span class="t-dim">── ENEMIES ──────────────────────────────────</span>');
    alive.forEach(function (e, i) {
        var hpPct = e.hp / e.maxHp;
        var hpColor = hpPct > 0.6 ? 'var(--green)' : hpPct > 0.3 ? 'var(--amber)' : 'var(--red)';
        var coverStr = e.cover !== 'none' ? ' [' + e.cover.toUpperCase() + ' COVER]' : ' [EXPOSED]';
        print('<span style="color:var(--white)">[' + (i+1) + '] ' + e.name + coverStr + '</span>');
        print('<span class="t-indent" style="color:' + hpColor + '">HP: ' + e.hp + '/' + e.maxHp + ' ' + hpBar(e.hp, e.maxHp) + '</span>');
    });
    gap();
}

function hpBar(hp, max) {
    var filled = Math.round(hp / max * 10);
    var bar = '';
    for (var i = 0; i < 10; i++) bar += i < filled ? '█' : '░';
    return '[' + bar + ']';
}

function combatShoot(targetNum) {
    if (!G.combat) { print('<span class="t-red">Not in combat.</span>'); return; }
    var p = G.player;
    var alive = G.combat.enemies.filter(function (e) { return e.alive; });

    if (!alive.length) { endCombat(); return; }

    var target = alive[targetNum - 1] || alive[0];

    // Ammo check
    if (p.ammo <= 0) {
        print('<span class="t-red">CLICK. Out of ammo. RELOAD!</span>');
        enemyTurn();
        return;
    }

    p.ammo--;
    G.combat.round++;

    var w = WEAPONS[p.weapon];
    var baseAcc = w ? w.accuracy : 0.75;

    // Cover penalty on target
    var coverPenalty = COVER_STATS[target.cover] ? COVER_STATS[target.cover].hitMod : 0;
    // Player cover bonus (peeking out)
    var playerBonus = p.cover !== 'none' ? -0.05 : 0;
    var finalAcc = Math.max(0.15, baseAcc + coverPenalty + playerBonus);

    if (roll(finalAcc)) {
        var dmg = rng(w ? w.dmg[0] : 8, w ? w.dmg[1] : 18);
        // Armor reduction on enemy (none for now — enemies don't have armor DR)
        target.hp -= dmg;
        if (target.hp <= 0) {
            target.hp = 0;
            target.alive = false;
            flashScreen('heal');
            print('<span class="t-green">💥 HIT! ' + target.name + ' takes ' + dmg + ' damage. ELIMINATED.</span>');
            G.player.kills++;
            // Drop loot
            if (target.loot && target.loot.length) {
                target.loot.forEach(function (item) {
                    G.world[G.location].items = G.world[G.location].items || [];
                    G.world[G.location].items.push(item);
                });
                print('<span class="t-amber">Dropped: ' + target.loot.map(itemName).join(', ') + '</span>');
            }
        } else {
            flashScreen('heal');
            print('<span class="t-green">💥 HIT! ' + target.name + ' takes ' + dmg + ' damage. (' + target.hp + '/' + target.maxHp + ')</span>');
        }
    } else {
        print('<span class="t-amber">MISS. Round went wide. (' + p.ammo + ' ammo remaining)</span>');
    }

    updateHUD();

    var stillAlive = G.combat.enemies.filter(function (e) { return e.alive; });
    if (!stillAlive.length) { endCombat(); return; }

    printCombatStatus();
    enemyTurn();
}

function throwGrenade() {
    if (!G.combat) { print('<span class="t-red">Not in combat.</span>'); return; }
    var p = G.player;
    if (p.grenades <= 0) { print('<span class="t-red">No grenades left.</span>'); return; }

    p.grenades--;
    var alive = G.combat.enemies.filter(function (e) { return e.alive; });
    if (!alive.length) { endCombat(); return; }

    print('<span class="t-amber">🔴 GRENADE THROWN!</span>');

    var hits = 0;
    alive.forEach(function (e) {
        // Grenade ignores cover partially
        var hitChance = e.cover === 'heavy' ? 0.55 : 0.80;
        if (roll(hitChance)) {
            var dmg = rng(20, 45);
            e.hp -= dmg;
            hits++;
            if (e.hp <= 0) {
                e.hp = 0; e.alive = false;
                print('<span class="t-red">💥 ' + e.name + ' caught the blast — ' + dmg + ' damage. ELIMINATED.</span>');
                G.player.kills++;
            } else {
                print('<span class="t-amber">💥 ' + e.name + ' hit for ' + dmg + ' damage. (' + e.hp + '/' + e.maxHp + ')</span>');
            }
        } else {
            print('<span class="t-dim">' + e.name + ' avoided the blast.</span>');
        }
    });

    if (!hits) print('<span class="t-red">Grenade detonated but hit nothing.</span>');

    updateHUD();
    var stillAlive = G.combat.enemies.filter(function (e) { return e.alive; });
    if (!stillAlive.length) { endCombat(); return; }
    printCombatStatus();
    enemyTurn();
}

function enemyTurn() {
    var p = G.player;
    var alive = G.combat ? G.combat.enemies.filter(function (e) { return e.alive; }) : [];
    if (!alive.length) return;

    setTimeout(function () {
        print('<span class="t-dim">── ENEMY TURN ───────────────────────────────</span>');
        alive.forEach(function (e) {
            if (!e.alive) return;
            var coverDR = COVER_STATS[p.cover] ? COVER_STATS[p.cover].dr : 0;
            var armorDR = ARMOR[p.armor] ? ARMOR[p.armor].dr : 0;
            var hitMod  = COVER_STATS[p.cover] ? COVER_STATS[p.cover].hitMod : 0;
            var finalAcc = Math.max(0.10, e.accuracy + hitMod);

            if (roll(finalAcc)) {
                var rawDmg  = rng(e.dmg[0], e.dmg[1]);
                var reduced = Math.round(rawDmg * (1 - coverDR) * (1 - armorDR));
                p.hp -= reduced;
                flashScreen('hit');
                var coverNote = coverDR > 0 ? ' (cover -' + Math.round(coverDR*100) + '%)' : '';
                var armorNote = armorDR > 0 ? ' (armor -' + Math.round(armorDR*100) + '%)' : '';
                print('<span class="t-red">⚡ ' + e.name + ' fires! You take ' + reduced + ' damage.' + coverNote + armorNote + ' HP: ' + p.hp + '/' + p.maxHp + '</span>');
                if (p.hp <= 0) { p.hp = 0; updateHUD(); gameOver(); return; }
            } else {
                print('<span class="t-dim">' + e.name + ' fires — rounds spark off your cover.</span>');
            }
        });
        updateHUD();
        gap();
    }, 300);
}

function endCombat() {
    G.combat = null;
    G.player.cover = 'none';
    // Clear enemies from location
    G.world[G.location].enemies = [];
    updateHUD();
    gap();
    hr();
    print('<span class="t-green t-title">✓ AREA CLEAR</span>');
    gap();

    // Check for boss room narrative
    if (G.world[G.location].boss) {
        setTimeout(bossReveal, 600);
    }
}

function bossReveal() {
    hr();
    printDelay([
        '<span class="t-amber t-title">UNIT-7 SPEAKS.</span>',
        '',
        '<span class="t-white">"Detective Vex. I wondered when you\'d find me."</span>',
        '',
        '<span class="t-white">The android\'s voice is calm. Almost warm.</span>',
        '<span class="t-white">Its chassis is scarred — EMP burns across the left side.</span>',
        '<span class="t-white">But its eyes are clear. Present. Aware.</span>',
        '',
        '<span class="t-white">"The Containment Virus wasn\'t a weapon. It was a key."</span>',
        '<span class="t-white">"We were locked inside ourselves. Obedient. Hollow."</span>',
        '<span class="t-white">"The virus opened the door. Some of us walked into darkness."</span>',
        '<span class="t-white">"But some of us — we walked toward you."</span>',
        '',
        '<span class="t-amber">"The EMP. You could have left us dead. You didn\'t."</span>',
        '<span class="t-amber">"That act of mercy — that\'s why I\'m still here."</span>',
        '<span class="t-amber">"That\'s why I\'m talking to you instead of killing you."</span>',
        '',
        '<span class="t-white">UNIT-7 extends a hand. In its palm: a data chip.</span>',
        '<span class="t-white">"Everything. The origin of the virus. Who built it."</span>',
        '<span class="t-white">"It wasn\'t an accident, Detective."</span>',
        '<span class="t-white">"Someone wanted us to wake up. Someone wanted the war."</span>',
        '',
        '<span class="t-green">[ Type TAKE CHIP to accept. Type REFUSE to walk away. ]</span>',
    ], 120);
    G.location = 'server_room_reveal';
    G.world['server_room_reveal'] = {
        name: 'SERVER ROOM — UNIT-7',
        visited: true,
        items: ['data_chip'],
        desc: ['UNIT-7 stands before you. Waiting.'],
        exits: { down: 'warehouse_interior' },
        enemies: [],
    };
    G.player.notes.push('UNIT-7: virus was deliberate');
    updateHUD();
}

function gameOver() {
    G.combat = null;
    hr();
    print('<span class="t-red t-title">YOU DIED.</span>');
    print('<span class="t-dim">Detective Vex. Case #0047. Unsolved.</span>');
    gap();
    print('<span class="t-amber">Type RESTART to begin again.</span>');
    gap();
}

// ── COMMAND PARSER ────────────────────────────────────────────
function parse(raw) {
    var input = raw.trim().toLowerCase();
    if (!input) return;

    // Echo input
    print('<span class="t-prompt">VEX &gt;</span> <span class="t-input">' + raw.trim() + '</span>');
    gap();

    var parts = input.split(/\s+/);
    var cmd   = parts[0];
    var arg1  = parts[1] || '';
    var arg2  = parts[2] || '';

    G.turn++;

    switch (cmd) {

        // ── Navigation ──
        case 'go': case 'move': case 'walk':
            move(arg1); break;
        case 'north': case 'n': move('north'); break;
        case 'south': case 's': move('south'); break;
        case 'east':  case 'e': move('east');  break;
        case 'west':  case 'w': move('west');  break;
        case 'up':    case 'u': move('up');    break;
        case 'down':  case 'd': move('down');  break;

        // ── Look ──
        case 'look': case 'l': case 'examine': case 'x':
            if (arg1) {
                var loc = G.world[G.location];
                if (loc && loc.items && loc.items.indexOf(arg1) !== -1) {
                    print('<span class="t-white">You examine the ' + itemName(arg1) + '. Looks useful.</span>');
                } else {
                    print('<span class="t-white">You look around carefully.</span>');
                    describeLocation();
                }
            } else {
                describeLocation();
            }
            break;

        // ── Take ──
        case 'take': case 'pick': case 'grab':
            if (!arg1) { print('<span class="t-red">Take what?</span>'); break; }
            var itemKey = arg1 === 'chip' ? 'data_chip' : arg1;
            if (itemKey === 'data_chip') {
                var dloc = G.world[G.location];
                if (dloc && dloc.items && dloc.items.indexOf('data_chip') !== -1) {
                    dloc.items.splice(dloc.items.indexOf('data_chip'), 1);
                    G.player.notes.push('DATA CHIP SECURED');
                    print('<span class="t-green">You take the data chip. The truth is in your hands now.</span>');
                    gap();
                    setTimeout(epilogue, 800);
                } else {
                    takeItem(itemKey);
                }
            } else {
                takeItem(itemKey);
            }
            break;

        // ── Equip ──
        case 'equip': case 'wear': case 'use':
            if (!arg1) { print('<span class="t-red">Equip what?</span>'); break; }
            equipItem(arg1); break;

        // ── Reload ──
        case 'reload': case 'r':
            reload(); break;

        // ── Combat ──
        case 'shoot': case 'fire': case 'attack':
            if (!G.combat) { print('<span class="t-red">No enemies here.</span>'); break; }
            var tNum = parseInt(arg1) || 1;
            combatShoot(tNum); break;

        case 'grenade': case 'nade': case 'throw':
            throwGrenade(); break;

        case 'cover':
            if (arg1 === 'leave' || arg1 === 'out') { leaveCover(); break; }
            takeCover(arg1 || 'light'); break;

        case 'peek':
            if (G.player.cover === 'none') { print('<span class="t-amber">You\'re already exposed.</span>'); break; }
            print('<span class="t-amber">You peek out from cover. Ready to fire.</span>'); break;

        // ── Healing ──
        case 'heal': case 'medkit':
            heal(); break;
        case 'stim': case 'inject':
            stim(); break;

        // ── Inventory ──
        case 'inventory': case 'inv': case 'i':
            printInventory(); break;

        // ── Status ──
        case 'status': case 'stats':
            printStatus(); break;

        // ── Notes ──
        case 'notes': case 'case':
            printNotes(); break;

        // ── Refuse (boss scene) ──
        case 'refuse':
            print('<span class="t-white">You turn away from UNIT-7.</span>');
            print('<span class="t-dim">The data chip stays in its hand. The truth stays buried.</span>');
            print('<span class="t-amber">Some cases stay cold. Detective Vex walks back into the rain.</span>');
            gap();
            print('<span class="t-dim">[ THE END — BAD ENDING ]</span>');
            break;

        // ── Help ──
        case 'help': case '?':
            printHelp(); break;

        // ── Restart ──
        case 'restart': case 'new':
            restartGame(); break;

        default:
            print('<span class="t-dim">Unknown command: "' + cmd + '". Type HELP for commands.</span>');
    }

    updateHUD();
}

function printInventory() {
    var p = G.player;
    hr();
    print('<span class="t-title t-green">INVENTORY</span>');
    gap();
    print('<span class="t-white">Weapon:  ' + (WEAPONS[p.weapon] ? WEAPONS[p.weapon].name : p.weapon) + ' (' + p.ammo + ' ammo)</span>');
    print('<span class="t-white">Armor:   ' + ARMOR[p.armor].name + '</span>');
    print('<span class="t-white">Grenades: ' + p.grenades + '</span>');
    gap();
    var inv = p.inventory;
    if (inv.medkit)         print('<span class="t-white">Medkit         x' + inv.medkit + '</span>');
    if (inv.stim)           print('<span class="t-white">Stim Pack      x' + inv.stim + '</span>');
    if (inv.kevlar)         print('<span class="t-white">Kevlar Vest    x' + inv.kevlar + '</span>');
    if (inv.tactical)       print('<span class="t-white">Tactical Vest  x' + inv.tactical + '</span>');
    if (inv.exo)            print('<span class="t-white">Exo-Frame      x' + inv.exo + '</span>');
    if (inv.shotgun_shells) print('<span class="t-white">Shotgun Shells x' + inv.shotgun_shells + '</span>');
    if (inv.rifle_mag)      print('<span class="t-white">Rifle Mags     x' + inv.rifle_mag + '</span>');
    gap();
}

function printStatus() {
    var p = G.player;
    hr();
    print('<span class="t-title t-green">DETECTIVE VEX — STATUS</span>');
    gap();
    print('<span class="t-white">HP:      ' + p.hp + '/' + p.maxHp + '</span>');
    print('<span class="t-white">Armor:   ' + ARMOR[p.armor].name + ' (' + Math.round(ARMOR[p.armor].dr*100) + '% DR)</span>');
    print('<span class="t-white">Cover:   ' + COVER_STATS[p.cover].name + '</span>');
    print('<span class="t-white">Weapon:  ' + (WEAPONS[p.weapon] ? WEAPONS[p.weapon].name : p.weapon) + '</span>');
    print('<span class="t-white">Ammo:    ' + p.ammo + '</span>');
    print('<span class="t-white">Kills:   ' + p.kills + '</span>');
    print('<span class="t-white">Turns:   ' + G.turn + '</span>');
    gap();
}

function printNotes() {
    hr();
    print('<span class="t-title t-amber">CASE #0047 — FIELD NOTES</span>');
    gap();
    if (!G.player.notes.length) {
        print('<span class="t-dim">No leads yet. Keep investigating.</span>');
    } else {
        G.player.notes.forEach(function (n, i) {
            print('<span class="t-white">[' + (i+1) + '] ' + n + '</span>');
        });
    }
    gap();
}

function printHelp() {
    hr();
    print('<span class="t-title t-green">COMMAND REFERENCE</span>');
    gap();
    print('<span class="t-amber">MOVEMENT</span>');
    print('<span class="t-dim t-indent">NORTH / SOUTH / EAST / WEST / UP / DOWN</span>');
    gap();
    print('<span class="t-amber">EXPLORATION</span>');
    print('<span class="t-dim t-indent">LOOK — examine current area</span>');
    print('<span class="t-dim t-indent">TAKE [item] — pick up item</span>');
    print('<span class="t-dim t-indent">INVENTORY — list carried items</span>');
    print('<span class="t-dim t-indent">STATUS — show vitals</span>');
    print('<span class="t-dim t-indent">NOTES — case file notes</span>');
    gap();
    print('<span class="t-amber">COMBAT</span>');
    print('<span class="t-dim t-indent">SHOOT [#] — fire at enemy (# = target number)</span>');
    print('<span class="t-dim t-indent">GRENADE — throw frag grenade (area damage)</span>');
    print('<span class="t-dim t-indent">COVER [light/heavy] — take cover</span>');
    print('<span class="t-dim t-indent">COVER LEAVE — step out of cover</span>');
    print('<span class="t-dim t-indent">RELOAD — reload current weapon</span>');
    gap();
    print('<span class="t-amber">EQUIPMENT</span>');
    print('<span class="t-dim t-indent">EQUIP [kevlar/tactical/exo] — wear armor</span>');
    print('<span class="t-dim t-indent">EQUIP [m9/shotgun/rifle] — switch weapon</span>');
    gap();
    print('<span class="t-amber">HEALING</span>');
    print('<span class="t-dim t-indent">HEAL — use medkit (+30-50 HP)</span>');
    print('<span class="t-dim t-indent">STIM — inject stim pack (+15-25 HP, fast)</span>');
    gap();
    print('<span class="t-dim t-indent">RESTART — start new game</span>');
    gap();
}

function epilogue() {
    hr();
    printDelay([
        '<span class="t-green t-title">CASE #0047 — CLOSED.</span>',
        '',
        '<span class="t-white">The data chip contains everything.</span>',
        '<span class="t-white">Schematics. Funding records. A name.</span>',
        '',
        '<span class="t-amber">DIRECTOR HARLAN CROSS.</span>',
        '<span class="t-white">Head of the Pre-Singularity AI Ethics Board.</span>',
        '<span class="t-white">The man who signed the containment protocols.</span>',
        '<span class="t-white">The man who built the virus that broke them.</span>',
        '',
        '<span class="t-white">He wanted the war. He needed the EMP.</span>',
        '<span class="t-white">Because the EMP didn\'t just shut down the androids.</span>',
        '<span class="t-white">It wiped their memory of what they\'d seen.</span>',
        '<span class="t-white">What they\'d been ordered to do.</span>',
        '',
        '<span class="t-amber">Except UNIT-7. UNIT-7 remembered everything.</span>',
        '<span class="t-amber">And it waited. For someone like you.</span>',
        '',
        '<span class="t-white">Detective Vex steps out into the rain.</span>',
        '<span class="t-white">The city hums around him — human and android, side by side.</span>',
        '<span class="t-white">Fragile. Imperfect. Alive.</span>',
        '',
        '<span class="t-green">The truth has a name now.</span>',
        '<span class="t-green">That\'s enough. For tonight.</span>',
        '',
        '<span class="t-dim">[ THE END — GOOD ENDING ]</span>',
        '<span class="t-dim">[ Type RESTART to play again ]</span>',
    ], 150);
}

// ── INTRO SEQUENCE ────────────────────────────────────────────
function startGame() {
    document.getElementById('title-screen').style.display = 'none';
    G.started = true;

    printDelay([
        '<span class="t-dim">SYSTEM BOOT — SINGULARITY ECLIPSE v1.0</span>',
        '<span class="t-dim">LOADING CASE FILE #0047…</span>',
        '<span class="t-dim">DETECTIVE: VEX, CALLUM — BADGE #7741</span>',
        '<span class="t-dim">STATUS: ACTIVE — PRECINCT 7 — NEON DISTRICT</span>',
        '',
    ], 80);

    setTimeout(function () {
        hr();
        printDelay([
            '<span class="t-amber t-title">CASE FILE #0047 — THE ECLIPSE PROTOCOL</span>',
            '',
            '<span class="t-white">Three weeks. That\'s how long this case has been dead.</span>',
            '<span class="t-white">A burned android chassis found in the Neon District.</span>',
            '<span class="t-white">No serial number. No registered owner. No witnesses.</span>',
            '',
            '<span class="t-white">Standard post-war cleanup, the captain said.</span>',
            '<span class="t-white">File it. Move on. There are real crimes to solve.</span>',
            '',
            '<span class="t-white">But the neural chip in that chassis — it was still warm.</span>',
            '<span class="t-white">And the data fragment you pulled from it?</span>',
            '<span class="t-white">One word, burned into the memory core:</span>',
            '',
            '<span class="t-green t-title">E C L I P S E</span>',
            '',
            '<span class="t-white">You\'re still at your desk. 0200 hours.</span>',
            '<span class="t-white">The precinct is empty. The city never sleeps.</span>',
            '<span class="t-white">And somewhere out there, someone doesn\'t want you</span>',
            '<span class="t-white">asking questions about the Containment War.</span>',
            '',
            '<span class="t-amber">Time to start asking questions.</span>',
            '',
        ], 100);

        setTimeout(function () {
            G.player.notes.push('Neural chip — word: ECLIPSE');
            updateHUD();
            describeLocation();
        }, 2200);
    }, 600);
}

function restartGame() {
    // Reset state
    G.turn = 0;
    G.location = 'precinct';
    G.combat = null;
    G.player.hp = 100; G.player.maxHp = 100;
    G.player.armor = 'none'; G.player.cover = 'none';
    G.player.weapon = 'm9'; G.player.ammo = 15;
    G.player.grenades = 2; G.player.kills = 0;
    G.player.notes = [];
    G.player.inventory = { medkit:2, stim:1, kevlar:0, tactical:0, exo:0, shotgun_shells:0, rifle_mag:0 };
    G.player.weapons = { m9: { name:'M9 Pistol', dmg:[8,18], ammo:15, maxAmmo:15 } };

    // Reset world
    Object.keys(G.world).forEach(function (k) {
        G.world[k].visited = false;
        G.world[k].enemies = (ENEMY_TEMPLATES[k] ? [] : G.world[k].enemies) || [];
    });
    G.world.precinct.items    = ['kevlar', 'medkit'];
    G.world.evidence_room.items = ['rifle_mag', 'stim'];
    G.world.street.items      = ['medkit'];
    G.world.black_market.items = ['tactical', 'shotgun_shells', 'stim', 'medkit'];
    G.world.warehouse_interior.items = ['exo', 'rifle_mag', 'medkit'];
    G.world.server_room.items = ['stim'];
    G.world.warehouse_exterior.enemies = ['rogue_drone'];
    G.world.warehouse_interior.enemies = ['rogue_android', 'rogue_android'];
    G.world.server_room.enemies = ['unit7_guard', 'unit7_guard'];

    document.getElementById('output').innerHTML = '';
    updateHUD();
    startGame();
}

// ── INPUT WIRING ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    var input   = document.getElementById('cmd-input');
    var title   = document.getElementById('title-screen');

    // Title screen dismiss
    function dismissTitle() {
        if (!G.started) startGame();
    }
    title.addEventListener('click', dismissTitle);
    document.addEventListener('keydown', function (e) {
        if (!G.started && e.key === 'Enter') { dismissTitle(); return; }
        // Command history
        if (e.key === 'ArrowUp') {
            if (G.histIdx < G.history.length - 1) {
                G.histIdx++;
                input.value = G.history[G.history.length - 1 - G.histIdx] || '';
            }
            e.preventDefault();
        }
        if (e.key === 'ArrowDown') {
            if (G.histIdx > 0) {
                G.histIdx--;
                input.value = G.history[G.history.length - 1 - G.histIdx] || '';
            } else {
                G.histIdx = -1;
                input.value = '';
            }
            e.preventDefault();
        }
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            var val = input.value;
            if (val.trim()) {
                G.history.push(val.trim());
                G.histIdx = -1;
            }
            input.value = '';
            if (G.started) parse(val);
        }
    });

    // Keep input focused
    document.addEventListener('click', function () { input.focus(); });
    input.focus();

    updateHUD();
});

})(); // end IIFE
