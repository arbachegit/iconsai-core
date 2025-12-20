import { cn } from "@/lib/utils";

interface CircularTimerProps {
  timeLeft: number; // seconds
  totalTime: number; // seconds
  size?: number;
  strokeWidth?: number;
}

export const CircularTimer = ({ 
  timeLeft, 
  totalTime, 
  size = 120, 
  strokeWidth = 8 
}: CircularTimerProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = timeLeft / totalTime;
  const strokeDashoffset = circumference * (1 - progress);
  
  // Format time as MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  // Color based on time remaining
  const getColor = () => {
    if (timeLeft > 60) return 'text-emerald-500'; // Green > 1min
    if (timeLeft > 30) return 'text-amber-500'; // Yellow 30s-1min
    return 'text-red-500'; // Red < 30s
  };
  
  const getStrokeColor = () => {
    if (timeLeft > 60) return '#10b981'; // emerald-500
    if (timeLeft > 30) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Time display */}
      <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        getColor()
      )}>
        <span className="text-2xl font-bold font-mono">{timeDisplay}</span>
        <span className="text-xs text-muted-foreground">restantes</span>
      </div>
    </div>
  );
};
