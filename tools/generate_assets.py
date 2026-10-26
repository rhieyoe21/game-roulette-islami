#!/usr/bin/env python3
"""Generate kartu dan karakter roda dengan Gemini dari environment variable.

Kredensial TIDAK disimpan di proyek ini. Script hanya membaca
GEMINI_API_KEY dari environment.

Contoh:
    $env:GEMINI_API_KEY = "..."   # PowerShell, sesi ini saja
    python tools/generate_assets.py --all
    python tools/generate_assets.py --wheel --force
    python tools/generate_assets.py --only berbagi --wheel

Tanpa argumen, script membuat kartu yang belum punya file WebP.
Karakter roda dibuat satu karakter per kondisi dengan latar transparan.
Gambar referensi opsional diletakkan di assets/reference/.
"""

from __future__ import annotations

import argparse
import base64
import io
import mimetypes
import os
import sys
import time
from pathlib import Path

import requests
from PIL import Image, ImageOps

try:
    import numpy as np
except ImportError:  # pragma: no cover - numpy tersedia di environment ini
    np = None


ROOT = Path(__file__).resolve().parent.parent
REFERENCE_DIR = ROOT / "assets" / "reference"
CARD_DIR = ROOT / "assets" / "cards"
WHEEL_DIR = ROOT / "assets" / "wheel"
DEFAULT_MODEL = "gemini-nano-banana-2.1"
OUTPUT_SIZE = (1024, 768)
WHEEL_OUTPUT_SIZE = 512
REFERENCE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}

STYLE_PROMPT = """
Gunakan gambar referensi yang dilampirkan HANYA sebagai panduan gaya visual:
ilustrasi kartun vektor flat untuk anak, garis luar cokelat tua yang tebal dan
membulat, warna pastel hangat, proporsi anak yang lucu, bayangan lembut minimal,
latar sederhana yang bersih, dan komposisi ramah anak. Jangan meniru teks,
tulisan, logo, watermark, bingkai, atau komposisi persis dari referensi.

Buat SATU adegan ilustrasi 4:3 untuk permainan edukasi Islami anak. Karakter
utama yang konsisten: anak laki-laki Indonesia berkulit hangat, memakai peci
putih dengan pita hijau dan kemeja hijau. Karakter pendukung: anak perempuan
berhijab pink dengan gamis peach, guru berhijab ungu, dan ibu berhijab cokelat.
Wajah ramah, ekspresif, sopan, mata sederhana, senyum lembut. Tangan dan kaki
harus utuh secara anatomi. Jangan menambahkan huruf, angka, aksara Arab,
kaligrafi, papan nama, tulisan pada buku, atau caption apa pun. Jangan membuat
bingkai kartu; bingkai akan ditambahkan oleh antarmuka. Isi seluruh kanvas
dengan adegan tanpa objek terpotong di tepi.
""".strip()


