import * as Slider from '@radix-ui/react-slider';
import { Volume2 } from 'lucide-react';

function VolumeSlider({ value, onChange }) {
  return (
    <div className="volume-control">
      <Volume2 size={18} />
      <Slider.Root
        className="slider-root"
        value={[value]}
        max={1}
        step={0.01}
        aria-label="Volume"
        onValueChange={(v) => onChange(v[0])}
      >
        <Slider.Track className="slider-track">
          <Slider.Range className="slider-range" />
        </Slider.Track>
        <Slider.Thumb className="slider-thumb" />
      </Slider.Root>
      <span className="volume-value">{Math.round(value * 100)}%</span>
    </div>
  );
}

export default VolumeSlider;
