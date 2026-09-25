# Vista hub (vistahub.my)

The front door to Vista. A new business registers here; an existing one signs in. Either way the
owner then picks an app and lands in it already signed in:

- **Open the counter** → [vista-pos](https://github.com/hariz2001-del/vista-pos) at `pos.vistahub.my`
- **Open the books** → [vista-rms](https://github.com/hariz2001-del/vista-rms) at `rms.vistahub.my`

Backend: [vista-api](https://github.com/hariz2001-del/vista-api).

## How the hand-over works

Each app keeps its own sign-in on its own domain, so this page cannot pass a token across. Instead
it signs in with a short `HUB` session (30 minutes, able to do nothing but this), asks the API for a
one-time code (`POST /auth/handoff`), and sends the browser to `https://pos.vistahub.my/#handoff=<code>`.
The code is single-use, expires after a minute and is stored only as a hash. It travels in the URL
fragment, which browsers never send to a server. The app swaps it for its own session and removes
it from the address bar.

The hub stores nothing: the `HUB` session lives in memory and is gone when the tab closes.

## Run it

```
npm install
npm run dev        # http://localhost:5176
npm run check      # lint, tests, build
```

| Variable            | Default                   | Purpose                  |
| ------------------- | ------------------------- | ------------------------ |
| `VITE_API_BASE_URL` | `http://127.0.0.1:3000`   | The API                  |
| `VITE_POS_URL`      | `https://pos.vistahub.my` | Where "counter" goes     |
| `VITE_RMS_URL`      | `https://rms.vistahub.my` | Where "books" goes       |

For local work point the last two at `http://localhost:5173` and `http://localhost:5174`. The API
must list this site's address in its `CORS_ORIGINS`.
