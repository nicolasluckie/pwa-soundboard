import * as Tooltip from '@radix-ui/react-tooltip';

function SoundButton({ sample, onPlay, isPlaying }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className={`sound-button ${isPlaying ? 'pressed' : ''}`}
            style={{ '--accent': sample.color }}
            onClick={() => onPlay(sample.file)}
            aria-label={`Play ${sample.name}`}
          >
            {sample.icon && (
              <div
                className="sound-bg sound-bg-img"
                style={{ backgroundImage: `url(${sample.icon})` }}
              />
            )}
            {sample.emoji && !sample.icon && (
              <div className="sound-bg sound-bg-emoji">{sample.emoji}</div>
            )}
            <span className="sound-name">{sample.name}</span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip" sideOffset={5}>
            {sample.name}
            <Tooltip.Arrow className="tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export default SoundButton;
