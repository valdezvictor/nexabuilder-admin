import { useEffect, useState } from "react";
import { listFeatureFlags, updateFeatureFlag } from "../api/system";
import { FeatureFlagToggle } from "../components/FeatureFlagToggle";

export function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);

  useEffect(() => {
    listFeatureFlags().then(setFlags);
  }, []);

  const handleToggle = (key: string, value: boolean) => {
    updateFeatureFlag(key, value).then(() => {
      setFlags(prev =>
        prev.map(f => (f.key === key ? { ...f, value } : f))
      );
    });
  };

  return (
    <div>
      <h1>Feature Flags</h1>
      {flags.map(f => (
        <FeatureFlagToggle
          key={f.key}
          flag={f}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