CARDS = [
    {
        "id": "mengucapkan-salam",
        "scene": (
            "Seorang anak laki-laki muslim tersenyum dan melambaikan tangan kepada "
            "guru perempuan berhijab ungu di halaman sekolah. Gedung sekolah kecil "
            "dengan atap dan jendela, matahari, awan lembut, rerumputan, dan balon "
            "percakapan kecil berisi simbol hati (tanpa huruf)."
        ),
    },
    {
        "id": "berdoa",
        "scene": (
            "Anak laki-laki muslim tampak dari belakang, mengangkat kedua tangan "
            "berdoa sambil melangkah memasuki masjid. Masjid dengan kubah hijau, "
            "menara, pintu lengkung bercahaya hangat, langit senja, bulan sabit, "
            "dan bintang. Suasana tenang dan khusyuk. Tanpa kaligrafi atau tulisan."
        ),
    },
    {
        "id": "berbagi",
        "scene": (
            "Anak perempuan berhijab pink tersenyum menyodorkan sepiring makanan "
            "kepada anak laki-laki berkemeja hijau di taman piknik. Piring berisi "
            "nasi, lauk, dan sayuran. Ada keranjang piknik dan bunga di rerumputan. "
            "Ekspresi hangat dan gembira."
        ),
    },
    {
        "id": "menolong-teman",
        "scene": (
            "Anak laki-laki berkemeja hijau berjongkok membantu teman laki-laki "
            "berkemeja biru memungut beberapa buku berwarna yang jatuh di lantai "
            "kelas. Rak buku dan jendela di latar belakang, hati kecil sebagai "
            "aksen, suasana saling membantu."
        ),
    },
    {
        "id": "menjaga-kebersihan",
        "scene": (
            "Anak laki-laki berkemeja hijau memungut botol dan kertas bekas lalu "
            "membuangnya ke tempat sampah hijau di taman. Beberapa sampah kecil "
            "berserakan di rumput, pohon rindang, bunga, dan kupu-kupu. Ekspresi "
            "bangga dan bersemangat."
        ),
    },
    {
        "id": "berkata-jujur",
        "scene": (
            "Anak laki-laki berkemeja hijau berdiri dengan satu tangan di dada, "
            "berbicara jujur kepada ibu berhijab cokelat yang mendengarkan dengan "
            "tenang. Sebuah mobil mainan rusak dengan satu roda lepas tergeletak "
            "di lantai ruang keluarga sederhana. Suasana jujur dan saling percaya."
        ),
    },
    {
        "id": "meminta-maaf",
        "scene": (
            "Anak laki-laki berkemeja hijau menangkupkan kedua tangan untuk meminta "
            "maaf kepada anak perempuan berhijab pink. Pot bunga terakota pecah "
            "dengan tanah dan bunga di lantai. Ekspresi anak laki-laki tulus dan "
            "sedikit menyesal; ekspresi anak perempuan lembut dan memaafkan."
        ),
    },
]

WHEEL_STYLE_PROMPT = """
Gunakan gambar kartu yang dilampirkan HANYA sebagai referensi gaya visual:
ilustrasi kartun anak, garis luar gelap yang tebal dan membulat, warna pastel
hangat, proporsi karakter yang lucu, bayangan minimal, dan wajah ramah.

Buat TEPAT SATU karakter saja, bukan adegan. Karakter utama adalah anak
Indonesia: laki-laki dengan peci putih bertepi hijau dan kemeja hijau, atau
anak perempuan berhijab pink dan gamis peach sesuai pose yang diminta. Tampilkan
seluruh tubuh atau tiga perempat tubuh, menghadap ke arah penonton, pose jelas
sesuai adegan. Jangan menambahkan karakter lain, guru, ibu, teman, kerumunan,
atau orang di latar belakang.

Latar belakang HARUS berupa warna magenta murni #FF00FF yang rata sempurna,
tanpa gradasi, tanpa bayangan, tanpa tanah, tanpa tanaman, tanpa bangunan, dan
tanpa properti latar. Hanya karakter (dan satu properti kecil bila disebutkan).
Jangan menambahkan huruf, angka, aksara Arab, kaligrafi, balon teks berisi
tulisan, logo, watermark, atau bingkai. Jangan memotong kepala, tangan, atau
kaki. Kualitas ilustrasi bersih, tajam, dan siap dijadikan stiker transparan.
""".strip()

