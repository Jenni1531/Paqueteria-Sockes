const btnRegresar = document.getElementById("btnRegresar");

const conexion = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5000/pedido")
    .withAutomaticReconnect()
    .build();

let contadorPuntos = 0;

function agregarFilaCoordenada(lat, lng, estatus, hora) {
    const tbody = document.getElementById("tablaCuerpo");
    if (!tbody) return;

    contadorPuntos++;
    const horaFila = hora || new Date().toLocaleTimeString();
    const fila = document.createElement("tr");

    fila.innerHTML = `
        <td style="padding: 8px; text-align: center;"><strong>${contadorPuntos}</strong></td>
        <td style="padding: 8px;">${lat}</td>
        <td style="padding: 8px;">${lng}</td>
        <td style="padding: 8px; font-weight: bold; color: #28a745;">${estatus}</td>
        <td style="padding: 8px; text-align: center; color: #666; font-size: 0.85em;">${horaFila}</td>
    `;

    tbody.appendChild(fila);
}

window.addEventListener('DOMContentLoaded', () => {
    try {
        const historialGuardado = localStorage.getItem("historialRuta");
        if (historialGuardado) {
            const historial = JSON.parse(historialGuardado);
            historial.forEach(item => {
                agregarFilaCoordenada(item.lat, item.lng, item.estatus, item.hora);
            });
        }
    } catch (e) {
        console.error("Error al cargar historial desde localStorage:", e);
    }
});

conexion.on("actualizacionRuta", function (lat, lng, estatus) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const horaActual = new Date().toLocaleTimeString();

    agregarFilaCoordenada(latNum, lngNum, estatus, horaActual);

    let historial = [];
    try {
        const guardado = localStorage.getItem("historialRuta");
        if (guardado) historial = JSON.parse(guardado);

        historial.push({ lat: latNum, lng: lngNum, estatus, hora: horaActual });
        localStorage.setItem("historialRuta", JSON.stringify(historial));
    } catch (e) {
        console.error("Error al guardar en localStorage:", e);
    }
});

btnRegresar.addEventListener("click", () => {
    window.location.href = "Solicitud.html";
});

conexion.start()
        .then(()=> console.log("Conexion Exitosa"))
        .catch(e => console.log("Error al conectar"));