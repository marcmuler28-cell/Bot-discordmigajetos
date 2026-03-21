"""
Servidor TTS con edge-tts para Bot de Discord
Voces neurales de Microsoft - Sin compilación, funciona en Windows

Instalación (solo esto, sin errores):
  pip install edge-tts fastapi uvicorn

Uso:
  python tts_server.py

Luego exponer con Cloudflare Tunnel:
  cloudflared tunnel --url http://localhost:5002
"""

import asyncio
import io
import os

import edge_tts
import uvicorn
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse, StreamingResponse

app = FastAPI(title="TTS Server para Discord Bot")

# Voces neurales por voz del bot
# Todas son voces de alta calidad de Microsoft Edge
VOCES = {
    "Enrique":   "es-ES-AlvaroNeural",     # Español España, voz masculina
    "Valentina": "es-MX-DaliaNeural",      # Español México, voz femenina
    "Brian":     "en-GB-RyanNeural",       # Inglés Reino Unido, masculina
    "Justin":    "en-US-AndrewNeural",     # Inglés USA, masculina
    "Pierre":    "fr-FR-HenriNeural",      # Francés, masculina
    "Klaus":     "de-DE-ConradNeural",     # Alemán, masculina
}

# Voz por defecto si no coincide
DEFAULT_VOICE = "es-ES-AlvaroNeural"


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Servidor TTS activo con voces neurales de Microsoft",
        "voces_disponibles": list(VOCES.keys()),
    }


@app.get("/voces")
async def listar_voces():
    """Lista todas las voces disponibles en edge-tts."""
    voices = await edge_tts.list_voices()
    spanish = [v for v in voices if v["Locale"].startswith("es")]
    return {"voces_español": spanish, "total": len(voices)}


@app.get("/tts")
async def text_to_speech(
    text: str = Query(..., description="Texto a convertir en voz", max_length=300),
    lang: str = Query("es", description="Idioma: es, en, pt, fr, de"),
    voice: str = Query("Enrique", description="Nombre de la voz del bot"),
):
    """
    Convierte texto en audio MP3.
    Lavalink puede reproducir este audio directamente vía HTTP.
    """
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "El texto no puede estar vacío"})

    # Seleccionar la voz según el nombre del personaje
    voz_neural = VOCES.get(voice, DEFAULT_VOICE)

    try:
        # Generar audio con edge-tts en memoria (sin archivos temporales)
        audio_buffer = io.BytesIO()

        communicate = edge_tts.Communicate(text=text, voice=voz_neural)

        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_buffer.write(chunk["data"])

        audio_buffer.seek(0)

        if audio_buffer.getbuffer().nbytes == 0:
            return JSONResponse(status_code=500, content={"error": "No se generó audio"})

        print(f"[TTS] ✅ '{text[:40]}...' | Voz: {voz_neural}")

        return StreamingResponse(
            audio_buffer,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'attachment; filename="tts.mp3"',
                "X-Voice": voz_neural,
                "X-Lang": lang,
            },
        )

    except Exception as e:
        print(f"[TTS] ❌ Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    port = int(os.environ.get("TTS_PORT", 5002))
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  🎙️  Servidor TTS para Discord Bot")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  📍 URL local: http://localhost:{port}")
    print("  🎤 Voces: Enrique, Valentina, Brian, Justin, Pierre, Klaus")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
