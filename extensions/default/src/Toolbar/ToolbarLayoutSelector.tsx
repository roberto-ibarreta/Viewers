import React, { useEffect, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { LayoutSelector as OHIFLayoutSelector, ToolbarButton, LayoutPreset } from '@ohif/ui';

const _areSelectorsValid = (hp, displaySets, hangingProtocolService) => {
  if (!hp.displaySetSelectors || Object.values(hp.displaySetSelectors).length === 0) {
    return true;
  }

  return hangingProtocolService.areRequiredSelectorsValid(
    Object.values(hp.displaySetSelectors),
    displaySets[0]
  );
};

const generateAdvancedPresets = ({ servicesManager }: withAppTypes) => {
  const { hangingProtocolService, viewportGridService, displaySetService } =
    servicesManager.services;

  const hangingProtocols = Array.from(hangingProtocolService.protocols.values());

  const viewportId = viewportGridService.getActiveViewportId();

  if (!viewportId) {
    return [];
  }
  const displaySetInsaneUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewportId);

  if (!displaySetInsaneUIDs) {
    return [];
  }

  const displaySets = displaySetInsaneUIDs.map(uid => displaySetService.getDisplaySetByUID(uid));

  return hangingProtocols
    .map(hp => {
      if (!hp.isPreset) {
        return null;
      }

      const areValid = _areSelectorsValid(hp, displaySets, hangingProtocolService);

      return {
        icon: hp.icon,
        title: hp.name,
        commandOptions: {
          protocolId: hp.id,
        },
        disabled: !areValid,
      };
    })
    .filter(preset => preset !== null);
};

function ToolbarLayoutSelectorWithServices({
  commandsManager,
  servicesManager,
  ...props
}: withAppTypes) {
  const onSelection = useCallback(props => {
    commandsManager.run({
      commandName: 'setViewportGridLayout',
      commandOptions: { ...props },
    });
  }, [commandsManager]);

  const onSelectionPreset = useCallback(props => {
    commandsManager.run({
      commandName: 'setHangingProtocol',
      commandOptions: { ...props },
    });
  }, [commandsManager]);

  return (
    <LayoutSelector
      {...props}
      onSelection={onSelection}
      onSelectionPreset={onSelectionPreset}
      servicesManager={servicesManager}
    />
  );
}

function LayoutSelector({
  rows = 3,
  columns = 4,
  onLayoutChange = () => {},
  className,
  onSelection,
  onSelectionPreset,
  servicesManager,
  ...rest
}: withAppTypes) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonWrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  const { customizationService } = servicesManager.services;
  const advancedPresets =
    customizationService.get('advancedPresets') || generateAdvancedPresets({ servicesManager });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnOutsidePointer = event => {
      const target = event.target as Node;
      if (buttonWrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    // Defer so the opening tap/click does not immediately close the menu (common on mobile).
    const frameId = window.requestAnimationFrame(() => {
      document.addEventListener('pointerdown', closeOnOutsidePointer);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [isOpen]);

  const onInteractionHandler = () => {
    setIsOpen(prev => !prev);
  };

  const handleSelection = useCallback(
    props => {
      onSelection?.(props);
      setIsOpen(false);
    },
    [onSelection]
  );

  const handleSelectionPreset = useCallback(
    props => {
      onSelectionPreset?.(props);
      setIsOpen(false);
    },
    [onSelectionPreset]
  );

  const DropdownContent = isOpen ? OHIFLayoutSelector : null;

  return (
    <div ref={buttonWrapperRef}>
      <ToolbarButton
        id="Layout"
        label="Layout"
        icon="tool-layout"
        onInteraction={onInteractionHandler}
        className={className}
        rounded={rest.rounded}
        dropdownContent={
          DropdownContent !== null && (
            <div
              className="flex"
              ref={dropdownRef}
            >
              <div className="bg-secondary-dark flex flex-col gap-2.5 p-2">
                <div className="text-aqua-pale text-xs">Advanced</div>

                <div className="flex flex-col gap-2.5">
                  {advancedPresets.map((preset, index) => (
                    <LayoutPreset
                      key={index}
                      classNames="hover:bg-primary-dark group flex gap-2 p-1 cursor-pointer"
                      icon={preset.icon}
                      title={preset.title}
                      disabled={preset.disabled}
                      commandOptions={preset.commandOptions}
                      onSelection={handleSelectionPreset}
                    />
                  ))}
                </div>
              </div>

              <div className="bg-primary-dark flex flex-col gap-2.5 border-l-2 border-solid border-black  p-2">
                <div className="text-aqua-pale text-xs">Custom</div>
                <DropdownContent
                  rows={rows}
                  columns={columns}
                  onSelection={handleSelection}
                />
                <p className="text-aqua-pale text-xs leading-tight">
                  Hover to select <br></br>rows and columns <br></br> Click to apply
                </p>
              </div>
            </div>
          )
        }
        isActive={isOpen}
        type="toggle"
      />
    </div>
  );
}

LayoutSelector.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number,
  onLayoutChange: PropTypes.func,
  servicesManager: PropTypes.object.isRequired,
};

export default ToolbarLayoutSelectorWithServices;
