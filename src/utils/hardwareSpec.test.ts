import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PIN_CONNECTIONS,
  filterPinConnections,
  EMOTION_NAMES,
  getEmotionRenderParams,
  rgb888ToRgb565,
  formatRgb565Hex,
  generateRgb565HeaderSnippet,
  validateGitHubPushInput,
  RGB565_PALETTE
} from './hardwareSpec';

test('PIN_CONNECTIONS contains all 8 hardware nets from the ESP32-C3 sketch', () => {
  assert.equal(PIN_CONNECTIONS.length, 8);
  const sclk = PIN_CONNECTIONS.find((p) => p.gpioNumber === 4);
  assert.ok(sclk);
  assert.equal(sclk.targetPin, 'SCL / SCK');

  const dhtPin = PIN_CONNECTIONS.find((p) => p.gpioNumber === 3);
  assert.ok(dhtPin);
  assert.equal(dhtPin.subsystem, 'sensor');
});

test('filterPinConnections filters accurately by subsystem and search query', () => {
  const displayPins = filterPinConnections(PIN_CONNECTIONS, 'display', '');
  assert.equal(displayPins.length, 5);

  const sensorPins = filterPinConnections(PIN_CONNECTIONS, 'sensor', '');
  assert.equal(sensorPins.length, 1);
  assert.equal(sensorPins[0].espPin, 'GPIO 3');

  const mosiSearch = filterPinConnections(PIN_CONNECTIONS, 'all', 'mosi');
  assert.equal(mosiSearch.length, 1);
  assert.equal(mosiSearch[0].espPin, 'GPIO 6');
});

test('getEmotionRenderParams matches C++ switch(emotion) geometry and RGB565 colors', () => {
  assert.equal(EMOTION_NAMES.length, 18);

  const neutral = getEmotionRenderParams('NEUTRAL', 0, 0);
  assert.equal(neutral.w, 64);
  assert.equal(neutral.h, 54);
  assert.equal(neutral.rgb565, RGB565_PALETTE.CYAN);
  assert.equal(neutral.forcedClosed, false);

  const sleepy = getEmotionRenderParams('SLEEPY', 2, -2);
  assert.equal(sleepy.w, 64);
  assert.equal(sleepy.h, 32);
  assert.equal(sleepy.forcedClosed, true);
  assert.equal(sleepy.rgb565, RGB565_PALETTE.BLUE);

  const thinking = getEmotionRenderParams('THINKING', 0, 0);
  assert.equal(thinking.gx, 9);
  assert.equal(thinking.gy, -5);
});

test('rgb888ToRgb565 and formatRgb565Hex produce exact 16-bit color values', () => {
  assert.equal(rgb888ToRgb565(0, 0, 0), 0x0000);
  assert.equal(rgb888ToRgb565(255, 255, 255), 0xffff);
  assert.equal(rgb888ToRgb565(255, 0, 0), 0xf800);
  assert.equal(rgb888ToRgb565(0, 255, 0), 0x07e0);
  assert.equal(rgb888ToRgb565(0, 0, 255), 0x001f);
  assert.equal(formatRgb565Hex(0x07ff), '0x07FF');
});

test('generateRgb565HeaderSnippet formats valid PROGMEM C array', () => {
  const snippet = generateRgb565HeaderSnippet([0xffff, 0x0000, 0x07ff, 0xf800], 'test_logo', 2, 2);
  assert.ok(snippet.includes('const uint16_t test_logo[4] PROGMEM'));
  assert.ok(snippet.includes('0xFFFF, 0x0000, 0x07FF, 0xF800'));
});

test('validateGitHubPushInput rejects empty token or invalid repo name and accepts valid payload', () => {
  const invalidEmpty = validateGitHubPushInput({ token: '', repoName: '' });
  assert.equal(invalidEmpty.valid, false);
  assert.ok(invalidEmpty.errors.token);
  assert.ok(invalidEmpty.errors.repoName);

  const invalidChars = validateGitHubPushInput({
    token: 'ghp_1234567890abcdef',
    repoName: 'bad repo name!'
  });
  assert.equal(invalidChars.valid, false);
  assert.ok(invalidChars.errors.repoName);

  const valid = validateGitHubPushInput({
    token: 'ghp_1234567890abcdef',
    repoName: 'esp32c3-gc9a01-smart-companion'
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});
