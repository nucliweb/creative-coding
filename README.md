# Creative Coding · La Girotrònica

A 20-minute talk (in Catalan) about Creative Coding for Computer Engineering students. The slides are a web app with live demos: webcam, microphone, p5.js, WebGL shaders, WebGPU compute and the audience's phones via Firebase Realtime Database.

## Run

```bash
npm install
npm run dev        # http://localhost:5173, also exposed on the LAN
npm test           # unit tests (navigation, params, sanitizer, applause energy)
npm run build      # static build in dist/
```

Pages:

- `/` the deck (projector)
- `/presenter.html` presenter view: notes, timer, next slide, mic/camera/Firebase/phones status
- `/control.html` the page the audience opens from the QR code

Override the QR target with `?control=https://example.com/control.html` (useful when serving from the laptop on the venue Wi‑Fi).

## Keys (deck)

| Key | Action |
| --- | --- |
| `→` `Space` `PageDown` | next (clickers work) |
| `←` `PageUp` | previous |
| `Shift+P` | open presenter view |
| `Shift+F` | fullscreen |
| `Shift+S` | settings: camera, microphone, mic sensitivity and live meter |
| `Shift+C` | toggle CRT scanlines |
| `B` or `.` | black screen |
| `+` / `-` | mic sensitivity |
| hold `Q` | simulated microphone (plan B for the applause) |

Per-demo keys are listed in each slide's presenter notes (for example `1`–`7` toggle shader effects, `g` shows the local control panel on the rings demo, `t` drops a test word on the messages demo).

## Firebase

The rules in `database.rules.json` only open the paths the demos use (`stage`, `rings`, `players`, `messages`) and validate ranges and message length. A test keeps them in sync with `src/shared/params.js`. Publish them in the Firebase console (Realtime Database → Rules). After the talk, lock the database again (`".read": false, ".write": false`).

The free Spark plan allows 100 simultaneous connections, enough for a room under 100 people.

## Processing

`processing/GirotronicaClap` is the classic applause demo in real Processing 4. Install the Sound library once (Sketch → Import Library → Manage Libraries → Sound), open the sketch and press `⌘R`. `UP` / `DOWN` adjust the gain.

## Day-of checklist

1. Chrome, laptop on power, notifications off (Do Not Disturb).
2. Open the deck, press `Enter`: every line of the boot check must say `[OK]`.
3. `Shift+S`: pick the external camera pointing at the audience and calibrate the mic sensitivity with a test applause.
4. `Shift+P`: move the presenter window to the laptop screen, deck fullscreen (`Shift+F`) on the projector.
5. Scan the QR with your own phone and move a slider: the rings must react.
6. Open Processing with the sketch loaded, ready for `⌘R`.
