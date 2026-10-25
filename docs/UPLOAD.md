# AfroMix — Guide Upload Audio & Images

## Vue d'ensemble

Les fichiers ne transitent **jamais** par le serveur Next.js.
Le flux est : client → URL signée → R2/S3 directement.

```
Client                  Next.js API              Cloudflare R2
  │                         │                         │
  │── POST /audio ──────────▶│                         │
  │◀──── { uploadUrl, key }──│                         │
  │                         │                         │
  │── PUT <uploadUrl> ───────────────────────────────▶│
  │◀──── 200 OK ─────────────────────────────────────│
  │                         │                         │
  │── POST /audio/confirm ──▶│                         │
  │     { key }              │── UPDATE mix ──────────▶│
  │◀──── { audioUrl } ───────│                         │
```

## Configuration requise (.env.local)

```env
STORAGE_REGION="auto"
STORAGE_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
STORAGE_ACCESS_KEY_ID="<R2_ACCESS_KEY>"
STORAGE_SECRET_ACCESS_KEY="<R2_SECRET_KEY>"
STORAGE_BUCKET="afromix"
STORAGE_CDN_URL="https://cdn.afromix.io"
```

Pour Cloudflare R2 :
1. Dashboard R2 → Bucket → Settings → Public access → Enable
2. Custom domain ou `*.r2.dev` URL comme `STORAGE_CDN_URL`
3. API Tokens → Create Token → R2 Token (Edit permissions)

## Routes disponibles

### Audio

| Route | Méthode | Description |
|---|---|---|
| `/api/v1/mixes/[id]/audio` | POST | Presign upload audio pour un mix |
| `/api/v1/mixes/[id]/audio/confirm` | POST | Confirme et persiste l'audio |
| `/api/v1/tracks/[id]/audio` | POST | Presign upload audio pour un track |
| `/api/v1/tracks/[id]/audio/confirm` | POST | Confirme et persiste l'audio |

### Covers (pochettes)

| Route | Méthode | Description |
|---|---|---|
| `/api/v1/mixes/[id]/cover` | POST | Presign upload cover mix |
| `/api/v1/mixes/[id]/cover/confirm` | POST | Persiste la cover |
| `/api/v1/tracks/[id]/cover` | POST | Presign upload cover track |
| `/api/v1/tracks/[id]/cover/confirm` | POST | Persiste la cover |

### Avatar & Banner artiste

| Route | Méthode | Description |
|---|---|---|
| `/api/v1/artists/[slug]/avatar` | POST | Presign avatar |
| `/api/v1/artists/[slug]/avatar/confirm` | POST | Persiste l'avatar |
| `/api/v1/artists/[slug]/banner` | POST | Presign banner |
| `/api/v1/artists/[slug]/banner/confirm` | POST | Persiste le banner |

## Formats acceptés

### Audio
| Format | MIME type |
|---|---|
| MP3 | `audio/mpeg` |
| WAV | `audio/wav` |
| AIFF | `audio/aiff` |
| FLAC | `audio/flac` |
| OGG | `audio/ogg` |

**Taille max** : 500 MB  
**TTL URL signée** : 1 heure

### Images (covers, avatars, banners)
| Format | MIME type |
|---|---|
| JPEG | `image/jpeg` |
| PNG | `image/png` |
| WEBP | `image/webp` |

**Taille max** : 10 MB  
**TTL URL signée** : 15 minutes  
**Dimensions recommandées** : 3000×3000 px (cover), 1500×500 px (banner)

## Exemple complet — Upload audio d'un mix

### Étape 1 — Obtenir l'URL presignée

```http
POST /api/v1/mixes/afrobeats-session-vol-1-q24yv/audio
Authorization: Cookie afromix_access=...
Content-Type: application/json

{
  "contentType": "audio/mpeg"
}
```

Réponse :
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://ep-xxx.r2.cloudflarestorage.com/afromix/mixes/2026/09/abc123.mp3?X-Amz-...",
    "key": "mixes/2026/09/abc123.mp3",
    "cdnUrl": "https://cdn.afromix.io/mixes/2026/09/abc123.mp3",
    "expiresIn": 3600,
    "maxBytes": 524288000
  }
}
```

### Étape 2 — Upload direct vers R2 (côté client)

```javascript
const file = document.querySelector('input[type=file]').files[0];

await fetch(data.uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'audio/mpeg' },
  body: file,
});
```

> ⚠️ Le header `Content-Type` doit correspondre exactement au type demandé en étape 1.

### Étape 3 — Confirmer l'upload

```http
POST /api/v1/mixes/afrobeats-session-vol-1-q24yv/audio/confirm
Authorization: Cookie afromix_access=...
Content-Type: application/json

{
  "key": "mixes/2026/09/abc123.mp3",
  "durationSec": 3600
}
```

Réponse :
```json
{
  "success": true,
  "data": {
    "audioUrl": "https://cdn.afromix.io/mixes/2026/09/abc123.mp3",
    "audioKey": "mixes/2026/09/abc123.mp3",
    "status": "PROCESSING",
    "durationSec": 3600,
    "message": "Audio uploadé. Le fichier est en cours de traitement."
  }
}
```

Le mix passe automatiquement en `status: PROCESSING`.
Une fois le traitement FFmpeg terminé (future implémentation), il passera à `PUBLISHED`.

## Statuts du contenu

```
DRAFT → (upload audio) → PROCESSING → (FFmpeg worker) → PUBLISHED
                                                       ↘ REJECTED
```

| Status | Signification |
|---|---|
| `DRAFT` | Pas encore d'audio uploadé |
| `PROCESSING` | Audio uploadé, en attente de traitement |
| `PUBLISHED` | Disponible publiquement |
| `UNLISTED` | Accessible via lien direct seulement |
| `REMOVED` | Retiré (modération) |

## Roadmap — Traitement audio (Phase 5 avancée)

Le traitement FFmpeg sera implémenté sous forme de worker séparé :

```
R2 (source)
    ↓
Redis Queue (job)
    ↓
FFmpeg Worker
    ├── Normalisation niveau sonore (-14 LUFS)
    ├── MP3 320kbps (HIGH)
    ├── MP3 128kbps (MEDIUM)
    ├── AAC 96kbps (LOW)
    └── Waveform JSON (visualisation)
    ↓
R2 (versions)
    ↓
CDN
    ↓
UPDATE mix.status = PUBLISHED
```

Variables à ajouter quand le worker sera implémenté :
```env
REDIS_URL="redis://..."
FFMPEG_WORKER_URL="https://worker.afromix.io"
```
