# Creative Coding · La Girotrònica

A 20-minute talk (in Catalan) about Creative Coding for Computer Engineering students. The slides are a web app with live demos: webcam, microphone, p5.js, WebGL shaders, WebGPU compute and the audience's phones via Firebase Realtime Database. The finale is a Three.js arena where every phone controls a character (name, colour, speed, joystick and dash) and the deck simulates the collisions.

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
| `T` | light / dark theme (text slides; full-screen demos stay dark) |
| `<` / `>` | smaller / bigger text, remembered between sessions |
| `+` / `-` | mic sensitivity |
| `M` | mute / unmute sound effects (crashes, win, boom), remembered between sessions; on the camera demos `m` mirrors, use `Shift+M` there |
| hold `Q` | simulated microphone (plan B for the applause) |

Per-demo keys are listed in each slide's presenter notes (for example `1`–`7` toggle shader effects, `g` shows the local control panel on the rings demo, `w` drops a test word on the messages demo, and on the arena finale `Tab` pauses the game and shows the full crash ranking, `b` toggles bots, `p` switches to pixel mode and `c` orbits the camera). The presenter view forwards every key except navigation and `I` (which starts or pauses the timer) to the deck, so demo keys such as `g`, `x`, `r` or `Tab` work from there too.

## Resources

The links from the closing slide, to keep exploring after the talk:

- [Processing](https://processing.org): the original creative coding environment (Java, 2001), with tutorials and reference.
- [p5.js](https://p5js.org): Processing for the browser, with an online editor and an inclusive community.
- [OpenProcessing](https://openprocessing.org): thousands of sketches to read, fork and remix.
- [The Book of Shaders](https://thebookofshaders.com): a gentle, step by step introduction to fragment shaders.
- [Shadertoy](https://www.shadertoy.com): a social network of shaders; every piece shows its code.
- [The Coding Train](https://thecodingtrain.com): Daniel Shiffman's videos and coding challenges.
- [Genuary](https://genuary.art): one generative sketch per day every January, with a prompt for each day.
- [Awesome Creative Coding](https://github.com/terkelg/awesome-creative-coding): the big curated list of tools, books, courses and communities.

### Alternatives

Processing and p5.js are a starting point. A few alternatives, picked from Awesome Creative Coding:

- Code: [openFrameworks](https://openframeworks.cc/) (C++), [Cinder](https://libcinder.org/) (C++), [nannou](https://nannou.cc/) (Rust), [py5](https://py5coding.org) (Python)
- Web: [three.js](https://github.com/mrdoob/three.js/) (3D), [Pixi.js](https://pixijs.com/) (2D), [Paper.js](https://paperjs.org/) (vector graphics), [canvas-sketch](https://github.com/mattdesl/canvas-sketch) (generative artwork)
- Visual programming: [TouchDesigner](https://derivative.ca/), [vvvv](https://vvvv.org/), [Max](https://cycling74.com/products/max), [Pure Data](https://puredata.info/)
- Sound: [Sonic Pi](https://sonic-pi.net/), [TidalCycles](https://tidalcycles.org/), [SuperCollider](https://supercollider.github.io/), [Glicol](https://glicol.org)

## Firebase

The rules in `database.rules.json` only open the paths the demos use (`stage`, `rings`, `players`, `messages`, `avatars`, `scores`) and validate ranges and message length. A test keeps them in sync with `src/shared/params.js`. Publish them in the Firebase console (Realtime Database → Rules). After the talk, lock the database again (`".read": false, ".write": false`).

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
