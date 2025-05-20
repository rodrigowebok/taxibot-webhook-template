require('dotenv').config();
const express = require('express');
const { WebhookClient } = require('dialogflow-fulfillment');
const axios = require('axios');
const app = express();
app.use(express.json());

async function calculateFare(origin, destination, dateTime) {
  const key = process.env.AIzaSyBjpZsBxb3UNQCHMbIG9wLK8AFkH5I5Vgc;
  const url = `https://maps.googleapis.com/maps/api/directions/json`
    + `?origin=${encodeURIComponent(origin)}`
    + `&destination=${encodeURIComponent(destination)}`
    + `&mode=driving&departure_time=${Math.floor(dateTime.getTime()/1000)}`
    + `&traffic_model=best_guess&key=${key}`;
  const res = await axios.get(url);
  const leg = res.data.routes[0].legs[0];
  const km = leg.distance.value / 1000;
  // lógica de tarifa
  let fare = 62.98 + (km * 40);
  const hour = dateTime.getHours();
  const day = dateTime.getDay(); // 0=dom,1=lun...
  // Aquí iría llamada a Nager.Date para feriado (omito por brevedad)
  if (hour >= 22 || hour < 6 || day === 0 /*|| esFeriado*/) fare *= 1.2;
  // recargo fuera de Montevideo 65% se aplicaría según lógica adicional
  return fare.toFixed(2);
}

app.post('/webhook', async (req, res) => {
  const agent = new WebhookClient({ request: req, response: res });
  async function cotizar(agent) {
    const { origin, destination, date, time } = agent.parameters;
    const dt = new Date(`${date}T${time}`);
    const fare = await calculateFare(origin, destination, dt);
    agent.add(`El costo estimado es $${fare}`);
  }
  let map = new Map();
  map.set('Cotizar Viaje', cotizar);
  agent.handleRequest(map);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('El webhook está corriendo');
});
