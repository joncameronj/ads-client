"""Transcribe a folder of videos with Whisper and write one markdown transcript per video.

Usage:
    python scripts/transcribe.py \
        --client-id aec \
        --campaign-type conversion \
        --videos-dir aec/conversion/videos \
        --transcripts-dir aec/conversion/transcripts \
        --model base

Filename template: {client_id}_{YYYY-MM-DD}_{slug}.md
"""

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"}


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-+", "-", value).strip("-")
    return value or "video"


def load_client_name(client_id: str, repo_root: Path) -> str:
    clients_file = repo_root / "clients.json"
    if not clients_file.exists():
        return client_id
    try:
        data = json.loads(clients_file.read_text())
        return data.get("clients", {}).get(client_id, {}).get("name", client_id)
    except (json.JSONDecodeError, OSError):
        return client_id


def find_videos(videos_dir: Path) -> list[Path]:
    if not videos_dir.exists():
        return []
    return sorted(
        p for p in videos_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS
    )


def write_transcript(
    out_path: Path,
    *,
    client_id: str,
    client_name: str,
    campaign_type: str,
    source_video: Path,
    repo_root: Path,
    model_name: str,
    result: dict,
) -> None:
    duration = result.get("duration")
    language = result.get("language", "unknown")
    text = result.get("text", "").strip()

    relative_video = source_video.relative_to(repo_root) if source_video.is_absolute() else source_video

    frontmatter = [
        "---",
        f"client_id: {client_id}",
        f"client_name: {client_name}",
        f"campaign_type: {campaign_type}",
        f"source_video: {relative_video}",
        f"transcribed_at: {dt.datetime.now().isoformat(timespec='seconds')}",
        f"whisper_model: {model_name}",
        f"language: {language}",
    ]
    if duration is not None:
        frontmatter.append(f"duration_seconds: {duration:.2f}")
    frontmatter.append("---\n")

    body = [
        f"# Transcript — {source_video.stem}",
        "",
        "## Full text",
        "",
        text,
        "",
    ]

    segments = result.get("segments") or []
    if segments:
        body.append("## Segments")
        body.append("")
        for seg in segments:
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            seg_text = (seg.get("text") or "").strip()
            body.append(f"- [{start:06.2f} → {end:06.2f}] {seg_text}")
        body.append("")

    out_path.write_text("\n".join(frontmatter) + "\n".join(body))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--client-id", required=True)
    parser.add_argument("--campaign-type", choices=["conversion", "content"], required=True)
    parser.add_argument("--videos-dir", required=True, type=Path)
    parser.add_argument("--transcripts-dir", required=True, type=Path)
    parser.add_argument("--model", default="base", help="Whisper model: tiny|base|small|medium|large")
    parser.add_argument("--force", action="store_true", help="Re-transcribe even if output exists")
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()

    repo_root: Path = args.repo_root.resolve()
    videos_dir: Path = args.videos_dir if args.videos_dir.is_absolute() else repo_root / args.videos_dir
    transcripts_dir: Path = args.transcripts_dir if args.transcripts_dir.is_absolute() else repo_root / args.transcripts_dir
    transcripts_dir.mkdir(parents=True, exist_ok=True)

    videos = find_videos(videos_dir)
    if not videos:
        print(f"No videos found in {videos_dir}", file=sys.stderr)
        return 1

    print(f"Found {len(videos)} video(s) in {videos_dir}")
    print(f"Loading Whisper model '{args.model}'...")
    import whisper
    model = whisper.load_model(args.model)

    client_name = load_client_name(args.client_id, repo_root)
    today = dt.date.today().isoformat()

    transcribed = 0
    skipped = 0
    for video in videos:
        slug = slugify(video.stem)
        out_path = transcripts_dir / f"{args.client_id}_{today}_{slug}.md"
        if out_path.exists() and not args.force:
            print(f"  skip {video.name} → {out_path.name} (exists, use --force to redo)")
            skipped += 1
            continue

        print(f"  transcribing {video.name}...")
        result = model.transcribe(str(video), verbose=False)
        write_transcript(
            out_path,
            client_id=args.client_id,
            client_name=client_name,
            campaign_type=args.campaign_type,
            source_video=video,
            repo_root=repo_root,
            model_name=args.model,
            result=result,
        )
        print(f"  wrote {out_path.relative_to(repo_root)}")
        transcribed += 1

    print(f"\nDone. Transcribed: {transcribed}, skipped: {skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
