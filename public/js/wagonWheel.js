(function () {
  var canvas = document.getElementById("wagonWheelCanvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;
  var cx = W / 2, cy = H / 2;
  var R = Math.min(W, H) * 0.46;

  var shotType = "ground"; // default
  var shots = []; // {ring:0..2, sector:0..7, type:"ground"/"aerial"}

  var groundEl = document.getElementById("groundCount");
  var aerialEl = document.getElementById("aerialCount");
  var totalEl = document.getElementById("totalCount");
  var hidden = document.getElementById("shotMapJson");

  var btnGround = document.getElementById("shotTypeGround");
  var btnAerial = document.getElementById("shotTypeAerial");
  var btnUndo = document.getElementById("shotUndo");
  var btnClear = document.getElementById("shotClear");

  function loadExistingShots() {
  if (!hidden) return;

  var raw = hidden.value || "[]";
  try {
    var arr = JSON.parse(raw);
    if (Array.isArray(arr)) shots = arr;
  } catch (e) {
    // leave shots as []
  }
}

  function setType(t) {
    shotType = t;
    if (btnGround && btnAerial) {
      btnGround.classList.toggle("active", t === "ground");
      btnAerial.classList.toggle("active", t === "aerial");
    }
  }

  if (btnGround) btnGround.addEventListener("click", function(){ setType("ground"); });
  if (btnAerial) btnAerial.addEventListener("click", function(){ setType("aerial"); });

  if (btnUndo) btnUndo.addEventListener("click", function () {
    shots.pop();
    sync();
    draw();
  });

  if (btnClear) btnClear.addEventListener("click", function () {
    shots = [];
    sync();
    draw();
  });

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // 3 rings (inner/mid/outer), 8 sectors
  function hitTest(x, y) {
    var dx = x - cx, dy = y - cy;
    var dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > R) return null;

    // ring
    var ring = 0;
    var r1 = R * 0.33;
    var r2 = R * 0.66;
    if (dist > r2) ring = 2;
    else if (dist > r1) ring = 1;

    // sector angle: 0 at straight up, clockwise
    var ang = Math.atan2(dy, dx); // -pi..pi (0 = east)
    var a = ang + Math.PI/2;      // rotate so 0 = north
    if (a < 0) a += Math.PI * 2;

    var sector = Math.floor(a / (Math.PI * 2 / 8)); // 0..7
    sector = clamp(sector, 0, 7);

    return { ring: ring, sector: sector };
  }

  function drawPitch() {
    // pitch rectangle in the middle
    var pitchW = R * 0.35;
    var pitchH = R * 0.60;
    var px = cx - pitchW/2;
    var py = cy - pitchH/2;

    ctx.fillStyle = "#caa66a";
    ctx.fillRect(px, py, pitchW, pitchH);

    // creases
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py + pitchH*0.15); ctx.lineTo(px + pitchW, py + pitchH*0.15);
    ctx.moveTo(px, py + pitchH*0.85); ctx.lineTo(px + pitchW, py + pitchH*0.85);
    ctx.stroke();

    // stumps markers
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(cx-3, py + pitchH*0.12, 6, 6);
    ctx.fillRect(cx-3, py + pitchH*0.88 - 6, 6, 6);
  }

  function drawWheel() {
    ctx.clearRect(0,0,W,H);

    // outfield background
    ctx.fillStyle = "#0b6b3a";
    ctx.fillRect(0,0,W,H);

    // rings + sectors
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;

    // ring circles
    [R*0.33, R*0.66, R].forEach(function(rr){
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI*2);
      ctx.stroke();
    });

    // sector lines (8)
    for (var i=0;i<8;i++){
      var a = (Math.PI*2/8)*i - Math.PI/2; // start at north
      var x2 = cx + Math.cos(a)*R;
      var y2 = cy + Math.sin(a)*R;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // pitch overlay
    drawPitch();

    // draw plotted shots as small dots at ring/sector center
    for (var s=0;s<shots.length;s++){
      var sh = shots[s];
      var ringMid = (sh.ring === 0) ? R*0.17 : (sh.ring === 1 ? R*0.50 : R*0.83);
      var aMid = (Math.PI*2/8)*(sh.sector + 0.5) - Math.PI/2;

      var x = cx + Math.cos(aMid)*ringMid;
      var y = cy + Math.sin(aMid)*ringMid;

      ctx.beginPath();
      ctx.fillStyle = (sh.type === "aerial") ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)";
      ctx.arc(x, y, 6, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function sync() {
    // counts
    var g = 0, a = 0;
    for (var i=0;i<shots.length;i++){
      if (shots[i].type === "ground") g++;
      if (shots[i].type === "aerial") a++;
    }
    if (groundEl) groundEl.textContent = String(g);
    if (aerialEl) aerialEl.textContent = String(a);
    if (totalEl) totalEl.textContent = String(shots.length);

    // save to hidden field for form submit
    if (hidden) hidden.value = JSON.stringify(shots);

    // optional autosave to server (non-blocking)
    var fitIdEl = document.getElementById("fitId");
    var fitId = fitIdEl ? fitIdEl.value : "";
    if (!fitId) return;

    // debounce-ish: just fire and forget
    try {
      fetch("/fit/shotmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fitId: fitId, shot_map_json: shots })
      }).catch(function(){});
    } catch(e){}
  }

  canvas.addEventListener("click", function (evt) {
    var rect = canvas.getBoundingClientRect();
    var x = (evt.clientX - rect.left) * (canvas.width / rect.width);
    var y = (evt.clientY - rect.top) * (canvas.height / rect.height);

    var hit = hitTest(x, y);
    if (!hit) return;

    shots.push({ ring: hit.ring, sector: hit.sector, type: shotType, ts: Date.now() });
    sync();
    draw();
  });

  function draw() { drawWheel(); }

  // initial render
  setType("ground");
  loadExistingShots();
  sync();
  draw();
})();
