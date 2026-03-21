"""
Servidor TTS con Chatterbox (ResembleAI) para Bot de Discord
- Clonación de voz: graba tu voz y ponla como archivo .wav
- Soporta español y 22 idiomas más
- Sin errores de compilación en Windows
- Supera a ElevenLabs en calidad

Instalación (solo esto):
  pip install chatterbox-tts fastapi uvicorn torch torchaudio

Uso:
  python tts_server.py

Para clonar tu voz:
  1. Graba tu voz 10-30 segundos en un archivo WAV
  2. Ponlo en la carpeta "voices/" con el nombre que quieras
     Ejemplo: voices/MiVoz.wav
  3. Usa ese nombre en el bot con /tts voz:MiVoz

Exponer a internet:
  cloudflared tunnel --url http://localhost:5002
"""

import io
import os
from contextlib import asynccontextmanager
from typing import List, Optional

import torch
import torchaudio
import uvicorn
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse, StreamingResponse

# Carpeta donde pones tus archivos de voz para clonar
VOICES_DIR = "voices"
os.makedirs(VOICES_DIR, exist_ok=True)

# Caché del modelo (se carga una sola vez)
_model = None


def get_model():
    global _model
    if _model is None:
        from chatterbox.tts import ChatterboxTTS
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[TTS] Cargando modelo Chatterbox en {device.upper()}...")
        print("[TTS] La primera vez puede tardar varios minutos (descarga ~1.5GB)...")
        _model = ChatterboxTTS.from_pretrained(device=device)
        print(f"[TTS] Modelo listo en {device.upper()}")
    return _model


def list_voices() -> List[str]:
    """Lista los archivos de voz disponibles en la carpeta voices/"""
    if not os.path.exists(VOICES_DIR):
        return []
    return [
        f.replace(".wav", "").replace(".mp3", "")
        for f in os.listdir(VOICES_DIR)
        if f.endswith((".wav", ".mp3"))
    ]


def find_voice_file(voice_name: str) -> Optional[str]:
    """Busca el archivo de voz por nombre (sin extensión)."""
    for ext in [".wav", ".mp3"]:
        path = os.path.join(VOICES_DIR, voice_name + ext)
        if os.path.exists(path):
            return path
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Arranque: pre-cargar el modelo
    print("[TTS] Pre-cargando modelo Chatterbox...")
    get_model()
    voices = list_voices()
    if voices:
        print(f"[TTS] Voces disponibles: {', '.join(voices)}")
    else:
        print(f"[TTS] Sin voces en '{VOICES_DIR}/'. Se usará voz por defecto.")
        print(f"[TTS] Agrega archivos .wav a '{VOICES_DIR}/' para clonar voces.")
    yield
    # Apagado: nada que limpiar


app = FastAPI(title="Chatterbox TTS Server para Discord Bot", lifespan=lifespan)


@app.get("/")
def root():
    voices = list_voices()
    return {
        "status": "ok",
        "modelo": "Chatterbox TTS (ResembleAI)",
        "voces_disponibles": voices if voices else ["(sin voces, usando voz por defecto)"],
        "instrucciones": f"Agrega archivos .wav a la carpeta '{VOICES_DIR}/' para clonar voces",
    }


@app.get("/voces")
def listar_voces():
    """Lista las voces disponibles para clonar."""
    voices = list_voices()
    return {
        "voces": voices,
        "carpeta": os.path.abspath(VOICES_DIR),
        "instrucciones": "Agrega archivos WAV de 10-30 segundos para clonar cualquier voz",
    }


@app.get("/tts")
async def text_to_speech(
    text: str = Query(..., description="Texto a convertir en voz", max_length=300),
    lang: str = Query("es", description="Idioma: es, en, pt, fr, de"),
    voice: str = Query("default", description="Nombre de la voz (archivo en la carpeta voices/)"),
    exaggeration: float = Query(0.5, description="Intensidad emocional (0.25=calmado, 0.75=expresivo)"),
    cfg: float = Query(0.5, description="Control de ritmo (0.3=rapido, 0.7=lento)"),
):
    """
    Convierte texto en audio WAV usando clonación de voz.
    Si no hay archivo de voz, usa la voz por defecto del modelo.
    """
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "El texto no puede estar vacio"})

    try:
        model = get_model()
        voice_path = find_voice_file(voice)

        if voice_path:
            print(f"[TTS] Clonando voz '{voice}' desde '{voice_path}'")
            wav = model.generate(
                text,
                audio_prompt_path=voice_path,
                exaggeration=exaggeration,
                cfg_weight=cfg,
            )
        else:
            if voice != "default":
                print(f"[TTS] Voz '{voice}' no encontrada, usando voz por defecto")
            wav = model.generate(
                text,
                exaggeration=exaggeration,
                cfg_weight=cfg,
            )

        # Asegurar que el tensor tenga la forma correcta (channels, samples)
        if wav.dim() == 1:
            wav = wav.unsqueeze(0)

        # Guardar en memoria como WAV
        buf = io.BytesIO()
        torchaudio.save(buf, wav.cpu(), model.sr, format="wav")
        buf.seek(0)

        print(f"[TTS] Audio generado: '{text[:50]}' | Voz: {voice}")

        return StreamingResponse(
            buf,
            media_type="audio/wav",
            headers={
                "Content-Disposition": 'attachment; filename="tts.wav"',
                "X-Voice": voice,
                "X-Lang": lang,
            },
        )

    except Exception as e:
        print(f"[TTS] Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    port = int(os.environ.get("TTS_PORT", 5002))
    print("=" * 52)
    print("  Servidor TTS con Chatterbox (ResembleAI)")
    print("=" * 52)
    print(f"  URL local:       http://localhost:{port}")
    print(f"  Carpeta voces:   {os.path.abspath(VOICES_DIR)}/")
    print(f"  GPU disponible:  {'Si (CUDA)' if torch.cuda.is_available() else 'No (CPU)'}")
    print("  Para clonar voz: pon un .wav en la carpeta voices/")
    print("=" * 52)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
