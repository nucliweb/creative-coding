// La Girotrònica · Creative Coding
// Applause makes the logo grow. Same idea as T3chFest 2019, updated for Processing 4.
// Requires the Sound library: Sketch > Import Library > Manage Libraries > "Sound".
// Keys: UP / DOWN adjust the microphone gain, R resets the peak.

import processing.sound.*;

AudioIn input;
Amplitude loudness;
PShape logo;
float ratio;
float smoothed = 0;
float peak = 0;
float gain = 3.0;

void setup() {
  fullScreen();
  // size(1280, 720); // use this instead while rehearsing in a window
  input = new AudioIn(this, 0);
  input.start();
  loudness = new Amplitude(this);
  loudness.input(input);

  logo = loadShape("logo.svg");
  logo.disableStyle();
  ratio = logo.width / logo.height;
}

void draw() {
  background(2, 6, 4);

  float volume = loudness.analyze() * gain;
  smoothed = lerp(smoothed, volume, volume > smoothed ? 0.6 : 0.08);
  peak = max(peak * 0.995, smoothed);

  float size = map(constrain(smoothed, 0, 0.5), 0, 0.5, 20, height * 0.9);
  float w = min(size * ratio, width * 0.85);
  float h = w / ratio;

  noStroke();
  // chromatic split grows with the volume
  float split = smoothed * 60;
  blendMode(ADD);
  fill(0, 240, 255);
  shape(logo, (width - w) / 2 - split, (height - h) / 2, w, h);
  fill(255, 43, 214);
  shape(logo, (width - w) / 2 + split, (height - h) / 2, w, h);
  fill(0, 255, 106);
  shape(logo, (width - w) / 2, (height - h) / 2, w, h);
  blendMode(BLEND);

  // volume meter
  fill(0, 255, 106);
  rect(40, height - 40, map(constrain(smoothed, 0, 0.5), 0, 0.5, 0, width - 80), 12);
  fill(252, 238, 10);
  rect(40 + map(constrain(peak, 0, 0.5), 0, 0.5, 0, width - 80), height - 46, 4, 24);
  fill(47, 122, 77);
  textSize(16);
  text("GAIN " + nf(gain, 1, 1) + "  (UP/DOWN)", 40, height - 56);
}

void keyPressed() {
  if (keyCode == UP) gain *= 1.25;
  if (keyCode == DOWN) gain /= 1.25;
  if (key == 'r' || key == 'R') peak = 0;
}
