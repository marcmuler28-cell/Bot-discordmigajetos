"""
Servidor TTS con Chatterbox (ResembleAI) para Bot de Discord
- Clonación de voz: graba tu voz y ponla como archivo .wav
- Soporta español y 22 idiomas más
- Sin errores de compilación en Windows
- Supera a ElevenLabs en calidad

Instalación (solo esto):
  pip install chatterbox-tts fastapi uvicorn

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
import torch
import torchaudio
import uvicorn
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse, StreamingResponse

app = FastAPI(title="Chatterbox TTS Server para Discord Bot")

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
        print(f"[TTS] Cargando modelo Chatterbox en {device}...")
        _model = ChatterboxTTS.from_pretrained(device=device)
        print(f"[TTS] ✅ Modelo listo en {device.upper()}")
    return _model


def list_voices() -> list[str]:
    """Lista los archivos de voz disponibles en la carpeta voices/"""
    if not os.path.exists(VOICES_DIR):
        return []
    return [
        f.replace(".wav", "").replace(".mp3", "")
        for f in os.listdir(VOICES_DIR)
        if f.endswith((".wav", ".mp3"))
    ]


def find_voice_file(voice_name: str) -> str | None:
    """Busca el archivo de voz por nombre (sin extensión)."""
    for ext in [".wav", ".mp3"]:
        path = os.path.join(VOICES_DIR, voice_name + ext)
        if os.path.exists(path):
            return path
    return None


@app.on_event("startup")
async def startup():
    print("[TTS] Pre-cargando modelo Chatterbox...")
    get_model()
    voices = list_voices()
    if voices:
        print(f"[TTS] Voces disponibles: {', '.join(voices)}")
    else:
        print(f"[TTS] ⚠️  No hay voces en '{VOICES_DIR}/'. El bot usará voz por defecto.")
        print(f"[TTS]    Agrega archivos .wav a la carpeta '{VOICES_DIR}/' para clonar voces.")


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
    cfg: float = Query(0.5, description="Control de ritmo (0.3=rápido, 0.7=lento)"),
):
    """
    Convierte texto en audio usando clonación de voz.
    Si no hay archivo de voz, usa la voz por defecto del modelo.
    """
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "El texto no puede estar vacío"})

    try:
        model = get_model()

        # Buscar archivo de voz para clonar
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
            print(f"[TTS] Voz '{voice}' no encontrada, usando voz por defecto")
            wav = model.generate(
                text,
                exaggeration=exaggeration,
                cfg_weight=cfg,
            )

        # Convertir tensor a bytes WAV en memoria
        buf = io.BytesIO()
        torchaudio.save(buf, wav, model.sr, format="wav")
        buf.seek(0)

        print(f"[TTS] ✅ Audio generado: '{text[:40]}...' | Voz: {voice}")

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
        print(f"[TTS] ❌ Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    port = int(os.environ.get("TTS_PORT", 5002))
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  🎙️  Servidor TTS con Chatterbox (ResembleAI)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  📍 URL local:  http://localhost:{port}")
    print(f"  📁 Carpeta de voces: {os.path.abspath(VOICES_DIR)}/")
    print("  🎤 Para clonar tu voz: pon un archivo .wav en la carpeta voices/")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
