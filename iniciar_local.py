import http.server
import socketserver
import webbrowser
import os
import sys
import socket

# Evita errores de codificación con emojis en consolas Windows (cp1252, etc.)
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

def find_available_port(start_port=8000):
    port = start_port
    while port < start_port + 50:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
        port += 1
    return start_port

def get_lan_ip():
    """Devuelve la IP local de este PC dentro de la red WiFi (para el teléfono)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # No envía datos: solo sirve para conocer la interfaz de salida.
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)

    port = find_available_port(8000)
    local_url = f"http://localhost:{port}/index.html"
    lan_ip = get_lan_ip()
    lan_url = f"http://{lan_ip}:{port}/index.html"

    print("=" * 64)
    print("  🌿  MI DESPENSA — SERVIDOR LOCAL ACTIVO")
    print("=" * 64)
    print(f"  Carpeta:      {base_dir}")
    print(f"  Este PC:      {local_url}")
    print(f"  Teléfono:     {lan_url}")
    print("-" * 64)
    print("  📱 Para abrirlo en el iPhone:")
    print("     1. Conecta el teléfono a la MISMA red WiFi que este PC.")
    print(f"     2. Abre en Safari: {lan_url}")
    print("  (Nota: por WiFi sin HTTPS funciona como web, pero para")
    print("   'Añadir a pantalla de inicio' necesitas publicarla con")
    print("   HTTPS, por ejemplo gratis en https://app.netlify.com/drop)")
    print("=" * 64)
    print("  Presiona [Ctrl + C] en esta consola para detener el servidor.")
    print("=" * 64)

    webbrowser.open(local_url)

    handler = http.server.SimpleHTTPRequestHandler
    # "0.0.0.0" permite que otros dispositivos de la red (el teléfono) se conecten.
    with socketserver.TCPServer(("0.0.0.0", port), handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor cerrado correctamente.")

if __name__ == "__main__":
    main()
