(function() {
  'use strict';

  // ==================== CONFIG ====================
  var PX = 3;
  var GRID = 200;
  var FRAME_INTERVAL = 1000 / 30;

  // Isometric projection: u = left-wall axis, v = right-wall axis, h = height
  // u increases toward front-left, v toward front-right, h upward
  function isoX(u, v) { return 300 + (v - u) * 1.3; }
  function isoY(u, v, h) { return 140 + (u + v) * 0.72 - (h || 0); }
  function iso(u, v, h) { return { x: isoX(u, v), y: isoY(u, v, h) }; }

  var ROOM_W = 200, ROOM_D = 200, ROOM_H = 155;

  var COLORS = {
    wallLeft:      '#1C2C38',
    wallLeftLight: '#223444',
    wallRight:     '#202E3C',
    wallRightLight:'#263848',
    wallTrim:      '#2A3E50',
    floorDark:     '#151D18',
    floor:         '#1C2820',
    floorLight:    '#243028',
    rugMain:       '#2A3C2E',
    rugBorder:     '#223424',
    rugPattern:    '#304836',
    furnDark:      '#1A2828',
    furnMid:       '#2A3E3E',
    furnLight:     '#3A5555',
    furnTop:       '#3E5E5E',
    accentCyan:    '#40C8B0',
    accentWarm:    '#C89050',
    candleFlame:   '#E8A030',
    candleGlow:    '#FFD060',
    candleWax:     '#C87830',
    rain:          '#4080A0',
    fishOrange:    '#C87840',
    fishTeal:      '#40A088',
    catFur:        '#8C7050',
    catStripe:     '#6B5540',
    clockFace:     '#2A4444',
    clockRim:      '#3A5858',
    clockDial:     '#D0D8D0',
    fanBlade:      '#2A3E3E',
    fanHub:        '#3A5858',
    plantLeaf:     '#2D6040',
    plantDark:     '#1E4028',
    plantPot:      '#6B5540',
    plantPotDark:  '#5A4A38',
    skinTone:      '#C8A878',
    hair:          '#2A3038',
    hairHighlight: '#384048',
    headphone:     '#222830',
    headphoneAccent:'#40C8B0',
    shirt:         '#305848',
    shirtDark:     '#284838',
    paper:         '#C8D0C8',
    paperLines:    '#A0A8A0',
    cityLight:     '#D0A060',
    citySky:       '#182838',
    cityBuilding:  '#141E28',
    bubble:        '#50B8A8',
    volBarBg:      '#1A2828',
    volBarFill:    '#40C8B0',
    textColor:     '#D0D8D0',
    vinylBody:     '#2A3838',
    vinylDisc:     '#1A2020',
    vinylGroove:   '#283030',
    vinylLabel:    '#C89050',
    cushion:       '#3A2838',
    cushionLight:  '#483848',
    menuBg:        '#121820',
    menuBorder:    '#2A4040',
    menuHighlight: '#1E3030',
    shadow:        '#0A1010',
  };

  // ==================== ELEMENT DEFINITIONS ====================
  // bounds in grid coordinates (screen / PX) for UI overlays
  var ELEMENTS = [
    { id: 'fan',      label: 'Fan',      bounds: {x:78,y:4,w:44,h:22},   audioId: 'audio-fan',      menuY: 32 },
    { id: 'window',   label: 'Window',   bounds: {x:38,y:12,w:42,h:52},  audioId: 'audio-rain',     menuY: 72 },
    { id: 'clock',    label: 'Clock',    bounds: {x:120,y:26,w:18,h:22}, audioId: 'audio-tick',      menuY: 56 },
    { id: 'vinyl',    label: 'Vinyl',    bounds: {x:24,y:72,w:26,h:18},  audioId: 'audio-lofi',     menuY: 98 },
    { id: 'person',   label: 'Girl',     bounds: {x:90,y:72,w:22,h:24},  audioId: null,             menuY: 104 },
    { id: 'fishtank', label: 'Fish',     bounds: {x:148,y:72,w:26,h:26}, audioId: 'audio-water',    menuY: 106 },
    { id: 'candle',   label: 'Candle',   bounds: {x:88,y:36,w:18,h:20},  audioId: 'audio-candle',   menuY: 64 },
    { id: 'plant',    label: 'Plant',    bounds: {x:91,y:116,w:14,h:21}, audioId: 'audio-crickets', menuY: 140 },
    { id: 'cat',      label: 'Cat',      bounds: {x:34,y:90,w:22,h:16},  audioId: 'audio-purr',     menuY: 114 },
  ];

  var NAV_MAP = {
    fan:      { up:null,     down:'person',   left:'candle',  right:'clock' },
    window:   { up:null,     down:'vinyl',    left:null,      right:'candle' },
    clock:    { up:null,     down:'fishtank', left:'fan',     right:null },
    candle:   { up:null,     down:'vinyl',    left:'window',  right:'fan' },
    vinyl:    { up:'candle', down:'cat',      left:null,      right:'person' },
    person:   { up:'fan',    down:'cat',      left:'vinyl',   right:'fishtank' },
    fishtank: { up:'clock',  down:'plant',    left:'person',  right:null },
    plant:    { up:'fishtank',down:null,      left:'cat',     right:null },
    cat:      { up:'vinyl',  down:null,       left:null,      right:'plant' },
  };

  // ==================== STATE ====================
  var state = {
    focused: 'person',
    elements: {},
    focusPulse: 0,
    time: 0,
    lastInputTime: Date.now(),
  };

  ELEMENTS.forEach(function(el) {
    state.elements[el.id] = {
      state: 'off',
      volume: 50,
      menuIndex: 0,
      animFrame: 0,
      animTimer: 0,
      pageFlipTimer: 0,
      nextPageFlip: 8000 + Math.random() * 7000,
      textLines: 0,
      blindsOpen: 0,
      rainDrops: [],
      lightningTimer: 0,
      nextLightning: 15000 + Math.random() * 15000,
      lightningFlash: 0,
      cityLights: [],
      fish: [
        { x: 0.3, y: 0.4, vx: 0.4, dir: 1, phase: 0 },
        { x: 0.6, y: 0.6, vx: 0.3, dir: -1, phase: Math.PI },
      ],
      bubbles: [],
      clockAngle: 0,
      catBreathPhase: 0,
      catTailTimer: 0,
      catTailFlick: false,
      fanAngle: 0,
      plantSwayPhase: 0,
      cricketTimer: 0,
      cricketHop: false,
      vinylAngle: 0,
      soundWavePhase: 0,
    };
  });

  // ==================== CANVAS REFS ====================
  var canvas, ctx, bgCanvas, bgCtx;

  // ==================== PIXEL FONT ====================
  var FONT = {
    '0': [7,5,5,5,7], '1': [2,6,2,2,7], '2': [7,1,7,4,7], '3': [7,1,7,1,7],
    '4': [5,5,7,1,1], '5': [7,4,7,1,7], '6': [7,4,7,5,7], '7': [7,1,1,1,1],
    '8': [7,5,7,5,7], '9': [7,5,7,1,7],
    'V': [5,5,5,5,2], 'O': [7,5,5,5,7], 'L': [4,4,4,4,7],
    'S': [7,4,7,1,7], 'T': [7,2,2,2,2], 'P': [7,5,7,4,4],
    '%': [5,1,2,4,5], ' ': [0,0,0,0,0],
    '>': [4,2,1,2,4],
  };

  // ==================== DRAWING HELPERS ====================
  // Grid-based (PX-scaled) for UI overlays
  function drawPixel(gx, gy, color) {
    ctx.fillStyle = color;
    ctx.fillRect(gx * PX, gy * PX, PX, PX);
  }

  function drawRect(gx, gy, gw, gh, color) {
    ctx.fillStyle = color;
    ctx.fillRect(gx * PX, gy * PX, gw * PX, gh * PX);
  }

  function drawRectAlpha(gx, gy, gw, gh, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(gx * PX, gy * PX, gw * PX, gh * PX);
    ctx.globalAlpha = 1;
  }

  function drawText(text, gx, gy, color) {
    for (var i = 0; i < text.length; i++) {
      var ch = FONT[text[i]];
      if (!ch) continue;
      for (var row = 0; row < 5; row++) {
        for (var col = 0; col < 3; col++) {
          if (ch[row] & (4 >> col)) {
            drawPixel(gx + i * 4 + col, gy + row, color);
          }
        }
      }
    }
  }

  // Screen-coordinate helpers for isometric drawing
  function fillPoly(context, points, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      context.lineTo(points[i].x, points[i].y);
    }
    context.closePath();
    context.fill();
  }

  function strokePoly(context, points, color, width) {
    context.strokeStyle = color;
    context.lineWidth = width || 1;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      context.lineTo(points[i].x, points[i].y);
    }
    context.closePath();
    context.stroke();
  }

  function drawIsoBox(context, u, v, h, w, d, ht, topCol, leftCol, rightCol) {
    // Left face (facing front-left, at u+w edge)
    fillPoly(context, [
      iso(u+w, v, h), iso(u+w, v+d, h),
      iso(u+w, v+d, h+ht), iso(u+w, v, h+ht)
    ], leftCol);
    // Right face (facing front-right, at v+d edge)
    fillPoly(context, [
      iso(u, v+d, h), iso(u+w, v+d, h),
      iso(u+w, v+d, h+ht), iso(u, v+d, h+ht)
    ], rightCol);
    // Top face
    fillPoly(context, [
      iso(u, v, h+ht), iso(u+w, v, h+ht),
      iso(u+w, v+d, h+ht), iso(u, v+d, h+ht)
    ], topCol);
  }

  // ==================== AUDIO MANAGER (Web Audio API) ====================
  var AudioManager = {
    ctx: null,
    buffers: {},
    sources: {},
    gains: {},
    pageflipaudio: null,
    audioFiles: {
      fan: 'audio/fan.ogg',
      window: 'audio/rain.ogg',
      clock: 'audio/tick.ogg',
      vinyl: 'audio/lofi.ogg',
      fishtank: 'audio/water.ogg',
      candle: 'audio/candle.ogg',
      plant: 'audio/crickets.ogg',
      cat: 'audio/purr.ogg'
    },

    init: function() {
      AudioManager.pageflipaudio = document.getElementById('audio-pageflip');
      AudioManager.ctx = new (window.AudioContext || window.webkitAudioContext)();
      Object.keys(AudioManager.audioFiles).forEach(function(id) {
        fetch(AudioManager.audioFiles[id])
          .then(function(r) { return r.arrayBuffer(); })
          .then(function(buf) { return AudioManager.ctx.decodeAudioData(buf); })
          .then(function(decoded) { AudioManager.buffers[id] = decoded; })
          .catch(function() {});
      });
    },

    play: function(elementId) {
      if (!AudioManager.buffers[elementId] || !AudioManager.ctx) return;
      AudioManager.stop(elementId);
      var source = AudioManager.ctx.createBufferSource();
      source.buffer = AudioManager.buffers[elementId];
      source.loop = true;
      var gain = AudioManager.ctx.createGain();
      gain.gain.value = state.elements[elementId].volume / 100;
      source.connect(gain);
      gain.connect(AudioManager.ctx.destination);
      source.start(0);
      AudioManager.sources[elementId] = source;
      AudioManager.gains[elementId] = gain;
    },

    stop: function(elementId) {
      if (AudioManager.sources[elementId]) {
        try { AudioManager.sources[elementId].stop(); } catch(e) {}
        AudioManager.sources[elementId] = null;
        AudioManager.gains[elementId] = null;
      }
    },

    setVolume: function(elementId, vol) {
      if (AudioManager.gains[elementId]) {
        AudioManager.gains[elementId].gain.value = vol / 100;
      }
    },

    playOneShot: function(soundId, volumeRef) {
      var audio = AudioManager.pageflipaudio;
      if (audio) {
        audio.volume = (volumeRef || 50) / 100;
        audio.currentTime = 0;
        audio.play().catch(function() {});
      }
    },
  };

  // ==================== STATIC BACKGROUND ====================
  function renderStaticBackground() {
    bgCtx.clearRect(0, 0, 600, 600);

    var floorBack  = iso(0, 0, 0);
    var floorLeft  = iso(ROOM_W, 0, 0);
    var floorFront = iso(ROOM_W, ROOM_D, 0);
    var floorRight = iso(0, ROOM_D, 0);

    var ceilBack  = iso(0, 0, ROOM_H);
    var ceilLeft  = iso(ROOM_W, 0, ROOM_H);
    var ceilRight = iso(0, ROOM_D, ROOM_H);

    // === LEFT WALL ===
    var leftWallGrad = bgCtx.createLinearGradient(ceilBack.x, ceilBack.y, floorLeft.x, floorLeft.y);
    leftWallGrad.addColorStop(0, COLORS.wallLeft);
    leftWallGrad.addColorStop(0.5, COLORS.wallLeftLight);
    leftWallGrad.addColorStop(1, COLORS.wallLeft);
    bgCtx.fillStyle = leftWallGrad;
    bgCtx.beginPath();
    bgCtx.moveTo(floorBack.x, floorBack.y);
    bgCtx.lineTo(floorLeft.x, floorLeft.y);
    bgCtx.lineTo(ceilLeft.x, ceilLeft.y);
    bgCtx.lineTo(ceilBack.x, ceilBack.y);
    bgCtx.closePath();
    bgCtx.fill();

    // Left wall crown molding
    var lmY = 8;
    var lm1 = iso(0, 0, ROOM_H - lmY);
    var lm2 = iso(ROOM_W, 0, ROOM_H - lmY);
    bgCtx.strokeStyle = COLORS.wallTrim;
    bgCtx.lineWidth = 2;
    bgCtx.beginPath();
    bgCtx.moveTo(lm1.x, lm1.y);
    bgCtx.lineTo(lm2.x, lm2.y);
    bgCtx.stroke();

    // Left wall baseboard
    var lb1 = iso(0, 0, 8);
    var lb2 = iso(ROOM_W, 0, 8);
    bgCtx.strokeStyle = COLORS.furnDark;
    bgCtx.lineWidth = 3;
    bgCtx.beginPath();
    bgCtx.moveTo(lb1.x, lb1.y);
    bgCtx.lineTo(lb2.x, lb2.y);
    bgCtx.stroke();

    // === RIGHT WALL ===
    var rightWallGrad = bgCtx.createLinearGradient(ceilBack.x, ceilBack.y, floorRight.x, floorRight.y);
    rightWallGrad.addColorStop(0, COLORS.wallRight);
    rightWallGrad.addColorStop(0.5, COLORS.wallRightLight);
    rightWallGrad.addColorStop(1, COLORS.wallRight);
    bgCtx.fillStyle = rightWallGrad;
    bgCtx.beginPath();
    bgCtx.moveTo(floorBack.x, floorBack.y);
    bgCtx.lineTo(floorRight.x, floorRight.y);
    bgCtx.lineTo(ceilRight.x, ceilRight.y);
    bgCtx.lineTo(ceilBack.x, ceilBack.y);
    bgCtx.closePath();
    bgCtx.fill();

    // Right wall crown molding
    var rm1 = iso(0, 0, ROOM_H - lmY);
    var rm2 = iso(0, ROOM_D, ROOM_H - lmY);
    bgCtx.strokeStyle = COLORS.wallTrim;
    bgCtx.lineWidth = 2;
    bgCtx.beginPath();
    bgCtx.moveTo(rm1.x, rm1.y);
    bgCtx.lineTo(rm2.x, rm2.y);
    bgCtx.stroke();

    // Right wall baseboard
    var rb1 = iso(0, 0, 8);
    var rb2 = iso(0, ROOM_D, 8);
    bgCtx.strokeStyle = COLORS.furnDark;
    bgCtx.lineWidth = 3;
    bgCtx.beginPath();
    bgCtx.moveTo(rb1.x, rb1.y);
    bgCtx.lineTo(rb2.x, rb2.y);
    bgCtx.stroke();

    // Corner edge line where walls meet
    bgCtx.strokeStyle = COLORS.shadow;
    bgCtx.lineWidth = 2;
    bgCtx.beginPath();
    bgCtx.moveTo(floorBack.x, floorBack.y);
    bgCtx.lineTo(ceilBack.x, ceilBack.y);
    bgCtx.stroke();

    // === FLOOR ===
    fillPoly(bgCtx, [floorBack, floorRight, floorFront, floorLeft], COLORS.floor);

    // Floor planks (subtle lines along left-wall direction)
    bgCtx.strokeStyle = COLORS.floorDark;
    bgCtx.lineWidth = 1;
    for (var p = 20; p < ROOM_D; p += 25) {
      var p1 = iso(0, p, 0);
      var p2 = iso(ROOM_W, p, 0);
      bgCtx.beginPath();
      bgCtx.moveTo(p1.x, p1.y);
      bgCtx.lineTo(p2.x, p2.y);
      bgCtx.stroke();
    }

    // Rug
    var rugMarginU = 55, rugMarginV = 50;
    fillPoly(bgCtx, [
      iso(rugMarginU, rugMarginV, 0),
      iso(ROOM_W - 15, rugMarginV, 0),
      iso(ROOM_W - 15, ROOM_D - rugMarginV, 0),
      iso(rugMarginU, ROOM_D - rugMarginV, 0),
    ], COLORS.rugMain);
    // Rug border
    strokePoly(bgCtx, [
      iso(rugMarginU, rugMarginV, 0),
      iso(ROOM_W - 15, rugMarginV, 0),
      iso(ROOM_W - 15, ROOM_D - rugMarginV, 0),
      iso(rugMarginU, ROOM_D - rugMarginV, 0),
    ], COLORS.rugBorder, 2);
    // Rug pattern stripes
    bgCtx.strokeStyle = COLORS.rugPattern;
    bgCtx.lineWidth = 1;
    for (var rs = rugMarginU + 15; rs < ROOM_W - 25; rs += 20) {
      var rp1 = iso(rs, rugMarginV + 5, 0);
      var rp2 = iso(rs, ROOM_D - rugMarginV - 5, 0);
      bgCtx.beginPath();
      bgCtx.moveTo(rp1.x, rp1.y);
      bgCtx.lineTo(rp2.x, rp2.y);
      bgCtx.stroke();
    }

    // === DESK (solid with side panels) ===
    drawIsoBox(bgCtx, 82, 78, 0, 56, 56, 6, COLORS.furnDark, COLORS.furnDark, COLORS.furnDark);
    drawIsoBox(bgCtx, 83, 79, 6, 4, 54, 24, COLORS.furnMid, COLORS.furnDark, COLORS.furnDark);
    drawIsoBox(bgCtx, 133, 79, 6, 4, 54, 24, COLORS.furnMid, COLORS.furnDark, COLORS.furnDark);
    drawIsoBox(bgCtx, 82, 78, 30, 56, 56, 8, COLORS.furnTop, COLORS.furnMid, COLORS.furnDark);

    // === CHAIR (back panel + armrests only, no seat surface) ===
    drawIsoBox(bgCtx, 55, 90, 20, 4, 26, 45, COLORS.furnMid, COLORS.furnLight, COLORS.furnDark);
    // Left armrest
    drawIsoBox(bgCtx, 55, 90, 20, 20, 3, 12, COLORS.furnMid, COLORS.furnDark, COLORS.furnDark);
    // Right armrest
    drawIsoBox(bgCtx, 55, 113, 20, 20, 3, 12, COLORS.furnMid, COLORS.furnDark, COLORS.furnDark);

    // === WINDOW FRAME on left wall ===
    // Window sits on left wall (v=0 plane), position u=45-135, h=55-140
    var wf = [
      iso(45, 0, 140), iso(135, 0, 140),
      iso(135, 0, 55), iso(45, 0, 55)
    ];
    strokePoly(bgCtx, wf, COLORS.furnLight, 3);
    // Window panes (dark fill for closed state)
    fillPoly(bgCtx, [
      iso(47, 0, 138), iso(135, 0, 138),
      iso(135, 0, 57), iso(47, 0, 57)
    ], '#101820');
    // Window cross divider
    var wMidU = 90;
    var wMidH = 97;
    var wd1 = iso(wMidU, 0, 57);
    var wd2 = iso(wMidU, 0, 138);
    bgCtx.strokeStyle = COLORS.furnLight;
    bgCtx.lineWidth = 2;
    bgCtx.beginPath();
    bgCtx.moveTo(wd1.x, wd1.y);
    bgCtx.lineTo(wd2.x, wd2.y);
    bgCtx.stroke();
    var wh1 = iso(47, 0, wMidH);
    var wh2 = iso(135, 0, wMidH);
    bgCtx.beginPath();
    bgCtx.moveTo(wh1.x, wh1.y);
    bgCtx.lineTo(wh2.x, wh2.y);
    bgCtx.stroke();

    // === BEANBAG SOFA under window (non-interactive, fits 3) ===
    var bbP = iso(100, 8, 0);
    bgCtx.fillStyle = '#4A3040';
    bgCtx.beginPath();
    bgCtx.ellipse(bbP.x, bbP.y - 4, 40, 16, -0.4, 0, Math.PI * 2);
    bgCtx.fill();
    bgCtx.fillStyle = '#3A2838';
    bgCtx.beginPath();
    bgCtx.ellipse(bbP.x - 4, bbP.y - 16, 32, 18, -0.35, Math.PI, 0);
    bgCtx.fill();
    // Seam lines
    bgCtx.strokeStyle = '#2A2030';
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    bgCtx.moveTo(bbP.x - 24, bbP.y - 8);
    bgCtx.quadraticCurveTo(bbP.x - 4, bbP.y - 28, bbP.x + 20, bbP.y - 6);
    bgCtx.stroke();
    bgCtx.beginPath();
    bgCtx.moveTo(bbP.x - 10, bbP.y - 6);
    bgCtx.quadraticCurveTo(bbP.x, bbP.y - 22, bbP.x + 12, bbP.y - 4);
    bgCtx.stroke();

    // === VINYL SHELF on left wall ===
    drawIsoBox(bgCtx, 150, 0, 30, 40, 18, 3, COLORS.furnTop, COLORS.furnMid, COLORS.furnDark);
    // Shelf brackets
    fillPoly(bgCtx, [
      iso(155, 0, 30), iso(155, 0, 20), iso(155, 8, 20), iso(155, 8, 30)
    ], COLORS.furnDark);
    fillPoly(bgCtx, [
      iso(183, 0, 30), iso(183, 0, 20), iso(183, 8, 20), iso(183, 8, 30)
    ], COLORS.furnDark);

    // === FISHTANK STAND (pushed into right corner) ===
    drawIsoBox(bgCtx, 10, 160, 0, 40, 35, 35, COLORS.furnMid, COLORS.furnDark, COLORS.furnDark);
    var tankU = 12, tankV = 162, tankH = 35, tankW = 36, tankD = 31, tankHt = 30;
    // Tank back walls (on stand)
    fillPoly(bgCtx, [
      iso(tankU, tankV, tankH), iso(tankU+tankW, tankV, tankH),
      iso(tankU+tankW, tankV, tankH+tankHt), iso(tankU, tankV, tankH+tankHt)
    ], '#142828');
    fillPoly(bgCtx, [
      iso(tankU, tankV, tankH), iso(tankU, tankV+tankD, tankH),
      iso(tankU, tankV+tankD, tankH+tankHt), iso(tankU, tankV, tankH+tankHt)
    ], '#142828');
    // Tank water fill
    drawIsoBox(bgCtx, tankU, tankV, tankH, tankW, tankD, tankHt,
      '#1A3838', '#163030', '#183434');
    // Water surface highlight
    fillPoly(bgCtx, [
      iso(tankU+1, tankV+1, tankH+tankHt-1),
      iso(tankU+tankW-1, tankV+1, tankH+tankHt-1),
      iso(tankU+tankW-1, tankV+tankD-1, tankH+tankHt-1),
      iso(tankU+1, tankV+tankD-1, tankH+tankHt-1)
    ], '#2A4848');
    // Tank glass edges
    strokePoly(bgCtx, [
      iso(tankU+tankW, tankV, tankH), iso(tankU+tankW, tankV+tankD, tankH),
      iso(tankU+tankW, tankV+tankD, tankH+tankHt), iso(tankU+tankW, tankV, tankH+tankHt)
    ], COLORS.furnLight, 1);
    strokePoly(bgCtx, [
      iso(tankU, tankV+tankD, tankH), iso(tankU+tankW, tankV+tankD, tankH),
      iso(tankU+tankW, tankV+tankD, tankH+tankHt), iso(tankU, tankV+tankD, tankH+tankHt)
    ], COLORS.furnLight, 1);

    // === CLOCK on right wall ===
    var clockCenterV = 75, clockCenterH = 100, clockR = 14;
    bgCtx.fillStyle = COLORS.clockFace;
    bgCtx.beginPath();
    for (var ca = 0; ca < 360; ca += 5) {
      var crad = ca * Math.PI / 180;
      var cp = iso(0, clockCenterV + clockR * Math.cos(crad), clockCenterH + clockR * Math.sin(crad));
      if (ca === 0) bgCtx.moveTo(cp.x, cp.y);
      else bgCtx.lineTo(cp.x, cp.y);
    }
    bgCtx.closePath();
    bgCtx.fill();
    // Clock rim
    bgCtx.strokeStyle = COLORS.clockRim;
    bgCtx.lineWidth = 2;
    bgCtx.stroke();
    // Hour marks
    for (var hm = 0; hm < 12; hm++) {
      var hmrad = hm * Math.PI / 6;
      var hmp = iso(0, clockCenterV + (clockR - 2) * Math.cos(hmrad), clockCenterH + (clockR - 2) * Math.sin(hmrad));
      bgCtx.fillStyle = COLORS.clockDial;
      bgCtx.fillRect(hmp.x - 1, hmp.y - 1, 2, 2);
    }

    // === FAN MOUNTING ===
    var fanCenter = iso(80, 80, ROOM_H);
    bgCtx.fillStyle = COLORS.furnMid;
    bgCtx.fillRect(fanCenter.x - 3, fanCenter.y - 2, 6, 6);
    bgCtx.fillStyle = COLORS.furnLight;
    bgCtx.fillRect(fanCenter.x - 5, fanCenter.y + 3, 10, 4);

    // === CANDLE SIDE TABLE (upper-left corner, closer in) ===
    drawIsoBox(bgCtx, 18, 8, 0, 18, 18, 28, COLORS.furnTop, COLORS.furnMid, COLORS.furnDark);

    // === CAT CUSHION ===
    var cushU = 155, cushV = 30;
    fillPoly(bgCtx, [
      iso(cushU, cushV, 0), iso(cushU+28, cushV, 0),
      iso(cushU+28, cushV+28, 0), iso(cushU, cushV+28, 0)
    ], COLORS.cushion);
    fillPoly(bgCtx, [
      iso(cushU+2, cushV+2, 1), iso(cushU+26, cushV+2, 1),
      iso(cushU+26, cushV+26, 1), iso(cushU+2, cushV+26, 1)
    ], COLORS.cushionLight);

    // === PLANT POT (static, in bottom corner) ===
    var potU = 175, potV = 170;
    drawIsoBox(bgCtx, potU, potV, 0, 12, 12, 14, COLORS.plantPot, COLORS.plantPotDark, COLORS.plantPotDark);
    // Dirt surface
    fillPoly(bgCtx, [
      iso(potU+1, potV+1, 14), iso(potU+11, potV+1, 14),
      iso(potU+11, potV+11, 14), iso(potU+1, potV+11, 14)
    ], '#3A2E20');

    // === WALL DECORATIONS ===

    // "Hang in there" cat poster on right wall (tall, narrow)
    var postV1 = 130, postV2 = 170, postH1 = 65, postH2 = 140;
    fillPoly(bgCtx, [
      iso(0, postV1, postH2), iso(0, postV2, postH2),
      iso(0, postV2, postH1), iso(0, postV1, postH1)
    ], '#2A3040');
    strokePoly(bgCtx, [
      iso(0, postV1, postH2), iso(0, postV2, postH2),
      iso(0, postV2, postH1), iso(0, postV1, postH1)
    ], COLORS.furnLight, 2);
    // Branch
    bgCtx.strokeStyle = '#6B5540';
    bgCtx.lineWidth = 2;
    bgCtx.beginPath();
    var brL = iso(0, postV1+6, postH2-10);
    var brR = iso(0, postV2-6, postH2-10);
    bgCtx.moveTo(brL.x, brL.y);
    bgCtx.lineTo(brR.x, brR.y);
    bgCtx.stroke();
    // Cat body hanging from branch
    bgCtx.fillStyle = '#C89060';
    var catHang = iso(0, (postV1+postV2)/2, postH2-20);
    bgCtx.fillRect(catHang.x - 4, catHang.y - 1, 8, 14);
    // Cat head
    bgCtx.fillRect(catHang.x - 5, catHang.y - 6, 10, 7);
    // Paws on branch
    bgCtx.fillRect(catHang.x - 5, catHang.y - 1, 3, 3);
    bgCtx.fillRect(catHang.x + 3, catHang.y - 1, 3, 3);
    // Ears
    bgCtx.fillRect(catHang.x - 5, catHang.y - 8, 3, 3);
    bgCtx.fillRect(catHang.x + 3, catHang.y - 8, 3, 3);
    // Eyes
    bgCtx.fillStyle = '#1A2020';
    bgCtx.fillRect(catHang.x - 3, catHang.y - 4, 2, 2);
    bgCtx.fillRect(catHang.x + 2, catHang.y - 4, 2, 2);
    // "HANG IN THERE" text below
    var textLine = iso(0, (postV1+postV2)/2, postH1 + 18);
    bgCtx.fillStyle = '#607080';
    bgCtx.font = '8px monospace';
    bgCtx.textAlign = 'center';
    bgCtx.fillText('HANG IN', textLine.x, textLine.y + 4);
    bgCtx.fillText('THERE', textLine.x, textLine.y + 12);
    bgCtx.textAlign = 'start';

  }

  // ==================== ELEMENT RENDERERS ====================

  function renderFan(es) {
    var cx = isoX(80, 80);
    var cy = isoY(80, 80, ROOM_H) - 14;

    if (es.state === 'off') {
      ctx.strokeStyle = COLORS.fanBlade;
      ctx.lineWidth = 5;
      for (var b = 0; b < 4; b++) {
        var ba = b * Math.PI / 2;
        var bx = cx + Math.cos(ba) * 60;
        var by = cy + Math.sin(ba) * 24;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      ctx.fillStyle = COLORS.fanHub;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.furnDark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 8);
      ctx.lineTo(cx, cy + 24);
      ctx.stroke();
      ctx.fillStyle = COLORS.furnLight;
      ctx.beginPath();
      ctx.arc(cx, cy + 25, 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    var a = es.fanAngle;
    ctx.lineWidth = 6;
    for (var rb = 0; rb < 4; rb++) {
      var rba = a + rb * Math.PI / 2;
      var rbx = cx + Math.cos(rba) * 64;
      var rby = cy + Math.sin(rba) * 26;
      ctx.strokeStyle = COLORS.fanBlade;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(rbx, rby);
      ctx.stroke();
      var tipX = cx + Math.cos(rba) * 56;
      var tipY = cy + Math.sin(rba) * 22;
      var perpX = -Math.sin(rba) * 10;
      var perpY = Math.cos(rba) * 4;
      ctx.fillStyle = COLORS.fanBlade;
      ctx.beginPath();
      ctx.moveTo(tipX - perpX, tipY - perpY);
      ctx.lineTo(rbx, rby);
      ctx.lineTo(tipX + perpX, tipY + perpY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = COLORS.fanBlade;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 68, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.fanHub;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    var chainSwing = Math.sin(state.time * 0.008) * 3;
    ctx.strokeStyle = COLORS.furnDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx + chainSwing, cy + 26);
    ctx.stroke();
    ctx.fillStyle = COLORS.furnLight;
    ctx.beginPath();
    ctx.arc(cx + chainSwing, cy + 27, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderWindow(es) {
    if (es.state === 'off') return;

    var openAmount = Math.min(es.blindsOpen, 1);

    // Window interior area (on left wall, v=0)
    var winU1 = 47, winU2 = 135, winH1 = 57, winH2 = 138;

    // Build clip polygon for the window area
    var wp1 = iso(winU1, 0, winH2);
    var wp2 = iso(winU2, 0, winH2);
    var wp3 = iso(winU2, 0, winH1);
    var wp4 = iso(winU1, 0, winH1);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wp1.x, wp1.y);
    ctx.lineTo(wp2.x, wp2.y);
    ctx.lineTo(wp3.x, wp3.y);
    ctx.lineTo(wp4.x, wp4.y);
    ctx.closePath();
    ctx.clip();

    // Sky fill
    fillPoly(ctx, [wp1, wp2, wp3, wp4], COLORS.citySky);

    if (openAmount > 0) {
      // City skyline silhouettes
      var buildings = [
        { u: 50, h1: 57, h2: 90 },
        { u: 65, h1: 57, h2: 100 },
        { u: 78, h1: 57, h2: 85 },
        { u: 90, h1: 57, h2: 110 },
        { u: 105, h1: 57, h2: 95 },
        { u: 118, h1: 57, h2: 88 },
        { u: 128, h1: 57, h2: 78 },
      ];
      for (var bi = 0; bi < buildings.length; bi++) {
        var bldg = buildings[bi];
        fillPoly(ctx, [
          iso(bldg.u, 0, bldg.h1), iso(bldg.u + 12, 0, bldg.h1),
          iso(bldg.u + 12, 0, bldg.h2), iso(bldg.u, 0, bldg.h2)
        ], COLORS.cityBuilding);
      }

      // City lights
      for (var cl = 0; cl < es.cityLights.length; cl++) {
        var light = es.cityLights[cl];
        if (light.on) {
          var lp = iso(light.u, 0, light.h);
          ctx.fillStyle = COLORS.cityLight;
          ctx.fillRect(lp.x - 1, lp.y - 1, 2, 2);
        }
      }

      // Rain
      ctx.strokeStyle = COLORS.rain;
      ctx.lineWidth = 1;
      for (var r = 0; r < es.rainDrops.length; r++) {
        var drop = es.rainDrops[r];
        var dp1 = iso(drop.u, 0, drop.h);
        var dp2 = iso(drop.u + 2, 0, drop.h - drop.len * 3);
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(dp1.x, dp1.y);
        ctx.lineTo(dp2.x, dp2.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Lightning flash
      if (es.lightningFlash > 0) {
        ctx.globalAlpha = es.lightningFlash * 0.5;
        fillPoly(ctx, [wp1, wp2, wp3, wp4], '#FFFFFF');
        ctx.globalAlpha = 1;
      }
    }

    // Blinds (partially closed)
    var blindsDrawn = Math.floor((1 - openAmount) * 8);
    var blindStep = (winH2 - winH1) / 8;
    ctx.lineWidth = 1;
    for (var bl = 0; bl < blindsDrawn; bl++) {
      var blindH = winH2 - bl * blindStep;
      fillPoly(ctx, [
        iso(winU1, 0, blindH), iso(winU2, 0, blindH),
        iso(winU2, 0, blindH - blindStep + 1), iso(winU1, 0, blindH - blindStep + 1)
      ], COLORS.furnMid);
    }

    ctx.restore();

    // Redraw window frame on top
    strokePoly(ctx, [wp1, wp2, wp3, wp4], COLORS.furnLight, 3);
    var wMid = iso(90, 0, winH1);
    var wMid2 = iso(90, 0, winH2);
    ctx.strokeStyle = COLORS.furnLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wMid.x, wMid.y);
    ctx.lineTo(wMid2.x, wMid2.y);
    ctx.stroke();
    var wh1 = iso(winU1, 0, 97);
    var wh2 = iso(winU2, 0, 97);
    ctx.beginPath();
    ctx.moveTo(wh1.x, wh1.y);
    ctx.lineTo(wh2.x, wh2.y);
    ctx.stroke();
  }

  function renderClock(es) {
    if (es.state === 'off') return;

    var cv = 75, ch = 100, cr = 14;

    // Minute hand (slow rotation, clockwise)
    var mrad = -es.clockAngle;
    var mLen = cr - 4;
    var mEnd = iso(0, cv + mLen * Math.cos(mrad - Math.PI / 2), ch + mLen * Math.sin(mrad - Math.PI / 2));
    var mStart = iso(0, cv, ch);
    ctx.strokeStyle = COLORS.clockDial;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mStart.x, mStart.y);
    ctx.lineTo(mEnd.x, mEnd.y);
    ctx.stroke();

    // Second hand (slower, decorative)
    var srad = -es.clockAngle * 4;
    var sLen = cr - 2;
    var sEnd = iso(0, cv + sLen * Math.cos(srad - Math.PI / 2), ch + sLen * Math.sin(srad - Math.PI / 2));
    ctx.strokeStyle = '#D04040';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mStart.x, mStart.y);
    ctx.lineTo(sEnd.x, sEnd.y);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = COLORS.clockDial;
    ctx.beginPath();
    ctx.arc(mStart.x, mStart.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Pendulum below clock
    var pendAngle = Math.sin(state.time * 0.002) * 0.5;
    var pendBase = iso(0, cv, ch - cr - 2);
    var pendBob = iso(0, cv + 6 * Math.sin(pendAngle), ch - cr - 14);
    ctx.strokeStyle = COLORS.furnDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pendBase.x, pendBase.y);
    ctx.lineTo(pendBob.x, pendBob.y);
    ctx.stroke();
    ctx.fillStyle = COLORS.accentWarm;
    ctx.beginPath();
    ctx.arc(pendBob.x, pendBob.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderVinyl(es) {
    // Vinyl player sits on shelf on left wall
    var shelfU = 152, shelfV = 2, shelfH = 33;
    var bodyW = 36, bodyD = 14, bodyHt = 5;

    if (es.state === 'off') {
      // Player body
      drawIsoBox(ctx, shelfU, shelfV, shelfH, bodyW, bodyD, bodyHt,
        COLORS.vinylBody, COLORS.furnDark, COLORS.furnDark);
      // Static record on top
      var discCenter = iso(shelfU + bodyW/2, shelfV + bodyD/2, shelfH + bodyHt);
      ctx.fillStyle = COLORS.vinylDisc;
      ctx.beginPath();
      ctx.ellipse(discCenter.x, discCenter.y, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.furnLight;
      ctx.beginPath();
      ctx.arc(discCenter.x, discCenter.y, 2, 0, Math.PI * 2);
      ctx.fill();
      // Tonearm resting
      var armBase = iso(shelfU + bodyW - 4, shelfV + 2, shelfH + bodyHt + 1);
      var armEnd = iso(shelfU + bodyW - 2, shelfV + bodyD - 2, shelfH + bodyHt + 1);
      ctx.strokeStyle = COLORS.furnLight;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(armBase.x, armBase.y);
      ctx.lineTo(armEnd.x, armEnd.y);
      ctx.stroke();
      return;
    }

    // Playing state - animated
    drawIsoBox(ctx, shelfU, shelfV, shelfH, bodyW, bodyD, bodyHt,
      COLORS.vinylBody, COLORS.furnDark, COLORS.furnDark);

    // Spinning record
    var discCenter2 = iso(shelfU + bodyW/2, shelfV + bodyD/2, shelfH + bodyHt);
    var angle = es.vinylAngle;
    // Record base
    ctx.fillStyle = COLORS.vinylDisc;
    ctx.beginPath();
    ctx.ellipse(discCenter2.x, discCenter2.y, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Spinning groove lines
    ctx.strokeStyle = COLORS.vinylGroove;
    ctx.lineWidth = 0.5;
    for (var gr = 4; gr <= 12; gr += 3) {
      ctx.beginPath();
      ctx.ellipse(discCenter2.x, discCenter2.y, gr, gr * 0.43, angle * 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Center label
    ctx.fillStyle = COLORS.vinylLabel;
    ctx.beginPath();
    ctx.ellipse(discCenter2.x, discCenter2.y, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tonearm on record
    var armBase2 = iso(shelfU + bodyW - 4, shelfV + 2, shelfH + bodyHt + 1);
    var armMid = iso(shelfU + bodyW/2 + 5, shelfV + bodyD/2 - 2, shelfH + bodyHt + 2);
    ctx.strokeStyle = COLORS.furnLight;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(armBase2.x, armBase2.y);
    ctx.lineTo(armMid.x, armMid.y);
    ctx.stroke();

    // Cyan glow
    ctx.globalAlpha = 0.15 + 0.1 * Math.sin(state.time * 0.002);
    ctx.fillStyle = COLORS.accentCyan;
    ctx.beginPath();
    ctx.ellipse(discCenter2.x, discCenter2.y, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Sound waves
    var wavePhase = es.soundWavePhase;
    for (var sw = 0; sw < 3; sw++) {
      var swAlpha = Math.max(0, Math.sin(wavePhase - sw * 1.2)) * 0.4;
      if (swAlpha > 0.05) {
        ctx.globalAlpha = swAlpha;
        ctx.strokeStyle = COLORS.accentCyan;
        ctx.lineWidth = 1;
        var swR = 18 + sw * 8;
        ctx.beginPath();
        ctx.ellipse(discCenter2.x + 20, discCenter2.y, swR * 0.3, swR * 0.5, 0, -Math.PI/3, Math.PI/3);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function renderFishtank(es) {
    if (es.state === 'off') return;

    var tU = 12, tV = 162, tH = 35, tW = 36, tD = 31, tHt = 30;

    // Water shimmer on surface
    var shimmer = 0.3 + 0.15 * Math.sin(state.time * 0.003);
    var surfTL = iso(tU + 2, tV + 2, tH + tHt - 1);
    var surfTR = iso(tU + tW - 2, tV + 2, tH + tHt - 1);
    var surfBR = iso(tU + tW - 2, tV + tD - 2, tH + tHt - 1);
    var surfBL = iso(tU + 2, tV + tD - 2, tH + tHt - 1);
    ctx.globalAlpha = shimmer;
    fillPoly(ctx, [surfTL, surfTR, surfBR, surfBL], '#3A6060');
    ctx.globalAlpha = 1;

    // Fish
    for (var f = 0; f < es.fish.length; f++) {
      var fish = es.fish[f];
      var fc = f === 0 ? COLORS.fishOrange : COLORS.fishTeal;
      var fishU = tU + 4 + fish.x * (tW - 8);
      var fishH = tH + 5 + fish.y * (tHt - 15) + Math.sin(fish.phase) * 3;
      var fishV = tV + tD * 0.4 + f * tD * 0.2;
      var fp = iso(fishU, fishV, fishH);
      // Fish body
      ctx.fillStyle = fc;
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      var tailDir = fish.dir > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(fp.x + tailDir * 6, fp.y);
      ctx.lineTo(fp.x + tailDir * 10, fp.y - 3);
      ctx.lineTo(fp.x + tailDir * 10, fp.y + 3);
      ctx.closePath();
      ctx.fill();
    }

    // Seaweed
    var seaweedPositions = [
      { du: 8, dv: 8 },
      { du: 18, dv: 12 },
      { du: 28, dv: 6 },
    ];
    for (var sw = 0; sw < seaweedPositions.length; sw++) {
      var swP = seaweedPositions[sw];
      var swBase = iso(tU + swP.du, tV + swP.dv, tH + 2);
      var sway = Math.sin(state.time * 0.002 + sw * 2.1) * 3;
      ctx.strokeStyle = '#2D6040';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(swBase.x, swBase.y);
      ctx.quadraticCurveTo(swBase.x + sway, swBase.y - 10, swBase.x + sway * 0.7, swBase.y - 18);
      ctx.stroke();
      ctx.strokeStyle = '#3A7050';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(swBase.x + 2, swBase.y - 2);
      ctx.quadraticCurveTo(swBase.x + sway * 0.8 + 3, swBase.y - 8, swBase.x + sway * 0.5 + 2, swBase.y - 13);
      ctx.stroke();
    }

    // Bubbles
    for (var bb = 0; bb < es.bubbles.length; bb++) {
      var bub = es.bubbles[bb];
      var bubU = tU + tW - 5;
      var bubH = tH + 5 + bub.y * (tHt - 8);
      var bubV = tV + tD * 0.6;
      var bp = iso(bubU + bub.wobble, bubV, bubH);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = COLORS.bubble;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function renderCandle(es) {
    // Cluster of 3 candles on side table in upper-left corner
    var tableU = 27, tableV = 17, tableH = 28;
    var candles = [
      { du: 0, dv: 0, h: 10 },
      { du: -5, dv: 4, h: 7 },
      { du: 4, dv: -3, h: 6 },
    ];

    for (var c = 0; c < candles.length; c++) {
      var cd = candles[c];
      var cu = tableU + cd.du;
      var cv = tableV + cd.dv;
      var cBase = iso(cu, cv, tableH);
      var cTop = iso(cu, cv, tableH + cd.h);
      ctx.fillStyle = COLORS.candleWax;
      ctx.fillRect(cBase.x - 3, cTop.y, 6, cBase.y - cTop.y);
      ctx.fillStyle = '#D89040';
      ctx.fillRect(cBase.x - 3, cTop.y - 1, 6, 2);
      ctx.fillStyle = COLORS.furnDark;
      ctx.fillRect(cBase.x, cTop.y - 3, 1, 3);

      if (es.state !== 'off') {
        var flameFrame = (es.animFrame + c) % 3;
        var fx = cBase.x;
        var fy = cTop.y - 5;
        var flameOff = (flameFrame - 1) * 2;
        ctx.fillStyle = COLORS.candleGlow;
        ctx.beginPath();
        ctx.ellipse(fx + flameOff, fy - 2, 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.candleFlame;
        ctx.beginPath();
        ctx.ellipse(fx + flameOff, fy, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (es.state !== 'off') {
      var glowP = iso(tableU, tableV, tableH);
      ctx.globalAlpha = 0.15 + 0.06 * Math.sin(state.time * 0.005);
      ctx.fillStyle = COLORS.accentWarm;
      ctx.beginPath();
      ctx.ellipse(glowP.x, glowP.y, 35, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function renderPlant(es) {
    var potU = 175, potV = 170;
    var baseP = iso(potU + 6, potV + 6, 14);
    var swayOff = 0;
    if (es.state !== 'off') {
      swayOff = Math.sin(es.plantSwayPhase) * 3;
    }

    // Stem
    ctx.strokeStyle = COLORS.plantDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(baseP.x, baseP.y);
    ctx.lineTo(baseP.x + swayOff * 0.3, baseP.y - 12);
    ctx.stroke();

    // Leaves
    var leafCx = baseP.x + swayOff * 0.5;
    var leafCy = baseP.y - 14;
    // Center leaf
    ctx.fillStyle = COLORS.plantLeaf;
    ctx.beginPath();
    ctx.ellipse(leafCx + swayOff * 0.2, leafCy - 6, 4, 8, 0.1 + swayOff * 0.02, 0, Math.PI * 2);
    ctx.fill();
    // Left leaf
    ctx.fillStyle = COLORS.plantDark;
    ctx.beginPath();
    ctx.ellipse(leafCx - 8 + swayOff * 0.3, leafCy, 4, 6, -0.6, 0, Math.PI * 2);
    ctx.fill();
    // Right leaf
    ctx.fillStyle = COLORS.plantLeaf;
    ctx.beginPath();
    ctx.ellipse(leafCx + 8 + swayOff * 0.3, leafCy, 4, 6, 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Small leaves
    ctx.fillStyle = COLORS.plantDark;
    ctx.beginPath();
    ctx.ellipse(leafCx - 5 + swayOff * 0.4, leafCy - 8, 3, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.plantLeaf;
    ctx.beginPath();
    ctx.ellipse(leafCx + 5 + swayOff * 0.4, leafCy - 8, 3, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Cricket
    if (es.state !== 'off') {
      var cricketP = iso(potU + 16, potV + 10, 1);
      var cricketYOff = es.cricketHop ? -5 : 0;
      ctx.fillStyle = '#3A4020';
      ctx.fillRect(cricketP.x - 2, cricketP.y - 2 + cricketYOff, 5, 3);
      // Legs
      ctx.strokeStyle = '#3A4020';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cricketP.x - 3, cricketP.y + 2 + cricketYOff);
      ctx.lineTo(cricketP.x - 4, cricketP.y + 5 + cricketYOff);
      ctx.moveTo(cricketP.x + 3, cricketP.y + 2 + cricketYOff);
      ctx.lineTo(cricketP.x + 4, cricketP.y + 5 + cricketYOff);
      ctx.stroke();
    }
  }

  function renderCat(es) {
    var cushU = 155, cushV = 30;
    var catP = iso(cushU + 14, cushV + 14, 2);
    var breathOff = 0;

    if (es.state !== 'off') {
      breathOff = Math.sin(es.catBreathPhase) > 0.5 ? -1 : 0;
    }

    var cx = catP.x;
    var cy = catP.y + breathOff;

    // Body (curled oval)
    ctx.fillStyle = COLORS.catFur;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 14, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Stripes
    ctx.strokeStyle = COLORS.catStripe;
    ctx.lineWidth = 1.5;
    for (var stripe = -6; stripe <= 6; stripe += 6) {
      ctx.beginPath();
      ctx.moveTo(cx + stripe - 1, cy - 5);
      ctx.lineTo(cx + stripe + 1, cy + 5);
      ctx.stroke();
    }

    // Head
    ctx.fillStyle = COLORS.catFur;
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy - 2, 7, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(cx - 17, cy - 6);
    ctx.lineTo(cx - 19, cy - 12);
    ctx.lineTo(cx - 14, cy - 7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 6);
    ctx.lineTo(cx - 8, cy - 12);
    ctx.lineTo(cx - 6, cy - 5);
    ctx.closePath();
    ctx.fill();
    // Eye (closed or half-open)
    ctx.fillStyle = '#40C870';
    ctx.fillRect(cx - 14, cy - 3, 3, 1.5);

    // Tail
    ctx.strokeStyle = COLORS.catFur;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + 13, cy);
    if (es.state !== 'off' && es.catTailFlick) {
      ctx.quadraticCurveTo(cx + 18, cy - 8, cx + 22, cy - 12);
    } else {
      ctx.quadraticCurveTo(cx + 18, cy + 3, cx + 22, cy + 1);
    }
    ctx.stroke();
  }

  function renderLofiGirl(es) {
    // Girl sitting at desk, slightly right of center
    // Desk surface is at iso(82-138, 78-134, 38)
    // Chair is at iso(72-94, 88-118, 22-65)
    // She sits in the chair facing the desk (toward the back-right area)

    var seatP = iso(68, 98, 25);
    var gx = seatP.x;
    var gy = seatP.y;

    // === HAIR BACK (behind body) ===
    ctx.fillStyle = COLORS.hair;
    ctx.beginPath();
    ctx.moveTo(gx - 2, gy - 28);
    ctx.quadraticCurveTo(gx - 14, gy - 15, gx - 12, gy + 8);
    ctx.lineTo(gx - 6, gy + 12);
    ctx.lineTo(gx + 6, gy + 10);
    ctx.quadraticCurveTo(gx + 10, gy - 10, gx + 6, gy - 26);
    ctx.closePath();
    ctx.fill();

    // === BODY (hoodie, trimmed to sit in chair) ===
    ctx.fillStyle = COLORS.shirt;
    ctx.beginPath();
    ctx.moveTo(gx - 10, gy - 10);
    ctx.lineTo(gx + 12, gy - 10);
    ctx.lineTo(gx + 13, gy + 4);
    ctx.lineTo(gx - 11, gy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.shirtDark;
    ctx.beginPath();
    ctx.moveTo(gx - 10, gy - 10);
    ctx.lineTo(gx, gy - 10);
    ctx.lineTo(gx, gy + 4);
    ctx.lineTo(gx - 11, gy + 4);
    ctx.closePath();
    ctx.fill();

    // === BOOK on desk (in front of girl, larger) ===
    var bookP = iso(108, 112, 39);
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(bookP.x - 15, bookP.y - 1, 14, 10);
    ctx.fillRect(bookP.x + 1, bookP.y - 1, 14, 10);
    ctx.fillStyle = COLORS.furnDark;
    ctx.fillRect(bookP.x - 1, bookP.y - 1, 2, 10);
    if (es.state !== 'off') {
      ctx.fillStyle = COLORS.paperLines;
      for (var tl = 0; tl < es.textLines && tl < 3; tl++) {
        ctx.fillRect(bookP.x + 2, bookP.y + 1 + tl * 3, 11, 1);
      }
    }

    // === HEAD ===
    ctx.fillStyle = COLORS.skinTone;
    ctx.beginPath();
    ctx.ellipse(gx + 2, gy - 18, 7, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // === HAIR FRONT ===
    ctx.fillStyle = COLORS.hair;
    // Bangs
    ctx.beginPath();
    ctx.moveTo(gx - 6, gy - 24);
    ctx.quadraticCurveTo(gx + 2, gy - 28, gx + 10, gy - 24);
    ctx.lineTo(gx + 8, gy - 18);
    ctx.quadraticCurveTo(gx + 2, gy - 16, gx - 4, gy - 18);
    ctx.closePath();
    ctx.fill();
    // Side hair (right)
    ctx.beginPath();
    ctx.moveTo(gx + 8, gy - 22);
    ctx.quadraticCurveTo(gx + 14, gy - 10, gx + 12, gy + 5);
    ctx.lineTo(gx + 9, gy + 5);
    ctx.quadraticCurveTo(gx + 10, gy - 8, gx + 7, gy - 18);
    ctx.closePath();
    ctx.fill();
    // Side hair (left)
    ctx.beginPath();
    ctx.moveTo(gx - 5, gy - 22);
    ctx.quadraticCurveTo(gx - 14, gy - 10, gx - 13, gy + 8);
    ctx.lineTo(gx - 10, gy + 8);
    ctx.quadraticCurveTo(gx - 11, gy - 8, gx - 4, gy - 18);
    ctx.closePath();
    ctx.fill();
    // Hair highlight
    ctx.strokeStyle = COLORS.hairHighlight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx - 2, gy - 26);
    ctx.quadraticCurveTo(gx + 5, gy - 28, gx + 9, gy - 22);
    ctx.stroke();

    // === HEADPHONES ===
    ctx.strokeStyle = COLORS.headphone;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gx + 2, gy - 20, 10, Math.PI + 0.3, -0.3);
    ctx.stroke();
    ctx.fillStyle = COLORS.headphone;
    ctx.beginPath();
    ctx.ellipse(gx - 7, gy - 17, 4, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.headphoneAccent;
    ctx.beginPath();
    ctx.ellipse(gx - 7, gy - 17, 2, 3, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.headphone;
    ctx.beginPath();
    ctx.ellipse(gx + 11, gy - 17, 4, 5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.headphoneAccent;
    ctx.beginPath();
    ctx.ellipse(gx + 11, gy - 17, 2, 3, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // === MUSIC NOTES (when active) ===
    if (es.state !== 'off') {
      var notes = [
        { dx: -8, speed: 0.0015, phase: 0 },
        { dx: 6, speed: 0.0012, phase: 2.5 },
        { dx: 14, speed: 0.0018, phase: 4.8 },
      ];
      for (var n = 0; n < notes.length; n++) {
        var note = notes[n];
        var noteTime = (state.time * note.speed + note.phase) % 6.28;
        var noteProgress = noteTime / 6.28;
        var noteAlpha = noteProgress < 0.7 ? 0.7 : Math.max(0, 1 - (noteProgress - 0.7) / 0.3);
        var noteY = gy - 34 - noteProgress * 25;
        var noteX = gx + note.dx + Math.sin(noteTime * 2) * 3;
        ctx.globalAlpha = noteAlpha * 0.8;
        ctx.fillStyle = COLORS.accentCyan;
        ctx.beginPath();
        ctx.ellipse(noteX, noteY, 2.5, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.accentCyan;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(noteX + 2, noteY);
        ctx.lineTo(noteX + 2, noteY - 8);
        ctx.stroke();
        // Flag
        ctx.beginPath();
        ctx.moveTo(noteX + 2, noteY - 8);
        ctx.quadraticCurveTo(noteX + 6, noteY - 6, noteX + 2, noteY - 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ==================== FOCUS BRACKETS ====================
  function renderFocusBrackets() {
    var el = getElementDef(state.focused);
    if (!el) return;
    if (Date.now() - state.lastInputTime > 3000) return;
    var b = el.bounds;
    var alpha = 0.5 + 0.3 * Math.sin(state.focusPulse);
    var m = 2;
    var armLen = Math.min(5, Math.floor(b.w / 3));

    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS.accentCyan;

    // Top-left
    ctx.fillRect((b.x - m) * PX, (b.y - m) * PX, armLen * PX, PX);
    ctx.fillRect((b.x - m) * PX, (b.y - m) * PX, PX, armLen * PX);
    // Top-right
    ctx.fillRect((b.x + b.w + m - armLen) * PX, (b.y - m) * PX, armLen * PX, PX);
    ctx.fillRect((b.x + b.w + m - 1) * PX, (b.y - m) * PX, PX, armLen * PX);
    // Bottom-left
    ctx.fillRect((b.x - m) * PX, (b.y + b.h + m - 1) * PX, armLen * PX, PX);
    ctx.fillRect((b.x - m) * PX, (b.y + b.h + m - armLen) * PX, PX, armLen * PX);
    // Bottom-right
    ctx.fillRect((b.x + b.w + m - armLen) * PX, (b.y + b.h + m - 1) * PX, armLen * PX, PX);
    ctx.fillRect((b.x + b.w + m - 1) * PX, (b.y + b.h + m - armLen) * PX, PX, armLen * PX);

    ctx.globalAlpha = 1;
  }

  // ==================== MENU RENDERING ====================
  function renderMenu() {
    var focusedEl = getElementDef(state.focused);
    var es = state.elements[state.focused];
    if (!focusedEl) return;

    if (es.state === 'menu') {
      // Position menu near the element
      var mx = focusedEl.bounds.x + Math.floor(focusedEl.bounds.w / 2) - 12;
      var my = focusedEl.menuY;
      mx = Math.max(3, Math.min(mx, GRID - 30));

      var menuW = 28;
      var menuH = 20;

      // Backdrop
      drawRectAlpha(mx - 1, my - 1, menuW + 2, menuH + 2, COLORS.menuBg, 0.92);
      // Border
      drawRect(mx, my, menuW, 1, COLORS.menuBorder);
      drawRect(mx, my + menuH - 1, menuW, 1, COLORS.menuBorder);
      drawRect(mx, my, 1, menuH, COLORS.menuBorder);
      drawRect(mx + menuW - 1, my, 1, menuH, COLORS.menuBorder);

      // Menu items
      var items = ['VOL', 'STOP'];
      for (var i = 0; i < items.length; i++) {
        var itemY = my + 3 + i * 9;
        if (i === es.menuIndex) {
          drawRectAlpha(mx + 1, itemY - 1, menuW - 2, 8, COLORS.menuHighlight, 0.8);
          drawText('>', mx + 2, itemY, COLORS.accentCyan);
        }
        drawText(items[i], mx + 7, itemY, COLORS.textColor);
      }

    } else if (es.state === 'volume') {
      var sliderW = 50;
      var sliderH = 5;
      var sx = Math.max(5, Math.min(focusedEl.bounds.x + Math.floor(focusedEl.bounds.w / 2) - 25, GRID - sliderW - 5));
      var sy = focusedEl.menuY;

      // Backdrop
      drawRectAlpha(sx - 3, sy - 8, sliderW + 6, sliderH + 14, COLORS.menuBg, 0.88);

      // Label
      var volStr = 'VOL ' + es.volume + '%';
      drawText(volStr, sx, sy - 6, COLORS.textColor);

      // Track
      drawRect(sx, sy, sliderW, sliderH, COLORS.volBarBg);
      drawRect(sx, sy, sliderW, 1, COLORS.furnMid);

      // Fill
      var fillW = Math.round(sliderW * es.volume / 100);
      drawRect(sx, sy, fillW, sliderH, COLORS.volBarFill);

      // Knob
      drawRect(sx + fillW - 1, sy - 1, 2, sliderH + 2, COLORS.textColor);
    }
  }

  // ==================== UPDATE ====================
  function update(delta) {
    state.time += delta;
    state.focusPulse += delta * 0.004;

    ELEMENTS.forEach(function(el) {
      var es = state.elements[el.id];
      if (es.state === 'off') return;

      es.animTimer += delta;

      switch (el.id) {
        case 'person':
          if (es.animTimer > 250) {
            es.animTimer = 0;
            es.animFrame = (es.animFrame + 1) % 4;
            if (es.animFrame === 0) {
              es.textLines = Math.min(es.textLines + 1, 3);
            }
          }
          es.pageFlipTimer += delta;
          if (es.pageFlipTimer >= es.nextPageFlip) {
            es.pageFlipTimer = 0;
            es.nextPageFlip = 8000 + Math.random() * 7000;
            es.textLines = 0;
            AudioManager.playOneShot('pageflip', es.volume);
          }
          break;

        case 'window':
          if (es.blindsOpen < 1) {
            es.blindsOpen += delta / 500;
            if (es.blindsOpen > 1) es.blindsOpen = 1;
          }
          // Rain
          while (es.rainDrops.length < 20) {
            es.rainDrops.push({
              u: 47 + Math.random() * 88,
              h: 57 + Math.random() * 81,
              len: 2 + Math.floor(Math.random() * 3),
              speed: 0.05 + Math.random() * 0.04,
            });
          }
          for (var r = 0; r < es.rainDrops.length; r++) {
            var drop = es.rainDrops[r];
            drop.h -= drop.speed * delta;
            drop.u += drop.speed * delta * 0.3;
            if (drop.h < 57 || drop.u > 135) {
              drop.u = 47 + Math.random() * 88;
              drop.h = 138;
              drop.len = 2 + Math.floor(Math.random() * 3);
            }
          }
          // City lights init
          if (es.cityLights.length === 0) {
            var lightDefs = [
              {u:55, h:72}, {u:58, h:78}, {u:70, h:82},
              {u:72, h:90}, {u:85, h:68}, {u:95, h:88},
              {u:108, h:80}, {u:120, h:72},
            ];
            lightDefs.forEach(function(ld) {
              es.cityLights.push({ u: ld.u, h: ld.h, on: Math.random() > 0.3 });
            });
          }
          // Flicker
          for (var cli = 0; cli < es.cityLights.length; cli++) {
            if (Math.random() < 0.003) es.cityLights[cli].on = !es.cityLights[cli].on;
          }
          // Lightning
          es.lightningTimer += delta;
          if (es.lightningTimer >= es.nextLightning) {
            es.lightningTimer = 0;
            es.nextLightning = 15000 + Math.random() * 15000;
            es.lightningFlash = 1;
          }
          if (es.lightningFlash > 0) {
            es.lightningFlash -= delta / 150;
            if (es.lightningFlash < 0) es.lightningFlash = 0;
          }
          break;

        case 'vinyl':
          es.vinylAngle += delta * 0.003;
          es.soundWavePhase += delta * 0.004;
          break;

        case 'fishtank':
          for (var fi = 0; fi < es.fish.length; fi++) {
            var fish = es.fish[fi];
            fish.x += fish.vx * fish.dir * delta * 0.0003;
            fish.phase += delta * 0.002;
            if (fish.x <= 0.05) { fish.x = 0.05; fish.dir = 1; }
            if (fish.x >= 0.95) { fish.x = 0.95; fish.dir = -1; }
          }
          // Bubbles
          while (es.bubbles.length < 4) {
            es.bubbles.push({
              y: 0.1 + Math.random() * 0.3,
              wobble: 0,
              wobblePhase: Math.random() * Math.PI * 2,
            });
          }
          for (var bbi = es.bubbles.length - 1; bbi >= 0; bbi--) {
            var bub = es.bubbles[bbi];
            bub.y += delta * 0.0003;
            bub.wobble = Math.sin(bub.wobblePhase) * 2;
            bub.wobblePhase += delta * 0.005;
            if (bub.y > 0.95) {
              es.bubbles[bbi] = {
                y: 0.05 + Math.random() * 0.2,
                wobble: 0,
                wobblePhase: Math.random() * Math.PI * 2,
              };
            }
          }
          break;

        case 'clock':
          // Slow rotation: ~2 minutes per revolution for minute hand
          es.clockAngle += delta * 0.00005;
          break;

        case 'cat':
          es.catBreathPhase += delta * 0.002;
          es.catTailTimer += delta;
          if (es.catTailTimer > 3000 + Math.random() * 4000) {
            es.catTailTimer = 0;
            es.catTailFlick = !es.catTailFlick;
          }
          break;

        case 'candle':
          if (es.animTimer > 150) {
            es.animTimer = 0;
            es.animFrame = (es.animFrame + 1) % 3;
          }
          break;

        case 'fan':
          es.fanAngle += delta * 0.012;
          break;

        case 'plant':
          es.plantSwayPhase += delta * 0.0015;
          es.cricketTimer += delta;
          if (es.cricketTimer > 2000 + Math.random() * 3000) {
            es.cricketTimer = 0;
            es.cricketHop = true;
            setTimeout(function() { es.cricketHop = false; }, 200);
          }
          break;
      }
    });
  }

  // ==================== RENDER ====================
  function render() {
    ctx.clearRect(0, 0, 600, 600);
    ctx.drawImage(bgCanvas, 0, 0);

    // Draw elements back-to-front (iso z-order)
    renderFan(state.elements['fan']);
    renderWindow(state.elements['window']);
    renderClock(state.elements['clock']);
    renderVinyl(state.elements['vinyl']);
    renderFishtank(state.elements['fishtank']);
    renderCandle(state.elements['candle']);
    renderLofiGirl(state.elements['person']);
    renderPlant(state.elements['plant']);
    renderCat(state.elements['cat']);

    renderFocusBrackets();
    renderMenu();
  }

  // ==================== INPUT ====================
  function getElementDef(id) {
    for (var i = 0; i < ELEMENTS.length; i++) {
      if (ELEMENTS[i].id === id) return ELEMENTS[i];
    }
    return null;
  }

  function resetElementAnimation(es) {
    es.blindsOpen = 0;
    es.animFrame = 0;
    es.textLines = 0;
    es.lightningFlash = 0;
    es.rainDrops = [];
    es.cityLights = [];
    es.menuIndex = 0;
  }

  function handleNavigation(direction) {
    var es = state.elements[state.focused];

    if (es.state === 'volume') {
      if (direction === 'left') {
        es.volume = Math.max(0, es.volume - 5);
        AudioManager.setVolume(state.focused, es.volume);
        saveState();
      } else if (direction === 'right') {
        es.volume = Math.min(100, es.volume + 5);
        AudioManager.setVolume(state.focused, es.volume);
        saveState();
      }
      return;
    }

    if (es.state === 'menu') {
      if (direction === 'up') {
        es.menuIndex = Math.max(0, es.menuIndex - 1);
      } else if (direction === 'down') {
        es.menuIndex = Math.min(1, es.menuIndex + 1);
      }
      return;
    }

    var target = NAV_MAP[state.focused][direction];
    if (target) {
      state.focused = target;
      ensureAnimating();
    }
  }

  function handleSelect() {
    var es = state.elements[state.focused];

    if (es.state === 'off') {
      es.state = 'playing';
      AudioManager.play(state.focused);
      ensureAnimating();
    } else if (es.state === 'playing') {
      es.state = 'menu';
      es.menuIndex = 0;
    } else if (es.state === 'menu') {
      if (es.menuIndex === 0) {
        es.state = 'volume';
      } else {
        es.state = 'off';
        AudioManager.stop(state.focused);
        resetElementAnimation(es);
        saveState();
        checkIdleMode();
      }
    } else if (es.state === 'volume') {
      es.state = 'playing';
      saveState();
    }
  }

  function handleEscape() {
    var es = state.elements[state.focused];
    if (es.state === 'volume') {
      es.state = 'menu';
    } else if (es.state === 'menu') {
      es.state = 'playing';
    }
  }

  document.addEventListener('keydown', function(e) {
    if (AudioManager.ctx && AudioManager.ctx.state === 'suspended') AudioManager.ctx.resume();
    state.lastInputTime = Date.now();
    switch (e.key) {
      case 'ArrowUp':    handleNavigation('up');    e.preventDefault(); break;
      case 'ArrowDown':  handleNavigation('down');  e.preventDefault(); break;
      case 'ArrowLeft':  handleNavigation('left');  e.preventDefault(); break;
      case 'ArrowRight': handleNavigation('right'); e.preventDefault(); break;
      case 'Enter':      handleSelect();            e.preventDefault(); break;
      case 'Escape':     handleEscape();            e.preventDefault(); break;
    }
    ensureAnimating();
  });

  // ==================== GAME LOOP ====================
  var animationId = null;
  var lastFrameTime = 0;
  var isAnimating = false;

  function gameLoop(timestamp) {
    animationId = requestAnimationFrame(gameLoop);
    var delta = timestamp - lastFrameTime;
    if (delta < FRAME_INTERVAL) return;
    lastFrameTime = timestamp - (delta % FRAME_INTERVAL);
    update(delta);
    render();
  }

  function ensureAnimating() {
    if (!isAnimating) {
      isAnimating = true;
      lastFrameTime = performance.now();
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  function stopLoop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    isAnimating = false;
  }

  function checkIdleMode() {
    var anyActive = false;
    ELEMENTS.forEach(function(el) {
      if (state.elements[el.id].state !== 'off') anyActive = true;
    });
    if (!anyActive) {
      stopLoop();
      render();
    }
  }

  // ==================== PERSISTENCE ====================
  var STORAGE_KEY = 'mdg_lofiroom';

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.volumes) {
        Object.keys(saved.volumes).forEach(function(id) {
          if (state.elements[id]) {
            state.elements[id].volume = saved.volumes[id];
          }
        });
      }
    } catch (e) {}
  }

  function saveState() {
    var volumes = {};
    ELEMENTS.forEach(function(el) {
      volumes[el.id] = state.elements[el.id].volume;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volumes: volumes }));
    } catch (e) {}
  }

  // ==================== INIT ====================
  function init() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    bgCanvas = document.createElement('canvas');
    bgCanvas.width = 600;
    bgCanvas.height = 600;
    bgCtx = bgCanvas.getContext('2d');
    bgCtx.imageSmoothingEnabled = false;

    AudioManager.init();
    loadState();
    renderStaticBackground();
    render();
    ensureAnimating();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
