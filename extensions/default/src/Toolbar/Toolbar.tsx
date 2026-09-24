import React, { useEffect, useState } from 'react';
import { useToolbar } from '@ohif/core';

const MOBILE_BREAKPOINT_PX = 768;

function useIsMobileToolbar() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT_PX : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}

export function Toolbar({ servicesManager, buttonSection = 'primary' }) {
  const isMobile = useIsMobileToolbar();
  const { toolbarButtons, onInteraction } = useToolbar({
    servicesManager,
    buttonSection,
  });

  const buttons = toolbarButtons.filter(Boolean);

  if (!buttons.length) {
    return null;
  }

  // On mobile, use a 2-row grid with equal (or nearly equal) tools per row.
  // e.g. 10 tools → 5 columns → 5 + 5; 9 tools → 5 columns → 5 + 4.
  const columns = isMobile ? Math.ceil(buttons.length / 2) : null;

  return (
    <div
      className={
        isMobile
          ? 'grid w-full justify-center justify-items-center gap-1'
          : 'flex flex-wrap items-center justify-center gap-1'
      }
      style={
        columns
          ? {
              gridTemplateColumns: `repeat(${columns}, auto)`,
            }
          : undefined
      }
    >
      {buttons.map(toolDef => {
        const { id, Component, componentProps } = toolDef;

        return (
          <div
            key={id}
            className="inline-flex shrink-0"
          >
            <Component
              id={id}
              onInteraction={onInteraction}
              servicesManager={servicesManager}
              {...componentProps}
            />
          </div>
        );
      })}
    </div>
  );
}
