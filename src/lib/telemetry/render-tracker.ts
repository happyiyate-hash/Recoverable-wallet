'use client';

import { useEffect, useRef } from 'react';
import { systemEmitter } from '../events/systemEmitter';
import { TelemetryEventType } from './event-types';

interface RenderMetrics {
  componentName: string;
  renderCount: number;
  timestamp: number;
  timeSinceLastRender: number;
  changedDependencies: string[];
  warnings: string[];
  diffDetails?: Record<string, { oldVal: string; newVal: string; isUnstableReference: boolean }>;
}

export function useRenderTracker(componentName: string, dependencies: Record<string, any> = {}) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const prevDependencies = useRef<Record<string, any>>({});

  renderCount.current += 1;
  const now = performance.now();
  const timeSinceLastRender = now - lastRenderTime.current;
  
  // Compare dependencies & check for unstable reference recreation
  const changedDependencies: string[] = [];
  const diffDetails: Record<string, { oldVal: string; newVal: string; isUnstableReference: boolean }> = {};
  const currentKeys = Object.keys(dependencies);
  
  for (const key of currentKeys) {
    const oldVal = prevDependencies.current[key];
    const newVal = dependencies[key];
    
    if (oldVal !== newVal) {
      changedDependencies.push(key);
      
      // Determine if it is an unstable reference recreation (deeply equal but structurally distinct)
      let isUnstableReference = false;
      let oldStr = '';
      let newStr = '';
      
      try {
        if (typeof oldVal === 'object' && typeof newVal === 'object') {
          oldStr = JSON.stringify(oldVal) || '';
          newStr = JSON.stringify(newVal) || '';
          if (oldStr === newStr) {
            isUnstableReference = true;
          }
        }
      } catch (e) {
        // Suppress serialization issues
      }

      diffDetails[key] = {
        oldVal: typeof oldVal === 'object' ? (oldStr || '[Object]') : String(oldVal),
        newVal: typeof newVal === 'object' ? (newStr || '[Object]') : String(newVal),
        isUnstableReference
      };
    }
  }
  
  // Detect excessive renders & burst warnings
  const warnings: string[] = [];
  if (timeSinceLastRender < 16 && renderCount.current > 1) {
    warnings.push('Double Render (Frame)');
  }
  if (timeSinceLastRender < 100 && renderCount.current > 4) {
    warnings.push('Render Loop Risk');
    systemEmitter.emit(TelemetryEventType.RENDER_BURST, {
      componentName,
      renderCount: renderCount.current,
      timeSinceLastRender: Math.round(timeSinceLastRender),
      changedDependencies,
      timestamp: Date.now()
    });
  }

  // Flag if we noticed any unstable dependency values that caused this re-render
  const hasUnstableRef = Object.values(diffDetails).some(detail => detail.isUnstableReference);
  if (hasUnstableRef) {
    warnings.push('Unstable Reference Recreated');
    systemEmitter.emit(TelemetryEventType.STABLE_CONTEXT_WARNING, {
      componentName,
      keys: Object.keys(diffDetails).filter(k => diffDetails[k].isUnstableReference),
      timestamp: Date.now()
    });
  }

  const metrics: RenderMetrics = {
    componentName,
    renderCount: renderCount.current,
    timestamp: Date.now(),
    timeSinceLastRender: Math.round(timeSinceLastRender),
    changedDependencies,
    warnings,
    diffDetails
  };

  // Emit on every render phase synchronously
  try {
    systemEmitter.emit('RENDER_METRICS', metrics);
    systemEmitter.emit(TelemetryEventType.RENDER_METRICS, metrics);
  } catch (e) {
    // Suppress
  }

  // Update refs for next cycle
  lastRenderTime.current = now;
  prevDependencies.current = { ...dependencies };
}
export default useRenderTracker;
