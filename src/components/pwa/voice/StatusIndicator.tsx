import React from "react";
import { motion } from "framer-motion";

interface StatusIndicatorProps {
  isActive: boolean;
  size?: "sm" | "md" | "lg";
  color?: "green" | "cyan" | "amber" | "red";
}

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4"
};

const colorClasses = {
  green: {
    bg: "bg-green-500",
    ping: "bg-green-400"
  },
  cyan: {
    bg: "bg-primary",
    ping: "bg-primary/60"
  },
  amber: {
    bg: "bg-amber-500",
    ping: "bg-amber-400"
  },
  red: {
    bg: "bg-red-500",
    ping: "bg-red-400"
  }
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  isActive, 
  size = "md",
  color = "green"
}) => {
  const sizeClass = sizeClasses[size];
  const colors = colorClasses[color];

  return (
    <div className="relative flex items-center justify-center">
      {/* Base dot */}
      <motion.div
        className={`${sizeClass} rounded-full ${colors.bg}`}
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={isActive ? {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        } : {}}
      />
      
      {/* Ping effect when active */}
      {isActive && (
        <motion.div
          className={`absolute ${sizeClass} rounded-full ${colors.ping}`}
          initial={{ scale: 1, opacity: 0.75 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}
    </div>
  );
};

export default StatusIndicator;
