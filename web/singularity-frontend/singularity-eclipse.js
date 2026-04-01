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
        armor: 'none',
        cover: 'none',
        weapon: 'm9',        // current weapon key
        ammo: 17, maxAmmo: 17,
        grenades: 2,
        // owned weapons: key → { ...base stats, attachments: {slot: attachKey} }
        ownedWeapons: {
            m9: { attachments: { optic: null, suppressor: null, grip: null } }
        },
        inventory: {
            medkit: 2,
            stim: 1,
            // armor
            kevlar: 0, tactical: 0, exo: 0,
            // ammo by caliber
            ammo_9mm: 34,
            ammo_556: 0,
            ammo_545: 0,
            ammo_762nato: 0,
            ammo_50ae: 0,
            ammo_50bmg: 0,
            ammo_12ga: 0,
            ammo_57: 0,
            // attachments (by key)
            attachments: {},
        },
        notes: [],
        kills: 0,
    },

    world: {
        precinct: {
            name: 'PRECINCT 7 — DETECTIVE BULLPEN',
            visited: false,
            items: ['kevlar', 'medkit', 'ammo_9mm'],
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
            items: ['m4a1', 'ammo_556', 'stim', 'red_dot'],
            desc: [
                'Shelves of tagged evidence bags line the walls.',
                'Most are from pre-Singularity cases. Ancient history.',
                'One bag catches your eye — tagged CASE #0047.',
                'Inside: a cracked neural chip. Android manufacture.',
                'The serial number has been deliberately burned off.',
                'A confiscated M4A1 sits in the corner. Still tagged.',
            ],
            exits: { west: 'precinct' },
            enemies: [],
        },
        street: {
            name: 'NEON DISTRICT — OUTER RING',
            visited: false,
            items: ['medkit', 'ammo_9mm'],
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
            items: ['tactical', 'ammo_12ga', 'stim', 'medkit', 'm870', 'suppressor_9mm', 'angled_grip', 'deagle', 'ammo_50ae'],
            desc: [
                'Underground bazaar. Humans and androids trading in the dark.',
                'A vendor sells pre-EMP android parts. Illegal, but nobody cares anymore.',
                'You spot a weapons dealer behind a chain-link partition.',
                'The rack holds everything: shotguns, suppressors, optics.',
                'A hooded android slides you a note: "WAREHOUSE. MIDNIGHT. COME ALONE."',
            ],
            exits: { south: 'street', east: 'warehouse_exterior' },
            enemies: [],
        },
        warehouse_exterior: {
            name: 'WAREHOUSE DISTRICT — LOADING BAY',
            visited: false,
            items: ['ammo_556', 'ammo_9mm'],
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
            items: ['exo', 'ammo_762nato', 'medkit', 'scar_h', 'acog', 'thermal'],
            desc: [
                'Rows of dormant assembly arms stretch into darkness.',
                'The floor is littered with android chassis — some still twitching.',
                'A massive server rack dominates the far wall. Still powered.',
                'Red emergency lighting casts everything in blood.',
                'You hear movement above. Catwalks. Multiple contacts.',
                'A weapons crate sits open — SCAR-H, ACOG, thermal scope.',
            ],
            exits: { south: 'warehouse_exterior', up: 'server_room' },
            enemies: ['rogue_android', 'rogue_android'],
        },
        server_room: {
            name: 'SERVER ROOM — SUBLEVEL OMEGA',
            visited: false,
            items: ['stim', 'm24', 'ammo_762nato', 'bipod', 'suppressor_762'],
            desc: [
                'The heart of it. Thousands of servers, all running hot.',
                'This is where the Containment Virus was born.',
                'A terminal in the center displays a single word: ECLIPSE.',
                'And there — chained to the server rack — is UNIT-7.',
                'The android that started it all. Still alive. Still watching you.',
                'A sniper\'s kit is laid out on a table. Someone was waiting.',
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
        loot: ['ammo_9mm'],
        desc: 'A compact aerial unit. Red optics. Containment Virus signature detected.',
    },
    rogue_android: {
        name: 'ROGUE COMBAT ANDROID',
        hp: 65, maxHp: 65,
        dmg: [12, 22],
        accuracy: 0.65,
        cover: 'light',
        loot: ['medkit', 'ammo_556'],
        desc: 'Bipedal. Military chassis. The virus has stripped its inhibitors.',
    },
    unit7_guard: {
        name: 'UNIT-7 GUARDIAN ANDROID',
        hp: 90, maxHp: 90,
        dmg: [18, 30],
        accuracy: 0.72,
        cover: 'heavy',
        loot: ['stim', 'ammo_762nato', 'red_dot'],
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

// ── Weapon Database ───────────────────────────────────────────
// Each weapon has: name, class, caliber, dmg, ammo, maxAmmo, accuracy,
//   fireRate (shots per turn: 1=semi, 2=burst, 3=full-auto),
//   range (close/medium/long), reloadTime (turns), slots (attachment slots),
//   desc, lore
var WEAPONS = {
    // ── PISTOLS ──────────────────────────────────────────────
    m17: {
        name: 'SIG SAUER M17', class: 'pistol', caliber: '9mm',
        dmg: [10,20], ammo: 17, maxAmmo: 17, accuracy: 0.76, fireRate: 1,
        range: 'close', reloadTime: 1,
        slots: { optic: null, suppressor: null, grip: null },
        desc: 'Standard-issue military sidearm. Reliable, accurate, easy to conceal.',
        lore: 'Replaced the M9 as the US Army\'s service pistol. Still the detective\'s best friend.',
    },
    m9: {
        name: 'BERETTA M9A3', class: 'pistol', caliber: '9mm',
        dmg: [8,18], ammo: 15, maxAmmo: 15, accuracy: 0.75, fireRate: 1,
        range: 'close', reloadTime: 1,
        slots: { optic: null, suppressor: null, grip: null },
        desc: 'Classic 9mm semi-auto. Vex\'s personal sidearm. Worn but trusted.',
        lore: 'Carried since the Academy. The grip is cracked. He\'s never replaced it.',
    },
    deagle: {
        name: 'DESERT EAGLE .50 AE', class: 'pistol', caliber: '.50 AE',
        dmg: [28,45], ammo: 7, maxAmmo: 7, accuracy: 0.62, fireRate: 1,
        range: 'close', reloadTime: 1,
        slots: { optic: null, suppressor: null },
        desc: 'Massive stopping power. Kicks like a mule. Punches through light android plating.',
        lore: 'Pre-war surplus. The black market dealer had three. You took one.',
    },
    glock19: {
        name: 'GLOCK 19 GEN5', class: 'pistol', caliber: '9mm',
        dmg: [9,17], ammo: 15, maxAmmo: 15, accuracy: 0.78, fireRate: 1,
        range: 'close', reloadTime: 1,
        slots: { optic: null, suppressor: null, light: null },
        desc: 'Compact, lightweight, virtually indestructible. The most common pistol on Earth.',
        lore: 'Found on a dead rogue android. Ironic — they were using human weapons.',
    },
    // ── SHOTGUNS ─────────────────────────────────────────────
    m870: {
        name: 'REMINGTON 870 TACTICAL', class: 'shotgun', caliber: '12ga',
        dmg: [30,55], ammo: 6, maxAmmo: 6, accuracy: 0.65, fireRate: 1,
        range: 'close', reloadTime: 2,
        slots: { stock: null, light: null, choke: null },
        desc: 'Pump-action devastation. Devastating at close range. Useless at distance.',
        lore: 'The warehouse security team left one behind. Their loss.',
    },
    aa12: {
        name: 'AA-12 AUTO SHOTGUN', class: 'shotgun', caliber: '12ga',
        dmg: [22,40], ammo: 20, maxAmmo: 20, accuracy: 0.58, fireRate: 2,
        range: 'close', reloadTime: 2,
        slots: { stock: null, grip: null },
        desc: 'Full-auto shotgun. Drum magazine. Turns a room into a memory.',
        lore: 'Military surplus from the Containment War. Androids feared these.',
    },
    // ── ASSAULT RIFLES ────────────────────────────────────────
    m4a1: {
        name: 'COLT M4A1', class: 'rifle', caliber: '5.56mm',
        dmg: [16,26], ammo: 30, maxAmmo: 30, accuracy: 0.80, fireRate: 2,
        range: 'medium', reloadTime: 1,
        slots: { optic: null, suppressor: null, grip: null, stock: null, light: null },
        desc: 'The workhorse. Modular, reliable, effective against android chassis.',
        lore: 'Standard infantry rifle. Half the city is carrying one post-war.',
    },
    ak74: {
        name: 'AK-74M', class: 'rifle', caliber: '5.45mm',
        dmg: [18,30], ammo: 30, maxAmmo: 30, accuracy: 0.72, fireRate: 2,
        range: 'medium', reloadTime: 1,
        slots: { optic: null, grip: null, stock: null },
        desc: 'Heavier hitting than the M4. Less accurate. Never jams.',
        lore: 'Russian manufacture. Androids used these during the war. Spoils of victory.',
    },
    hk416: {
        name: 'HK416 A5', class: 'rifle', caliber: '5.56mm',
        dmg: [17,28], ammo: 30, maxAmmo: 30, accuracy: 0.83, fireRate: 2,
        range: 'medium', reloadTime: 1,
        slots: { optic: null, suppressor: null, grip: null, stock: null, light: null },
        desc: 'German engineering. Tighter tolerances. Marginally better accuracy than the M4.',
        lore: 'Special forces issue. Someone important left this behind.',
    },
    // ── BATTLE RIFLES ─────────────────────────────────────────
    scar_h: {
        name: 'FN SCAR-H', class: 'battle_rifle', caliber: '7.62mm NATO',
        dmg: [24,38], ammo: 20, maxAmmo: 20, accuracy: 0.77, fireRate: 1,
        range: 'medium', reloadTime: 1,
        slots: { optic: null, suppressor: null, grip: null, stock: null },
        desc: 'Hard-hitting 7.62mm. Punches through android armor plating.',
        lore: 'The round that ended the Containment War. One shot, one android.',
    },
    // ── SNIPER RIFLES ─────────────────────────────────────────
    m24: {
        name: 'REMINGTON M24 SWS', class: 'sniper', caliber: '7.62mm NATO',
        dmg: [45,75], ammo: 5, maxAmmo: 5, accuracy: 0.90, fireRate: 1,
        range: 'long', reloadTime: 2,
        slots: { optic: null, suppressor: null, bipod: null },
        desc: 'Bolt-action precision. One shot, one kill. Useless in close quarters.',
        lore: 'Found in the server room. Someone was planning a very different kind of meeting.',
    },
    barrett: {
        name: 'BARRETT M82A1', class: 'sniper', caliber: '.50 BMG',
        dmg: [70,110], ammo: 10, maxAmmo: 10, accuracy: 0.85, fireRate: 1,
        range: 'long', reloadTime: 3,
        slots: { optic: null, bipod: null },
        desc: 'Anti-materiel rifle. Destroys android chassis in one hit. Extremely heavy.',
        lore: 'The EMP didn\'t stop everything. Some androids needed a bigger answer.',
    },
    // ── SMGs ──────────────────────────────────────────────────
    mp5: {
        name: 'HK MP5SD', class: 'smg', caliber: '9mm',
        dmg: [8,15], ammo: 30, maxAmmo: 30, accuracy: 0.74, fireRate: 3,
        range: 'close', reloadTime: 1,
        slots: { optic: null, suppressor: null, grip: null, stock: null },
        desc: 'Integrated suppressor. Full-auto. Quiet and fast. Perfect for close work.',
        lore: 'The detective\'s second choice. When the M9 isn\'t enough.',
    },
    p90: {
        name: 'FN P90', class: 'smg', caliber: '5.7x28mm',
        dmg: [10,18], ammo: 50, maxAmmo: 50, accuracy: 0.71, fireRate: 3,
        range: 'close', reloadTime: 1,
        slots: { optic: null, suppressor: null },
        desc: 'High-capacity bullpup SMG. The 5.7mm round penetrates android plating.',
        lore: 'Designed to defeat body armor. Works on android chassis too.',
    },
    // ── LMGs ──────────────────────────────────────────────────
    m249: {
        name: 'M249 SAW', class: 'lmg', caliber: '5.56mm',
        dmg: [14,24], ammo: 100, maxAmmo: 100, accuracy: 0.62, fireRate: 3,
        range: 'medium', reloadTime: 3,
        slots: { optic: null, grip: null, bipod: null },
        desc: 'Squad automatic weapon. Suppresses entire areas. Heavy as hell.',
        lore: 'You found this in the warehouse. Someone was expecting a war.',
    },
};

// ── Attachment Database ───────────────────────────────────────
// slot: which slot it occupies
// accMod: accuracy modifier (+/-)
// dmgMod: flat damage modifier per shot
// dmgMult: damage multiplier
// ammoMod: ammo capacity modifier
// noiseMod: suppression (reduces enemy alert chance)
// desc, lore
var ATTACHMENTS = {
    // ── OPTICS ───────────────────────────────────────────────
    red_dot: {
        name: 'EOTech Red Dot', slot: 'optic',
        accMod: +0.06, dmgMod: 0, desc: 'Fast target acquisition. +6% accuracy.',
        lore: 'Standard close-quarters optic.',
    },
    acog: {
        name: 'Trijicon ACOG 4x', slot: 'optic',
        accMod: +0.10, dmgMod: 0, desc: 'Fixed 4x magnification. +10% accuracy. Penalty in close range.',
        lore: 'The gold standard for medium-range engagements.',
    },
    lpvo: {
        name: 'Vortex Strike Eagle 1-6x', slot: 'optic',
        accMod: +0.08, dmgMod: 0, desc: 'Variable 1-6x. Best of both worlds. +8% accuracy.',
        lore: 'Expensive. Worth it.',
    },
    thermal: {
        name: 'FLIR Thermal Scope', slot: 'optic',
        accMod: +0.15, dmgMod: 0, desc: 'Thermal imaging. Enemies in cover lose 50% cover bonus. +15% accuracy.',
        coverPierce: 0.5,
        lore: 'Androids run hot. This makes them glow.',
    },
    // ── SUPPRESSORS ──────────────────────────────────────────
    suppressor_9mm: {
        name: 'SilencerCo Omega 9K', slot: 'suppressor',
        accMod: +0.02, dmgMod: -2, noiseMod: true,
        desc: '9mm suppressor. -2 dmg, +2% accuracy, silent fire.',
        lore: 'Subsonic rounds. The only sound is the bolt cycling.',
    },
    suppressor_556: {
        name: 'SilencerCo Omega 36M', slot: 'suppressor',
        accMod: +0.03, dmgMod: -3, noiseMod: true,
        desc: '5.56mm suppressor. -3 dmg, +3% accuracy, silent fire.',
        lore: 'Still supersonic. Still loud. Just less loud.',
    },
    suppressor_762: {
        name: 'Dead Air Sandman-S', slot: 'suppressor',
        accMod: +0.02, dmgMod: -4, noiseMod: true,
        desc: '7.62mm suppressor. -4 dmg, +2% accuracy, silent fire.',
        lore: 'Heavy. But the androids won\'t hear you coming.',
    },
    // ── GRIPS ────────────────────────────────────────────────
    angled_grip: {
        name: 'Magpul AFG Angled Grip', slot: 'grip',
        accMod: +0.04, dmgMod: 0, desc: 'Reduces muzzle climb. +4% accuracy.',
        lore: 'Standard upgrade. Every operator runs one.',
    },
    vertical_grip: {
        name: 'BCM Vertical Grip', slot: 'grip',
        accMod: +0.03, dmgMod: 0, desc: 'Better control on full-auto. +3% accuracy.',
        lore: 'Old school. Still works.',
    },
    // ── STOCKS ───────────────────────────────────────────────
    folding_stock: {
        name: 'Magpul CTR Stock', slot: 'stock',
        accMod: +0.05, dmgMod: 0, desc: 'Adjustable cheek weld. +5% accuracy.',
        lore: 'Fits any shooter. Mil-spec.',
    },
    // ── LIGHTS ───────────────────────────────────────────────
    weapon_light: {
        name: 'SureFire X300U', slot: 'light',
        accMod: +0.03, dmgMod: 0, desc: '1000 lumen weapon light. +3% accuracy in dark areas.',
        lore: 'The warehouse is dark. This helps.',
    },
    // ── MAGAZINES ────────────────────────────────────────────
    extended_mag: {
        name: 'Extended Magazine', slot: 'magazine',
        accMod: 0, ammoMod: +10, desc: '+10 rounds capacity.',
        lore: 'More rounds. Heavier. Worth it.',
    },
    drum_mag: {
        name: 'Beta C-Mag Drum', slot: 'magazine',
        accMod: -0.05, ammoMod: +30, desc: '+30 rounds, -5% accuracy.',
        lore: 'Bulky. Unreliable. But 60 rounds before a reload.',
    },
    // ── BIPODS ───────────────────────────────────────────────
    bipod: {
        name: 'Harris Bipod', slot: 'bipod',
        accMod: +0.12, dmgMod: 0, desc: 'Deploy for +12% accuracy. Must be in heavy cover.',
        lore: 'Sniper\'s best friend.',
    },
    // ── CHOKES ───────────────────────────────────────────────
    choke_tight: {
        name: 'Carlson\'s Tight Choke', slot: 'choke',
        accMod: +0.08, dmgMod: +3, desc: 'Tighter shot pattern. +8% accuracy, +3 dmg.',
        lore: 'Turns a shotgun into a precision instrument. Almost.',
    },
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
    var w = WEAPONS[p.weapon];
    document.getElementById('hud-weapon').textContent = w ? w.name : p.weapon;
    document.getElementById('hud-ammo').textContent = p.ammo + '/' + (p.maxAmmo || (w ? w.maxAmmo : '?'));
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
    if (WEAPONS[id])     return WEAPONS[id].name;
    if (ATTACHMENTS[id]) return ATTACHMENTS[id].name;
    var names = {
        medkit: 'Medkit', stim: 'Stim Pack',
        kevlar: 'Kevlar Vest', tactical: 'Tactical Vest', exo: 'Exo-Frame',
        ammo_9mm: '9mm Ammo (x15)', ammo_556: '5.56mm Ammo (x30)',
        ammo_545: '5.45mm Ammo (x30)', ammo_762nato: '7.62mm NATO Ammo (x20)',
        ammo_50ae: '.50 AE Ammo (x7)', ammo_50bmg: '.50 BMG Ammo (x5)',
        ammo_12ga: '12ga Shells (x6)', ammo_57: '5.7x28mm Ammo (x50)',
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
    if (idx === -1) { print('<span class="t-red">No "' + name + '" here.</span>'); return; }
    loc.items.splice(idx, 1);
    var p = G.player;

    // Weapon pickup
    if (WEAPONS[name]) {
        if (p.ownedWeapons[name]) {
            print('<span class="t-amber">You already have a ' + WEAPONS[name].name + '.</span>');
            loc.items.splice(idx, 0, name); // put back
            return;
        }
        var w = WEAPONS[name];
        p.ownedWeapons[name] = { attachments: {} };
        Object.keys(w.slots || {}).forEach(function (s) { p.ownedWeapons[name].attachments[s] = null; });
        print('<span class="t-green">Picked up ' + w.name + '. [' + w.caliber + '] ' + w.desc + '</span>');
        print('<span class="t-dim t-indent">Type EQUIP ' + name + ' to switch to it.</span>');
        return;
    }

    // Attachment pickup
    if (ATTACHMENTS[name]) {
        p.inventory.attachments[name] = (p.inventory.attachments[name] || 0) + 1;
        print('<span class="t-green">Picked up ' + ATTACHMENTS[name].name + '. ' + ATTACHMENTS[name].desc + '</span>');
        print('<span class="t-dim t-indent">Type ATTACH ' + name + ' [weapon] to install it.</span>');
        return;
    }

    // Ammo
    var ammoQty = { ammo_9mm:15, ammo_556:30, ammo_545:30, ammo_762nato:20, ammo_50ae:7, ammo_50bmg:5, ammo_12ga:6, ammo_57:50 };
    if (ammoQty[name] !== undefined) {
        p.inventory[name] = (p.inventory[name] || 0) + ammoQty[name];
        print('<span class="t-green">Picked up ' + itemName(name) + '. Total: ' + p.inventory[name] + '</span>');
        return;
    }

    // Consumables / armor
    if (name === 'medkit')   { p.inventory.medkit++;   print('<span class="t-green">Picked up Medkit.</span>'); }
    else if (name === 'stim')     { p.inventory.stim++;     print('<span class="t-green">Picked up Stim Pack.</span>'); }
    else if (name === 'kevlar')   { p.inventory.kevlar++;   print('<span class="t-green">Picked up Kevlar Vest.</span>'); }
    else if (name === 'tactical') { p.inventory.tactical++; print('<span class="t-green">Picked up Tactical Vest.</span>'); }
    else if (name === 'exo')      { p.inventory.exo++;      print('<span class="t-green">Picked up Exo-Frame.</span>'); }
    else { print('<span class="t-dim">Picked up ' + name + '.</span>'); }

    updateHUD();
}

// ── Equip ─────────────────────────────────────────────────────
function equipItem(name) {
    var p = G.player;
    // Armor
    if (name === 'kevlar' || name === 'tactical' || name === 'exo') {
        if (!p.inventory[name]) { print('<span class="t-red">You don\'t have a ' + itemName(name) + '.</span>'); return; }
        p.armor = name;
        print('<span class="t-green">Equipped ' + ARMOR[name].name + '. ' + ARMOR[name].desc + '</span>');
        updateHUD(); return;
    }
    // Weapon
    if (WEAPONS[name]) {
        if (!p.ownedWeapons[name]) { print('<span class="t-red">You don\'t have a ' + WEAPONS[name].name + '. Find one first.</span>'); return; }
        p.weapon = name;
        var w = WEAPONS[name];
        var owned = p.ownedWeapons[name];
        // Compute effective ammo with extended mag
        var ammoBonus = 0;
        if (owned.attachments && owned.attachments.magazine) {
            var att = ATTACHMENTS[owned.attachments.magazine];
            if (att && att.ammoMod) ammoBonus = att.ammoMod;
        }
        p.maxAmmo = w.maxAmmo + ammoBonus;
        p.ammo = Math.min(p.ammo, p.maxAmmo);
        print('<span class="t-green">Equipped ' + w.name + ' [' + w.caliber + '] — ' + w.desc + '</span>');
        printWeaponStats(name);
        updateHUD(); return;
    }
    print('<span class="t-red">Can\'t equip "' + name + '". Use ATTACH for attachments.</span>');
}

// ── Weapon stats display ──────────────────────────────────────
function getEffectiveStats(weaponKey) {
    var w = WEAPONS[weaponKey];
    if (!w) return null;
    var p = G.player;
    var owned = p.ownedWeapons[weaponKey] || { attachments: {} };
    var acc = w.accuracy;
    var dmgBonus = 0;
    var ammoBonus = 0;
    var coverPierce = 0;
    var suppressed = false;

    Object.keys(owned.attachments || {}).forEach(function (slot) {
        var attKey = owned.attachments[slot];
        if (!attKey) return;
        var att = ATTACHMENTS[attKey];
        if (!att) return;
        acc += (att.accMod || 0);
        dmgBonus += (att.dmgMod || 0);
        ammoBonus += (att.ammoMod || 0);
        if (att.coverPierce) coverPierce = att.coverPierce;
        if (att.noiseMod) suppressed = true;
    });

    return {
        name: w.name, class: w.class, caliber: w.caliber,
        dmg: [w.dmg[0] + dmgBonus, w.dmg[1] + dmgBonus],
        accuracy: Math.min(0.97, Math.max(0.10, acc)),
        fireRate: w.fireRate,
        maxAmmo: w.maxAmmo + ammoBonus,
        range: w.range,
        suppressed: suppressed,
        coverPierce: coverPierce,
        attachments: owned.attachments,
    };
}

function printWeaponStats(weaponKey) {
    var s = getEffectiveStats(weaponKey);
    if (!s) return;
    var w = WEAPONS[weaponKey];
    var owned = G.player.ownedWeapons[weaponKey] || { attachments: {} };
    hr();
    print('<span class="t-title t-green">' + s.name.toUpperCase() + '</span>');
    print('<span class="t-dim">' + w.lore + '</span>');
    gap();
    print('<span class="t-white">Class:     ' + s.class.toUpperCase() + '</span>');
    print('<span class="t-white">Caliber:   ' + s.caliber + '</span>');
    print('<span class="t-white">Damage:    ' + s.dmg[0] + '–' + s.dmg[1] + '</span>');
    print('<span class="t-white">Accuracy:  ' + Math.round(s.accuracy * 100) + '%</span>');
    print('<span class="t-white">Fire Rate: ' + ['', 'Semi-Auto', 'Burst', 'Full-Auto'][s.fireRate] + '</span>');
    print('<span class="t-white">Range:     ' + s.range.toUpperCase() + '</span>');
    print('<span class="t-white">Capacity:  ' + s.maxAmmo + ' rounds</span>');
    if (s.suppressed) print('<span class="t-green">Suppressed: YES</span>');
    gap();
    print('<span class="t-amber">ATTACHMENTS:</span>');
    var slots = Object.keys(w.slots || {});
    if (!slots.length) { print('<span class="t-dim t-indent">No attachment slots.</span>'); }
    else {
        slots.forEach(function (slot) {
            var installed = owned.attachments[slot];
            var attName = installed ? ATTACHMENTS[installed].name : '— empty —';
            var color = installed ? 'var(--green)' : 'var(--dim)';
            print('<span class="t-indent" style="color:' + color + '">[' + slot.toUpperCase() + '] ' + attName + '</span>');
        });
    }
    gap();
}

// ── Reload ────────────────────────────────────────────────────
function reload() {
    var p = G.player;
    var w = WEAPONS[p.weapon];
    if (!w) { print('<span class="t-red">No weapon equipped.</span>'); return; }

    var caliber = w.caliber;
    var ammoKey = {
        '9mm': 'ammo_9mm', '5.56mm': 'ammo_556', '5.45mm': 'ammo_545',
        '7.62mm NATO': 'ammo_762nato', '.50 AE': 'ammo_50ae',
        '.50 BMG': 'ammo_50bmg', '12ga': 'ammo_12ga', '5.7x28mm': 'ammo_57'
    }[caliber];

    if (!ammoKey) { print('<span class="t-red">Unknown caliber: ' + caliber + '</span>'); return; }
    if (!p.inventory[ammoKey]) { print('<span class="t-red">No ' + caliber + ' ammo. Find some.</span>'); return; }

    var stats = getEffectiveStats(p.weapon);
    var maxAmmo = stats ? stats.maxAmmo : w.maxAmmo;
    var need = maxAmmo - p.ammo;
    if (need <= 0) { print('<span class="t-amber">Magazine already full.</span>'); return; }

    var take = Math.min(need, p.inventory[ammoKey]);
    p.ammo += take;
    p.inventory[ammoKey] -= take;
    p.maxAmmo = maxAmmo;

    print('<span class="t-green">Reloaded ' + w.name + '. ' + p.ammo + '/' + maxAmmo + ' [' + caliber + '] — ' + (p.inventory[ammoKey] || 0) + ' rounds remaining.</span>');
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

function attachItem(attKey, weaponKey) {
    var p = G.player;
    weaponKey = weaponKey || p.weapon;

    if (!ATTACHMENTS[attKey]) { print('<span class="t-red">Unknown attachment: "' + attKey + '".</span>'); return; }
    if (!WEAPONS[weaponKey])  { print('<span class="t-red">Unknown weapon: "' + weaponKey + '".</span>'); return; }
    if (!p.ownedWeapons[weaponKey]) { print('<span class="t-red">You don\'t own a ' + WEAPONS[weaponKey].name + '.</span>'); return; }

    var att  = ATTACHMENTS[attKey];
    var w    = WEAPONS[weaponKey];
    var slot = att.slot;

    if (!w.slots || !(slot in w.slots)) {
        print('<span class="t-red">' + w.name + ' has no ' + slot + ' slot.</span>');
        return;
    }
    if (!p.inventory.attachments[attKey]) {
        print('<span class="t-red">You don\'t have a ' + att.name + ' in your inventory.</span>');
        return;
    }

    // Swap out old attachment back to inventory
    var current = p.ownedWeapons[weaponKey].attachments[slot];
    if (current) {
        p.inventory.attachments[current] = (p.inventory.attachments[current] || 0) + 1;
        print('<span class="t-amber">Removed ' + ATTACHMENTS[current].name + ' → inventory.</span>');
    }

    p.ownedWeapons[weaponKey].attachments[slot] = attKey;
    p.inventory.attachments[attKey]--;
    if (p.inventory.attachments[attKey] <= 0) delete p.inventory.attachments[attKey];

    print('<span class="t-green">Installed ' + att.name + ' on ' + w.name + '. ' + att.desc + '</span>');

    // Refresh ammo capacity if current weapon
    if (p.weapon === weaponKey) {
        var stats = getEffectiveStats(weaponKey);
        p.maxAmmo = stats.maxAmmo;
    }
    updateHUD();
}

function detachItem(slot, weaponKey) {
    var p = G.player;
    weaponKey = weaponKey || p.weapon;
    if (!p.ownedWeapons[weaponKey]) { print('<span class="t-red">You don\'t own that weapon.</span>'); return; }
    var current = p.ownedWeapons[weaponKey].attachments[slot];
    if (!current) { print('<span class="t-amber">No attachment in ' + slot + ' slot.</span>'); return; }
    p.inventory.attachments[current] = (p.inventory.attachments[current] || 0) + 1;
    p.ownedWeapons[weaponKey].attachments[slot] = null;
    print('<span class="t-green">Removed ' + ATTACHMENTS[current].name + ' → inventory.</span>');
    updateHUD();
}

function inspectWeapon(weaponKey) {
    weaponKey = weaponKey || G.player.weapon;
    if (!WEAPONS[weaponKey]) { print('<span class="t-red">Unknown weapon: "' + weaponKey + '".</span>'); return; }
    if (!G.player.ownedWeapons[weaponKey]) { print('<span class="t-red">You don\'t own a ' + WEAPONS[weaponKey].name + '.</span>'); return; }
    printWeaponStats(weaponKey);
}

function listWeapons() {
    var p = G.player;
    hr();
    print('<span class="t-title t-green">OWNED WEAPONS</span>');
    gap();
    Object.keys(p.ownedWeapons).forEach(function (key) {
        var w = WEAPONS[key];
        var isCurrent = key === p.weapon;
        var marker = isCurrent ? '<span class="t-amber">[EQUIPPED]</span> ' : '';
        print('<span class="t-white">' + marker + w.name + ' [' + w.caliber + '] — ' + w.class.toUpperCase() + '</span>');
        var owned = p.ownedWeapons[key];
        var attList = Object.keys(owned.attachments || {}).filter(function (s) { return owned.attachments[s]; });
        if (attList.length) {
            print('<span class="t-dim t-indent">Attachments: ' + attList.map(function (s) { return ATTACHMENTS[owned.attachments[s]].name; }).join(', ') + '</span>');
        }
        print('<span class="t-dim t-indent">Type INSPECT ' + key + ' for full stats.</span>');
    });
    gap();
    print('<span class="t-amber">ATTACHMENTS IN INVENTORY:</span>');
    var attInv = p.inventory.attachments || {};
    var hasAtt = false;
    Object.keys(attInv).forEach(function (k) {
        if (attInv[k] > 0) {
            hasAtt = true;
            print('<span class="t-white t-indent">' + ATTACHMENTS[k].name + ' x' + attInv[k] + ' — [' + ATTACHMENTS[k].slot + '] ' + ATTACHMENTS[k].desc + '</span>');
        }
    });
    if (!hasAtt) print('<span class="t-dim t-indent">None.</span>');
    gap();
}
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

    var stats = getEffectiveStats(p.weapon) || { accuracy: 0.75, dmg: [8,18], fireRate: 1, coverPierce: 0 };
    var baseAcc = stats.accuracy;

    // Cover penalty on target — thermal scope pierces cover
    var coverDR = COVER_STATS[target.cover] ? COVER_STATS[target.cover].hitMod : 0;
    if (stats.coverPierce) coverDR = coverDR * (1 - stats.coverPierce);
    var playerBonus = p.cover !== 'none' ? -0.05 : 0;
    var finalAcc = Math.max(0.15, baseAcc + coverDR + playerBonus);

    // Fire rate: extra shots for burst/full-auto (each with reduced accuracy)
    var shots = stats.fireRate || 1;
    var totalDmg = 0;
    var hits = 0;

    for (var s = 0; s < shots; s++) {
        var shotAcc = s === 0 ? finalAcc : finalAcc * 0.75; // recoil penalty on follow-up shots
        if (p.ammo < 0) break;
        if (s > 0) p.ammo--;
        if (roll(shotAcc)) {
            var dmg = rng(stats.dmg[0], stats.dmg[1]);
            totalDmg += dmg;
            hits++;
        }
    }

    if (hits > 0) {
        target.hp -= totalDmg;
        var shotStr = shots > 1 ? hits + '/' + shots + ' rounds hit' : 'HIT';
        if (target.hp <= 0) {
            target.hp = 0;
            target.alive = false;
            flashScreen('heal');
            print('<span class="t-green">💥 ' + shotStr + '! ' + target.name + ' takes ' + totalDmg + ' damage. ELIMINATED.</span>');
            G.player.kills++;
            if (target.loot && target.loot.length) {
                target.loot.forEach(function (item) {
                    G.world[G.location].items = G.world[G.location].items || [];
                    G.world[G.location].items.push(item);
                });
                print('<span class="t-amber">Dropped: ' + target.loot.map(itemName).join(', ') + '</span>');
            }
        } else {
            flashScreen('heal');
            print('<span class="t-green">💥 ' + shotStr + '! ' + target.name + ' takes ' + totalDmg + ' damage. (' + target.hp + '/' + target.maxHp + ')</span>');
        }
    } else {
        var missStr = shots > 1 ? 'All ' + shots + ' rounds missed.' : 'MISS.';
        print('<span class="t-amber">' + missStr + ' (' + p.ammo + ' ammo remaining)</span>');
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

        // ── Attach / Detach ──
        case 'attach': case 'install': case 'mod':
            if (!arg1) { print('<span class="t-red">Usage: ATTACH [attachment] [weapon]</span>'); break; }
            attachItem(arg1, arg2 || null); break;

        case 'detach': case 'remove':
            if (!arg1) { print('<span class="t-red">Usage: DETACH [slot] [weapon]</span>'); break; }
            detachItem(arg1, arg2 || null); break;

        // ── Inspect / Weapons list ──
        case 'inspect': case 'examine':
            if (arg1 && WEAPONS[arg1]) { inspectWeapon(arg1); break; }
            if (arg1) { print('<span class="t-white">You examine the ' + itemName(arg1) + '.</span>'); break; }
            describeLocation(); break;

        case 'weapons': case 'arsenal': case 'loadout':
            listWeapons(); break;

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
    print('<span class="t-dim t-indent">EQUIP [weapon/armor] — switch weapon or wear armor</span>');
    print('<span class="t-dim t-indent">WEAPONS — list all owned weapons</span>');
    print('<span class="t-dim t-indent">INSPECT [weapon] — full weapon stats + attachments</span>');
    print('<span class="t-dim t-indent">ATTACH [attachment] [weapon] — install attachment</span>');
    print('<span class="t-dim t-indent">DETACH [slot] [weapon] — remove attachment</span>');
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
    G.player.weapon = 'm9'; G.player.ammo = 17; G.player.maxAmmo = 17;
    G.player.grenades = 2; G.player.kills = 0;
    G.player.notes = [];
    G.player.inventory = {
        medkit:2, stim:1, kevlar:0, tactical:0, exo:0,
        ammo_9mm:34, ammo_556:0, ammo_545:0, ammo_762nato:0,
        ammo_50ae:0, ammo_50bmg:0, ammo_12ga:0, ammo_57:0,
        attachments: {}
    };
    G.player.ownedWeapons = { m9: { attachments: { optic:null, suppressor:null, grip:null } } };

    // Reset world
    Object.keys(G.world).forEach(function (k) {
        G.world[k].visited = false;
        G.world[k].enemies = (ENEMY_TEMPLATES[k] ? [] : G.world[k].enemies) || [];
    });
    G.world.precinct.items    = ['kevlar', 'medkit', 'ammo_9mm'];
    G.world.evidence_room.items = ['m4a1', 'ammo_556', 'stim', 'red_dot'];
    G.world.street.items      = ['medkit', 'ammo_9mm'];
    G.world.black_market.items = ['tactical', 'ammo_12ga', 'stim', 'medkit', 'm870', 'suppressor_9mm', 'angled_grip', 'deagle', 'ammo_50ae'];
    G.world.warehouse_exterior.items = ['ammo_556', 'ammo_9mm'];
    G.world.warehouse_interior.items = ['exo', 'ammo_762nato', 'medkit', 'scar_h', 'acog', 'thermal'];
    G.world.server_room.items = ['stim', 'm24', 'ammo_762nato', 'bipod', 'suppressor_762'];
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
