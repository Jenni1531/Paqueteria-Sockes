const conexion = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5035/pedido")
    .withAutomaticReconnect()
    .build();

const btnConfirmar = document.getElementById("btnConfirmarPunto");
const tablaCoordenadas = document.getElementById("tablaCoordenadas");
const infoCliente = document.getElementById("infoCliente");

let map = L.map('map').setView([19.817, -97.359], 13);
let marcadorOrigen = null;
let marcadorDestino = null;
let marcadorSeleccionado = null; 

let puntosRecorrido = [];
let marcadoresHistorial = [];
let historialCoordenadas = [];

let lineaRuta = L.polyline([], { color: 'blue', weight: 4 }).addTo(map);
let coordsPuntoNuevo = null;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

window.addEventListener('DOMContentLoaded', () => {
    const pedidoGuardado = localStorage.getItem("pedidoCliente") || localStorage.getItem("pedidoSeleccionado");

    if (pedidoGuardado) {
        const pedido = JSON.parse(pedidoGuardado);
        infoCliente.innerText = `Cliente: ${pedido.nombre || "Sin Nombre"} | Talla: ${pedido.talla || "-"} cm`;

        const latOrigen = parseFloat(pedido.origen || pedido.origenLat);
        const lngOrigen = parseFloat(pedido.origen2 || pedido.origenLng);
        const latDestino = parseFloat(pedido.destino || pedido.destinoLat);
        const lngDestino = parseFloat(pedido.destino2 || pedido.destinoLng);

        if (latOrigen && lngOrigen) {
            marcadorOrigen = L.marker([latOrigen, lngOrigen]).addTo(map).bindPopup("<b>Origen de Envío</b>");
            puntosRecorrido.push([latOrigen, lngOrigen]);
            map.setView([latOrigen, lngOrigen], 13);
        }

        if (latDestino && lngDestino) {
            marcadorDestino = L.marker([latDestino, lngDestino]).addTo(map).bindPopup("<b>Destino Final</b>");
        }

        const historialGuardado = localStorage.getItem("historialRuta");
        if (historialGuardado) {
            historialCoordenadas = JSON.parse(historialGuardado);
            historialCoordenadas.forEach((item, index) => {
                const pos = [item.lat, item.lng];
                puntosRecorrido.push(pos);

                const pin = L.marker(pos).addTo(map)
                    .bindPopup(`<b>Punto ${index + 1}</b><br>Estado: ${item.estatus}`);
                marcadoresHistorial.push(pin);

                agregarFilaCoordenada(item.lat, item.lng, item.estatus, item.hora);
            });
        }

        actualizarLineaAzul();
    }
});

function actualizarLineaAzul() {
    if (marcadorDestino) {
        lineaRuta.setLatLngs([...puntosRecorrido, marcadorDestino.getLatLng()]);
    } else {
        lineaRuta.setLatLngs(puntosRecorrido);
    }
}

map.on('click', (e) => {
    let lat = e.latlng.lat.toFixed(6);
    let lng = e.latlng.lng.toFixed(6);

    coordsPuntoNuevo = [parseFloat(lat), parseFloat(lng)];

    if (marcadorSeleccionado) {
        marcadorSeleccionado.setLatLng(coordsPuntoNuevo);
    } else {
        marcadorSeleccionado = L.marker(coordsPuntoNuevo, { opacity: 0.7 }).addTo(map);
    }

    marcadorSeleccionado.bindPopup(`<b>Nuevo Punto</b><br>${lat}, ${lng}`).openPopup();
    btnConfirmar.disabled = false;
});

btnConfirmar.addEventListener("click", async () => {
    if (!coordsPuntoNuevo) return;

    const lat = coordsPuntoNuevo[0];
    const lng = coordsPuntoNuevo[1];
    const estatus = "En Tránsito";

    try {
        await conexion.invoke("actualizarRuta", lat, lng, estatus);
        btnConfirmar.disabled = true;
        if (marcadorSeleccionado) {
            map.removeLayer(marcadorSeleccionado);
            marcadorSeleccionado = null;
        }
    } catch (err) {
        console.error("Error SignalR:", err);
    }
});

conexion.on("actualizacionRuta", (lat, lng, estatus) => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const nuevaPosicion = [latNum, lngNum];
    const horaActual = new Date().toLocaleTimeString();

    const nuevoPin = L.marker(nuevaPosicion).addTo(map)
        .bindPopup(`<b>Punto ${marcadoresHistorial.length + 1}</b><br>Estado: ${estatus}`).openPopup();
    
    marcadoresHistorial.push(nuevoPin);
    puntosRecorrido.push(nuevaPosicion);

    actualizarLineaAzul();
    map.panTo(nuevaPosicion);

    historialCoordenadas.push({ lat: latNum, lng: lngNum, estatus, hora: horaActual });
    localStorage.setItem("historialRuta", JSON.stringify(historialCoordenadas));

    agregarFilaCoordenada(latNum, lngNum, estatus, horaActual);
});

function agregarFilaCoordenada(lat, lng, estatus, hora) {
    const fila = document.createElement("tr");
    fila.innerHTML = `
        <td>${tablaCoordenadas.children.length + 1}</td>
        <td>${lat}</td>
        <td>${lng}</td>
        <td>${estatus}</td>
        <td>${hora || new Date().toLocaleTimeString()}</td>
    `;
    tablaCoordenadas.appendChild(fila);
}

conexion.start().catch(e => console.error("Error al conectar:", e));