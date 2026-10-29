const scene = document.getElementById("scene");
const viewport = document.getElementById("viewport");
const board = document.querySelector(".board");
const adcSlider = document.getElementById("adcSlider");
const adcValue = document.getElementById("adcValue");
const pa0 = document.getElementById("pa0");
const vdd = document.getElementById("vdd");
const terminal = document.getElementById("terminal");
const greenLed = document.getElementById("greenLed");
const redLed = document.getElementById("redLed");
const powerButton = document.getElementById("powerButton");
const userButton = document.getElementById("buttonUser");
const resetButton = document.getElementById("buttonReset");

let powered = false;
let rx = 58;
let rz = -18;
let zoom = 1;
let dragging = false;
let lastX = 0;
let lastY = 0;
let frame = 0;

function addPins() {
  ["leftPins", "rightPins"].forEach((id) => {
    const row = document.getElementById(id);
    for (let i = 0; i < 20; i++) {
      const pin = document.createElement("span");
      pin.className = "pin";
      row.appendChild(pin);
    }
  });
}

function log(message, muted = false) {
  const line = document.createElement("div");
  line.className = muted ? "terminal-line muted" : "terminal-line";
  line.textContent = message;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function updatePower() {
  powered = !powered;
  powerButton.classList.toggle("on", powered);
  greenLed.classList.toggle("on", powered);
  vdd.textContent = powered ? "3.30 V" : "0.00 V";
  document.getElementById("buttonReset").classList.toggle("active", false);

  if (powered) {
    log("Boot: STM32F103C8T6");
    log("Clock configured: 72 MHz");
    log("GPIOC13: output high");
  } else {
    cancelAnimationFrame(frame);
    greenLed.classList.remove("on");
    redLed.classList.remove("on");
    log("Power removed", true);
  }
}

function updateADC() {
  const percent = Number(adcSlider.value);
  adcValue.value = `${percent}%`;
  adcValue.textContent = `${percent}%`;
  pa0.textContent = powered ? `${(percent * 0.033).toFixed(3)} V` : "0.000 V";
  if (powered) log(`ADC1_IN0 = ${Math.round(percent * 40.95)} (${percent}%)`);
}

function blinkLed() {
  if (!powered) return;
  greenLed.classList.toggle("on");
  frame = setTimeout(blinkLed, 650);
}

function applyTransform() {
  board.style.setProperty("--rx", `${rx}deg`);
  board.style.setProperty("--rz", `${rz}deg`);
  board.style.setProperty("--zoom", zoom.toFixed(2));
}

viewport.addEventListener("pointerdown", (event) => {
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  viewport.setPointerCapture(event.pointerId);
});

viewport.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  rz += (event.clientX - lastX) * 0.25;
  rx -= (event.clientY - lastY) * 0.18;
  rx = Math.max(20, Math.min(78, rx));
  lastX = event.clientX;
  lastY = event.clientY;
  applyTransform();
});

viewport.addEventListener("pointerup", () => { dragging = false; });
viewport.addEventListener("pointercancel", () => { dragging = false; });

viewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoom = Math.max(0.65, Math.min(1.45, zoom - event.deltaY * 0.001));
  applyTransform();
}, { passive: false });

powerButton.addEventListener("click", () => {
  updatePower();
  if (powered) {
    clearTimeout(frame);
    blinkLed();
  }
});

adcSlider.addEventListener("input", updateADC);

userButton.addEventListener("pointerdown", () => {
  userButton.classList.add("active");
  if (powered) {
    redLed.classList.add("on");
    log("PA0: USER button pressed");
  }
});
userButton.addEventListener("pointerup", () => {
  userButton.classList.remove("active");
  redLed.classList.remove("on");
});

resetButton.addEventListener("click", () => {
  if (!powered) return;
  resetButton.classList.add("active");
  log("RESET pulse detected", true);
  setTimeout(() => resetButton.classList.remove("active"), 180);
  setTimeout(() => log("System reset complete"), 400);
});

document.querySelector(".board-button.user-button").addEventListener("pointerdown", () => {
  if (powered) {
    redLed.classList.add("on");
    log("PA0: USER button pressed");
  }
});
document.querySelector(".board-button.user-button").addEventListener("pointerup", () => {
  redLed.classList.remove("on");
});
document.querySelector(".board-button.reset-button").addEventListener("pointerdown", resetButton.click.bind(resetButton));

document.getElementById("clearLog").addEventListener("click", () => {
  terminal.innerHTML = '<div class="terminal-line muted">Console cleared</div>';
});

addPins();
applyTransform();
