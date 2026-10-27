using Microsoft.AspNetCore.SignalR;

namespace WebSocketServer.Hubs
{
    public class PedidoHub : Hub
    {
        public async Task generarPedido(string nombre, string telefono, int talla, double origen, double origen2, double destino, double destino2)
        {
            string fecha = DateTime.Now.ToLongDateString();

            await Clients.All.SendAsync("pedido", nombre, telefono, talla, origen, origen2, destino, destino2, fecha);
        }

        public async Task actualizarRuta(double lat, double lng, string estatus)
        {
            await Clients.All.SendAsync("actualizacionRuta", lat, lng, estatus);
        }
    }
}