import React, { useState, useEffect, useRef } from "react";

const Counter = ({ targetNumber, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const counterRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the element is visible
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => {
      if (counterRef.current) {
        observer.unobserve(counterRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && count === 0) {
      let start = 0;
      const step = Math.ceil(targetNumber / (duration / 16)); // Increase per frame (~16ms)
      const interval = setInterval(() => {
        start += step;
        if (start >= targetNumber) {
          setCount(targetNumber);
          clearInterval(interval);
        } else {
          setCount(start);
        }
      }, 16);
    }
  }, [isVisible, count, targetNumber, duration]);

  return (
    <span ref={counterRef} style={{fontSize:"40px"}}>{count}</span>
  );
};

export default Counter;