WHEEL_CHARACTERS = [
    {
        "id": "mengucapkan-salam",
        "pose": (
            "Satu anak laki-laki berpeci putih dan kemeja hijau melambaikan satu "
            "tangan ke atas dengan senyum ramah. Pose menyapa, berdiri tegak. "
            "Properti kecil: satu hati merah muda di dekat tangan yang melambai."
        ),
    },
    {
        "id": "berdoa",
        "pose": (
            "Satu anak laki-laki berpeci putih dan kemeja hijau mengangkat kedua "
            "tangan menengadah dalam posisi berdoa, mata terpejam, ekspresi tenang "
            "dan khusyuk. Tanpa properti lain."
        ),
    },
    {
        "id": "berbagi",
        "pose": (
            "Satu anak perempuan berhijab pink dan gamis peach tersenyum sambil "
            "menyodorkan satu piring kecil berisi makanan dengan kedua tangan. "
            "Pose memberi dan berbagi, berdiri atau setengah berlutut."
        ),
    },
    {
        "id": "menolong-teman",
        "pose": (
            "Satu anak laki-laki berpeci putih dan kemeja hijau merunduk dengan "
            "satu tangan terulur ke bawah membantu anak laki-laki yang jatuh untuk berdiri, Pose menolong, ramah, "
        ),
    },
    {
        "id": "menjaga-kebersihan",
        "pose": (
            "Satu anak laki-laki berpeci putih dan kemeja hijau memungut sampah "
            "dengan satu tangan dan memegang kantong sampah kecil, ekspresi bangga. "
            "Properti kecil: satu botol atau kertas bekas. Tanpa tempat sampah besar."
        ),
    },
    {
        "id": "berkata-jujur",
        "pose": (
            "Satu anak laki-laki berpeci putih dan kemeja hijau berdiri dengan satu "
            "tangan di dada, ekspresi jujur dan terbuka. Di sampingnya hanya satu "
            "balon percakapan kecil berisi tanda centang hijau, tanpa tulisan."
        ),
    },
    {
        "id": "meminta-maaf",
        "pose": (
            "Satu anak laki-laki berpeci putih dan kemeja hijau menangkupkan kedua "
            "tangan di depan dada, kepala sedikit menunduk, ekspresi menyesal meminta "
            "maaf. Tanpa orang lain dan tanpa properti."
        ),
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate aset Roda Kebaikan Islami dengan Gemini API."
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate kartu dan karakter roda yang belum ada.",
    )
    parser.add_argument(
        "--wheel",
        action="store_true",
        help="Generate karakter roda saja (satu karakter transparan per kondisi).",
    )
    parser.add_argument(
        "--only",
        metavar="ID",
        help="Generate satu aset berdasarkan id, misalnya: berbagi.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Timpa file WebP yang sudah ada.",
    )
    return parser.parse_args()


def load_reference_images(quiet: bool = False) -> list[tuple[bytes, str]]:
    if not REFERENCE_DIR.exists():
        return []

    references: list[tuple[bytes, str]] = []
    for path in sorted(REFERENCE_DIR.iterdir()):
        if path.is_file() and path.suffix.lower() in REFERENCE_SUFFIXES:
            mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
            references.append((path.read_bytes(), mime))

    if quiet:
        return references

    if references:
        print(f"Referensi gaya: {len(references)} gambar dari {REFERENCE_DIR}")
    else:
        print(
            "Referensi gaya tidak ditemukan. Generate tetap berjalan hanya dengan prompt."
        )
    return references


def image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def existing_anchor_png() -> bytes | None:
    anchor_path = CARD_DIR / "mengucapkan-salam.webp"
    if not anchor_path.exists():
        return None
    with Image.open(anchor_path) as image:
        rgb = image.convert("RGB")
        return image_to_png_bytes(rgb)


def make_parts(
    prompt: str,
    references: list[tuple[bytes, str]],
    anchor_png: bytes | None,
) -> list[dict]:
    parts: list[dict] = [{"text": prompt}]

    for data, mime in references:
        parts.append(
            {
                "inline_data": {
                    "mime_type": mime,
                    "data": base64.b64encode(data).decode("ascii"),
                }
            }
        )

    if anchor_png:
        parts.append(
            {
                "inline_data": {
                    "mime_type": "image/png",
                    "data": base64.b64encode(anchor_png).decode("ascii"),
                }
            }
        )

    return parts


def request_image(
    api_key: str,
    model: str,
    prompt: str,
    references: list[tuple[bytes, str]],
    anchor_png: bytes | None,
    aspect_ratio: str = "4:3",
    image_size: str = "1K",
) -> bytes:
    endpoint = (
        "https://generativelanguage.googleapis.com/v1/models/"
        f"{model}:generateContent"
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": make_parts(prompt, references, anchor_png),
            }
        ],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {
                "aspectRatio": aspect_ratio,
                "imageSize": image_size,
            },
        },
    }

    last_error: Exception | None = None
    for attempt in range(1, 5):
        try:
            response = requests.post(
                endpoint,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key,
                },
                json=payload,
                timeout=180,
            )
        except requests.RequestException as error:
            last_error = error
            if attempt == 4:
                break
            wait = 3 * attempt
            print(f"  Koneksi gagal, coba lagi dalam {wait}s...")
            time.sleep(wait)
            continue

        if response.status_code in {408, 429, 500, 502, 503, 504} and attempt < 4:
            retry_after = response.headers.get("Retry-After", "")
            try:
                wait = int(retry_after)
            except ValueError:
                wait = 4 * attempt
            print(
                f"  API merespons {response.status_code}; coba lagi dalam {wait}s..."
            )
            time.sleep(wait)
            continue

        if response.status_code >= 400:
            raise RuntimeError(
                f"Gemini API error {response.status_code}: {response.text[:700]}"
            )

        data = response.json()
        candidates = data.get("candidates") or []
        for candidate in candidates:
            for part in candidate.get("content", {}).get("parts", []):
                inline = part.get("inlineData") or part.get("inline_data")
                if not inline:
                    continue
                encoded = inline.get("data")
                if encoded:
                    return base64.b64decode(encoded)

        block_reason = data.get("promptFeedback", {}).get("blockReason")
        finish_reason = (
            candidates[0].get("finishReason") if candidates else "TANPA_KANDIDAT"
        )
        raise RuntimeError(
            "Gemini tidak mengembalikan gambar. "
            f"blockReason={block_reason}, finishReason={finish_reason}, "
            f"response={str(data)[:700]}"
        )

    raise RuntimeError(f"Gagal menghubungi Gemini setelah beberapa percobaan: {last_error}")


