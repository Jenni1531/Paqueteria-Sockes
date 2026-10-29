let map = L.map('map').setView([19.883504, -97.393235], 5);
const btn = document.getElementById("btnEnviar");
const btnHistorial = document.getElementById("btnHistorial");

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

const conexion = new signalR.HubConnectionBuilder()
    .withUrl("http://172.16.23.204:5000/pedido")
    .withAutomaticReconnect()
    .build();

let marcadorOrigen = null;
let marcadorDestino = null;

let puntosRecorrido = [];
let marcadoresHistorial = [];

// Única línea azul base que une todo el trayecto
let lineaRuta = L.polyline([], { color: 'blue', weight: 4 }).addTo(map);

function actualizarLineaAzul() {
    if (marcadorDestino) {
        lineaRuta.setLatLngs([...puntosRecorrido, marcadorDestino.getLatLng()]);
    } else {
        lineaRuta.setLatLngs(puntosRecorrido);
    }
}

function congelarFormulario(p) {
    ["Nombre", "Telefono", "Talla", "Origen", "Origen2", "Destino", "Destino2"].forEach(id => {
        const el = document.getElementById(`txt${id}`);
        if (el && p[id.toLowerCase()]) el.value = p[id.toLowerCase()];
        if (el) el.disabled = true;
    });

    if (btn) {
        btn.disabled = true;
        btn.innerText = "Pedido Registrado";
    }

    puntosRecorrido = [];

    if (p.origen && p.origen2) {
        if (marcadorOrigen) map.removeLayer(marcadorOrigen);
        marcadorOrigen = L.marker([p.origen, p.origen2]).addTo(map).bindPopup("<b>Origen</b>");
        puntosRecorrido.push([p.origen, p.origen2]);
    }

    if (p.destino && p.destino2) {
        if (marcadorDestino) map.removeLayer(marcadorDestino);
        marcadorDestino = L.marker([p.destino, p.destino2]).addTo(map).bindPopup("<b>Destino</b>");
    }

    // Cargar marcadores de puntos intermedios persistidos en localStorage
    const historialGuardado = localStorage.getItem("historialRuta");
    if (historialGuardado) {
        const historialCoordenadas = JSON.parse(historialGuardado);
        historialCoordenadas.forEach((item, index) => {
            const pos = [item.lat, item.lng];
            puntosRecorrido.push(pos);

            const pin = L.marker(pos).addTo(map)
                .bindPopup(`<b>Punto ${index + 1}</b><br>Estado: ${item.estatus}`);
            marcadoresHistorial.push(pin);
        });
    }

    actualizarLineaAzul();
}

async function obtenerOrigenAsync() {
    try {
        const pos = await new Promise((res, rej) => 
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        let lat = pos.coords.latitude.toFixed(6), lng = pos.coords.longitude.toFixed(6);

        marcadorOrigen = L.marker([lat, lng]).addTo(map).bindPopup(`<b>Origen (GPS)</b><br>${lat}, ${lng}`);
        document.getElementById('txtOrigen').value = lat;
        document.getElementById('txtOrigen2').value = lng;
        puntosRecorrido = [[parseFloat(lat), parseFloat(lng)]];
    } catch {
        marcadorOrigen = L.marker([19.817, -97.359]).addTo(map);
        document.getElementById('txtOrigen').value = "19.817";
        document.getElementById('txtOrigen2').value = "-97.359";
        puntosRecorrido = [[19.817, -97.359]];
    }
    actualizarLineaAzul();
}

window.addEventListener('DOMContentLoaded', async () => {
    const guardado = localStorage.getItem("pedidoCliente");
    if (guardado) congelarFormulario(JSON.parse(guardado));
    else await obtenerOrigenAsync();
});

map.on('click', (e) => {
    if (btn && btn.disabled) return;
    let lat = e.latlng.lat.toFixed(6), lng = e.latlng.lng.toFixed(6);

    if (marcadorDestino) marcadorDestino.setLatLng(e.latlng);
    else marcadorDestino = L.marker(e.latlng).addTo(map);

    marcadorDestino.bindPopup(`<b>Destino</b><br>${lat}, ${lng}`).openPopup();
    document.getElementById('txtDestino').value = lat;
    document.getElementById('txtDestino2').value = lng;
    actualizarLineaAzul();
});

conexion.on("actualizacionRuta", (lat, lng, estatus) => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const nuevaPosicion = [latNum, lngNum];

    const nuevoPin = L.marker(nuevaPosicion).addTo(map)
        .bindPopup(`<b>Punto ${marcadoresHistorial.length + 1}</b><br>Estado: ${estatus}`).openPopup();
    
    marcadoresHistorial.push(nuevoPin);
    puntosRecorrido.push(nuevaPosicion);

    actualizarLineaAzul();
    map.panTo(nuevaPosicion);

    let historial = [];
    const guardado = localStorage.getItem("historialRuta");
    if (guardado) historial = JSON.parse(guardado);

    historial.push({ lat: latNum, lng: lngNum, estatus, hora: new Date().toLocaleTimeString() });
    localStorage.setItem("historialRuta", JSON.stringify(historial));
});

if (btn) {
    btn.addEventListener("click", async () => {
        const pedido = {
            nombre: document.getElementById("txtNombre").value,
            telefono: document.getElementById("txtTelefono").value,
            talla: parseInt(document.getElementById("txtTalla").value) || 0,
            origen: parseFloat(document.getElementById("txtOrigen").value) || 0,
            origen2: parseFloat(document.getElementById("txtOrigen2").value) || 0,
            destino: parseFloat(document.getElementById("txtDestino").value) || 0,
            destino2: parseFloat(document.getElementById("txtDestino2").value) || 0
        };

        if (!pedido.nombre || !pedido.destino) return alert("Completa los campos obligatorios.");

        localStorage.setItem("pedidoCliente", JSON.stringify(pedido));
        congelarFormulario(pedido);

        try {
            await conexion.invoke("generarPedido", pedido.nombre, pedido.telefono, pedido.talla, pedido.origen, pedido.origen2, pedido.destino, pedido.destino2);
        } catch (e) {
            console.error("Error SignalR:", e);
        }
    });
}

btnHistorial.addEventListener("click", () => {
    window.location.href = "Tabla.html";
});

conexion.start()
        .then(()=> console.log("Conexion Exitosa"))
        .catch(e => console.log("Error al conectar"));