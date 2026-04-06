// Inicializar iconos
lucide.createIcons();

// --- DOM Elements ---
const inputs = {
    solarPower: document.getElementById('solarPower'),
    batterySize: document.getElementById('batterySize'),
    yearlyConsumption: document.getElementById('yearlyConsumption'),
    pricePeak: document.getElementById('pricePeak'),
    priceOffPeak: document.getElementById('priceOffPeak'),
    priceSell: document.getElementById('priceSell')
};

const displays = {
    solarPowerVal: document.getElementById('solarPowerVal'),
    batterySizeVal: document.getElementById('batterySizeVal'),
    yearlyConsumptionVal: document.getElementById('yearlyConsumptionVal')
};

const results = {
    costNoBattery: document.getElementById('costNoBattery'),
    selfConsNoBat: document.getElementById('selfConsNoBat'),
    soldNoBat: document.getElementById('soldNoBat'),
    
    costWithBattery: document.getElementById('costWithBattery'),
    selfConsBat: document.getElementById('selfConsBat'),
    soldBat: document.getElementById('soldBat'),

    compBatSize: document.getElementById('compBatSize'),
    compSavings: document.getElementById('compSavings'),
    savingsFill: document.getElementById('savingsFill')
};

// --- Constantes para simulación ---
const SUN_HOURS_PER_YEAR = 1600; // Producción media en España
// Perfil de consumo simplificado: % en valle vs pico (para quien no tiene batería)
// Asumimos un 50% valle, 50% pico para simplificar, pero el sol da energía por el día.
// Asumiremos que el 40% del consumo ocurre mientras hay sol directamente.
const SOLAR_DIRECT_CONSUMPTION = 0.40; 
// Del consumo con energía de red, porcentaje en valle vs pico
const GRID_OFF_PEAK_RATIO = 0.60; 

// --- Lógica del Simulador ---
function formatCurrency(amount) {
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function updateDisplays() {
    displays.solarPowerVal.textContent = `${inputs.solarPower.value} kW`;
    displays.batterySizeVal.textContent = `${inputs.batterySize.value} kWh`;
    displays.yearlyConsumptionVal.textContent = `${inputs.yearlyConsumption.value} kWh`;
    results.compBatSize.textContent = `${inputs.batterySize.value} kWh`;
}

function simulate() {
    const powerKw = parseFloat(inputs.solarPower.value);
    const batCapKwh = parseFloat(inputs.batterySize.value);
    const yearlyCons = parseFloat(inputs.yearlyConsumption.value);
    const pPeak = parseFloat(inputs.pricePeak.value);
    const pOffP = parseFloat(inputs.priceOffPeak.value);
    const pSell = parseFloat(inputs.priceSell.value);

    // Generación total en el año
    const totalGen = powerKw * SUN_HOURS_PER_YEAR;

    // --- OPCIÓN A: Sin batería ---
    // Consumo directo de sol (hasta donde cubra la generación)
    let directConsA = Math.min(totalGen, yearlyCons * SOLAR_DIRECT_CONSUMPTION);
    let surplusA = Math.max(0, totalGen - directConsA);
    let gridDemandA = Math.max(0, yearlyCons - directConsA);
    
    let costA = calculateGridCost(gridDemandA, pPeak, pOffP) - (surplusA * pSell);
    let selfConsPercentageA = ((directConsA) / totalGen) * 100 || 0;

    // --- OPCIÓN B: Con batería ---
    // La batería cicla cada día. Estimamos 365 ciclos al año.
    // Total de energía que puede guardar al año = cap * 365
    let batMaxYearly = batCapKwh * 365;
    
    // Primero, consumo directo
    let directConsB = directConsA; 
    let surplusBeforeBatB = surplusA;
    let gridDemandBeforeBatB = gridDemandA;
    
    // La batería absorbe el remanente, hasta su capacidad
    let batChargeB = Math.min(surplusBeforeBatB, batMaxYearly);
    let surplusFinalB = surplusBeforeBatB - batChargeB;
    
    // La batería descarga para cubrir demanda de red, asumiendo una eficiencia del 90%
    let batDischargeB = Math.min(gridDemandBeforeBatB, batChargeB * 0.90);
    let gridDemandFinalB = gridDemandBeforeBatB - batDischargeB;

    let costB = calculateGridCost(gridDemandFinalB, pPeak, pOffP) - (surplusFinalB * pSell);
    let selfConsPercentageB = ((directConsB + batChargeB) / totalGen) * 100 || 0;

    // Render results
    results.costNoBattery.textContent = formatCurrency(Math.max(0, costA)); // No dejamos coste negativo para simplificar o mostramos ingresos
    if(costA < 0) results.costNoBattery.textContent = `A favor: ${formatCurrency(Math.abs(costA))}`;
    
    results.selfConsNoBat.textContent = `${selfConsPercentageA.toFixed(1)}%`;
    results.soldNoBat.textContent = `${Math.round(surplusA)} kWh`;

    results.costWithBattery.textContent = formatCurrency(Math.max(0, costB));
    if(costB < 0) results.costWithBattery.textContent = `A favor: ${formatCurrency(Math.abs(costB))}`;
    
    results.selfConsBat.textContent = `${selfConsPercentageB.toFixed(1)}%`;
    results.soldBat.textContent = `${Math.round(surplusFinalB)} kWh`;

    // Impact
    let savings = costA - costB;
    if (savings < 0) savings = 0; // Battery shouldn't cost more to operate unless efficiency ruins it with strange tariffs, handled loosely
    results.compSavings.textContent = formatCurrency(savings);

    let maxPossibleSavings = batMaxYearly * pPeak; // Rough max baseline
    let fillPct = maxPossibleSavings > 0 ? Math.min(100, (savings / maxPossibleSavings) * 100 * 3) : 0; 
    // * 3 multiplier is just for UI visual pop in the bar
    results.savingsFill.style.width = `${fillPct}%`;
}

function calculateGridCost(demand, peak, offpeak) {
    let peakDemand = demand * (1 - GRID_OFF_PEAK_RATIO);
    let offPeakDemand = demand * GRID_OFF_PEAK_RATIO;
    return (peakDemand * peak) + (offPeakDemand * offpeak);
}

// Event Listeners
Object.values(inputs).forEach(input => {
    input.addEventListener('input', () => {
        updateDisplays();
        simulate();
    });
});

// Init
updateDisplays();
simulate();