def save_webp(
    image_bytes: bytes,
    destination: Path,
    output_size: tuple[int, int] = OUTPUT_SIZE,
    quality: int = 82,
) -> bytes:
    with Image.open(io.BytesIO(image_bytes)) as source:
        source = ImageOps.exif_transpose(source)
        rgb = source.convert("RGB")
        fitted = ImageOps.fit(
            rgb,
            output_size,
            method=Image.Resampling.LANCZOS,
            centering=(0.5, 0.5),
        )
        destination.parent.mkdir(parents=True, exist_ok=True)
        fitted.save(destination, "WEBP", quality=quality, method=6)
        return image_to_png_bytes(fitted)


def generate_one(
    card: dict,
    api_key: str,
    model: str,
    references: list[tuple[bytes, str]],
    anchor_png: bytes | None,
    force: bool,
) -> bytes | None:
    destination = CARD_DIR / f"{card['id']}.webp"
    if destination.exists() and not force:
        print(f"Lewati {card['id']}: {destination.name} sudah ada.")
        return None

    prompt = f"{STYLE_PROMPT}\n\nAdegan: {card['scene']}"
    print(f"Generate {card['id']}...")
    image_bytes = request_image(api_key, model, prompt, references, anchor_png)
    anchor = save_webp(image_bytes, destination)
    print(f"  Tersimpan: {destination}")
    return anchor


def load_wheel_style_references() -> list[tuple[bytes, str]]:
    references = load_reference_images(quiet=True)
    for card_id in ("mengucapkan-salam", "berbagi"):
        path = CARD_DIR / f"{card_id}.webp"
        if path.exists():
            references.append((path.read_bytes(), "image/webp"))
    print(f"Referensi gaya karakter roda: {len(references)} gambar")
    return references


