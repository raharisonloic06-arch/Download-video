import os
import uuid
import threading
from pathlib import Path
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import yt_dlp

app = FastAPI(title="MediaDown API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = Path("/tmp/mediadown")
DOWNLOAD_DIR.mkdir(exist_ok=True)

jobs: dict = {}


class AnalyzeRequest(BaseModel):
    url: str


class DownloadRequest(BaseModel):
    url: str
    format_id: str
    audio_only: bool = False
    audio_format: str = "mp3"


def cleanup_old_files():
    cutoff = datetime.now() - timedelta(minutes=30)
    for f in DOWNLOAD_DIR.iterdir():
        if f.is_file() and datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
            f.unlink(missing_ok=True)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_url(req: AnalyzeRequest):
    try:
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "socket_timeout": 20,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=False)

        if not info:
            raise HTTPException(status_code=404, detail="No media found at this URL")

        formats = []
        seen = set()
        raw_formats = info.get("formats", [])

        for f in raw_formats:
            ext = f.get("ext", "")
            height = f.get("height")
            vcodec = f.get("vcodec", "none")
            fid = f.get("format_id", "")
            filesize = f.get("filesize") or f.get("filesize_approx")

            if vcodec != "none" and height:
                label = f"{height}p"
                if label not in seen:
                    seen.add(label)
                    formats.append({
                        "id": fid,
                        "label": label,
                        "ext": ext,
                        "type": "video",
                        "height": height,
                        "filesize": filesize,
                        "note": f.get("format_note", ""),
                    })

        formats.sort(key=lambda x: x.get("height", 0), reverse=True)
        formats.append({"id": "bestaudio/best", "label": "MP3 (Audio)", "ext": "mp3", "type": "audio", "height": 0})
        formats.append({"id": "bestaudio/best", "label": "M4A (Audio)", "ext": "m4a", "type": "audio", "height": 0})

        if not any(f["type"] == "video" for f in formats):
            formats.insert(0, {"id": "best", "label": "Best available", "ext": "mp4", "type": "video", "height": 9999})

        duration = info.get("duration")
        duration_str = None
        if duration:
            mins, secs = divmod(int(duration), 60)
            hrs, mins = divmod(mins, 60)
            duration_str = f"{hrs}:{mins:02d}:{secs:02d}" if hrs else f"{mins}:{secs:02d}"

        return {
            "title": info.get("title", "Unknown"),
            "thumbnail": info.get("thumbnail"),
            "duration": duration_str,
            "uploader": info.get("uploader"),
            "view_count": info.get("view_count"),
            "platform": info.get("extractor_key", "Unknown"),
            "formats": formats,
        }

    except yt_dlp.utils.DownloadError as e:
        msg = str(e)
        if "not supported" in msg.lower() or "unsupported url" in msg.lower():
            raise HTTPException(status_code=400, detail="URL non supportée.")
        raise HTTPException(status_code=400, detail=f"Erreur: {msg[:200]}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


def do_download(job_id: str, url: str, format_id: str, audio_only: bool, audio_format: str):
    cleanup_old_files()
    output_template = str(DOWNLOAD_DIR / f"{job_id}_%(title).80s.%(ext)s")

    try:
        jobs[job_id]["status"] = "downloading"
        jobs[job_id]["progress"] = 0

        def progress_hook(d):
            if d["status"] == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate")
                downloaded = d.get("downloaded_bytes", 0)
                if total:
                    jobs[job_id]["progress"] = round((downloaded / total) * 100, 1)
                    jobs[job_id]["speed"] = d.get("_speed_str", "")
                    jobs[job_id]["eta"] = d.get("_eta_str", "")
            elif d["status"] == "finished":
                jobs[job_id]["progress"] = 95

        if audio_only:
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": output_template,
                "quiet": True,
                "progress_hooks": [progress_hook],
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": audio_format,
                    "preferredquality": "192",
                }],
            }
        else:
            if format_id in ("best", "bestaudio/best"):
                fmt = format_id
            else:
                fmt = f"{format_id}+bestaudio/best/best"

            ydl_opts = {
                "format": fmt,
                "outtmpl": output_template,
                "quiet": True,
                "progress_hooks": [progress_hook],
                "merge_output_format": "mp4",
            }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        files = list(DOWNLOAD_DIR.glob(f"{job_id}_*"))
        if not files:
            jobs[job_id]["status"] = "error"
            jobs[job_id]["error"] = "Fichier introuvable après téléchargement"
            return

        filepath = files[0]
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["filename"] = filepath.name
        jobs[job_id]["filepath"] = str(filepath)

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)[:300]


@app.post("/api/download")
async def start_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "progress": 0, "created": datetime.now().isoformat()}

    audio_only = req.audio_only or req.format_id in ("bestaudio/best",)
    audio_fmt = req.audio_format if req.audio_only else "mp3"

    thread = threading.Thread(
        target=do_download,
        args=(job_id, req.url, req.format_id, audio_only, audio_fmt),
        daemon=True,
    )
    thread.start()
    return {"job_id": job_id}


@app.get("/api/job/{job_id}")
def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]


@app.get("/api/download/{job_id}")
def download_file(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    if job["status"] != "done":
        raise HTTPException(status_code=400, detail="Fichier pas encore prêt")
    filepath = Path(job["filepath"])
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier expiré")
    return FileResponse(
        path=str(filepath),
        filename=job["filename"],
        media_type="application/octet-stream",
    )


# ── Serve React SPA ──────────────────────────────────────────────────────────
STATIC_DIR = Path(__file__).parent.parent / "static"

if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        index = STATIC_DIR / "index.html"
        if index.exists():
            return HTMLResponse(index.read_text())
        return HTMLResponse("<h1>Frontend not built</h1>", status_code=404)
