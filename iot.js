// Komunikasi ke NodeMCU/ESP8266 lewat HTTP GET.
// mode 'no-cors' = request tetap terkirim, respons tidak dibaca (cukup untuk LED).
function sendIoTCommand(path) {
    if (!CONFIG.IOT_ENABLED) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.IOT_TIMEOUT_MS);

    fetch(`${CONFIG.NODEMCU_IP}${path}`, { mode: 'no-cors', signal: controller.signal })
        .catch(err => console.log("IoT Send Error:", path, err.name))
        .finally(() => clearTimeout(timeoutId));
}
