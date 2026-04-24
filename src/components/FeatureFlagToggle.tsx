export function FeatureFlagToggle({
  flag,
  onToggle,
}: {
  flag: any;
  onToggle: (key: string, value: boolean) => void;
}) {
  return (
    <div>
      <label>{flag.key}</label>
      <input
        type="checkbox"
        checked={flag.value}
        onChange={e => onToggle(flag.key, e.target.checked)}
      />
    </div>
  );
}
