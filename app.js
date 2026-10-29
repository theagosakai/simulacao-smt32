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
const boardElement = document.querySelector(".board");

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

const componentData = {
  mcu: {
    id: "MCU-01", type: "MICROCONTROLADOR", name: "STM32F103C8T6",
    description: "CPU ARM Cortex-M3 de 32 bits. Unidade central do módulo Blue Pill.",
    preview: "STM32", specs: [["Núcleo","Cortex-M3"],["Flash","64 KB"],["SRAM","20 KB"],["Clock","72 MHz"]],
    pins: [["PA0","ADC"],["PA13","SWDIO"],["PA14","SWCLK"],["PC13","LED"],["GND","0 V"]]
  },
  crystal: {
    id: "OSC-01", type: "OSCILADOR", name: "Cristal 8 MHz",
    description: "Oscilador externo da alta velocidade. Alimenta o PLL que gera os 72 MHz.",
    preview: "8 MHz", specs: [["Frequência","8 MHz"],["Tipo","HSE"],["Faixa","20–40 pF"],["Tolerância","±30 ppm"]],
    pins: [["PD0","OSC_IN"],["PD1","OSC_OUT"]]
  },
  "led-green": {
    id: "LED-01", type: "LED INDICADOR", name: "LED de alimentação",
    description: "Indicador verde conectado à alimentação da placa.",
    preview: "PWR", specs: [["Cor","Verde"],["Tensão","3.0 V"],["Corrente","~5 mA"],["Estado","VDD ligado"]],
    pins: [["VDD","3.3 V"],["GND","0 V"]]
  },
  "led-red": {
    id: "LED-02", type: "LED INDICADOR", name: "LED PC13",
    description: "LED vermelho indicativo conectado ao PC13. Pode ser usado pelo firmware.",
    preview: "PC13", specs: [["Cor","Vermelho"],["Pino","PC13"],["Polaridade","Ativo baixo"],["Driver","GPIO"]],
    pins: [["PC13","GPIO"],["GND","0 V"]]
  },
  usb: {
    id: "USB-01", type: "INTERFACE", name: "USB Micro-B",
    description: "Conector USB para alimentação de 5 V e programação usando bootloader DFU.",
    preview: "USB", specs: [["Conector","Micro-B"],["Tensão","5 V"],["Dados","DM/DP"],["Protocolos","USB CDC/DFU"]],
    pins: [["VBUS","5 V"],["USB_DM","PA11"],["USB_DP","PA12"],["GND","0 V"]]
  },
  regulator: {
    id: "REG-01", type: "REGULADOR", name: "Conversor LM1117 3.3 V",
    description: "Reduz a tensão de entrada USB/VIN para a alimentação de 3.3 V da lógica.",
    preview: "3.3 V", specs: [["Entrada","5–12 V"],["Saída","3.3 V"],["Corrente","800 mA"],["Tipo","LDO"]],
    pins: [["VIN","5–12 V"],["VOUT","3.3 V"],["GND","0 V"]]
  },
  "button-user": {
    id: "BTN-01", type: "CHAVE TÁTIL", name: "USER / KEY",
    description: "Botão programável do usuário. Simula uma entrada digital em PA0.",
    preview: "KEY", specs: [["Contato","NO"],["Pino","PA0"],["Pull","Externo"],["Estados","Aberto/fechado"]],
    pins: [["PA0","Entrada"],["GND","Referência"]]
  },
  "button-reset": {
    id: "BTN-02", type: "CHAVE TÁTIL", name: "RESET / NRST",
    description: "Pulsa o pino NRST para reiniciar completamente o microcontrolador.",
    preview: "RST", specs: [["Contato","NO"],["Pino","NRST"],["Ação","Hardware reset"],["Pulso","Baixo"]],
    pins: [["NRST","RESET"],["GND","Referência"]]
  }
};

function inspectComponent(key) {
  const data = componentData[key] || componentData.mcu;
  document.querySelectorAll(".inspectable.selected").forEach((element) => element.classList.remove("selected"));
  document.querySelector(`[data-component="${key}"]`)?.classList.add("selected");
  document.getElementById("partId").textContent = data.id;
  document.querySelector(".chip-preview").textContent = data.preview;
  document.getElementById("componentType").textContent = data.type;
  document.getElementById("componentName").textContent = data.name;
  document.getElementById("componentDescription").textContent = data.description;
  document.getElementById("componentSpecs").innerHTML = data.specs
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  document.getElementById("pinList").innerHTML = data.pins
    .map(([pin, functionName]) => `<button type="button" data-pin="${pin}">${pin} <span>${functionName}</span></button>`).join("");
  log(`Inspecionado: ${data.name}`);
}

