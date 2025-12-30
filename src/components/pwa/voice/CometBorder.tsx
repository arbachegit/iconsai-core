import React from "react";
import { motion } from "framer-motion";

interface CometBorderProps {
  isActive: boolean;
  speed?: number;
  children: React.ReactNode;
  className?: string;
}

export const CometBorder: React.FC<CometBorderProps> = ({ 
  isActive, 
  speed = 2, 
  children,
  className = ""
}) => {
  return (
    <div className={`relative rounded-3xl p-[2px] ${className}`}>
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 rounded-3xl"
        style={{
          background: isActive 
            ? "conic-gradient(from 0deg, hsl(191, 100%, 50%), hsl(270, 64%, 58%), hsl(191, 100%, 50%))"
            : "conic-gradient(from 0deg, hsl(191, 100%, 50%, 0.3), hsl(270, 64%, 58%, 0.3), hsl(191, 100%, 50%, 0.3))",
        }}
        animate={isActive ? { rotate: 360 } : { rotate: 0 }}
        transition={isActive ? {
          duration: speed,
          repeat: Infinity,
          ease: "linear"
        } : {}}
      />
      
      {/* Glow effect */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-3xl blur-xl opacity-50"
          style={{
            background: "conic-gradient(from 0deg, hsl(191, 100%, 50%), hsl(270, 64%, 58%), hsl(191, 100%, 50%))",
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}
      
      {/* Inner content container */}
      <div className="relative rounded-3xl bg-background overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default CometBorder;
