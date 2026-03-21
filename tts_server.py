"""
Servidor TTS con Coqui TTS para Bot de Discord
Genera audio de alta calidad en español y otros idiomas
Autor: Tu bot de Discord

Instalación:
  pip install TTS fastapi uvicorn soundfile

Uso:
  python tts_server.py

Luego exponer con Cloudflare Tunnel:
  cloudflared tunnel --url http://localhost:5002
"""

import io
import os
import tempfile
import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse, JSONResponse
import uvicorn

app = FastAPI(title="TTS Server para Discord Bot")

# Modelos disponibles por idioma
MODELS = {
    "es": "tts_models/es/mai/tacotron2-DDC",       # Español - rápido y ligero
    "en": "tts_models/en/ljspeech/tacotron2-DDC",  # Inglés
    "multilingual": "tts_models/multilingual/multi-dataset/xtts_v2",  # Multi-idioma HD
}

# Caché de instancias TTS para no recargar el modelo cada vez
_tts_cache: dict = {}

def get_tts(lang: str = "es"):
    """Carga el modelo TTS para el idioma dado, con caché."""
    from TTS.api import TTS

    if lang not in _tts_cache:
        model_name = MODELS.get(lang, MODELS["es"])
        print(f"[TTS] Cargando modelo: {model_name}")
        _tts_cache[lang] = TTS(model_name=model_name, progress_bar=False)
        print(f"[TTS] Modelo '{model_name}' cargado correctamente.")

    return _tts_cache[lang]


@app.on_event("startup")
async def startup():
    """Pre-carga el modelo de español al iniciar el servidor."""
    print("[TTS] Pre-cargando modelo de español...")
    get_tts("es")
    print("[TTS] ✅ Servidor listo en http://localhost:5002")


@app.get("/")
def root():
    return {"status": "ok", "message": "Servidor TTS activo"}


@app.get("/tts")
async def text_to_speech(
    text: str = Query(..., description="Texto a convertir en voz", max_length=300),
    lang: str = Query("es", description="Idioma: es, en, pt, fr, de"),
    voice: str = Query("Enrique", description="Nombre de la voz (informativo)"),
):
    """
    Convierte texto en audio WAV.
    Lavalink puede reproducir este audio directamente.
    """
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "El texto no puede estar vacío"})

    # Normalizar idioma
    lang_map = {
        "es": "es", "pt": "es",  # Portugués usa modelo español como fallback
        "en": "en",
        "fr": "es", "de": "es",  # Fallback al español para idiomas sin modelo
    }
    model_lang = lang_map.get(lang, "es")

    try:
        tts = get_tts(model_lang)

        # Generar audio en archivo temporal
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        tts.tts_to_file(text=text, file_path=tmp_path)

        # Leer el archivo y enviarlo como respuesta
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()

        os.unlink(tmp_path)  # Eliminar archivo temporal

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'attachment; filename="tts.wav"',
                "X-Voice": voice,
                "X-Lang": lang,
            }
        )

    except Exception as e:
        print(f"[TTS] Error generando audio: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    port = int(os.environ.get("TTS_PORT", 5002))
    print(f"[TTS] Iniciando servidor en puerto {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
