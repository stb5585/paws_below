import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Soundscape } from '../src/game/systems/audio';

class FakeAudio {
  static instances: FakeAudio[] = [];
  preload = '';
  currentTime = 0;
  volume = 1;
  pause = vi.fn();
  play = vi.fn(() => Promise.resolve());

  constructor(readonly src: string) { FakeAudio.instances.push(this); }
}

describe('recorded bark selection', () => {
  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);
  });

  it('uses one bark normally and three barks for nearby treasure', () => {
    const sound = new Soundscape();
    const [single, treasure] = FakeAudio.instances;
    expect(single.src).toContain('one_bark');
    expect(treasure.src).toContain('three_barks');
    expect(FakeAudio.instances.every(player => player.preload === 'none')).toBe(true);

    sound.bark();
    expect(single.play).toHaveBeenCalledTimes(1);
    expect(single.volume).toBe(.34);
    expect(treasure.play).not.toHaveBeenCalled();

    sound.bark(true);
    expect(single.pause).toHaveBeenCalled();
    expect(treasure.play).toHaveBeenCalledTimes(1);
  });

  it('keeps recorded bark silent while muted', () => {
    const sound = new Soundscape();
    sound.muted = true;
    sound.bark(true);
    expect(FakeAudio.instances.every(player => player.play.mock.calls.length === 0)).toBe(true);
  });

  it('uses one honk normally and three honks for nearby treasure', () => {
    const sound = new Soundscape();
    const singleHonk = FakeAudio.instances.find(player => player.src.includes('one_honk'))!;
    const treasureHonks = FakeAudio.instances.find(player => player.src.includes('three_honks'))!;
    sound.honk();
    expect(singleHonk.play).toHaveBeenCalledTimes(1);
    expect(singleHonk.volume).toBe(.34);
    expect(treasureHonks.play).not.toHaveBeenCalled();
    sound.honk(true);
    expect(singleHonk.pause).toHaveBeenCalled();
    expect(treasureHonks.play).toHaveBeenCalledTimes(1);
  });
});
