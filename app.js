// Nick Roller — Mini App logic
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const NICK_POOL = {};
let state = {
  coins: 0,
  inventory: [],
  luckyBoost: false
};

const RARITY_CHANCE = {
  common: 0.60,
  rare: 0.25,
  epic: 0.12,
  legendary: 0.03
};

const SELL_PRICE = {
  common: 5,
  rare: 25,
  epic: 150,
  legendary: 1000
};

const SPIN_COST = 50;

async function loadPool() {
  try {
    const r = await fetch("nick_pool.json");
    const data = await r.json();
    Object.assign(NICK_POOL, data);
  } catch (e) {
    console.log("Pool load error:", e);
  }
}

function loadState() {
  const saved = localStorage.getItem("nickroller_state");
  if (saved) {
    try { state = JSON.parse(saved); } catch (e) {}
  }
  updateUI();
}

function saveState() {
  localStorage.setItem("nickroller_state", JSON.stringify(state));
}

function rollRarity() {
  let r = Math.random();
  if (state.luckyBoost) r = r * 0.6;
  let acc = 0;
  for (const [rarity, chance] of Object.entries(RARITY_CHANCE)) {
    acc += chance;
    if (r <= acc) return rarity;
  }
  return "common";
}

function pickNick(rarity) {
  const pool = NICK_POOL[rarity] || [];
  if (pool.length === 0) return "nick_" + Math.floor(Math.random() * 9999);
  return pool[Math.floor(Math.random() * pool.length)];
}

async function spin() {
  if (state.coins < SPIN_COST) {
    tg.showAlert("Недостаточно Coins");
    return;
  }
  state.coins -= SPIN_COST;
  updateUI();

  const btn = document.getElementById("spin-btn");
  btn.disabled = true;

  const display = document.getElementById("nick-display");
  const text = document.getElementById("nick-text");
  const rarityLabel = document.getElementById("nick-rarity");

  for (let i = 0; i < 15; i++) {
    const rndRarity = ["common", "rare", "epic", "legendary"][Math.floor(Math.random() * 4)];
    text.textContent = pickNick(rndRarity);
    display.className = "nick-display " + rndRarity;
    await new Promise(r => setTimeout(r, 60 + i * 10));
  }

  const rarity = rollRarity();
  const nick = pickNick(rarity);

  text.textContent = nick;
  display.className = "nick-display " + rarity;
  rarityLabel.textContent = rarity.toUpperCase();

  state.inventory.push({ nick, rarity, ts: Date.now() });
  saveState();
  updateUI();
  btn.disabled = false;

  if (rarity === "legendary" && tg.HapticFeedback) {
    tg.HapticFeedback.notificationOccurred("success");
  }
}

function sellNick(index) {
  const item = state.inventory[index];
  if (!item) return;
  const price = SELL_PRICE[item.rarity];
  state.coins += price;
  state.inventory.splice(index, 1);
  saveState();
  updateUI();
  if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
}

function updateUI() {
  document.getElementById("coins").textContent = state.coins;
  const user = tg.initDataUnsafe?.user?.username || "user";
  document.getElementById("username").textContent = user;

  const inv = document.getElementById("inventory-list");
  inv.innerHTML = "";
  state.inventory.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "inv-item " + item.rarity;
    div.textContent = item.nick;
    div.title = "Продать за " + SELL_PRICE[item.rarity] + " 🪙";
    div.onclick = () => sellNick(i);
    inv.appendChild(div);
  });
}

function buyCoins(stars, coins) {
  tg.showConfirm("Купить " + coins + " Coins за " + stars + " ★?", (ok) => {
    if (!ok) return;
    tg.sendData(JSON.stringify({ action: "buy_coins", stars, coins }));
  });
}

function buyBoost(stars, type) {
  tg.showConfirm("Активировать Lucky Boost за " + stars + " ★?", (ok) => {
    if (!ok) return;
    tg.sendData(JSON.stringify({ action: "buy_boost", stars, type }));
  });
}

(async () => {
  await loadPool();
  loadState();
  document.getElementById("spin-btn").onclick = spin;
  document.querySelectorAll(".buy-btn").forEach(btn => {
    btn.onclick = () => buyCoins(parseInt(btn.dataset.stars), parseInt(btn.dataset.coins));
  });
  document.querySelectorAll(".boost-btn").forEach(btn => {
    btn.onclick = () => buyBoost(parseInt(btn.dataset.stars), btn.dataset.boost);
  });
})();
