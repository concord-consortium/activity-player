// src/components/single-question/slides/single-question-completion-slide.tsx

import React, { useEffect, useMemo, useState } from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import IconCheck from "../../../assets/svg-icons/icon-check-circle.svg";
import "./single-question-completion-slide.scss";

interface IProps {
  isVisible?: boolean;
}

export const SingleQuestionCompletionSlide: React.FC<IProps> = ({ isVisible = true }) => {
  // Trigger entrance animation each time the slide becomes visible
  const [hasAnimated, setHasAnimated] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (isVisible) {
      // Reset animation state and trigger new animation
      setHasAnimated(false);
      setAnimationKey(prev => prev + 1);
      const timer = setTimeout(() => setHasAnimated(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Generate confetti particles - use animationKey to regenerate on each visit
  const confettiColors = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#95e1d3", "#a8d8ea", "#f38181", "#aa96da"];
  const confettiParticles = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: confettiColors[i % confettiColors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${1.5 + Math.random() * 1}s`,
    size: `${6 + Math.random() * 8}px`,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [animationKey]);

  return (
    <div className={`single-question-completion-slide ${hasAnimated ? "single-question-completion-slide--animate" : ""}`}>
      {/* Confetti container */}
      <div className="single-question-completion-slide__confetti" aria-hidden="true">
        {confettiParticles.map((particle) => (
          <div
            key={particle.id}
            className="single-question-completion-slide__confetti-particle"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
            }}
          />
        ))}
      </div>

      <div className="single-question-completion-slide__content">
        <IconCheck className="single-question-completion-slide__icon" width={80} height={80} />
        <h2 className="single-question-completion-slide__title">
          <DynamicText>All done!</DynamicText>
        </h2>
        <p className="single-question-completion-slide__message">
          <DynamicText>Great job completing this activity!</DynamicText>
        </p>
      </div>
    </div>
  );
};