def magenta_to_alpha(image_bytes: bytes) -> Image.Image:
    if np is None:
        raise RuntimeError("numpy diperlukan untuk menghapus latar magenta.")

    with Image.open(io.BytesIO(image_bytes)) as source:
        image = source.convert("RGBA")

    pixels = np.asarray(image).astype(np.float32)
    rgb = pixels[..., :3]
    border = np.concatenate(
        [
            rgb[:12].reshape(-1, 3),
            rgb[-12:].reshape(-1, 3),
            rgb[:, :12].reshape(-1, 3),
            rgb[:, -12:].reshape(-1, 3),
        ]
    )
    background = np.median(border, axis=0)
    background_distance = np.linalg.norm(background - np.array([255, 0, 255]))
    if background_distance > 110:
        raise RuntimeError(
            "Latar hasil generate bukan magenta murni "
            f"(terdeteksi {background.astype(int).tolist()}). Regenerate gambar."
        )

    distance = np.linalg.norm(rgb - np.array([255, 0, 255], dtype=np.float32), axis=2)
    alpha = np.clip((distance - 32) / (105 - 32), 0, 1) * 255
    alpha = np.minimum(alpha, pixels[..., 3])
    rgba = pixels.copy()
    rgba[..., 3] = alpha
    result = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")

    bbox = result.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Tidak ada karakter yang terdeteksi setelah latar dihapus.")
    result = result.crop(bbox)

    margin = int(max(result.size) * 0.04)
    canvas_size = max(result.size) + margin * 2
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(
        result,
        ((canvas_size - result.width) // 2, (canvas_size - result.height) // 2),
    )
    return ImageOps.contain(
        canvas,
        (WHEEL_OUTPUT_SIZE, WHEEL_OUTPUT_SIZE),
        method=Image.Resampling.LANCZOS,
    )


def generate_wheel_character(
    character: dict,
    api_key: str,
    model: str,
    references: list[tuple[bytes, str]],
    anchor_png: bytes | None,
    force: bool,
) -> bytes | None:
    destination = WHEEL_DIR / f"{character['id']}.webp"
    if destination.exists() and not force:
        print(f"Lewati roda {character['id']}: {destination.name} sudah ada.")
        return None

    prompt = f"{WHEEL_STYLE_PROMPT}\n\nPose: {character['pose']}"
    print(f"Generate karakter roda {character['id']}...")
    image_bytes = request_image(
        api_key,
        model,
        prompt,
        references,
        anchor_png,
        aspect_ratio="1:1",
        image_size="1K",
    )
    transparent = magenta_to_alpha(image_bytes)
    destination.parent.mkdir(parents=True, exist_ok=True)
    transparent.save(destination, "WEBP", quality=90, method=6)
    print(f"  Tersimpan: {destination}")
    return image_to_png_bytes(transparent)


def main() -> int:
    args = parse_args()
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print(
            "GEMINI_API_KEY belum tersedia.\n"
            "Set environment variable terlebih dahulu, misalnya di PowerShell:\n"
            '  $env:GEMINI_API_KEY = "..."\n'
            "Jangan menyimpan kredensial di dalam file proyek.",
            file=sys.stderr,
        )
        return 1

    model = os.environ.get("GEMINI_IMAGE_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL

    if args.only:
        do_cards = not args.wheel
        do_wheel = args.wheel
    elif args.all:
        do_cards = True
        do_wheel = True
    elif args.wheel:
        do_cards = False
        do_wheel = True
    else:
        do_cards = True
        do_wheel = False

    selected_cards = CARDS
    selected_wheel = WHEEL_CHARACTERS
    if args.only:
        selected_cards = [card for card in CARDS if card["id"] == args.only]
        selected_wheel = [
            character for character in WHEEL_CHARACTERS if character["id"] == args.only
        ]
        if not selected_cards and not selected_wheel:
            valid = ", ".join(card["id"] for card in CARDS)
            print(f"ID tidak dikenal: {args.only}. Pilihan: {valid}", file=sys.stderr)
            return 2

    print(f"Model gambar: {model}")

    if do_cards and selected_cards:
        CARD_DIR.mkdir(parents=True, exist_ok=True)
        references = load_reference_images()
        anchor_png = existing_anchor_png() if not args.force else None
        print(f"Output kartu: {CARD_DIR}")

        generated_anchor = False
        for card in selected_cards:
            is_first_card = card["id"] == "mengucapkan-salam"
            output_anchor = generate_one(
                card,
                api_key,
                model,
                references,
                anchor_png if not is_first_card else None,
                args.force,
            )
            if output_anchor and is_first_card:
                anchor_png = output_anchor
                generated_anchor = True

        if generated_anchor:
            print("Anchor gaya kartu baru dibuat dan dipakai untuk kartu berikutnya.")

    if do_wheel and selected_wheel:
        WHEEL_DIR.mkdir(parents=True, exist_ok=True)
        references = load_wheel_style_references()
        anchor_png = None
        print(f"Output karakter roda: {WHEEL_DIR}")
        print("Karakter roda memakai satu karakter per gambar dan latar transparan.")

        generated_wheel_anchor = False
        for character in selected_wheel:
            is_first_character = character["id"] == "mengucapkan-salam"
            output_anchor = generate_wheel_character(
                character,
                api_key,
                model,
                references,
                anchor_png if not is_first_character else None,
                args.force,
            )
            if output_anchor and is_first_character:
                anchor_png = output_anchor
                generated_wheel_anchor = True

        if generated_wheel_anchor:
            print("Anchor gaya karakter roda dibuat untuk karakter berikutnya.")

    print("Selesai. Jalankan ulang tanpa --force untuk melewati file yang sudah ada.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