document.querySelectorAll(".inspectable").forEach((element) => {
  element.addEventListener("click", (event) => {
    event.stopPropagation();
    inspectComponent(element.dataset.component);
  });
});

document.querySelectorAll(".view-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".view-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    boardElement.classList.remove("exploded-mode", "pins-mode");
    const view = button.dataset.view;
    if (view === "top") {
      rx = 0; rz = 0; zoom = 1.05;
    } else if (view === "exploded") {
      rx = 52; rz = -18; zoom = 0.95; boardElement.classList.add("exploded-mode");
    } else if (view === "pins") {
      rx = 58; rz = -18; zoom = 1; boardElement.classList.add("pins-mode");
      inspectComponent("mcu");
    } else {
      rx = 58; rz = -18; zoom = 1;
    }
    applyTransform();
  });

  const projects = [
    {
      name: "Estação de temperatura IoT",
      level: "Iniciante", complexity: 2, price: 170, time: "2–3 sessões",
      description: "Sensor, display e envio dos dados por Wi-Fi para uma página de monitoramento.",
      components: ["DS18B20", "OLED 0.96", "ESP01", "STM32"]
    },
    {
      name: "Controlador PWM de motor",
      level: "Intermediário", complexity: 4, price: 280, time: "4–6 horas",
      description: "Controle de velocidade de motor DC com ponte H, encoder e interface local.",
      components: ["TB6612FNG", "Motor DC", "Encoder", "OLED"]
    },
    {
      name: "Osciloscópio portátil",
      level: "Avançado", complexity: 5, price: 420, time: "8–12 horas",
      description: "Aquisição analógica rápida, trigger e desenho de formas de onda na tela TFT.",
      components: ["TFT 2.4", "ADC DMA", "OPA2350", "STM32"]
    },
    {
      name: "Automação de estufa",
      level: "Intermediário", complexity: 3, price: 360, time: "6–8 horas",
      description: "Controle de umidade, temperatura, ventilação, iluminação e bombas com logs.",
      components: ["DHT22", "Relés", "RTC", "Bomba 5V"]
    }
  ];

  const projectsSession = document.getElementById("projectsSession");
  const budgetRange = document.getElementById("budgetRange");
  const budgetLabel = document.getElementById("budgetLabel");
  const projectGrid = document.getElementById("projectGrid");
  const comparisonBody = document.getElementById("comparisonBody");
  const comparisonCount = document.getElementById("comparisonCount");

  function renderProjects() {
    const budget = Number(budgetRange.value);
    budgetLabel.textContent = budget >= 1000 ? "Até R$ 1.000+" : `Até R$ ${budget}`;
    let visibleCount = 0;

    projectGrid.innerHTML = projects.map((project) => {
      const overBudget = project.price > budget;
      if (!overBudget) visibleCount++;
      const dots = Array.from({ length: 5 }, (_, index) =>
        `<i class="${index < project.complexity ? "on" : ""}"></i>`).join("");
      return `
        <article class="project-card ${overBudget ? "over-budget" : ""}">
          <div class="project-card-header">
            <h3>${project.name}</h3>
            <span class="project-level ${project.level.toLowerCase().replace("á","a")}">${project.level}</span>
          </div>
          <p>${project.description}</p>
          <div class="project-components">${project.components.map((item) => `<span>${item}</span>`).join("")}</div>
          <div class="project-footer">
            <div class="project-price">R$ ${project.price}<small>estimativa de peças</small></div>
            <div class="project-time">${project.time}<br>${dots ? `<span class="complex-bar">${dots}</span>` : ""}</div>
          </div>
        </article>`;
    }).join("");

    comparisonBody.innerHTML = projects.map((project) => {
      const dots = Array.from({ length: 5 }, (_, index) =>
        `<i class="${index < project.complexity ? "on" : ""}"></i>`).join("");
      return `<tr>
        <td><strong>${project.name}</strong></td>
        <td>${project.level}</td>
        <td><span class="complex-bar">${dots}</span></td>
        <td>${project.time}</td>
        <td>R$ ${project.price}–R$ ${project.price + 120}</td>
      </tr>`;
    }).join("");

    comparisonCount.textContent = `${visibleCount} compatíveis · ${projects.length} opções`;
  }

  document.getElementById("projectsButton").addEventListener("click", () => {
    projectsSession.classList.add("open");
    projectsSession.setAttribute("aria-hidden", "false");
    renderProjects();
  });

  function closeProjects() {
    projectsSession.classList.remove("open");
    projectsSession.setAttribute("aria-hidden", "true");
  }

  document.getElementById("projectsClose").addEventListener("click", closeProjects);
  document.querySelector(".projects-backdrop").addEventListener("click", closeProjects);
  budgetRange.addEventListener("input", renderProjects);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProjects();
  });
});

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
